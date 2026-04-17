import { NextResponse } from "next/server";
import crypto from "crypto";
import { activateSubscription, handleSubscriptionPayment } from "@/lib/subscriptions";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/paypal
 *
 * Handles PayPal webhook events for subscription lifecycle:
 * - BILLING.SUBSCRIPTION.ACTIVATED → first activation + credit grant
 * - PAYMENT.SALE.COMPLETED → recurring payment → monthly credit refresh
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // In production, verify webhook signature via PayPal API
    // For now, validate the event structure
    const eventType = payload.event_type;
    const resource = payload.resource;

    if (!eventType || !resource) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subscriptionId = resource.id;
        if (subscriptionId) {
          await activateSubscription(subscriptionId);
          console.log(`[PayPal Webhook] Subscription activated: ${subscriptionId}`);
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Recurring payment — refresh monthly credits
        const subscriptionId = resource.billing_agreement_id;
        if (subscriptionId) {
          await handleSubscriptionPayment(subscriptionId);
          console.log(`[PayPal Webhook] Recurring payment for: ${subscriptionId}`);
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        console.log(`[PayPal Webhook] Subscription ${eventType}: ${resource.id}`);
        // The cancel is already handled client-side via DELETE /api/billing/subscriptions
        break;
      }

      default:
        console.log(`[PayPal Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[PayPal Webhook] Error:", e.message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
