import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentApprovalLines, documentSignatures, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/documents/[documentId]/approval-lines - 寃곗옱??議고쉶 (?쒕챸 ?ы븿)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
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

    // ?쒕챸 ?곗씠??議고쉶
    const signatures = await db
      .select({
        id: documentSignatures.id,
        approvalLineId: documentSignatures.approvalLineId,
        signatureData: documentSignatures.signatureData,
      })
      .from(documentSignatures)
      .where(eq(documentSignatures.documentId, documentId));

    const sigMap: Record<string, string> = {};
    signatures.forEach((s: { approvalLineId: string; signatureData: string }) => {
      if (s.approvalLineId && s.signatureData) {
        sigMap[s.approvalLineId] = s.signatureData;
      }
    });

    const enrichedLines = lines.map((line) => ({
      ...line,
      signatureData: sigMap[line.id] ?? null,
    }));

    return NextResponse.json({ approvalLines: enrichedLines });
  } catch (error) {
    console.error("[GET /api/documents/[documentId]/approval-lines]", error);
    return NextResponse.json({ error: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}

// POST /api/documents/[documentId]/approval-lines - 寃곗옱??吏??+ ?쒖텧
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
    const { reviewerUserId, formDataJson, signatureData } = body;

    if (!reviewerUserId) {
      return NextResponse.json({ error: "寃?좎옄瑜?吏?뺥빐二쇱꽭??" }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "臾몄꽌瑜?李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    if (!["DRAFT", "REJECTED"].includes(doc.status)) {
      return NextResponse.json({ error: "?쒖텧?????녿뒗 ?곹깭?낅땲??" }, { status: 400 });
    }

    // 湲곗〈 寃곗옱????젣
    await db
      .delete(documentApprovalLines)
      .where(eq(documentApprovalLines.documentId, documentId));

    // 1?④퀎 寃곗옱???앹꽦
    const [newLine] = await db.insert(documentApprovalLines).values({
      documentId,
      approverUserId: reviewerUserId,
      approvalOrder: 1,
      approvalRole: "REVIEWER",
      stepStatus: "WAITING",
      signatureRequired: true,
    }).returning();

    // ?좎껌???쒕챸 ???    if (signatureData && newLine) {
      await db.insert(documentSignatures).values({
        documentId,
        approvalLineId: newLine.id,
        signerUserId: session.user.id,
        signatureData,
      }).catch(() => {}); // ?쒕챸 ????ㅽ뙣?대룄 ?쒖텧? 吏꾪뻾
    }

    // 臾몄꽌 ?곹깭 SUBMITTED濡??낅뜲?댄듃
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

    // 寃?좎옄?먭쾶 ?뚮┝
    await db.insert(notifications).values({
      userId: reviewerUserId,
      type: "MY_TURN",
      title: "寃???붿껌",
      body: `${session.user.name}?섏씠 ?쒕쪟瑜??쒖텧?덉뒿?덈떎.`,
      targetDocumentId: documentId,
      isRead: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]/approval-lines]", error);
    return NextResponse.json({ error: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}

// PATCH /api/documents/[documentId]/approval-lines - 理쒖쥌?덇???吏??(2?④퀎 寃?좎옄媛 ?꾨즺 ??
export async function PATCH(
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
    const { finalApproverUserId } = body;

    if (!finalApproverUserId) {
      return NextResponse.json({ error: "理쒖쥌?덇??먮? 吏?뺥빐二쇱꽭??" }, { status: 400 });
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "臾몄꽌瑜?李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    // 2?④퀎 寃곗옱???앹꽦
    await db.insert(documentApprovalLines).values({
      documentId,
      approverUserId: finalApproverUserId,
      approvalOrder: 2,
      approvalRole: "FINAL_APPROVER",
      stepStatus: "WAITING",
      signatureRequired: true,
    });

    // 臾몄꽌 ?곹깭 IN_REVIEW濡??낅뜲?댄듃
    await db
      .update(documents)
      .set({
        status: "IN_REVIEW",
        currentApprovalOrder: 2,
        currentApproverUserId: finalApproverUserId,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 理쒖쥌?덇??먯뿉寃??뚮┝
    await db.insert(notifications).values({
      userId: finalApproverUserId,
      type: "MY_TURN",
      title: "理쒖쥌 寃곗옱 ?붿껌",
      body: `寃?좉? ?꾨즺?섏뼱 理쒖쥌 寃곗옱瑜??붿껌?⑸땲??`,
      targetDocumentId: documentId,
      isRead: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/documents/[documentId]/approval-lines]", error);
    return NextResponse.json({ error: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}
