import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, organization, email, password, role, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "이름, 이메일, 비밀번호는 필수입니다." },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 12);

    // 사용자 생성
    const [user] = await db
      .insert(users)
      .values({
        name,
        organization,
        email,
        passwordHash,
        role: role || "CONTRACTOR",
        status: "ACTIVE",
        phone,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}