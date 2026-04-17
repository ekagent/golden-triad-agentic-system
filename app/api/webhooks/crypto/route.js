import { NextResponse } from "next/server";
import crypto from "crypto";
import { addCredits } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-cc-webhook-signature");
    
    if (!signature || !process.env.COINBASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    // Verify webhook signature natively
    const expectedSignature = crypto
      .createHmac("sha256", process.env.COINBASE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      const payload = JSON.parse(rawBody);
      const event = payload.event;

      if (event.type === "charge:confirmed" || event.type === "charge:resolved") {
        const metadata = event.data.metadata || {};
        const userId = metadata.userId;
        const credits = parseInt(metadata.credits, 10);

        if (userId && !isNaN(credits)) {
           await addCredits(userId, credits);
           console.log(`[Coinbase Webhook] Handled charge:confirmed -> Granted ${credits} credits to ${userId}`);
        }
      }
      return NextResponse.json({ success: true });
    } else {
      console.warn("[Coinbase Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (err) {
    console.error("[Coinbase Webhook] Error processing event:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
