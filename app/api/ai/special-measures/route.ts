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

    // 위험공종 상세
    const riskItems: string[] = [];
    if (fd.riskHighPlace) {
      const details = Array.isArray(fd.riskHighPlaceItems) ? (fd.riskHighPlaceItems as string[]).join(", ") : "";
      riskItems.push(`고소작업(2m이상)${details ? ": " + details : ""}${fd.riskHighPlaceDetail ? ", " + fd.riskHighPlaceDetail : ""}`);
    }
    if (fd.riskWaterWork) {
      const details = Array.isArray(fd.riskWaterWorkItems) ? (fd.riskWaterWorkItems as string[]).join(", ") : "";
      riskItems.push(`수상·수중작업${details ? ": " + details : ""}${fd.riskWaterWorkDetail ? ", " + fd.riskWaterWorkDetail : ""}`);
    }
    if (fd.riskConfinedSpace) riskItems.push(`밀폐공간작업${fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""}`);
    if (fd.riskPowerOutage) riskItems.push(`정전작업${fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""}`);
    if (fd.riskFireWork) riskItems.push(`화기작업${fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""}`);
    if (fd.riskOther) riskItems.push(`기타${fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""}`);

    // 발생 위험요소
    const factorLabels: Record<string, string> = {
      factorNarrowAccess: "접근통로 협소",
      factorSlippery: "미끄러운 지반",
      factorSteepSlope: "급경사면",
      factorWaterHazard: "익수·유수",
      factorRockfall: "낙석·굴러떨어짐",
      factorNoRailing: "안전난간 미설치",
      factorLadderNoGuard: "사다리 방호울 미설치",
      factorSuffocation: "질식·산소결핍·유해가스",
      factorElectricFire: "감전·전기화재요인",
      factorSparkFire: "불꽃·불티에 의한 화재",
      factorOther: `기타${fd.factorOtherDetail ? "(" + fd.factorOtherDetail + ")" : ""}`,
    };
    const checkedFactors = Object.entries(factorLabels)
      .filter(([key]) => !!(fd as any)[key])
      .map(([, label]) => label);

    // 안전조치 이행사항
    const safetyChecks = Array.isArray(fd.safetyChecks)
      ? (fd.safetyChecks as any[])
          .filter(c => c.applicable === "해당")
          .map((c: any) => c.label)
      : [];

    // 위험요소/개선대책
    const riskRows = Array.isArray(fd.riskRows)
      ? (fd.riskRows as any[])
          .filter(r => r.riskFactor)
          .map((r: any) => `위험요소: ${r.riskFactor}${r.improvement ? " / 개선대책: " + r.improvement : ""}`)
      : [];

    // 안전조치 미이행 항목
    const notChecked = Array.isArray(fd.safetyChecks)
      ? (fd.safetyChecks as any[])
          .filter(c => c.applicable === "해당없음" || !c.applicable)
          .map((c: any) => c.label)
      : [];

    const prompt = `당신은 한국농어촌공사 안전관리 전문가입니다.
아래 ${docTypeLabel}의 신청 내용을 면밀히 분석하여, 해당 작업의 특수성과 위험요소에 맞는 구체적인 특별조치 필요사항을 작성해주세요.

[신청 작업 정보]
- 작업내용: ${fd.workContent || fd.workContents || "미입력"}
- 작업장소: ${fd.workLocation || fd.workAddress || fd.facilityLocation || "미입력"}
- 작업기간: ${fd.workStartDate || fd.workDate || "미입력"} ~ ${fd.workEndDate || ""}
- 작업시간: ${fd.workStartTime || ""} ~ ${fd.workEndTime || ""}
- 출입자 명단: ${fd.entryList || fd.participants || "미입력"}

[위험공종 (신청자 선택)]
${riskItems.length > 0 ? riskItems.map(r => "- " + r).join("
") : "- 없음"}

[발생 예상 위험요소 (신청자 선택)]
${checkedFactors.length > 0 ? checkedFactors.map(f => "- " + f).join("
") : "- 없음"}

[안전조치 이행사항 (해당 항목)]
${safetyChecks.length > 0 ? safetyChecks.map(s => "- " + s).join("
") : "- 없음"}

[위험요소 및 개선대책 (신청자 작성)]
${riskRows.length > 0 ? riskRows.join("
") : "- 없음"}

[특별 조건]
- 밀폐공간 작업: ${fd.needConfinedSpace || fd.riskConfinedSpace ? "해당" : "해당없음"}
- 화기작업: ${fd.needFireWork || fd.riskFireWork ? "해당" : "해당없음"}
- 내연기관 사용: ${fd.useInternalEngine || "미입력"}

위 신청 내용을 바탕으로, 이 작업에서 반드시 지켜야 할 특별조치 필요사항을 작성해주세요.

작성 규칙:
1. 반드시 위 신청 내용(작업내용, 위험공종, 위험요소 등)을 구체적으로 반영할 것
2. 일반적인 안전수칙이 아닌, 이 작업에 특화된 조치사항을 작성할 것
3. 각 항목은 "- "로 시작하고 구체적인 수치나 방법을 포함할 것
4. 최소 5줄 이상 작성하되, 필요시 7줄까지 작성 가능
5. 한국어로 작성하고, 다른 설명이나 제목 없이 항목만 출력할 것`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.4,
          },
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
