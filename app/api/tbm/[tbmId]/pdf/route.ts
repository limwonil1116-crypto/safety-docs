// app/api/tbm/[tbmId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tbmReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { TbmReportPDF } from "@/lib/pdf/templates";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tbmId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { tbmId } = await params;
    const [report] = await db.select().from(tbmReports).where(eq(tbmReports.id, tbmId));
    if (!report) return NextResponse.json({ error: "TBM 보고서를 찾을 수 없습니다." }, { status: 404 });

    const element = React.createElement(TbmReportPDF, { report: report as Record<string, any> }) as any;
    const buffer = await renderToBuffer(element);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `TBM보고서_${report.reportDate || dateStr}_${tbmId.slice(0, 8)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}
