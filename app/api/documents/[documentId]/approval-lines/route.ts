import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, documentSignatures, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - 결재선 조회 (서명 포함)
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
        signatureId: documentApprovalLines.signatureId,
        approverName: users.name,
        approverOrg: users.organization,
      })
      .from(documentApprovalLines)
      .leftJoin(users, eq(documentApprovalLines.approverUserId, users.id))
      .where(eq(documentApprovalLines.documentId, documentId))
      .orderBy(documentApprovalLines.approvalOrder);
    const signatures = await db
      .select({ id: documentSignatures.id, approvalLineId: documentSignatures.approvalLineId, signatureData: documentSignatures.signatureData })
      .from(documentSignatures)
      .where(eq(documentSignatures.documentId, documentId));
    const sigMap: Record<string, string> = {};
    signatures.forEach((s: { approvalLineId: string; signatureData: string }) => {
      if (s.approvalLineId && s.signatureData) sigMap[s.approvalLineId] = s.signatureData;
    });
    const enrichedLines = lines.map((line: typeof lines[0]) => ({ ...line, signatureData: sigMap[line.id] ?? null }));
    return NextResponse.json({ approvalLines: enrichedLines });
  } catch (error) {
    console.error("[GET approval-lines]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

// POST - 결재선 지정 + 제출
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
    const { reviewerUserId, monitorUserId, measurerUserId, formDataJson, signatureData } = body;
    // 밀폐공간: monitorUserId(감시인) 필수, 일반: reviewerUserId 필수
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }
    if (!["DRAFT", "REJECTED"].includes(doc.status)) {
      return NextResponse.json({ error: "제출할 수 없는 상태입니다." }, { status: 400 });
    }
    const isConfinedSpace = doc.documentType === "CONFINED_SPACE";
    const step1UserId = isConfinedSpace ? monitorUserId : reviewerUserId;
    if (!step1UserId) {
      return NextResponse.json({ error: isConfinedSpace ? "감시인을 지정해주세요." : "결재자를 지정해주세요." }, { status: 400 });
    }
    // 기존 결재선 삭제
    await db.delete(documentApprovalLines).where(eq(documentApprovalLines.documentId, documentId));
    // 1단계 결재선 생성
    const [newLine] = await db.insert(documentApprovalLines).values({
      documentId,
      approverUserId: step1UserId,
      approvalOrder: 1,
      approvalRole: "REVIEWER",
      stepStatus: "WAITING",
      signatureRequired: true,
    }).returning();
    // 신청인 서명 저장
    if (signatureData && newLine) {
      await db.insert(documentSignatures).values({
        documentId,
        approvalLineId: newLine.id,
        signerUserId: session.user.id,
        signatureData,
      }).catch(() => {});
    }
    // 밀폐공간: 측정담당자도 formData에 저장
    const updatedFormData: Record<string, unknown> = {
      ...(doc.formDataJson as object),
      ...(formDataJson ?? {}),
      signatureData: signatureData ?? null,
    };
    if (isConfinedSpace && measurerUserId) {
      updatedFormData.measurerUserId = measurerUserId;
    }
    await db.update(documents).set({
      status: "SUBMITTED",
      formDataJson: updatedFormData,
      lastUpdatedBy: session.user.id,
      submittedAt: new Date(),
      currentApprovalOrder: 1,
      currentApproverUserId: step1UserId,
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));
    // 결재자에게 알림
    await db.insert(notifications).values({
      userId: step1UserId,
      type: "MY_TURN",
      title: isConfinedSpace ? "밀폐공간 작업허가 - 감시인 서명 요청" : "결재 요청",
      body: `${session.user.name}이 결재를 요청했습니다.`,
      targetDocumentId: documentId,
      isRead: false,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST approval-lines]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH - 최종허가자 지정
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
    const { finalApproverUserId, nextApproverUserId, nextOrder, nextRole, nextTitle } = body;
    const targetUserId = finalApproverUserId ?? nextApproverUserId;
    if (!targetUserId) {
      return NextResponse.json({ error: "다음 결재자를 지정해주세요." }, { status: 400 });
    }
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }
    const order = nextOrder ?? 2;
    const role = nextRole ?? "FINAL_APPROVER";
    // 다음 단계 결재선 생성
    await db.insert(documentApprovalLines).values({
      documentId,
      approverUserId: targetUserId,
      approvalOrder: order,
      approvalRole: role as "REVIEWER" | "FINAL_APPROVER",
      stepStatus: "WAITING",
      signatureRequired: true,
    });
    // 문서 상태 업데이트
    await db.update(documents).set({
      status: "IN_REVIEW",
      currentApprovalOrder: order,
      currentApproverUserId: targetUserId,
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));
    // 다음 결재자에게 알림
    await db.insert(notifications).values({
      userId: targetUserId,
      type: "MY_TURN",
      title: nextTitle ?? "결재 요청",
      body: "결재를 요청합니다.",
      targetDocumentId: documentId,
      isRead: false,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH approval-lines]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
