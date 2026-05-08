import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    // BLOB 토큰 확인
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN 환경변수 없음");
      return NextResponse.json({ error: "Blob 스토리지 토큰이 없습니다. Vercel 환경변수를 확인하세요." }, { status: 500 });
    }

    const { put } = await import("@vercel/blob");
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `tbm/${Date.now()}.${ext}`;
    const blob = await put(filename, file, { access: "public", token });
    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e?.message || "업로드 오류" }, { status: 500 });
  }
}
