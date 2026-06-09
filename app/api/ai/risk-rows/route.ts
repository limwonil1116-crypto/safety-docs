import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const DT_CANON = ["\ucd94\ub77d","\uc804\ub3c4","\ucda9\ub3cc","\ud611\ucc29","\ub099\ud558","\ubd95\uad34","\uac10\uc804","\ud3ed\ubc1c","\ud654\uc7ac","\uc9c8\uc2dd","\uc720\ud574\ubb3c\uc811\ucd09","\uc775\uc0ac","\uae30\ud0c0"];
const DT_ALIAS: Record<string, string> = {
  "\ub099\uc0c1": "\ucd94\ub77d", "\ub5a8\uc5b4\uc9d0": "\ucd94\ub77d", "\ucd94\ub099": "\ucd94\ub77d",
  "\ub07c\uc784": "\ud611\ucc29", "\ud611\uc0ed": "\ud611\ucc29",
  "\ub118\uc5b4\uc9d0": "\uc804\ub3c4",
  "\ubd80\ub52a\ud798": "\ucda9\ub3cc",
  "\ub9de\uc74c": "\ub099\ud558", "\ube44\ub798": "\ub099\ud558", "\ub099\ud558\ube44\ub798": "\ub099\ud558",
  "\ubb34\ub108\uc9d0": "\ubd95\uad34", "\ub3c4\uad34": "\ubd95\uad34", "\ubd95\uad34\ub3c4\uad34": "\ubd95\uad34",
  "\ube60\uc9d0": "\uc775\uc0ac", "\uc775\uc218": "\uc775\uc0ac",
  "\ud30c\uc5f4": "\ud3ed\ubc1c", "\ud3ed\ubc1c\ud30c\uc5f4": "\ud3ed\ubc1c",
  "\uc0b0\uc18c\uacb0\ud54d": "\uc9c8\uc2dd",
  "\uc911\ub3c5": "\uc720\ud574\ubb3c\uc811\ucd09", "\uc720\ud574\ubb3c\uc9c8\uc811\ucd09": "\uc720\ud574\ubb3c\uc811\ucd09",
};
function _dtNorm(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 32 || c === 9 || c === 47 || c === 0xb7 || c === 0x318d || c === 0x30fb) continue;
    out += s[i];
  }
  return out;
}
function _dtLev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = [];
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}
function fixDisaster(raw: any): string {
  const s = _dtNorm(String(raw || ""));
  if (!s) return "\uae30\ud0c0";
  if (DT_CANON.indexOf(s) !== -1) return s;
  if (DT_ALIAS[s]) return DT_ALIAS[s];
  let best = "\uae30\ud0c0", bestD = 99;
  for (const c of DT_CANON) {
    const d = _dtLev(s, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return bestD <= 1 ? best : "\uae30\ud0c0";
}
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { workContent, workLocation, riskItems, checkedFactors } = await req.json();

    const riskStr = Array.isArray(riskItems) && riskItems.length > 0 ? riskItems.join(", ") : "없음";
    const factorStr = Array.isArray(checkedFactors) && checkedFactors.length > 0 ? checkedFactors.join(", ") : "없음";

    const prompt = [
      "당신은 한국농어초공사 안전관리 전문가입니다.",
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
      '[{"riskFactor":"위험요소1","improvement":"개선대책1","disasterType":"\ucd94\ub77d"},{"riskFactor":"위험요소2","improvement":"개선대책2","disasterType":"\ud611\ucc29"},{"riskFactor":"위험요소3","improvement":"개선대책3","disasterType":"감전"}]',
      "",
      "disasterType\uc740 \ucd94\ub77d/\uc804\ub3c4/\ucda9\ub3cc/\ud611\ucc29/\ub099\ud558/\ubd95\uad34/\uac10\uc804/\ud3ed\ubc1c/\ud654\uc7ac/\uc9c8\uc2dd/\uc720\ud574\ubb3c\uc811\ucd09/\uc775\uc0ac/\uae30\ud0c0 \uc911 \ud558\ub098\uc758 \uc815\ud655\ud55c \ub2e8\uc5b4\ub85c\ub9cc \uc791\uc131.",
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
          generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || "Gemini 오류" }, { status: 500 });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const rawText = parts.map((p: any) => p.text || "").join("").trim();

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

    const fixedRows = (rows as any[]).map((r: any) => ({
      ...r,
      disasterType: fixDisaster(r?.disasterType),
    }));

    return NextResponse.json({ rows: fixedRows });
  } catch (error) {
    console.error("[POST /api/ai/risk-rows]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
