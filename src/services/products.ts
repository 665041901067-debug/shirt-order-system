"use server";

import { createClient } from "@/lib/supabase/server";
import { Product, Campaign } from "@/types";

export async function getActiveCampaign(): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return campaign as Campaign | null;
}

export async function getProducts(searchQuery?: string, categoryFilter?: string): Promise<Product[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from("products")
    .select(`
      *,
      images:product_images(*),
      sizes:product_sizes(*),
      campaign:campaigns(*)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (categoryFilter && categoryFilter !== "ALL") {
    query = query.eq("category", categoryFilter);
  }

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  const { data: products } = await query;
  return (products || []) as Product[];
}

export async function getAllAdminProducts(): Promise<Product[]> {
  const supabase = await createClient();
  
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      images:product_images(*),
      sizes:product_sizes(*),
      campaign:campaigns(*)
    `)
    .order("created_at", { ascending: false });

  return (products || []) as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      images:product_images(*),
      sizes:product_sizes(*),
      campaign:campaigns(*),
      options:product_options(
        id,
        is_active,
        group:option_groups(
          id,
          name,
          is_required,
          values:option_values(*)
        )
      )
    `)
    .eq("id", id)
    .single();

  return product as Product | null;
}
