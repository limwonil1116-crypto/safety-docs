// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

// GET /api/notifications - ???뚮┝ 紐⑸줉
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id!))
      .orderBy(desc(notifications.sentAt))
      .limit(100);

    const unreadCount = list.filter((n: typeof list[0]) => !n.isRead).length;

    return NextResponse.json({ notifications: list, unreadCount });
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}

// PATCH /api/notifications - ?꾩껜 ?쎌쓬 泥섎━
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ error: "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}
