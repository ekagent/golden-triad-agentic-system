import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserNotifications, getUnreadCount, markAsRead, markAllRead, dismissNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Fetch user's notifications + unread count
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [notifications, unread] = await Promise.all([
      getUserNotifications(userId),
      getUnreadCount(userId)
    ]);
    return NextResponse.json({ notifications, unread });
  } catch (e) {
    return NextResponse.json({ notifications: [], unread: 0 });
  }
}

// POST: Mark as read or dismiss
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, notificationId } = await request.json().catch(() => ({}));

  try {
    if (action === "read" && notificationId) {
      await markAsRead(userId, notificationId);
    } else if (action === "read_all") {
      await markAllRead(userId);
    } else if (action === "dismiss" && notificationId) {
      await dismissNotification(userId, notificationId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
