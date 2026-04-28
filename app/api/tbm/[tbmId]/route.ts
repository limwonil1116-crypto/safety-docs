"use server";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tbmReports } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tbmId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { tbmId } = await params;
    const [report] = await db.select().from(tbmReports).where(eq(tbmReports.id, tbmId));
    if (!report) return NextResponse.json({ error: "TBM 보고서를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ tbmReport: report });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tbmId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { tbmId } = await params;
    await db.delete(tbmReports).where(eq(tbmReports.id, tbmId));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
