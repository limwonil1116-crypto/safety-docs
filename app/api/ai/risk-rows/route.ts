import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workContent, workLocation, riskItems, checkedFactors } = await req.json();

    const prompt = [
      "당신은 한국농어었공사 안전관리 전문가입니다.",
      "아래 안전작업허가서 내용을 분석해 위험요소·개선대책·재해형태를 3개 항목으로 작성해주세요.",
      "",
      "[작업 정보]",
      "- 작업내용: " + (workContent || "미입력"),
      "- 작업장소: " + (workLocation || "미입력"),
      "- 위험공종: " + ((riskItems as string[]).join(", ") || "없음"),
      "- 예상위험요소: " + ((checkedFactors as string[]).join(", ") || "없음"),
      "",
      "반드시 아래 JSON 배열 형식으로만 응답하세요.",
      "다른 어떤 텍스트나 설명없이 JSON만 출력하세요:",
      "",
      '[{"riskFactor":"구체적 위험요소","improvement":"구체적 개선대책","disasterType":"낙상"},{"riskFactor":"구체적 위험요소2","improvement":"구체적 개선대책2","disasterType":"협샭"},{"riskFactor":"구체적 위험요소3","improvement":"구체적 개선대책3","disasterType":"감전"}]',
      "",
      "작성 규칙:",
      "1. riskFactor: 해당 작업에 특화된 위험요소 (20자 내외)",
      "2. improvement: 구체적인 개선대책 (30자 내외)",
      "3. disasterType: 낙상/추낙/협샭/감전/화재/익수/질식 중 선택",
    ].join("\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Gemini 오류" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";

    // special-measures와 동일하게 텍스트로 넘기고 클라이언트에서 파싱
    return NextResponse.json({ rawText });
  } catch (error) {
    console.error("[POST /api/ai/risk-rows]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
