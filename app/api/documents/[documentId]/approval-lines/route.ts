import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/documents/[documentId]/approval-lines - 결재선 조회
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
    const { users } = await import("@/db/schema");

    const lines = await db
      .select({
        id: documentApprovalLines.id,
        documentId: documentApprovalLines.documentId,
        approverUserId: documentApprovalLines.approverUserId,
        approvalOrder: documentApprovalLines.approvalOrder,
        approvalRole: documentApprovalLines.approvalRole,
        stepStatus: documentApprovalLines.stepStatus,
        actedAt: documentApprovalLines.actedAt,
        comment: documentApprovalLines.comment,
        approverName: users.name,
        approverOrg: users.organization,
      })
      .from(documentApprovalLines)
      .leftJoin(users, eq(documentApprovalLines.approverUserId, users.id))
      .where(eq(documentApprovalLines.documentId, documentId))
      .orderBy(documentApprovalLines.approvalOrder);

    return NextResponse.json({ approvalLines: lines });
  } catch (error) {
    console.error("[GET /api/documents/[documentId]/approval-lines]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/documents/[documentId]/approval-lines - 결재선 저장 + 제출
// 작성자는 2단계(검토자)만 지정
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
    const { reviewerUserId, formDataJson, signatureData } = body;

    if (!reviewerUserId) {
      return NextResponse.json({ error: "검토자를 지정해주세요." }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!["DRAFT", "REJECTED"].includes(doc.status)) {
      return NextResponse.json({ error: "제출할 수 없는 상태입니다." }, { status: 400 });
    }

    // 기존 결재선 삭제
    await db
      .delete(documentApprovalLines)
      .where(eq(documentApprovalLines.documentId, documentId));

    // 2단계(검토자)만 저장
    await db.insert(documentApprovalLines).values({
      documentId,
      approverUserId: reviewerUserId,
      approvalOrder: 1,
      approvalRole: "REVIEWER",
      stepStatus: "WAITING",
      signatureRequired: true,
    });

    // 문서 상태 SUBMITTED로 변경
    const updatedFormData = {
      ...(doc.formDataJson as object),
      ...(formDataJson ?? {}),
      signatureData: signatureData ?? null,
    };

    await db
      .update(documents)
      .set({
        status: "SUBMITTED",
        formDataJson: updatedFormData,
        lastUpdatedBy: session.user.id,
        submittedAt: new Date(),
        currentApprovalOrder: 1,
        currentApproverUserId: reviewerUserId,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 검토자에게 알림
    await db.insert(notifications).values({
      userId: reviewerUserId,
      type: "MY_TURN",
      title: "결재 요청",
      body: `${session.user.name}님이 검토를 요청했습니다.`,
      targetDocumentId: documentId,
      isRead: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/approval-lines]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH /api/documents/[documentId]/approval-lines - 3단계 지정 (2단계 검토자가 호출)
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
    const { finalApproverUserId } = body;

    if (!finalApproverUserId) {
      return NextResponse.json({ error: "최종허가자를 지정해주세요." }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 3단계 결재선 추가
    await db.insert(documentApprovalLines).values({
      documentId,
      approverUserId: finalApproverUserId,
      approvalOrder: 2,
      approvalRole: "FINAL_APPROVER",
      stepStatus: "WAITING",
      signatureRequired: true,
    });

    // 문서 상태 업데이트
    await db
      .update(documents)
      .set({
        status: "IN_REVIEW",
        currentApprovalOrder: 2,
        currentApproverUserId: finalApproverUserId,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 최종허가자에게 알림
    await db.insert(notifications).values({
      userId: finalApproverUserId,
      type: "MY_TURN",
      title: "최종 결재 요청",
      body: `검토가 완료되어 최종 결재를 요청합니다.`,
      targetDocumentId: documentId,
      isRead: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/documents/[documentId]/approval-lines]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}