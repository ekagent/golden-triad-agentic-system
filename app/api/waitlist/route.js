import { NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    await addToWaitlist(email);

    return NextResponse.json({ success: true, message: "You have been added to the waitlist!" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join waitlist." },
      { status: 500 }
    );
  }
}
