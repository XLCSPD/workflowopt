#!/usr/bin/env node
/**
 * Update the "ProcessOpt App Overview (Guided Walkthrough)" module
 * to use enhanced slides instead of PDF viewer
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Updating Guided Walkthrough to use enhanced slides...\n");

  // Find the Guided Walkthrough module
  const { data: module, error: findError } = await supabase
    .from("training_content")
    .select("*")
    .ilike("title", "%Guided Walkthrough%")
    .single();

  if (findError) {
    console.error("Error finding module:", findError.message);
    process.exit(1);
  }

  console.log("Found module:", module.title);
  console.log("Current content type:", module.content?.deckType || "unknown");

  // Update to use enhanced slides (the slides are defined in trainingData in the page component)
  // We set deckType to "enhanced" so the page knows to use the hardcoded slide data
  const newContent = {
    deckType: "enhanced",
    // Keep the lab instructions for reference
    lab: module.content?.lab || null,
  };

  const { error: updateError } = await supabase
    .from("training_content")
    .update({ content: newContent })
    .eq("id", module.id);

  if (updateError) {
    console.error("Error updating module:", updateError.message);
    process.exit(1);
  }

  console.log("\n✅ Successfully updated to enhanced slides!");
  console.log("The module will now use the modern slide layouts defined in the app.");
}

main();

