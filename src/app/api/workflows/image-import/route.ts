import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, visionImportRateLimit } from "@/lib/rate-limit";
import {
  analyzeFlowchartImages,
  type VisionImageInput,
} from "@/lib/ai/visionAnalyzer";

const VALID_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGES = 10;
const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024; // 20MB in base64 ≈ ~15MB raw

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, userHint } = body as {
      images?: Array<{
        base64?: string;
        mediaType?: string;
        pageLabel?: string;
      }>;
      userHint?: string;
    };

    // Validate images
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one image is required" },
        { status: 400 }
      );
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_IMAGES} images allowed`,
        },
        { status: 400 }
      );
    }

    // Validate each image and calculate total size
    let totalSize = 0;
    const validatedImages: VisionImageInput[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      if (!img.base64 || typeof img.base64 !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: `Image ${i + 1}: missing base64 data`,
          },
          { status: 400 }
        );
      }

      if (
        !img.mediaType ||
        !VALID_MEDIA_TYPES.has(img.mediaType)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Image ${i + 1}: invalid media type "${img.mediaType}". Supported: PNG, JPEG, WebP, GIF`,
          },
          { status: 400 }
        );
      }

      totalSize += img.base64.length;
      validatedImages.push({
        base64: img.base64,
        mediaType: img.mediaType as VisionImageInput["mediaType"],
        pageLabel: img.pageLabel,
      });
    }

    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Total image size exceeds 20MB limit. Try using fewer or smaller images.",
        },
        { status: 400 }
      );
    }

    // Auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimitResult = rateLimit(authUser.id, visionImportRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${rateLimitResult.reset} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Call vision analyzer
    const result = await analyzeFlowchartImages({
      images: validatedImages,
      userHint,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          suggestions: result.suggestions,
          warnings: result.warnings,
          model: result.model,
          provider: result.provider,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      confidence: result.confidence,
      warnings: result.warnings,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    console.error("[image-import] Error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check for missing API keys
    if (message.includes("No LLM API key")) {
      return NextResponse.json(
        {
          success: false,
          error: "AI service not configured. Please set up an OpenAI or Anthropic API key.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Failed to analyze image: ${message}` },
      { status: 500 }
    );
  }
}

// Allow longer execution for AI vision analysis
export const maxDuration = 60;

