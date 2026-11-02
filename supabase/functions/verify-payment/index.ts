// Supabase Edge Function: verify-payment
// Runtime: Deno / TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface VerifyPaymentBody {
  internalOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// Compute HMAC SHA256 signature in hexadecimal
async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured on the Edge Function environment.");
    }

    const {
      internalOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    }: VerifyPaymentBody = await req.json();

    if (!internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return new Response(
        JSON.stringify({ error: "Missing required payment parameters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify HMAC SHA256 Signature
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = await generateSignature(payload, razorpayKeySecret);

    if (expectedSignature !== razorpaySignature) {
      console.warn("Invalid Razorpay payment signature detected.");
      // Record failure on database order
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from("orders")
        .update({
          payment_status: "Failed",
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      return new Response(
        JSON.stringify({ error: "Payment signature verification failed. Untrusted callback." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Signature valid. Initialize Supabase Admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Idempotency check: Retrieve current order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, payment_status, order_items(product_id, quantity)")
      .eq("id", internalOrderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Order #${internalOrderId} not found.`);
    }

    // If order was already marked Paid, return early without duplicate deductions
    if (order.payment_status === "Paid") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Order already verified and marked as Paid.",
          orderId: order.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Update order to Paid and Confirmed
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        payment_status: "Paid",
        order_status: "Confirmed",
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrderId);

    if (updateErr) {
      throw new Error(`Failed to update order payment status: ${updateErr.message}`);
    }

    // 5. Decrement inventory for each item
    if (order.order_items && Array.isArray(order.order_items)) {
      for (const item of order.order_items) {
        if (item.product_id) {
          // Decrement stock quantity safely
          const { data: currentProduct } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (currentProduct) {
            const updatedStock = Math.max(0, currentProduct.stock_quantity - item.quantity);
            await supabase
              .from("products")
              .update({ stock_quantity: updatedStock, updated_at: new Date().toISOString() })
              .eq("id", item.product_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment signature verified successfully. Order confirmed.",
        orderId: internalOrderId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("verify-payment error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to verify payment." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
