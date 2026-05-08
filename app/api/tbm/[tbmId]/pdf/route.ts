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
    if (!session?.user) return NextResponse.json({ error: "\ub85c\uadf8\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4." }, { status: 401 });

    const { tbmId } = await params;
    const [report] = await db.select().from(tbmReports).where(eq(tbmReports.id, tbmId));
    if (!report) return NextResponse.json({ error: "TBM \ubcf4\uace0\uc11c\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." }, { status: 404 });

    const element = React.createElement(TbmReportPDF, { report: report as Record<string, any> });
    const buffer = await renderToBuffer(element);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `TBM\ubcf4\uace0\uc11c_${report.reportDate || dateStr}_${tbmId.slice(0, 8)}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }, { status: 500 });
  }
}
