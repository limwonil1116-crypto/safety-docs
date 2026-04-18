// app/api/documents/[documentId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, documentSignatures, documentOutputs, documentAttachments, users, tasks } from "@/db/schema";
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

async function getApplicantSignature(
  doc: { formDataJson: unknown; createdBy: string; id: string }
): Promise<string | undefined> {
  const fd = doc.formDataJson as Record<string, unknown> | null;
  if (fd && typeof fd.signatureData === "string" && fd.signatureData) return fd.signatureData;
  try {
    const sigs = await db.select().from(documentSignatures).where(eq(documentSignatures.documentId, doc.id));
    const applicantSig = sigs.find(
      (s: { signerUserId: string; signatureData: string | null }) =>
        s.signerUserId === doc.createdBy && s.signatureData
    );
    if (applicantSig?.signatureData) return applicantSig.signatureData;
    if (sigs.length > 0 && sigs[0].signatureData) return sigs[0].signatureData;
  } catch (e) { console.error("서명 조회 오류:", e); }
  return undefined;
}

// ✅ 첨부파일 조회
async function getAttachments(documentId: string) {
  const all = await db
    .select()
    .from(documentAttachments)
    .where(eq(documentAttachments.documentId, documentId))
    .orderBy(documentAttachments.sortOrder);
  return all.filter((a: any) => !a.deletedAt).map((a: any) => ({
    id: a.id,
    fileName: a.fileName,
    fileUrl: a.fileUrl,
    mimeType: a.mimeType,
    attachmentType: a.attachmentType,
    description: a.description,
  }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { documentId } = await params;
    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "true";
    const forceNew = searchParams.get("force") === "true";

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    const [task] = doc.taskId
      ? await db.select({ name: tasks.name }).from(tasks).where(eq(tasks.id, doc.taskId)).limit(1)
      : [{ name: undefined }];
    const taskName = task?.name ?? undefined;
    const applicantSignature = await getApplicantSignature({ formDataJson: doc.formDataJson, createdBy: doc.createdBy, id: doc.id });
    const workAddress = (doc as any).workAddress ?? null;
    const attachments = await getAttachments(documentId);  // ✅

    if (download) {
      const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);
      const { buffer, filename } = await generatePDF({
        documentId, documentType: doc.documentType,
        formData: (doc.formDataJson as Record<string, unknown>) ?? {},
        approvalLines: approvalLinesWithSig,
        createdAt: doc.createdAt.toISOString(),
        taskName, applicantSignature, workAddress, attachments,
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    if (!forceNew) {
      try {
        const [existingOutput] = await db.select().from(documentOutputs)
          .where(sql`${documentOutputs.documentId} = ${documentId} AND ${documentOutputs.generationStatus} = 'COMPLETED'`)
          .orderBy(sql`${documentOutputs.generatedAt} DESC`).limit(1);
        if (existingOutput?.fileUrl) return NextResponse.json({ url: existingOutput.fileUrl, filename: existingOutput.fileName, size: existingOutput.fileSize, generatedAt: existingOutput.generatedAt });
      } catch (e) { console.error("기존 output 조회 오류:", e); }
    }

    const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);

    try {
      const { url, filename, size } = await generateAndUploadPDF({
        documentId, documentType: doc.documentType,
        formData: (doc.formDataJson as Record<string, unknown>) ?? {},
        approvalLines: approvalLinesWithSig,
        createdAt: doc.createdAt.toISOString(),
        taskName, applicantSignature, workAddress, attachments,
      });
      try {
        await db.insert(documentOutputs).values({
          documentId, outputType: "PDF", fileName: filename, fileUrl: url,
          fileSize: BigInt(size), mimeType: "application/pdf",
          generationStatus: "COMPLETED", isOfficial: doc.status === "APPROVED", generatedAt: new Date(),
        });
      } catch (e) { console.error("output 저장 오류:", e); }
      return NextResponse.json({ url, filename, size });
    } catch (uploadError) {
      console.error("Blob 업로드 실패, fallback:", uploadError);
      const { buffer, filename } = await generatePDF({
        documentId, documentType: doc.documentType,
        formData: (doc.formDataJson as Record<string, unknown>) ?? {},
        approvalLines: approvalLinesWithSig,
        createdAt: doc.createdAt.toISOString(),
        taskName, applicantSignature, workAddress, attachments,
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
    return NextResponse.json({ error: `PDF 생성 중 오류: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { documentId } = await params;
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    const [task] = doc.taskId
      ? await db.select({ name: tasks.name }).from(tasks).where(eq(tasks.id, doc.taskId)).limit(1)
      : [{ name: undefined }];

    const applicantSignature = await getApplicantSignature({ formDataJson: doc.formDataJson, createdBy: doc.createdBy, id: doc.id });
    const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);
    const workAddress = (doc as any).workAddress ?? null;
    const attachments = await getAttachments(documentId);

    const { url, filename, size } = await generateAndUploadPDF({
      documentId, documentType: doc.documentType,
      formData: (doc.formDataJson as Record<string, unknown>) ?? {},
      approvalLines: approvalLinesWithSig,
      createdAt: doc.createdAt.toISOString(),
      taskName: task?.name ?? undefined,
      applicantSignature, workAddress, attachments,
    });

    await db.insert(documentOutputs).values({
      documentId, outputType: "PDF", fileName: filename, fileUrl: url,
      fileSize: BigInt(size), mimeType: "application/pdf",
      generationStatus: "COMPLETED", isOfficial: doc.status === "APPROVED", generatedAt: new Date(),
    });

    return NextResponse.json({ url, filename, size, message: "PDF가 생성됐습니다." });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/pdf]", error);
    return NextResponse.json({ error: `PDF 생성 중 오류: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
