import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, notifications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// POST /api/documents/[documentId]/approve - 승인 또는 반려
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
    const { action, comment } = body;
    // action: "APPROVE" | "REJECT"

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "올바른 액션이 아닙니다." }, { status: 400 });
    }

    if (action === "REJECT" && !comment?.trim()) {
      return NextResponse.json({ error: "반려 시 사유를 입력해주세요." }, { status: 400 });
    }

    // 문서 조회
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 현재 결재자 확인
    if (doc.currentApproverUserId !== session.user.id) {
      return NextResponse.json({ error: "현재 결재 차례가 아닙니다." }, { status: 403 });
    }

    // 현재 결재선 조회
    const [currentLine] = await db
      .select()
      .from(documentApprovalLines)
      .where(
        sql`${documentApprovalLines.documentId} = ${documentId}
          AND ${documentApprovalLines.approverUserId} = ${session.user.id}
          AND ${documentApprovalLines.stepStatus} = 'WAITING'`
      )
      .limit(1);

    if (!currentLine) {
      return NextResponse.json({ error: "결재선을 찾을 수 없습니다." }, { status: 404 });
    }

    if (action === "REJECT") {
      // 반려 처리
      await db
        .update(documentApprovalLines)
        .set({
          stepStatus: "REJECTED",
          actedAt: new Date(),
          comment: comment,
          updatedAt: new Date(),
        })
        .where(eq(documentApprovalLines.id, currentLine.id));

      await db
        .update(documents)
        .set({
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: comment,
          currentApproverUserId: null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      // 작성자에게 반려 알림
      await db.insert(notifications).values({
        userId: doc.createdBy,
        type: "REJECTED",
        title: "문서가 반려되었습니다",
        body: `반려 사유: ${comment}`,
        targetDocumentId: documentId,
        isRead: false,
      });

      return NextResponse.json({ success: true, action: "REJECTED" });

    } else {
      // 승인 처리
      await db
        .update(documentApprovalLines)
        .set({
          stepStatus: "APPROVED",
          actedAt: new Date(),
          comment: comment || null,
          updatedAt: new Date(),
        })
        .where(eq(documentApprovalLines.id, currentLine.id));

      // 현재 단계가 1단계(검토자)인 경우 → 3단계 지정 필요
      if (currentLine.approvalOrder === 1) {
        // 문서를 "검토완료 대기" 상태로 변경 (3단계 지정 대기)
        await db
          .update(documents)
          .set({
            status: "IN_REVIEW",
            currentApproverUserId: null,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));

        return NextResponse.json({ success: true, action: "NEED_FINAL_APPROVER" });

      } else {
        // 2단계(최종허가자) 승인 → 최종 완료
        await db
          .update(documents)
          .set({
            status: "APPROVED",
            approvedAt: new Date(),
            currentApproverUserId: null,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));

        // 작성자에게 최종 승인 알림
        await db.insert(notifications).values({
          userId: doc.createdBy,
          type: "APPROVED",
          title: "문서가 최종 승인되었습니다",
          body: "모든 결재가 완료되었습니다.",
          targetDocumentId: documentId,
          isRead: false,
        });

        return NextResponse.json({ success: true, action: "APPROVED" });
      }
    }
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/approve]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}