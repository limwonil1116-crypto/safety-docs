import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gtvyekhjrrubbcxdnxlw.supabase.co";
const BUCKET = "attachments";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY가 없습니다.");
  return createClient(SUPABASE_URL, key);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const supabase = getSupabase();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `tbm-photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // File → ArrayBuffer → Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, uint8Array, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e?.message || "업로드 오류" }, { status: 500 });
  }
}
