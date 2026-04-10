// app/api/documents/[documentId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, documentSignatures, documentOutputs, users, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateAndUploadPDF, generatePDF } from "@/lib/pdf/generator";

async function getApprovalLinesWithSig(documentId: string) {
  const lines = await db
    .select({
      id: documentApprovalLines.id,
      approvalOrder: documentApprovalLines.approvalOrder,
      actedAt: documentApprovalLines.actedAt,
      approverName: users.name,
      approverOrg: users.organization,
      approverUserId: documentApprovalLines.approverUserId,
    })
    .from(documentApprovalLines)
    .leftJoin(users, eq(documentApprovalLines.approverUserId, users.id))
    .where(eq(documentApprovalLines.documentId, documentId))
    .orderBy(documentApprovalLines.approvalOrder);

  const signatures = await db
    .select()
    .from(documentSignatures)
    .where(eq(documentSignatures.documentId, documentId));

  return lines.map((line: typeof lines[0]) => ({
    approvalOrder: line.approvalOrder,
    approverName: line.approverName ?? undefined,
    approverOrg: line.approverOrg ?? undefined,
    actedAt: line.actedAt?.toISOString(),
    approverUserId: line.approverUserId,
    signatureData: signatures.find(
      (s: { approvalLineId: string; signatureData: string | null }) =>
        s.approvalLineId === line.id
    )?.signatureData ?? undefined,
  }));
}

// ===== 신청인 서명 추출 =====
// 저장 위치 우선순위:
// 1. formDataJson.signatureData (제출 시 저장)
// 2. documentSignatures 테이블에서 signerUserId === createdBy인 것 (approval-lines POST에서 저장)
async function getApplicantSignature(
  doc: { formDataJson: unknown; createdBy: string; id: string }
): Promise<string | undefined> {
  // 1순위: formDataJson.signatureData
  const fd = doc.formDataJson as Record<string, unknown> | null;
  if (fd && typeof fd.signatureData === "string" && fd.signatureData) {
    return fd.signatureData;
  }

  // 2순위: documentSignatures에서 신청인(createdBy) 서명 찾기
  try {
    const sigs = await db
      .select()
      .from(documentSignatures)
      .where(eq(documentSignatures.documentId, doc.id));

    // signerUserId가 문서 작성자인 서명
    const applicantSig = sigs.find(
      (s: { signerUserId: string; signatureData: string | null }) =>
        s.signerUserId === doc.createdBy && s.signatureData
    );
    if (applicantSig?.signatureData) return applicantSig.signatureData;

    // 없으면 가장 먼저 저장된 서명 (신청 시 저장되는 서명)
    if (sigs.length > 0 && sigs[0].signatureData) {
      return sigs[0].signatureData;
    }
  } catch (e) {
    console.error("신청인 서명 조회 오류:", e);
  }

  return undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { documentId } = await params;
    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "true";
    const forceNew = searchParams.get("force") === "true";

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!doc || doc.deletedAt)
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    const [task] = doc.taskId
      ? await db.select({ name: tasks.name }).from(tasks).where(eq(tasks.id, doc.taskId)).limit(1)
      : [{ name: undefined }];
    const taskName = task?.name ?? undefined;

    // 신청인 서명 (두 경로 모두 확인)
    const applicantSignature = await getApplicantSignature({
      formDataJson: doc.formDataJson,
      createdBy: doc.createdBy,
      id: doc.id,
    });

    // 다운로드 요청
    if (download) {
      const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);
      const { buffer, filename } = await generatePDF({
        documentId,
        documentType: doc.documentType,
        formData: (doc.formDataJson as Record<string, unknown>) ?? {},
        approvalLines: approvalLinesWithSig,
        createdAt: doc.createdAt.toISOString(),
        taskName,
        applicantSignature,
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    // 미리보기: 기존 완료된 output 확인 (force=true면 재생성)
    if (!forceNew) {
      try {
        const [existingOutput] = await db
          .select()
          .from(documentOutputs)
          .where(
            sql`${documentOutputs.documentId} = ${documentId}
            AND ${documentOutputs.generationStatus} = 'COMPLETED'`
          )
          .orderBy(sql`${documentOutputs.generatedAt} DESC`)
          .limit(1);
        if (existingOutput?.fileUrl) {
          return NextResponse.json({
            url: existingOutput.fileUrl,
            filename: existingOutput.fileName,
            size: existingOutput.fileSize,
            generatedAt: existingOutput.generatedAt,
          });
        }
      } catch (e) {
        console.error("기존 output 조회 오류 (무시):", e);
      }
    }

    // 새로 생성
    const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);

    try {
      const { url, filename, size } = await generateAndUploadPDF({
        documentId,
        documentType: doc.documentType,
        formData: (doc.formDataJson as Record<string, unknown>) ?? {},
        approvalLines: approvalLinesWithSig,
        createdAt: doc.createdAt.toISOString(),
        taskName,
        applicantSignature,
      });

      // output 저장 (실패해도 URL은 반환)
      try {
        await db.insert(documentOutputs).values({
          documentId,
          outputType: "PDF",
          fileName: filename,
          fileUrl: url,
          fileSize: BigInt(size),
          mimeType: "application/pdf",
          generationStatus: "COMPLETED",
          isOfficial: doc.status === "APPROVED",
          generatedAt: new Date(),
        });
      } catch (e) {
        console.error("output 저장 오류 (무시):", e);
      }

      return NextResponse.json({ url, filename, size });
    } catch (uploadError) {
      // Blob 업로드 실패 시 → 직접 다운로드로 fallback
      console.error("Blob 업로드 실패, 직접 다운로드로 전환:", uploadError);
      const { buffer, filename } = await generatePDF({
        documentId,
        documentType: doc.documentType,
        formData: (doc.formDataJson as Record<string, unknown>) ?? {},
        approvalLines: approvalLinesWithSig,
        createdAt: doc.createdAt.toISOString(),
        taskName,
        applicantSignature,
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Content-Length": String(buffer.length),
        },
      });
    }
  } catch (error) {
    console.error("[GET /api/documents/[documentId]/pdf]", error);
    return NextResponse.json(
      { error: `PDF 생성 중 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { documentId } = await params;
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!doc || doc.deletedAt)
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    const [task] = doc.taskId
      ? await db.select({ name: tasks.name }).from(tasks).where(eq(tasks.id, doc.taskId)).limit(1)
      : [{ name: undefined }];

    const applicantSignature = await getApplicantSignature({
      formDataJson: doc.formDataJson,
      createdBy: doc.createdBy,
      id: doc.id,
    });
    const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);

    const { url, filename, size } = await generateAndUploadPDF({
      documentId,
      documentType: doc.documentType,
      formData: (doc.formDataJson as Record<string, unknown>) ?? {},
      approvalLines: approvalLinesWithSig,
      createdAt: doc.createdAt.toISOString(),
      taskName: task?.name ?? undefined,
      applicantSignature,
    });

    await db.insert(documentOutputs).values({
      documentId,
      outputType: "PDF",
      fileName: filename,
      fileUrl: url,
      fileSize: BigInt(size),
      mimeType: "application/pdf",
      generationStatus: "COMPLETED",
      isOfficial: doc.status === "APPROVED",
      generatedAt: new Date(),
    });

    return NextResponse.json({ url, filename, size, message: "PDF가 생성되었습니다." });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/pdf]", error);
    return NextResponse.json(
      { error: `PDF 생성 중 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
