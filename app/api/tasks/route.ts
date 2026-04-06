import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tasks, documents, users } from "@/db/schema";
import { eq, ilike, or, isNull, desc, sql } from "drizzle-orm";

// GET /api/tasks - 과업 목록 조회
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || "";

    const taskList = await db
      .select({
        id: tasks.id,
        name: tasks.name,
        contractorCompanyName: tasks.contractorCompanyName,
        description: tasks.description,
        status: tasks.status,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdBy: tasks.createdBy,
      })
      .from(tasks)
      .where(
        keyword
          ? or(
              ilike(tasks.name, `%${keyword}%`),
              ilike(tasks.contractorCompanyName, `%${keyword}%`)
            )
          : isNull(tasks.deletedAt)
      )
      .orderBy(desc(tasks.updatedAt));

      const taskIds = taskList.map((t: { id: string }) => t.id);
    let docStats: Record<string, { inProgress: number; completed: number; rejected: number }> = {};

    if (taskIds.length > 0) {
      const stats = await db
        .select({
          taskId: documents.taskId,
          status: documents.status,
          count: sql<number>`count(*)::int`,
        })
        .from(documents)
        .where(isNull(documents.deletedAt))
        .groupBy(documents.taskId, documents.status);

      for (const row of stats) {
        if (!docStats[row.taskId]) {
          docStats[row.taskId] = { inProgress: 0, completed: 0, rejected: 0 };
        }
        if (["SUBMITTED", "IN_REVIEW"].includes(row.status)) {
          docStats[row.taskId].inProgress += row.count;
        } else if (row.status === "APPROVED") {
          docStats[row.taskId].completed += row.count;
        } else if (row.status === "REJECTED") {
          docStats[row.taskId].rejected += row.count;
        }
      }
    }

    const result = taskList.map((task: typeof taskList[0]) => ({
      ...task,
      counts: docStats[task.id] ?? { inProgress: 0, completed: 0, rejected: 0 },
      lastDate: task.updatedAt
        ? new Date(task.updatedAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).replace(/\. /g, ".").replace(/\.$/, "")
        : "",
    }));

    return NextResponse.json({ tasks: result });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/tasks - 과업 생성
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { name, contractorCompanyName, description, startDate, endDate } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "과업명을 입력해주세요." }, { status: 400 });
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        name: name.trim(),
        contractorCompanyName: contractorCompanyName?.trim() || null,
        description: description?.trim() || null,
        createdBy: session.user.id,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "ACTIVE",
      })
      .returning();

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}