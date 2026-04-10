import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, documents, users, documentApprovalLines } from "@/db/schema";
import { eq, sql, inArray, isNull, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    const { taskId } = await params;

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task || task.deletedAt) {
      return NextResponse.json({ error: "怨쇱뾽??李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    const docList = await db
      .select({
        id: documents.id,
        taskId: documents.taskId,
        documentType: documents.documentType,
        status: documents.status,
        createdBy: documents.createdBy,
        currentApprovalOrder: documents.currentApprovalOrder,
        currentApproverUserId: documents.currentApproverUserId,
        submittedAt: documents.submittedAt,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        writerName: users.name,
        writerOrg: users.organization,
      })
      .from(documents)
      .leftJoin(users, eq(documents.createdBy, users.id))
      .where(and(eq(documents.taskId, taskId), isNull(documents.deletedAt)))
      .orderBy(sql`${documents.updatedAt} desc`);

    // ?꾩옱 寃곗옱???대쫫 議고쉶
    const approverIds = docList
      .filter((d: typeof docList[0]) => d.currentApproverUserId)
      .map((d: typeof docList[0]) => d.currentApproverUserId as string);

    const approverMap: Record<string, string> = {};
    if (approverIds.length > 0) {
      const approvers = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, approverIds));
      approvers.forEach((a) => { approverMap[a.id] = a.name; });
    }

    // 臾몄꽌蹂?寃곗옱??議고쉶
    const docIds = docList.map((d) => d.id);
    let approvalLinesMap: Record<string, { approvalOrder: number; approverName: string | null; approverOrg: string | null; stepStatus: string }[]> = {};

    if (docIds.length > 0) {
      const lines = await db
        .select({
          documentId: documentApprovalLines.documentId,
          approvalOrder: documentApprovalLines.approvalOrder,
          stepStatus: documentApprovalLines.stepStatus,
          approverName: users.name,
          approverOrg: users.organization,
        })
        .from(documentApprovalLines)
        .leftJoin(users, eq(documentApprovalLines.approverUserId, users.id))
        .where(inArray(documentApprovalLines.documentId, docIds))
        .orderBy(documentApprovalLines.approvalOrder);

      lines.forEach((line) => {
        if (!approvalLinesMap[line.documentId]) approvalLinesMap[line.documentId] = [];
        approvalLinesMap[line.documentId].push({
          approvalOrder: line.approvalOrder,
          approverName: line.approverName,
          approverOrg: line.approverOrg,
          stepStatus: line.stepStatus,
        });
      });
    }

    const enrichedDocs = docList.map((doc) => ({
      ...doc,
      currentApproverName: doc.currentApproverUserId
        ? approverMap[doc.currentApproverUserId] ?? null
        : null,
      approvalLines: approvalLinesMap[doc.id] ?? [],
      submittedAt: doc.submittedAt
        ? new Date(doc.submittedAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).replace(/\. /g, ".").replace(/\.$/, "")
        : null,
    }));

    return NextResponse.json({ task, documents: enrichedDocs });
  } catch (error) {
    console.error("[GET /api/tasks/[taskId]]", error);
    return NextResponse.json({ error: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await req.json();
    const { name, contractorCompanyName, description, startDate, endDate, status } = body;

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "怨쇱뾽??李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    const updateData: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (contractorCompanyName !== undefined) updateData.contractorCompanyName = contractorCompanyName?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("[PATCH /api/tasks/[taskId]]", error);
    return NextResponse.json({ error: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲??" }, { status: 401 });
    }

    const { taskId } = await params;

    const [updated] = await db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "怨쇱뾽??李얠쓣 ???놁뒿?덈떎." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[taskId]]", error);
    return NextResponse.json({ error: "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 });
  }
}
