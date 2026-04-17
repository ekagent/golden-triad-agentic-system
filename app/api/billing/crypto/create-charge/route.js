import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, credits, name } = await request.json(); 
  
  if (!amount || !credits || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": process.env.COINBASE_COMMERCE_API_KEY || "",
        "X-CC-Version": "2018-03-22"
      },
      body: JSON.stringify({
        name: `Compute Credits: ${name}`,
        description: `Direct acquisition of ${credits} compute credits for the Golden Triad Agentic System.`,
        pricing_type: "fixed_price",
        local_price: {
          amount: amount,
          currency: "USD"
        },
        metadata: {
          userId: userId,
          credits: credits
        },
        redirect_url: `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}dashboard/billing?status=crypto_success`,
        cancel_url: `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}dashboard/billing?status=crypto_cancel`
      })
    });
    
    const data = await response.json();
    if (data.error) {
       console.error("Coinbase Commerce Error:", data.error);
       return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ hosted_url: data.data.hosted_url });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create crypto charge" }, { status: 500 });
  }
}
