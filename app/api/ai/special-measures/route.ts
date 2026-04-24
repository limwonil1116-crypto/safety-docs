import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { documentType, formData } = body;

    const fd = formData ?? {};
    const docTypeLabel =
      documentType === "SAFETY_WORK_PERMIT" ? "안전작업허가서" :
      documentType === "POWER_OUTAGE" ? "정전작업허가서" :
      documentType === "CONFINED_SPACE" ? "밀폐공간작업허가서" :
      documentType === "HOLIDAY_WORK" ? "휴일작업신청서" : "안전작업허가서";

    const workContent = fd.workContent || fd.workContents || "";
    const workLocation = fd.workLocation || fd.workAddress || "";
    const riskItems: string[] = [];
    if (fd.riskHighPlace) riskItems.push("고소작업");
    if (fd.riskWaterWork) riskItems.push("수상·수중작업");
    if (fd.riskConfinedSpace) riskItems.push("밀폐공간작업");
    if (fd.riskPowerOutage) riskItems.push("정전작업");
    if (fd.riskFireWork) riskItems.push("화기작업");

    const safetyChecks = Array.isArray(fd.safetyChecks)
      ? (fd.safetyChecks as any[]).filter(c => c.applicable === "해당").map((c: any) => c.label).join(", ")
      : "";

    const riskRows = Array.isArray(fd.riskRows)
      ? (fd.riskRows as any[]).filter(r => r.riskFactor).map((r: any) => r.riskFactor).join(", ")
      : "";

    const prompt = `당신은 한국농어촌공사의 안전관리 전문가입니다.
아래 ${docTypeLabel} 신청 내용을 검토하고, 특별조치 필요사항을 5줄로 간결하고 명확하게 작성해주세요.
각 줄은 "- "로 시작하고, 구체적인 안전조치 사항을 포함해야 합니다.

[작업 정보]
- 작업내용: ${workContent || "미입력"}
- 작업장소: ${workLocation || "미입력"}
- 위험공종: ${riskItems.join(", ") || "없음"}
- 안전조치 이행사항: ${safetyChecks || "없음"}
- 위험요소: ${riskRows || "없음"}

위 내용을 바탕으로 특별조치 필요사항 5줄을 작성해주세요. 한국어로 작성하고, 다른 설명 없이 5줄만 출력하세요.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Gemini 오류" }, { status: 500 });
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return NextResponse.json({ specialMeasures: result });
  } catch (error) {
    console.error("[POST /api/ai/special-measures]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
