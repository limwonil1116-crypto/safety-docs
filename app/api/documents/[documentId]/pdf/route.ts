// app/api/documents/[documentId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, documentSignatures, documentOutputs, users, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateAndUploadPDF, generatePDF } from "@/lib/pdf/generator";

async function getApprovalLinesWithSig(documentId: string) {
  const lines = await db
    .select({ id: documentApprovalLines.id, approvalOrder: documentApprovalLines.approvalOrder, actedAt: documentApprovalLines.actedAt, approverName: users.name, approverOrg: users.organization })
    .from(documentApprovalLines)
    .leftJoin(users, eq(documentApprovalLines.approverUserId, users.id))
    .where(eq(documentApprovalLines.documentId, documentId))
    .orderBy(documentApprovalLines.approvalOrder);
  const signatures = await db.select().from(documentSignatures).where(eq(documentSignatures.documentId, documentId));
  return lines.map((line: typeof lines[0]) => ({
    approvalOrder: line.approvalOrder,
    approverName: line.approverName ?? undefined,
    approverOrg: line.approverOrg ?? undefined,
    actedAt: line.actedAt?.toISOString(),
    signatureData: signatures.find((s: { approvalLineId: string; signatureData: string }) => s.approvalLineId === line.id)?.signatureData ?? undefined,
  }));
}

// 신청인 서명 추출 (formDataJson.signatureData)
function getApplicantSignature(doc: { formDataJson: unknown }): string | undefined {
  const fd = doc.formDataJson as Record<string, unknown> | null;
  if (!fd) return undefined;
  return typeof fd.signatureData === "string" ? fd.signatureData : undefined;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { documentId } = await params;
    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "true";
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    const [task] = doc.taskId ? await db.select({ name: tasks.name }).from(tasks).where(eq(tasks.id, doc.taskId)).limit(1) : [{ name: undefined }];
    const taskName = task?.name ?? undefined;
    const applicantSignature = getApplicantSignature(doc);

    if (!download) {
      const [existingOutput] = await db.select().from(documentOutputs)
        .where(sql`${documentOutputs.documentId} = ${documentId} AND ${documentOutputs.generationStatus} = 'COMPLETED' AND ${documentOutputs.isOfficial} = true`)
        .orderBy(sql`${documentOutputs.generatedAt} DESC`).limit(1);
      if (existingOutput?.fileUrl) return NextResponse.json({ url: existingOutput.fileUrl, filename: existingOutput.fileName, size: existingOutput.fileSize, generatedAt: existingOutput.generatedAt });
    }

    const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);

    if (download) {
      const { buffer, filename } = await generatePDF({ documentId, documentType: doc.documentType, formData: (doc.formDataJson as Record<string, unknown>) ?? {}, approvalLines: approvalLinesWithSig, createdAt: doc.createdAt.toISOString(), taskName, applicantSignature });
      return new NextResponse(new Uint8Array(buffer), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, "Content-Length": String(buffer.length) },
      });
    }

    const { url, filename, size } = await generateAndUploadPDF({ documentId, documentType: doc.documentType, formData: (doc.formDataJson as Record<string, unknown>) ?? {}, approvalLines: approvalLinesWithSig, createdAt: doc.createdAt.toISOString(), taskName, applicantSignature });
    await db.insert(documentOutputs).values({ documentId, outputType: "PDF", fileName: filename, fileUrl: url, fileSize: BigInt(size), mimeType: "application/pdf", generationStatus: "COMPLETED", isOfficial: doc.status === "APPROVED", generatedAt: new Date() });
    return NextResponse.json({ url, filename, size });
  } catch (error) {
    console.error("[GET /api/documents/[documentId]/pdf]", error);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { documentId } = await params;
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.deletedAt) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    const [task] = doc.taskId ? await db.select({ name: tasks.name }).from(tasks).where(eq(tasks.id, doc.taskId)).limit(1) : [{ name: undefined }];
    const applicantSignature = getApplicantSignature(doc);
    const approvalLinesWithSig = await getApprovalLinesWithSig(documentId);
    const { url, filename, size } = await generateAndUploadPDF({ documentId, documentType: doc.documentType, formData: (doc.formDataJson as Record<string, unknown>) ?? {}, approvalLines: approvalLinesWithSig, createdAt: doc.createdAt.toISOString(), taskName: task?.name ?? undefined, applicantSignature });
    await db.insert(documentOutputs).values({ documentId, outputType: "PDF", fileName: filename, fileUrl: url, fileSize: BigInt(size), mimeType: "application/pdf", generationStatus: "COMPLETED", isOfficial: doc.status === "APPROVED", generatedAt: new Date() });
    return NextResponse.json({ url, filename, size, message: "PDF가 생성되었습니다." });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/pdf]", error);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
