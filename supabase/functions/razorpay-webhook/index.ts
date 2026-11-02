// Supabase Edge Function: razorpay-webhook
// Runtime: Deno / TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

async function verifyWebhookSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return expectedSignature === signature;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return new Response("Missing Razorpay signature header", { status: 400 });
    }

    // Read raw body for exact signature verification
    const rawBody = await req.text();
    const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      console.warn("Invalid webhook signature rejected.");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventName = event.event;
    console.log(`Verified Razorpay webhook event received: ${eventName}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (eventName === "payment.captured") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const paymentId = payment.id;

      if (razorpayOrderId) {
        // Find corresponding order
        const { data: order } = await supabase
          .from("orders")
          .select("id, payment_status")
          .eq("razorpay_order_id", razorpayOrderId)
          .single();

        if (order && order.payment_status !== "Paid") {
          await supabase
            .from("orders")
            .update({
              payment_status: "Paid",
              order_status: "Confirmed",
              razorpay_payment_id: paymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          console.log(`Order #${order.id} updated to Paid via Webhook.`);
        }
      }
    } else if (eventName === "payment.failed") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      if (razorpayOrderId) {
        await supabase
          .from("orders")
          .update({
            payment_status: "Failed",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", razorpayOrderId);

        console.log(`Order with Razorpay ID ${razorpayOrderId} marked as Failed.`);
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
