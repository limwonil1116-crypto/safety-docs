"use server";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tbmReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tbmId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { tbmId } = await params;
    const body = await req.json();
    const [report] = await db.update(tbmReports).set({
      reportDate: body.reportDate,
      eduStartTime: body.eduStartTime,
      eduEndTime: body.eduEndTime,
      projectName: body.projectName,
      projectType: body.projectType,
      contractorName: body.contractorName,
      facilityName: body.facilityName,
      workToday: body.workToday,
      workAddress: body.workAddress,
      workLatitude: body.workLatitude,
      workLongitude: body.workLongitude,
      workerCount: body.workerCount || 0,
      newWorkerCount: body.newWorkerCount || 0,
      equipment: body.equipment,
      riskType: body.riskType,
      cctvUsed: body.cctvUsed || false,
      riskFactor1: body.riskFactor1, riskMeasure1: body.riskMeasure1,
      riskFactor2: body.riskFactor2, riskMeasure2: body.riskMeasure2,
      riskFactor3: body.riskFactor3, riskMeasure3: body.riskMeasure3,
      mainRiskFactor: body.mainRiskFactor, mainRiskMeasure: body.mainRiskMeasure,
      riskElement1: body.riskElement1, riskElement2: body.riskElement2, riskElement3: body.riskElement3,
      otherContent: body.otherContent,
      instructorName: body.instructorName,
      instructorPhone: body.instructorPhone,
      signatureData: body.signatureData,
      updatedAt: new Date(),
    }).where(eq(tbmReports.id, tbmId)).returning();
    return NextResponse.json({ tbmReport: report });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
