import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentHistories } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/documents/[documentId] - 문서 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("[GET /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH /api/documents/[documentId] - 문서 임시저장
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;
    const body = await req.json();
    const { formDataJson } = body;

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    // DRAFT 또는 REJECTED 상태만 수정 가능
    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 400 });
    }

    const [updated] = await db
      .update(documents)
      .set({
        formDataJson: formDataJson ?? existing.formDataJson,
        lastUpdatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("[PATCH /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/documents/[documentId] - 문서 제출
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;
    const body = await req.json();
    const { formDataJson } = body;

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      return NextResponse.json({ error: "제출할 수 없는 상태입니다." }, { status: 400 });
    }

    const [updated] = await db
      .update(documents)
      .set({
        formDataJson: formDataJson ?? existing.formDataJson,
        status: "SUBMITTED",
        lastUpdatedBy: session.user.id,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    // 이력 기록
    await db.insert(documentHistories).values({
      documentId,
      actionType: existing.status === "REJECTED" ? "RESUBMITTED" : "SUBMITTED",
      actorUserId: session.user.id,
      previousStatus: existing.status,
      nextStatus: "SUBMITTED",
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}