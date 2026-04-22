import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, tasks, users } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// GET /api/documents - 문서 목록 (대시보드용)
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const rows = await db
      .select({
        id: documents.id,
        documentType: documents.documentType,
        status: documents.status,
        currentApprovalOrder: documents.currentApprovalOrder,
        workLatitude: documents.workLatitude,
        workLongitude: documents.workLongitude,
        workAddress: documents.workAddress,
        formDataJson: documents.formDataJson,   // ← 추가: workStartDate/workEndDate 포함
        createdAt: documents.createdAt,
        taskId: documents.taskId,
        taskName: tasks.name,
        creatorOrganization: users.organization,
      })
      .from(documents)
      .leftJoin(tasks, eq(documents.taskId, tasks.id))
      .leftJoin(users, eq(documents.createdBy, users.id))
      .where(and(isNull(documents.deletedAt), isNull(tasks.deletedAt)));

    const result = rows.map((r: typeof rows[0]) => {
      const fd = (r.formDataJson ?? {}) as Record<string, unknown>;
      // workStartDate/workEndDate 우선, 없으면 workDate fallback
      const workStartDate: string | null =
        (fd.workStartDate as string | null) ?? (fd.workDate as string | null) ?? null;
      const workEndDate: string | null =
        (fd.workEndDate as string | null) ?? (fd.workDate as string | null) ?? null;

      return {
        id: r.id as string,
        documentType: r.documentType as string,
        status: r.status as string,
        currentApprovalOrder: r.currentApprovalOrder as number | null,
        workLatitude: r.workLatitude as number | null,
        workLongitude: r.workLongitude as number | null,
        workAddress: r.workAddress as string | null,
        // 캘린더용 기간 필드 - formDataJson에서 추출
        formDataJson: {
          workStartDate,
          workEndDate,
        },
        taskId: r.taskId as string,
        createdAt: r.createdAt as Date,
        task: { name: r.taskName ?? "용역명없음" },
        creator: { organization: r.creatorOrganization ?? "-" },
      };
    });

    return NextResponse.json({ documents: result });
  } catch (error) {
    console.error("[GET /api/documents]", error);
    return NextResponse.json({ error: "알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/documents - 문서 생성
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const body = await req.json();
    const { taskId, documentType } = body;
    if (!taskId || !documentType) {
      return NextResponse.json({ error: "taskId와 documentType이 필요합니다." }, { status: 400 });
    }
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!task || task.deletedAt) {
      return NextResponse.json({ error: "용역을 찾을 수 없습니다." }, { status: 404 });
    }
    const [newDoc] = await db
      .insert(documents)
      .values({
        taskId,
        documentType,
        status: "DRAFT",
        createdBy: session.user.id,
        formDataJson: {},
      })
      .returning();
    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents]", error);
    return NextResponse.json({ error: "알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}

