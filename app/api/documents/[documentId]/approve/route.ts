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
    const { action, comment, reviewResult, signatureData, specialMeasures, gasMeasureRows } = body;

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

    const isConfinedSpace = doc.documentType === "CONFINED_SPACE";
    const order = currentLine.approvalOrder;

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
      // 서명 저장
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

      const currentFd = (doc.formDataJson as Record<string, unknown>) ?? {};
      const updatedFd: Record<string, unknown> = { ...currentFd };

      // =============================================
      // 밀폐공간 5단계 분기
      // =============================================
      if (isConfinedSpace) {
        if (order === 1) {
          // 2단계: 감시인 서명 완료 → (계획확인)허가자 지정 필요
          await db.update(documents).set({
            status: "IN_REVIEW", currentApproverUserId: null,
            formDataJson: updatedFd, updatedAt: new Date(),
          }).where(eq(documents.id, documentId));
          return NextResponse.json({ success: true, action: "NEED_PLAN_APPROVER" });

        } else if (order === 2) {
          // 3단계: (계획확인)허가자 - 특별조치 입력 + 서명 완료 → 측정담당자 차례
          if (body.specialMeasures !== undefined) updatedFd.specialMeasures = body.specialMeasures;
          // 측정담당자 userId는 formData에서 가져옴
          const measurerUserId = updatedFd.measurerUserId as string | undefined;
          if (!measurerUserId) {
            await db.update(documents).set({
              status: "IN_REVIEW", currentApproverUserId: null,
              formDataJson: updatedFd, updatedAt: new Date(),
            }).where(eq(documents.id, documentId));
            return NextResponse.json({ success: true, action: "NEED_MEASURER" });
          }
          // 측정담당자 3단계 결재선 생성
          await db.insert(documentApprovalLines).values({
            documentId, approverUserId: measurerUserId,
            approvalOrder: 3, approvalRole: "REVIEWER",
            stepStatus: "WAITING", signatureRequired: false,
          });
          await db.update(documents).set({
            status: "IN_REVIEW", currentApprovalOrder: 3,
            currentApproverUserId: measurerUserId,
            formDataJson: updatedFd, updatedAt: new Date(),
          }).where(eq(documents.id, documentId));
          await db.insert(notifications).values({
            userId: measurerUserId, type: "MY_TURN",
            title: "밀폐공간 측정결과 입력 요청",
            body: "산소 및 유해가스 농도 측정결과를 입력해주세요.",
            targetDocumentId: documentId, isRead: false,
          });
          return NextResponse.json({ success: true, action: "NEED_MEASUREMENT" });

        } else if (order === 3) {
          // 4단계: 측정담당자 - 측정결과 입력 완료 → (이행확인)확인자 지정 필요
          if (body.gasMeasureRows) updatedFd.gasMeasureRows = body.gasMeasureRows;
          await db.update(documents).set({
            status: "IN_REVIEW", currentApproverUserId: null,
            formDataJson: updatedFd, updatedAt: new Date(),
          }).where(eq(documents.id, documentId));
          return NextResponse.json({ success: true, action: "NEED_FINAL_CONFIRMER" });

        } else if (order === 4) {
          // 5단계: (이행확인)확인자 최종 서명 → 승인완료
          await db.update(documents).set({
            status: "APPROVED", approvedAt: new Date(),
            currentApproverUserId: null,
            formDataJson: updatedFd, updatedAt: new Date(),
          }).where(eq(documents.id, documentId));
          await db.insert(notifications).values({
            userId: doc.createdBy, type: "APPROVED",
            title: "밀폐공간 작업허가서 최종 승인됐습니다.",
            body: "최종 승인됐습니다. PDF를 다운로드할 수 있습니다.",
            targetDocumentId: documentId, isRead: false,
          });
          generatePDFBackground(documentId, doc).catch(console.error);
          return NextResponse.json({ success: true, action: "APPROVED" });
        }
      }

      // =============================================
      // 일반 문서 2단계 분기 (기존 로직)
      // =============================================
      if (comment?.trim()) updatedFd.reviewOpinion = comment.trim();
      if (reviewResult?.trim()) updatedFd.reviewResult = reviewResult.trim();

      if (order === 1) {
        await db.update(documents).set({
          status: "IN_REVIEW", currentApproverUserId: null,
          formDataJson: updatedFd, updatedAt: new Date(),
        }).where(eq(documents.id, documentId));
        return NextResponse.json({ success: true, action: "NEED_FINAL_APPROVER" });
      } else {
        await db.update(documents).set({
          status: "APPROVED", approvedAt: new Date(),
          currentApproverUserId: null,
          formDataJson: updatedFd, updatedAt: new Date(),
        }).where(eq(documents.id, documentId));
        await db.insert(notifications).values({
          userId: doc.createdBy, type: "APPROVED",
          title: "결재가 최종 승인됐습니다.",
          body: "결재가 최종 승인됐습니다. PDF를 다운로드할 수 있습니다.",
          targetDocumentId: documentId, isRead: false,
        });
        generatePDFBackground(documentId, doc).catch(console.error);
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
