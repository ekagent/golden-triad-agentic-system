import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addCredits } from "@/lib/storage";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderID, credits } = await request.json();
  
  if (!orderID || typeof credits !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const authString = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
    
    // Capture the payment
    const captureResponse = await fetch(`${process.env.PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`
      }
    });

    const captureData = await captureResponse.json();
    
    if (captureData.status === "COMPLETED") {
      // Payment Successful - Issue Credits to Postgres
      await addCredits(userId, credits);
      return NextResponse.json({ success: true, credits });
    } else {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to capture order" }, { status: 500 });
  }
}
