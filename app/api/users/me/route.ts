import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

// GET /api/users/me - 현재 로그인 사용자 정보
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        organization: users.organization,
        email: users.email,
        role: users.role,
        employeeNo: users.employeeNo,
      })
      .from(users)
      .where(sql`${users.id} = ${session.user.id}::uuid`)
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[GET /api/users/me]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
// PATCH /api/users/me - 현재 사용자 정보 수정
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const body = await req.json();
    const { name, organization, phone } = body;
    const updateData: Record<string, string> = {};
    if (name?.trim())         updateData["name"]         = name.trim();
    if (organization !== undefined) updateData["organization"] = organization ?? "";
    if (phone !== undefined)  updateData["phone"]        = phone ?? "";
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
    }
    await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(sql`${users.id} = ${session.user.id}::uuid`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/users/me]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
