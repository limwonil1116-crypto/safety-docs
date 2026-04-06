import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, tasks, users, documentApprovalLines } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

// GET /api/approvals - 승인 목록 조회
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || "";
    const docType = searchParams.get("type") || "ALL";
    const dateFilter = searchParams.get("date") || "ALL";

    // 날짜 필터 계산
    const now = new Date();
    let dateFrom: Date | null = null;
    if (dateFilter === "THIS_WEEK") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === "THIS_MONTH") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 내가 결재선에 포함된 문서 조회
    const allDocs = await db.execute(sql`
      SELECT DISTINCT
        d.id,
        d.document_type,
        d.status,
        d.submitted_at,
        d.updated_at,
        d.current_approver_user_id,
        t.name as task_name,
        t.contractor_company_name,
        u.name as writer_name,
        cu.name as current_approver_name,
        CASE WHEN d.current_approver_user_id = ${session.user.id}::uuid THEN true ELSE false END as is_my_turn
      FROM documents d
      LEFT JOIN tasks t ON d.task_id = t.id
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users cu ON d.current_approver_user_id = cu.id
      INNER JOIN document_approval_lines dal ON dal.document_id = d.id
        AND dal.approver_user_id = ${session.user.id}::uuid
      WHERE d.deleted_at IS NULL
        AND d.status != 'DRAFT'
        ${docType !== "ALL" ? sql`AND d.document_type = ${docType}` : sql``}
        ${dateFrom ? sql`AND d.updated_at >= ${dateFrom.toISOString()}` : sql``}
        ${keyword ? sql`AND (t.name ILIKE ${"%" + keyword + "%"} OR u.name ILIKE ${"%" + keyword + "%"})` : sql``}
      ORDER BY d.updated_at DESC
      LIMIT 50
    `);

    // 문서 유형별 카운트
    const countRows = await db.execute(sql`
      SELECT d.document_type, COUNT(*) as count
      FROM documents d
      INNER JOIN document_approval_lines dal ON dal.document_id = d.id
        AND dal.approver_user_id = ${session.user.id}::uuid
      WHERE d.deleted_at IS NULL AND d.status != 'DRAFT'
      GROUP BY d.document_type
    `);

    const typeCounts: Record<string, number> = {
      ALL: 0,
      SAFETY_WORK_PERMIT: 0,
      CONFINED_SPACE: 0,
      HOLIDAY_WORK: 0,
      POWER_OUTAGE: 0,
    };

    const countArray = Array.isArray(countRows) ? countRows : (countRows as { rows?: unknown[] }).rows ?? [];
    for (const row of countArray) {
      const r = row as { document_type: string; count: string };
      typeCounts[r.document_type] = parseInt(r.count);
      typeCounts.ALL += parseInt(r.count);
    }

    // 내 차례 카운트
    const myTurnRows = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM documents d
      WHERE d.current_approver_user_id = ${session.user.id}::uuid
        AND d.deleted_at IS NULL
    `);

    const myTurnArray = Array.isArray(myTurnRows) ? myTurnRows : (myTurnRows as { rows?: unknown[] }).rows ?? [];
    const myTurnCount = parseInt((myTurnArray[0] as { count: string })?.count ?? "0");

    const docsArray = Array.isArray(allDocs) ? allDocs : (allDocs as { rows?: unknown[] }).rows ?? [];

    return NextResponse.json({
      documents: docsArray,
      typeCounts,
      myTurnCount,
    });
  } catch (error) {
    console.error("[GET /api/approvals]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}