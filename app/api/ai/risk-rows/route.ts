import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workContent, workLocation, riskItems, checkedFactors } = await req.json();

    const riskStr = Array.isArray(riskItems) && riskItems.length > 0 ? riskItems.join(", ") : "없음";
    const factorStr = Array.isArray(checkedFactors) && checkedFactors.length > 0 ? checkedFactors.join(", ") : "없음";

    const prompt = [
      "당신은 한국농어었공사 안전관리 전문가입니다.",
      "아래 작업 정보를 분석하여 위험요소, 개선대책, 재해형태를 3개 작성하십시오.",
      "",
      "[작업 정보]",
      "- 작업내용: " + (workContent || "미입력"),
      "- 작업장소: " + (workLocation || "미입력"),
      "- 위험공종: " + riskStr,
      "- 예상위험요소: " + factorStr,
      "",
      "응답 형식: 아래 JSON 배열 형식으로만 출력하십시오.",
      "코드블록(\`\`\`)이나 추가 텍스트 없이 JSON만 출력하십시오.",
      '[{"riskFactor":"위험요소1","improvement":"개선대책1","disasterType":"낙상"},{"riskFactor":"위험요소2","improvement":"개선대책2","disasterType":"협샭"},{"riskFactor":"위험요소3","improvement":"개선대책3","disasterType":"감전"}]',
      "",
      "disasterType은 낙상/추낙/협샭/감전/화재/익수/질식 중 하나.",
      "riskFactor는 20자 내, improvement는 30자 내로 작성.",
    ].join("\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini API 키가 없습니다." }, { status: 500 });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Gemini 오류" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    // 서버에서 직접 파싱하여 검증
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    
    // JSON 배열 추출 - 여러 패턴 시도
    let rows: any[] | null = null;
    
    // 1차: 전체 텍스트를 JSON으로 파싱 시도
    try { rows = JSON.parse(cleaned); } catch {}
    
    // 2차: [ ] 사이 추출 후 파싱
    if (!Array.isArray(rows)) {
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      if (start !== -1 && end !== -1 && end > start) {
        try { rows = JSON.parse(cleaned.slice(start, end + 1)); } catch {}
      }
    }

    // 로직 유효성 검사
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error("Gemini rawText:", rawText);
      return NextResponse.json({ error: "AI가 올바른 형식으로 응답하지 않았습니다. 다시 시도해주세요." }, { status: 500 });
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("[POST /api/ai/risk-rows]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
