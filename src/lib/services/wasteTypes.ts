import { getSupabaseClient } from "@/lib/supabase/client";
import type { WasteType } from "@/types";

const supabase = getSupabaseClient();

// ============================================
// WASTE TYPES
// ============================================

export async function getWasteTypes() {
  const { data, error } = await supabase
    .from("waste_types")
    .select("*")
    .order("category", { ascending: true })
    .order("code", { ascending: true });

  if (error) throw error;
  return data as WasteType[];
}

export async function getWasteTypeById(id: string) {
  const { data, error } = await supabase
    .from("waste_types")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as WasteType;
}

export async function getWasteTypeByCode(code: string) {
  const { data, error } = await supabase
    .from("waste_types")
    .select("*")
    .eq("code", code)
    .single();

  if (error) throw error;
  return data as WasteType;
}

export async function createWasteType(wasteType: {
  code: string;
  name: string;
  description: string;
  category: "core_lean" | "digital";
  digital_examples?: string[];
  icon?: string;
  color?: string;
}) {
  const { data, error } = await supabase
    .from("waste_types")
    .insert(wasteType)
    .select()
    .single();

  if (error) throw error;
  return data as WasteType;
}

export async function updateWasteType(id: string, updates: Partial<WasteType>) {
  const { data, error } = await supabase
    .from("waste_types")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as WasteType;
}

export async function deleteWasteType(id: string) {
  const { error } = await supabase
    .from("waste_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================
// HELPERS
// ============================================

export async function getWasteTypesByCategory(category: "core_lean" | "digital") {
  const { data, error } = await supabase
    .from("waste_types")
    .select("*")
    .eq("category", category)
    .order("code", { ascending: true });

  if (error) throw error;
  return data as WasteType[];
}

export async function getCoreLeanWasteTypes() {
  return getWasteTypesByCategory("core_lean");
}

export async function getDigitalWasteTypes() {
  return getWasteTypesByCategory("digital");
}

