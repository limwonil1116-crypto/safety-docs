import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workToday, workAddress, facilityName, riskType, reportDate } = await req.json();

    const prompt = `당신은 한국농어촌공사 건설현장 안전관리 전문가입니다.
다음 정보를 바탕으로 TBM(Tool Box Meeting) 보고서의 위험요인과 안전대책을 작성해주세요.

- 작업일자: ${reportDate || "오늘"}
- 시설물명: ${facilityName || "미입력"}
- 작업내용: ${workToday || "미입력"}
- 작업장소: ${workAddress || "미입력"}
- 위험공종: ${riskType || "해당없음"}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "riskFactor1": "잠재위험요인 1 (구체적으로)",
  "riskMeasure1": "위험요인 1 대책",
  "riskFactor2": "잠재위험요인 2 (구체적으로)",
  "riskMeasure2": "위험요인 2 대책",
  "riskFactor3": "잠재위험요인 3 (구체적으로)",
  "riskMeasure3": "위험요인 3 대책",
  "mainRiskFactor": "오늘 작업의 가장 중요한 중점위험요인",
  "mainRiskMeasure": "중점위험요인 대책",
  "riskElement1": "잠재위험요소 1",
  "riskElement2": "잠재위험요소 2",
  "riskElement3": "잠재위험요소 3"
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API 키가 없습니다." }, { status: 500 });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    });

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json({ result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI 생성 오류가 발생했습니다." }, { status: 500 });
  }
}
