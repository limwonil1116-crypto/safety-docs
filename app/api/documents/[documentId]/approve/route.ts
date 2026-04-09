// app/api/documents/[documentId]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  documents,
  documentApprovalLines,
  documentSignatures,
  documentOutputs,
  notifications,
  users,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateAndUploadPDF } from "@/lib/pdf/generator";

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
    const { action, comment, signatureData } = body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "올바르지 않은 액션입니다." }, { status: 400 });
    }

    if (action === "REJECT" && !comment?.trim()) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
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

    // 결재 권한 확인
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

      await db.insert(notifications).values({
        userId: doc.createdBy,
        type: "REJECTED",
        title: "서류가 반려되었습니다",
        body: `반려 사유: ${comment}`,
        targetDocumentId: documentId,
        isRead: false,
      });

      return NextResponse.json({ success: true, action: "REJECTED" });

    } else {
      // 승인 처리 - 서명 저장
      await db
        .update(documentApprovalLines)
        .set({
          stepStatus: "APPROVED",
          actedAt: new Date(),
          comment: comment || null,
          updatedAt: new Date(),
        })
        .where(eq(documentApprovalLines.id, currentLine.id));

      // 서명 데이터 저장
      if (signatureData) {
        await db
          .delete(documentSignatures)
          .where(
            sql`${documentSignatures.documentId} = ${documentId}
              AND ${documentSignatures.approvalLineId} = ${currentLine.id}`
          );

        await db.insert(documentSignatures).values({
          documentId,
          approvalLineId: currentLine.id,
          signerUserId: session.user.id,
          signatureData,
        });
      }

      if (currentLine.approvalOrder === 1) {
        // 1단계 승인 → 최종허가자 지정 대기
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
        // 2단계(최종) 승인 → APPROVED + PDF 자동 생성
        await db
          .update(documents)
          .set({
            status: "APPROVED",
            approvedAt: new Date(),
            currentApproverUserId: null,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));

        // 작성자에게 승인 완료 알림
        await db.insert(notifications).values({
          userId: doc.createdBy,
          type: "APPROVED",
          title: "서류가 최종 승인되었습니다",
          body: "서류가 최종 승인되었습니다. PDF를 다운로드할 수 있습니다.",
          targetDocumentId: documentId,
          isRead: false,
        });

        // 비동기로 PDF 자동 생성 (응답 지연 없이)
        generatePDFBackground(documentId, doc).catch((err) => {
          console.error("[PDF Auto-Generate Error]", err);
        });

        return NextResponse.json({ success: true, action: "APPROVED" });
      }
    }
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/approve]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

// 백그라운드 PDF 생성 함수
async function generatePDFBackground(
  documentId: string,
  doc: { documentType: string; formDataJson: unknown; createdAt: Date }
) {
  try {
    const lines = await db
      .select({
        id: documentApprovalLines.id,
        approvalOrder: documentApprovalLines.approvalOrder,
        actedAt: documentApprovalLines.actedAt,
        approverName: users.name,
        approverOrg: users.organization,
      })
      .from(documentApprovalLines)
      .leftJoin(users, eq(documentApprovalLines.approverUserId, users.id))
      .where(eq(documentApprovalLines.documentId, documentId))
      .orderBy(documentApprovalLines.approvalOrder);

    const signatures = await db
      .select()
      .from(documentSignatures)
      .where(eq(documentSignatures.documentId, documentId));

    const approvalLinesWithSig = lines.map((line) => ({
      approvalOrder: line.approvalOrder,
      approverName: line.approverName ?? undefined,
      approverOrg: line.approverOrg ?? undefined,
      actedAt: line.actedAt?.toISOString(),
      signatureData: signatures.find((s) => s.approvalLineId === line.id)?.signatureData ?? undefined,
    }));

    const { url, filename, size } = await generateAndUploadPDF({
      documentId,
      documentType: doc.documentType,
      formData: (doc.formDataJson as Record<string, unknown>) ?? {},
      approvalLines: approvalLinesWithSig,
      createdAt: doc.createdAt.toISOString(),
    });

    await db.insert(documentOutputs).values({
      documentId,
      outputType: "PDF",
      fileName: filename,
      fileUrl: url,
      fileSize: BigInt(size),
      mimeType: "application/pdf",
      generationStatus: "COMPLETED",
      isOfficial: true,
      generatedAt: new Date(),
    });

    console.log(`[PDF Auto-Generated] ${documentId} → ${url}`);
  } catch (err) {
    console.error(`[PDF Auto-Generate Failed] ${documentId}`, err);
  }
}
