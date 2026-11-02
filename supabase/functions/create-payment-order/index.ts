// Supabase Edge Function: create-payment-order
// Runtime: Deno / TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface OrderRequestItem {
  productId: string;
  quantity: number;
}

interface CreatePaymentOrderBody {
  items: OrderRequestItem[];
  shippingAddress: any;
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay credentials are missing on the Edge Function environment.");
    }

    // 2. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized user session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and validate body
    const { items, shippingAddress }: CreatePaymentOrderBody = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided in order request." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch live products to validate prices & stock quantities on server
    const productIds = items.map((i) => i.productId);
    const { data: dbProducts, error: pErr } = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, is_active")
      .in("id", productIds);

    if (pErr || !dbProducts) {
      throw new Error("Could not retrieve current product inventory.");
    }

    let calculatedTotal = 0;
    const validatedLineItems: Array<{
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const match = dbProducts.find((p) => p.id === item.productId);
      if (!match || !match.is_active) {
        return new Response(
          JSON.stringify({ error: `Product ID ${item.productId} is no longer available.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (match.stock_quantity < item.quantity) {
        return new Response(
          JSON.stringify({
            error: `Insufficient stock for "${match.name}". Only ${match.stock_quantity} available.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const unitPrice = Number(match.price);
      const subtotal = unitPrice * item.quantity;
      calculatedTotal += subtotal;

      validatedLineItems.push({
        productId: match.id,
        name: match.name,
        unitPrice,
        quantity: item.quantity,
        subtotal,
      });
    }

    // Razorpay amounts are integer paise (1 INR = 100 paise)
    const amountInPaise = Math.round(calculatedTotal * 100);

    // 5. Create order in Razorpay (Test Mode)
    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const receiptId = `rcpt_${Date.now()}`;

    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptId,
        payment_capture: 1,
      }),
    });

    if (!rzpResponse.ok) {
      const rzpError = await rzpResponse.text();
      console.error("Razorpay order creation failed:", rzpError);
      throw new Error(`Razorpay gateway error: ${rzpError}`);
    }

    const rzpOrder = await rzpResponse.json();

    // 6. Record order in PostgreSQL
    const { data: insertedOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: calculatedTotal,
        order_status: "Pending",
        payment_status: "Pending",
        razorpay_order_id: rzpOrder.id,
        shipping_address: shippingAddress,
      })
      .select("id")
      .single();

    if (orderErr || !insertedOrder) {
      throw new Error(`Failed to save database order record: ${orderErr?.message}`);
    }

    // Record order items snapshot
    const itemRecords = validatedLineItems.map((v) => ({
      order_id: insertedOrder.id,
      product_id: v.productId,
      product_name_snapshot: v.name,
      quantity: v.quantity,
      unit_price: v.unitPrice,
      subtotal: v.subtotal,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemRecords);
    if (itemsErr) {
      throw new Error(`Failed to record order item snapshots: ${itemsErr.message}`);
    }

    // Return sanitized response for client-side modal initiation
    return new Response(
      JSON.stringify({
        success: true,
        orderId: insertedOrder.id,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-payment-order error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create payment order." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
