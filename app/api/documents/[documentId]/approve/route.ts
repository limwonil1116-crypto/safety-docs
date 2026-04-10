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

// POST /api/documents/[documentId]/approve - ?뱀씤 ?먮뒗 諛섎젮
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    const { documentId } = await params;
    const body = await req.json();
    const { action, comment, signatureData } = body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "?щ컮瑜댁? ?딆? ?≪뀡?낅땲??" }, { status: 400 });
    }

    if (action === "REJECT" && !comment?.trim()) {
      return NextResponse.json({ error: "諛섎젮 ?ъ쑀瑜??낅젰?댁＜?몄슂." }, { status: 400 });
    }

    // 臾몄꽌 議고쉶
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "臾몄꽌瑜?李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    // 寃곗옱 沅뚰븳 ?뺤씤
    if (doc.currentApproverUserId !== session.user.id) {
      return NextResponse.json({ error: "?꾩옱 寃곗옱 李⑤?媛 ?꾨떃?덈떎." }, { status: 403 });
    }

    // ?꾩옱 寃곗옱??議고쉶
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
      return NextResponse.json({ error: "寃곗옱?좎쓣 李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    if (action === "REJECT") {
      // 諛섎젮 泥섎━
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
        title: "?쒕쪟媛 諛섎젮?섏뿀?듬땲??,
        body: `諛섎젮 ?ъ쑀: ${comment}`,
        targetDocumentId: documentId,
        isRead: false,
      });

      return NextResponse.json({ success: true, action: "REJECTED" });

    } else {
      // ?뱀씤 泥섎━ - ?쒕챸 ???      await db
        .update(documentApprovalLines)
        .set({
          stepStatus: "APPROVED",
          actedAt: new Date(),
          comment: comment || null,
          updatedAt: new Date(),
        })
        .where(eq(documentApprovalLines.id, currentLine.id));

      // ?쒕챸 ?곗씠?????      if (signatureData) {
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
        // 1?④퀎 ?뱀씤 ??理쒖쥌?덇???吏???湲?        await db
          .update(documents)
          .set({
            status: "IN_REVIEW",
            currentApproverUserId: null,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));

        return NextResponse.json({ success: true, action: "NEED_FINAL_APPROVER" });

      } else {
        // 2?④퀎(理쒖쥌) ?뱀씤 ??APPROVED + PDF ?먮룞 ?앹꽦
        await db
          .update(documents)
          .set({
            status: "APPROVED",
            approvedAt: new Date(),
            currentApproverUserId: null,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, documentId));

        // ?묒꽦?먯뿉寃??뱀씤 ?꾨즺 ?뚮┝
        await db.insert(notifications).values({
          userId: doc.createdBy,
          type: "APPROVED",
          title: "?쒕쪟媛 理쒖쥌 ?뱀씤?섏뿀?듬땲??,
          body: "?쒕쪟媛 理쒖쥌 ?뱀씤?섏뿀?듬땲?? PDF瑜??ㅼ슫濡쒕뱶?????덉뒿?덈떎.",
          targetDocumentId: documentId,
          isRead: false,
        });

        // 鍮꾨룞湲곕줈 PDF ?먮룞 ?앹꽦 (?묐떟 吏???놁씠)
        generatePDFBackground(documentId, doc).catch((err) => {
          console.error("[PDF Auto-Generate Error]", err);
        });

        return NextResponse.json({ success: true, action: "APPROVED" });
      }
    }
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/approve]", error);
    return NextResponse.json({ error: "?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}

// 諛깃렇?쇱슫??PDF ?앹꽦 ?⑥닔
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
    const approvalLinesWithSig = lines.map((line: typeof lines[0]) => ({
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

    console.log(`[PDF Auto-Generated] ${documentId} ??${url}`);
  } catch (err) {
    console.error(`[PDF Auto-Generate Failed] ${documentId}`, err);
  }
}
