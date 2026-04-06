import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      return NextResponse.json({ error: "taskId와 documentType은 필수입니다." }, { status: 400 });
    }

    // 과업 존재 확인
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task || task.deletedAt) {
      return NextResponse.json({ error: "과업을 찾을 수 없습니다." }, { status: 404 });
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
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}