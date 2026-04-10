// app/api/notifications/[notificationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/notifications/[notificationId] - ?④굔 ?쎌쓬 泥섎━
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    const { notificationId } = await params;

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, session.user.id as string)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/notifications/[notificationId]]", error);
    return NextResponse.json({ error: "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}
