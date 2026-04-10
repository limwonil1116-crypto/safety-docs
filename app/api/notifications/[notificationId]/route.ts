// app/api/notifications/[notificationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const { notificationId } = await params;
    const userId = session.user.id!;
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH notification]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
