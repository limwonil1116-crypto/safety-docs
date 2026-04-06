import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";

// GET /api/documents/[documentId]/previous - 이전 작성 내용 목록
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;

    // 현재 문서 조회
    const [currentDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!currentDoc) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 같은 작성자 + 같은 문서 유형의 이전 문서 목록 (최근 5개)
    const prevDocs = await db
      .select({
        id: documents.id,
        documentType: documents.documentType,
        status: documents.status,
        formDataJson: documents.formDataJson,
        createdAt: documents.createdAt,
        submittedAt: documents.submittedAt,
      })
      .from(documents)
      .where(
        sql`${documents.createdBy} = ${session.user.id}
          AND ${documents.documentType} = ${currentDoc.documentType}
          AND ${documents.id} != ${documentId}
          AND ${documents.deletedAt} IS NULL`
      )
      .orderBy(desc(documents.createdAt))
      .limit(5);

    return NextResponse.json({ previousDocs: prevDocs });
  } catch (error) {
    console.error("[GET /api/documents/[documentId]/previous]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}