import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workToday, workAddress, facilityName, riskType, reportDate } = await req.json();

    const lines = [
      "당신은 한국농어초공사 건설현장 안전관리 전문가입니다.",
      "다음 정보를 바탕으로 TBM 위험요인과 안전대책을 작성해주세요.",
      "",
      "- 작업일자: " + (reportDate || "오늘"),
      "- 시설물명: " + (facilityName || "미입력"),
      "- 작업내용: " + (workToday || "미입력"),
      "- 작업장소: " + (workAddress || "미입력"),
      "- 위험공종: " + (riskType || "해당없음"),
      "",
      "반드시 아래 JSON 형식으로만 응답하세요. 마크다운, 설명 없이 JSON만:",
      "{",
      '  "riskFactor1": "구체적 위험요인 1",',
      '  "riskMeasure1": "대책 1",',
      '  "riskFactor2": "구체적 위험요인 2",',
      '  "riskMeasure2": "대책 2",',
      '  "riskFactor3": "구체적 위험요인 3",',
      '  "riskMeasure3": "대책 3",',
      '  "mainRiskFactor": "오늘 가장 중요한 위험요인",',
      '  "mainRiskMeasure": "중점 대책",',
      '  "riskElement1": "잔재위험요소 1",',
      '  "riskElement2": "잔재위험요소 2",',
      '  "riskElement3": "잔재위험요소 3"',
      "}",
    ];
    const prompt = lines.join("\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY가 없습니다." }, { status: 500 });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "AI API 오류: " + JSON.stringify(err) }, { status: 500 });
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const fullText = parts.map((p: any) => p.text || "").join("");

    const jsonStart = fullText.indexOf("{");
    const jsonEnd = fullText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No JSON found:", fullText.substring(0, 300));
      return NextResponse.json({ error: "AI 응답 파싱 오류" }, { status: 500 });
    }

    const result = JSON.parse(fullText.substring(jsonStart, jsonEnd + 1));
    return NextResponse.json({ result });
  } catch (e) {
    console.error("TBM AI error:", e);
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }
}