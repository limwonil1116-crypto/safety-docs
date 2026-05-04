import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workContent, workLocation, riskItems, checkedFactors } = await req.json();

    const prompt = [
      "당신은 한국농어었공사 안전관리 전문가입니다.",
      "아래 안전작업허가서 내용을 분석해 위험요소·개선대책·재해형태를 3개 항목으로 작성하세요.",
      "",
      "[작업 정보]",
      "- 작업내용: " + (workContent || "미입력"),
      "- 작업장소: " + (workLocation || "미입력"),
      "- 위험공종: " + ((riskItems as string[]).join(", ") || "없음"),
      "- 예상위험요소: " + ((checkedFactors as string[]).join(", ") || "없음"),
      "",
      "정확히 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):",
      '[{"riskFactor":"위험요소1","improvement":"개선대책1","disasterType":"재해형태1"},',
      '{"riskFactor":"위험요소2","improvement":"개선대책2","disasterType":"재해형태2"},',
      '{"riskFactor":"위험요소3","improvement":"개선대책3","disasterType":"재해형태3"}]',
      "",
      "작성 규칙:",
      "1. riskFactor: 구체적 위험요소 (20자 내외)",
      "2. improvement: 해당 위험의 개선대책 (30자 내외)",
      "3. disasterType: 낙상/추낙/협샭/감전/화재/익수/질식 중 선택",
      "4. 유효한 JSON 배열만 출력",
    ].join("\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini API 키가 없습니다." }, { status: 500 });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 512, temperature: 0.3 } }) }
    );
    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Gemini 오류" }, { status: 500 });
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const rows = JSON.parse(clean);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("[POST /api/ai/risk-rows]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
