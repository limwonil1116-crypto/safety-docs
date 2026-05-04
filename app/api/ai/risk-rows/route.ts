import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workContent, workLocation, riskItems, checkedFactors } = await req.json();

    const riskStr = Array.isArray(riskItems) && riskItems.length > 0 ? riskItems.join(", ") : "없음";
    const factorStr = Array.isArray(checkedFactors) && checkedFactors.length > 0 ? checkedFactors.join(", ") : "없음";

    const prompt =
      "당신은 한국농어었공사 안전관리 전문가입니다.\n" +
      "아래 작업 정보를 분석하여 위험요소, 개선대책, 재해형태를 3개 작성하십시오.\n\n" +
      "[작업 정보]\n" +
      "- 작업내용: " + (workContent || "미입력") + "\n" +
      "- 작업장소: " + (workLocation || "미입력") + "\n" +
      "- 위험공종: " + riskStr + "\n" +
      "- 예상위험요소: " + factorStr + "\n\n" +
      "반드시 아래와 같은 JSON 배열만 응답하십시오. 다른 텍스트는 절대 입력하지 마십시오.\n" +
      '[{"riskFactor":"위험요소 설명","improvement":"개선대책 설명","disasterType":"낙상"},' +
      '{"riskFactor":"위험요소 설명","improvement":"개선대책 설명","disasterType":"협샭"},' +
      '{"riskFactor":"위험요소 설명","improvement":"개선대책 설명","disasterType":"감전"}]\n\n' +
      "disasterType 허용값: 낙상, 추낙, 협샭, 감전, 화재, 익수, 질식\n" +
      "JSON 배열로만 응답. 코드 블록, 마크다운, 설명 사용 금지.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API 키가 없습니다." }, { status: 500 });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Gemini 오류" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
    return NextResponse.json({ rawText });
  } catch (error) {
    console.error("[POST /api/ai/risk-rows]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
