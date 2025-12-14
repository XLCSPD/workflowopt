import Image from "next/image";
import { cn } from "@/lib/utils";

type VersatexLogoVariant = "sidebar" | "auth";

const VARIANTS: Record<VersatexLogoVariant, { wrapperClassName: string; size: number }> = {
  sidebar: {
    wrapperClassName: "w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden",
    size: 28,
  },
  auth: {
    wrapperClassName: "w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-lg",
    size: 56,
  },
};

export function VersatexLogo({
  variant = "sidebar",
  className,
  priority,
}: {
  variant?: VersatexLogoVariant;
  className?: string;
  priority?: boolean;
}) {
  const v = VARIANTS[variant];

  return (
    <div className={cn(v.wrapperClassName, className)}>
      <Image
        src="/versatex-logo.png"
        alt="Versatex"
        width={v.size}
        height={v.size}
        priority={priority}
      />
    </div>
  );
}

