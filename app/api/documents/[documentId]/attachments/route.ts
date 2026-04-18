// app/api/documents/[documentId]/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, documentAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gtvyekhjrrubbcxdnxlw.supabase.co";
const BUCKET = "attachments";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(SUPABASE_URL, key);
}

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

    // ✅ 1번: 허용 타입 확장 - jfif, heic, webp 등 추가
    const allowedTypes = [
      // 이미지
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "image/heic", "image/heif", "image/bmp", "image/tiff",
      // jfif는 image/jpeg로 인식되지만 명시적 추가
      "image/jfif",
      // 문서
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    // ✅ mimeType 체크 완화: 이미지는 image/로 시작하면 모두 허용
    const isAllowed = allowedTypes.includes(file.type) ||
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.type.includes("excel") ||
      file.type.includes("spreadsheet");

    if (!isAllowed)
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. (${file.type}) JPG, PNG, PDF, Excel만 가능` },
        { status: 400 }
      );

    const supabase = getSupabase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파일 확장자 추출
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `${documentId}/${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase 업로드 오류:", uploadError);
      return NextResponse.json({ error: `업로드 실패: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    const [attachment] = await db
      .insert(documentAttachments)
      .values({
        documentId,
        uploadedBy: session.user.id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
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

    const supabase = getSupabase();
    const urlParts = attachment.fileUrl.split(`/${BUCKET}/`);
    if (urlParts.length > 1) {
      await supabase.storage.from(BUCKET).remove([urlParts[1]]);
    }

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
