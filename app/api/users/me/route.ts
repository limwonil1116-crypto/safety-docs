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