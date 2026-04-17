import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount } = await request.json(); // e.g. "5.00"
  
  try {
    const authString = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
    
    const response = await fetch(`${process.env.PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: amount }
        }]
      })
    });
    
    const data = await response.json();
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
