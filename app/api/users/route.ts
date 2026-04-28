import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ilike, or, isNull } from "drizzle-orm";

// GET /api/users - 사용자 목록 (공사직원만)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || "";
    const krcOnly = searchParams.get("krcOnly") === "true";
    const roleFilter = searchParams.get("role") || "";

    const conditions = [];

    // 공사직원만 필터 (organization이 한국농어촌공사)
    if (krcOnly) {
      conditions.push(eq(users.organization, "한국농어촌공사"));
    }
    if (roleFilter) {
      conditions.push(eq(users.role, roleFilter as any));
    }

    // 활성 사용자만
    conditions.push(eq(users.status, "ACTIVE"));

    // 키워드 검색
    if (keyword) {
      conditions.push(
        or(
          ilike(users.name, `%${keyword}%`),
          ilike(users.organization, `%${keyword}%`)
        )
      );
    }

    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        organization: users.organization,
        email: users.email,
        role: users.role,
        employeeNo: users.employeeNo,
      })
      .from(users)
      .where(and(...conditions));

    return NextResponse.json({ users: userList });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}