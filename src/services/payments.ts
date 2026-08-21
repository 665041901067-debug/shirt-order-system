import { createClient } from "@/lib/supabase/server";
import { PaymentMethodConfig } from "@/types";

export async function getActivePaymentMethods(): Promise<PaymentMethodConfig[]> {
  const supabase = await createClient();

  const { data: methods } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (methods || []) as PaymentMethodConfig[];
}
