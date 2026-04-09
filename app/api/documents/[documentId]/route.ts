import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentHistories } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/documents/[documentId] - 문서 조회
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

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("[GET /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// PATCH /api/documents/[documentId] - 임시저장 (위치 포함)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;
    const body = await req.json();
    const { formDataJson, workLatitude, workLongitude, workAddress } = body;

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 400 });
    }

    const [updated] = await db
      .update(documents)
      .set({
        formDataJson: formDataJson ?? existing.formDataJson,
        // 위치 정보 - null 명시적으로도 저장 가능
        ...(workLatitude  !== undefined && { workLatitude }),
        ...(workLongitude !== undefined && { workLongitude }),
        ...(workAddress   !== undefined && { workAddress }),
        lastUpdatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("[PATCH /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/documents/[documentId] - 제출
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { documentId } = await params;
    const body = await req.json();
    const { formDataJson } = body;

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      return NextResponse.json({ error: "제출할 수 없는 상태입니다." }, { status: 400 });
    }

    const [updated] = await db
      .update(documents)
      .set({
        formDataJson: formDataJson ?? existing.formDataJson,
        status: "SUBMITTED",
        lastUpdatedBy: session.user.id,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    await db.insert(documentHistories).values({
      documentId,
      actionType: existing.status === "REJECTED" ? "RESUBMITTED" : "SUBMITTED",
      actorUserId: session.user.id,
      previousStatus: existing.status,
      nextStatus: "SUBMITTED",
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("[POST /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE /api/documents/[documentId] - 결재 취소 → DRAFT 복원
// 권한: 작성자 본인 또는 ADMIN
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

    // 권한 체크: 로그인한 사용자면 누구나 결재 취소 가능
    // (작성자 본인, 검토자, 관리자 모두 포함)
    const userRole = (session.user as any).role ?? "";
    const isOwner = String(existing.createdBy).toLowerCase() === String(session.user.id).toLowerCase();
    const isStaff = ["REVIEWER", "FINAL_APPROVER", "ADMIN"].includes(userRole);
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "결재 취소 권한이 없습니다. (작성자 또는 공사직원만 가능)" }, { status: 403 });
    }

    // 이미 DRAFT면 취소 불필요
    if (existing.status === "DRAFT") {
      return NextResponse.json({ error: "이미 작성중 상태입니다." }, { status: 400 });
    }

    const previousStatus = existing.status;

    // formDataJson에서 서명 데이터 제거
    const formData = (existing.formDataJson as Record<string, unknown>) ?? {};
    const { signatureData: _removed, ...cleanFormData } = formData;

    // DRAFT로 복원 + 결재 관련 필드 초기화
    const [updated] = await db
      .update(documents)
      .set({
        status: "DRAFT",
        formDataJson: cleanFormData,
        currentApprovalOrder: null,
        currentApproverUserId: null,
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        lastUpdatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    // 결재선 + 서명 완전 삭제 (재작성을 위해)
    const { documentApprovalLines, documentSignatures } = await import("@/db/schema");
    
    // 서명 먼저 삭제
    await db
      .delete(documentSignatures)
      .where(eq(documentSignatures.documentId, documentId));
    
    // 결재선 삭제
    await db
      .delete(documentApprovalLines)
      .where(eq(documentApprovalLines.documentId, documentId));

    // 이력 기록
    await db.insert(documentHistories).values({
      documentId,
      actionType: "CANCELLED",
      actorUserId: session.user.id,
      previousStatus: previousStatus as "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "DRAFT",
      nextStatus: "DRAFT",
      memo: "결재 취소 - 재작성을 위해 초기화",
    });

    return NextResponse.json({ document: updated, message: "결재가 취소되었습니다." });
  } catch (error) {
    console.error("[DELETE /api/documents/[documentId]]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
