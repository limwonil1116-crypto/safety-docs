import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  documents,
  documentApprovalLines,
  documentSignatures,
  documentHistories,
  documentReviewComments,
  documentAttachments,
} from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/documents/[documentId]/delete - 문서 완전 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 관련 데이터 삭제 (순서 중요 - FK 제약)
    await db.delete(documentSignatures).where(eq(documentSignatures.documentId, documentId));
    await db.delete(documentReviewComments).where(eq(documentReviewComments.documentId, documentId));
    await db.delete(documentApprovalLines).where(eq(documentApprovalLines.documentId, documentId));
    await db.delete(documentAttachments).where(eq(documentAttachments.documentId, documentId));
    await db.delete(documentHistories).where(eq(documentHistories.documentId, documentId));

    // 문서 소프트 삭제
    await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/documents/[documentId]/delete]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
