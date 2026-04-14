// app/api/documents/[documentId]/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://gtvyekhjrrubbcxdnxlw.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "attachments";

// GET - 첨부파일 목록
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { documentId } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const all = await db
      .select()
      .from(documentAttachments)
      .where(eq(documentAttachments.documentId, documentId))
      .orderBy(documentAttachments.sortOrder);

    const filtered = all.filter((a) => {
      if (a.deletedAt) return false;
      if (type && a.attachmentType !== type) return false;
      return true;
    });

    return NextResponse.json({ attachments: filtered });
  } catch (error) {
    console.error("[GET attachments]", error);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}

// POST - 파일 업로드
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { documentId } = await params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!doc || doc.deletedAt)
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const attachmentType = (formData.get("attachmentType") as string) || "PHOTO";
    const description = (formData.get("description") as string) || "";
    const sortOrder = parseInt((formData.get("sortOrder") as string) || "0", 10);

    if (!file)
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    if (file.size > 20 * 1024 * 1024)
      return NextResponse.json({ error: "파일 크기는 20MB 이하여야 합니다." }, { status: 400 });

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type))
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. (JPG, PNG, PDF, Excel만 가능)" },
        { status: 400 }
      );

    // Supabase Storage 업로드
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = `${documentId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase 업로드 오류:", uploadError);
      return NextResponse.json(
        { error: `업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // DB 저장
    const [attachment] = await db
      .insert(documentAttachments)
      .values({
        documentId,
        uploadedBy: session.user.id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        attachmentType: attachmentType as "PHOTO" | "DOCUMENT",
        sortOrder,
        description: description || null,
      })
      .returning();

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error("[POST attachments]", error);
    return NextResponse.json(
      { error: `업로드 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}` },
      { status: 500 }
    );
  }
}

// DELETE - 첨부파일 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId)
      return NextResponse.json({ error: "attachmentId가 필요합니다." }, { status: 400 });

    const [attachment] = await db
      .select()
      .from(documentAttachments)
      .where(eq(documentAttachments.id, attachmentId))
      .limit(1);

    if (!attachment)
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    // Supabase Storage에서 삭제
    const { documentId } = await params;
    const urlParts = attachment.fileUrl.split(`/${BUCKET}/`);
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from(BUCKET).remove([filePath]);
    }

    // soft delete
    await db
      .update(documentAttachments)
      .set({ deletedAt: new Date() })
      .where(eq(documentAttachments.id, attachmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE attachments]", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
