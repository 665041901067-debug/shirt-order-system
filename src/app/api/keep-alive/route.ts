import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: "Missing Supabase configuration environment variables" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query 1 lightweight record to ping Supabase and keep the project active 24/7
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, status")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "ONLINE",
      message: "Supabase Keep-Alive Anti-Sleep System Active 🚀",
      timestamp: new Date().toISOString(),
      activeCampaignsCount: data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
