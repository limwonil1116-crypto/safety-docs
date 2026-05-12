import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await req.json();
    const { documentType, formData } = body;
    const fd = formData ?? {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini API 키가 없습니다." }, { status: 500 });

    const taskName = fd.taskName || fd.serviceName || fd.projectName || "";
    const workLocation = fd.facilityLocation || fd.facilityAddress || fd.workLocation || "";
    const workContent = fd.workContents || fd.workContent || "";
    const workPosition = fd.workPosition || "";

    const typeLabel: Record<string, string> = {
      SAFETY_WORK_PERMIT: "안전작업허가서",
      CONFINED_SPACE: "밀폐공간작업허가서",
      HOLIDAY_WORK: "휴일작업신고서",
      POWER_OUTAGE: "정전작업허가서",
    };

    const callGemini = async (prompt: string, maxTokens = 1000) => {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
          }),
        }
      );
      const data = await response.json();
      return (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
    };

    // 검토의견 초안 (검토 단계)
    const originalType = (body as any).originalType || documentType;
    if (documentType === "REVIEW_OPINION") {
      const docLabel = typeLabel[originalType] || "안전서류";
      // formData에서 위험요소/안전조치 정보 추출
      const riskHighPlace = fd.riskHighPlace ? "고소작업(2m이상)" : "";
      const riskWater = fd.riskWaterWork ? "수상·수변작업" : "";
      const riskConfined = fd.riskConfinedSpace ? "밀폐공간작업" : "";
      const riskFire = fd.riskFireWork ? "화기작업" : "";
      const riskPower = fd.riskPowerOutage ? "정전작업" : "";
      const riskList = [riskHighPlace,riskWater,riskConfined,riskFire,riskPower].filter(Boolean).join(", ") || "미입력";
      const safetyChecks = Array.isArray(fd.safetyChecks)
        ? (fd.safetyChecks as any[]).filter((c:any) => c.applicable === "해당").map((c:any) => c.label?.replace(/^[\u25cf\u2605]/,"")||"").join(", ")
        : "";
      const participants = fd.participants || fd.workContent || "";
      const prompt = `당신은 한국농어얄공사 안전관리 용역감독원입니다.
${docLabel} 신청서를 검토하고 구체적인 안전조치 검토의견 초안을 작성해주세요.

[작업 정보]
- 용역명: ${taskName || "미입력"}
- 작업내용: ${workContent || "미입력"}
- 작업위치: ${workLocation || "미입력"}
- 위험공종: ${riskList}
- 안전조치 해당항목: ${safetyChecks || "미입력"}

작성 요령:
1. 각 위험공종별 위험요인과 안전조치의 적정성을 평가하는 구체적 텍스트
2. 위험성평가 대체의 적정성 평가 포함
3. 안전조치 해당항목에 대한 현장 실행 권고사항 서술
4. 산업안전보건법 등 법적근거 포함
5. "- "로 시작하는 문장으로 7개 이상 작성
6. 마크다운 없이 순수 텍스트, 한국어 수식어체
7. 각 항목은 2~3문장으로 작성하여 충분한 분량 유지`;
      const specialMeasures = await callGemini(prompt, 3000);
      return NextResponse.json({ specialMeasures });
    }

    // 휴일작업 - 위험요소/개선대유
    if (documentType === "HOLIDAY_WORK") {
      const prompt = `당신은 한국 건설현장 안전관리 전문가입니다.
다음 휴일작업에 대해 위험요소 3가지와 개선대유 3가지를 작성하세요.

[작업 정보]
- 용역명: ${taskName}
- 작업위치: ${workPosition} ${workLocation}
- 작업공종: ${workContent}

반드시 JSON만 응답 (다른 텍스트 없이):
{"riskFactors":"1. 위험요소1\n2. 위험요소2\n3. 위험요소3","improvementMeasures":"1. 개선대유\n2. 개선대유\n3. 개선대유"}`;
      const text = await callGemini(prompt, 800);
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");
        const parsed = JSON.parse(clean.slice(start, end + 1));
        return NextResponse.json({ riskFactors: parsed.riskFactors || "", improvementMeasures: parsed.improvementMeasures || "" });
      } catch {
        return NextResponse.json({ riskFactors: text, improvementMeasures: "" });
      }
    }

    // 기타 문서타입 - 특별조치사항
    const riskItems: string[] = [];
    if (fd.riskHighPlace) riskItems.push("고소작업(2m이상)" + (fd.riskHighPlaceDetail ? ": " + fd.riskHighPlaceDetail : ""));
    if (fd.riskWaterWork) riskItems.push("수상·수변작업" + (fd.riskWaterWorkDetail ? ": " + fd.riskWaterWorkDetail : ""));
    if (fd.riskConfinedSpace) riskItems.push("밀폐공간작업" + (fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""));
    if (fd.riskPowerOutage) riskItems.push("정전작업" + (fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""));
    if (fd.riskFireWork) riskItems.push("화기작업" + (fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""));
    const factorMap: Record<string, string> = {
      factorNarrowAccess: "진출입로 협소", factorSlippery: "미끔러짐(이끼,습기)",
      factorSteepSlope: "급경사면", factorWaterHazard: "파랑·유수·수심",
      factorRockfall: "낙석·토사붕괴", factorNoRailing: "난간 미설치",
      factorLadderNoGuard: "사다리·방호울 미설치", factorSuffocation: "질식·화재·폭발",
      factorElectricFire: "감전·전기불꽃 화재", factorSparkFire: "스파크 화염 화재",
    };
    const checkedFactors = Object.entries(factorMap).filter(([k]) => fd[k]).map(([,v]) => v);
    const docLabel = typeLabel[documentType] || "안전서류";
    const prompt = `당신은 한국 건설현장 안전관리 전문가입니다.
${docLabel} 특별조치 필요사항을 작성해주세요.

[작업 정보]
- 용역명: ${taskName}
- 작업위치: ${workLocation}
- 작업내용: ${workContent}
- 위험공종: ${riskItems.join(", ") || "없음"}
- 위험요소: ${checkedFactors.join(", ") || "없음"}

조건: 구체적 안전조치 5~8개, "- "로 시작, 한국어로 작성`;

    const specialMeasures = await callGemini(prompt, 1000);
    return NextResponse.json({ specialMeasures });
  } catch (error) {
    console.error("[POST /api/ai/special-measures]", error);
    return NextResponse.json({ error: `AI 오류: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
