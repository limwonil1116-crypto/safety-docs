import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tbmReports } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const dateFilter = searchParams.get("date");
    const conditions: any[] = [];
    if (taskId) conditions.push(eq(tbmReports.taskId, taskId));
    if (dateFilter) conditions.push(eq(tbmReports.reportDate, dateFilter));
    const list = await db.select().from(tbmReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tbmReports.reportDate), desc(tbmReports.createdAt));
    // taskType 정규화: CONTRACTOR→용역, SELF→자체진단
    const normalizedList = list.map(r => ({
      ...r,
      taskType: r.taskType === "CONTRACTOR" ? "용역"
        : r.taskType === "SELF" ? "자체진단"
        : r.taskType || ""
    }));
    return NextResponse.json({ tbmReports: normalizedList });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const body = await req.json();
    const [report] = await db.insert(tbmReports).values({
      taskId: body.taskId || null,
      submittedBy: (session.user as any).id,
      reportDate: body.reportDate,
      eduStartTime: body.eduStartTime,
      eduEndTime: body.eduEndTime,
      headquarters: body.headquarters,
      branch: body.branch,
      projectName: body.projectName,
      projectType: body.projectType,
      facilityName: body.facilityName,
      contractorName: body.contractorName,
      workToday: body.workToday,
      workAddress: body.workAddress,
      workLatitude: body.workLatitude,
      workLongitude: body.workLongitude,
      workerCount: body.workerCount || 0,
      newWorkerCount: body.newWorkerCount || 0,
      equipment: body.equipment,
      riskType: body.riskType,
      cctvUsed: body.cctvUsed || false,
      riskFactor1: body.riskFactor1,
      riskMeasure1: body.riskMeasure1,
      riskFactor2: body.riskFactor2,
      riskMeasure2: body.riskMeasure2,
      riskFactor3: body.riskFactor3,
      riskMeasure3: body.riskMeasure3,
      mainRiskFactor: body.mainRiskFactor,
      mainRiskMeasure: body.mainRiskMeasure,
      riskElement1: body.riskElement1,
      riskElement2: body.riskElement2,
      riskElement3: body.riskElement3,
      otherContent: body.otherContent,
      instructorName: body.instructorName,
      instructorPhone: body.instructorPhone,
      signatureData: body.signatureData,
      photoUrl: body.photoUrl,
      taskType: body.taskType === "CONTRACTOR" ? "용역"
        : body.taskType === "SELF" ? "자체진단"
        : body.taskType || null,
      band: body.band || null,
      region: body.region || null,
    }).returning();
    return NextResponse.json({ tbmReport: report });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
