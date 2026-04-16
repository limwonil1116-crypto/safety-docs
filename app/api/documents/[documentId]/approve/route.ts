// app/api/documents/[documentId]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, documentSignatures, documentOutputs, notifications, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateAndUploadPDF } from "@/lib/pdf/generator";

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
    const { action, comment, reviewResult, signatureData } = body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "올바르지 않은 액션입니다." }, { status: 400 });
    }
    if (action === "REJECT" && !comment?.trim()) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }
    if (doc.currentApproverUserId !== session.user.id) {
      return NextResponse.json({ error: "현재 결재 차례가 아닙니다." }, { status: 403 });
    }

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
      await db.update(documentApprovalLines).set({
        stepStatus: "REJECTED", actedAt: new Date(), comment, updatedAt: new Date(),
      }).where(eq(documentApprovalLines.id, currentLine.id));

      await db.update(documents).set({
        status: "REJECTED", rejectedAt: new Date(), rejectionReason: comment,
        currentApproverUserId: null, updatedAt: new Date(),
      }).where(eq(documents.id, documentId));

      await db.insert(notifications).values({
        userId: doc.createdBy, type: "REJECTED",
        title: "결재가 반려됐습니다.",
        body: `반려 사유: ${comment}`,
        targetDocumentId: documentId, isRead: false,
      });

      return NextResponse.json({ success: true, action: "REJECTED" });

    } else {
      await db.update(documentApprovalLines).set({
        stepStatus: "APPROVED", actedAt: new Date(), comment: comment || null, updatedAt: new Date(),
      }).where(eq(documentApprovalLines.id, currentLine.id));

      if (signatureData) {
        await db.delete(documentSignatures).where(
          sql`${documentSignatures.documentId} = ${documentId} AND ${documentSignatures.approvalLineId} = ${currentLine.id}`
        );
        await db.insert(documentSignatures).values({
          documentId, approvalLineId: currentLine.id, signerUserId: session.user.id, signatureData,
        });
      }

      if (currentLine.approvalOrder === 1) {
        const currentFd = (doc.formDataJson as Record<string, unknown>) ?? {};
        const updatedFd: Record<string, unknown> = { ...currentFd };
        if (comment?.trim()) updatedFd.reviewOpinion = comment.trim();
        if (reviewResult?.trim()) updatedFd.reviewResult = reviewResult.trim();

        await db.update(documents).set({
          status: "IN_REVIEW",
          currentApproverUserId: null,
          formDataJson: updatedFd,
          updatedAt: new Date(),
        }).where(eq(documents.id, documentId));

        return NextResponse.json({ success: true, action: "NEED_FINAL_APPROVER" });

      } else {
        const currentFd = (doc.formDataJson as Record<string, unknown>) ?? {};
        const updatedFd: Record<string, unknown> = { ...currentFd };
        if (comment?.trim()) updatedFd.reviewOpinion = comment.trim();
        if (reviewResult?.trim()) updatedFd.reviewResult = reviewResult.trim();

        await db.update(documents).set({
          status: "APPROVED", approvedAt: new Date(),
          currentApproverUserId: null,
          formDataJson: updatedFd,
          updatedAt: new Date(),
        }).where(eq(documents.id, documentId));

        await db.insert(notifications).values({
          userId: doc.createdBy, type: "APPROVED",
          title: "결재가 최종 승인됐습니다.",
          body: "결재가 최종 승인됐습니다. PDF를 다운로드할 수 있습니다.",
          targetDocumentId: documentId, isRead: false,
        });

        generatePDFBackground(documentId, doc).catch((err) => {
          console.error("[PDF Auto-Generate Error]", err);
        });

        return NextResponse.json({ success: true, action: "APPROVED" });
      }
    }
  } catch (error) {
    console.error("[POST approve]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

async function generatePDFBackground(
  documentId: string,
  doc: { documentType: string; formDataJson: unknown; createdAt: Date }
) {
  try {
    const [latestDoc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    const fd = (latestDoc?.formDataJson as Record<string, unknown>) ?? {};

    // ★ workAddress(별도 컬럼)를 formData에 병합 → PDF workLocation 정상 출력
    const mergedFd: Record<string, unknown> = { ...fd };
    if (latestDoc?.workAddress && !mergedFd.workLocation) {
      mergedFd.workLocation = latestDoc.workAddress;
    }
    if (latestDoc?.workAddress && !mergedFd.facilityLocation) {
      mergedFd.facilityLocation = latestDoc.workAddress;
    }

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

    const approvalLinesWithSig = lines.map((line: typeof lines[0]) => ({
      approvalOrder: line.approvalOrder,
      approverName: line.approverName ?? undefined,
      approverOrg: line.approverOrg ?? undefined,
      actedAt: line.actedAt?.toISOString(),
      signatureData: signatures.find((s: { approvalLineId: string; signatureData: string }) => s.approvalLineId === line.id)?.signatureData ?? undefined,
    }));

    let applicantSignature = typeof fd.signatureData === "string" ? fd.signatureData : undefined;
    if (!applicantSignature) {
      const applicantSig = signatures.find((s: any) => s.signerUserId === latestDoc?.createdBy && s.signatureData);
      if (applicantSig?.signatureData) applicantSignature = applicantSig.signatureData;
    }

    const { url, filename, size } = await generateAndUploadPDF({
      documentId, documentType: doc.documentType,
      formData: mergedFd,  // ★ workAddress 병합된 데이터 사용
      approvalLines: approvalLinesWithSig,
      createdAt: doc.createdAt.toISOString(), applicantSignature,
    });

    await db.insert(documentOutputs).values({
      documentId, outputType: "PDF", fileName: filename, fileUrl: url,
      fileSize: BigInt(size), mimeType: "application/pdf",
      generationStatus: "COMPLETED", isOfficial: true, generatedAt: new Date(),
    });

    console.log(`[PDF Auto-Generated] ${documentId} -> ${url}`);
  } catch (err) {
    console.error(`[PDF Auto-Generate Failed] ${documentId}`, err);
  }
}
