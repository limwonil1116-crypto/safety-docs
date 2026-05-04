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

    const riskItems: string[] = [];
    if (fd.riskHighPlace) {
      const details = Array.isArray(fd.riskHighPlaceItems) ? (fd.riskHighPlaceItems as string[]).join(", ") : "";
      riskItems.push("고소작업(2m이상)" + (details ? ": " + details : "") + (fd.riskHighPlaceDetail ? ", " + fd.riskHighPlaceDetail : ""));
    }
    if (fd.riskWaterWork) {
      const details = Array.isArray(fd.riskWaterWorkItems) ? (fd.riskWaterWorkItems as string[]).join(", ") : "";
      riskItems.push("수상·수중작업" + (details ? ": " + details : "") + (fd.riskWaterWorkDetail ? ", " + fd.riskWaterWorkDetail : ""));
    }
    if (fd.riskConfinedSpace) riskItems.push("밀폐공간작업" + (fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""));
    if (fd.riskPowerOutage) riskItems.push("정전작업" + (fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""));
    if (fd.riskFireWork) riskItems.push("화기작업" + (fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""));
    if (fd.riskOther) riskItems.push("기타" + (fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""));

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
    };
    const checkedFactors = Object.entries(factorLabels)
      .filter(([key]) => !!(fd as any)[key])
      .map(([, label]) => label);

    const safetyChecks: string[] = Array.isArray(fd.safetyChecks)
      ? (fd.safetyChecks as any[]).filter(c => c.applicable === "해당").map((c: any) => c.label)
      : [];

    const riskRows: string[] = Array.isArray(fd.riskRows)
      ? (fd.riskRows as any[])
          .filter(r => r.riskFactor)
          .map((r: any) => "위험요소: " + r.riskFactor + (r.improvement ? " / 개선대책: " + r.improvement : ""))
      : [];

    const riskItemsStr = riskItems.length > 0 ? riskItems.map(r => "- " + r).join("\n") : "- 없음";
    const factorsStr = checkedFactors.length > 0 ? checkedFactors.map(f => "- " + f).join("\n") : "- 없음";
    const safetyStr = safetyChecks.length > 0 ? safetyChecks.map(s => "- " + s).join("\n") : "- 없음";
    const riskRowsStr = riskRows.length > 0 ? riskRows.join("\n") : "- 없음";

    const workContent = String(fd.workContent || fd.workContents || "미입력");
    const workLocation = String(fd.workLocation || fd.workAddress || fd.facilityLocation || "미입력");
    const workStart = String(fd.workStartDate || fd.workDate || "미입력");
    const workEnd = String(fd.workEndDate || "");
    const entryList = String(fd.entryList || fd.participants || "미입력");
    const workStartTime = String(fd.workStartTime || "");
    const workEndTime = String(fd.workEndTime || "");
    const needFire = fd.needFireWork || fd.riskFireWork ? "해당" : "해당없음";
    const needConfined = fd.needConfinedSpace || fd.riskConfinedSpace ? "해당" : "해당없음";
    const useEngine = String(fd.useInternalEngine || "미입력");

    const prompt = [
      "당신은 한국농어촌공사 안전관리 전문가입니다.",
      "아래 " + docTypeLabel + "의 신청 내용을 면밀히 분석하여, 해당 작업의 특수성과 위험요소에 맞는 구체적인 특별조치 필요사항을 작성해주세요.",
      "",
      "[신청 작업 정보]",
      "- 작업내용: " + workContent,
      "- 작업장소: " + workLocation,
      "- 작업기간: " + workStart + " ~ " + workEnd,
      "- 작업시간: " + workStartTime + " ~ " + workEndTime,
      "- 출입자 명단: " + entryList,
      "",
      "[위험공종 (신청자 선택)]",
      riskItemsStr,
      "",
      "[발생 예상 위험요소 (신청자 선택)]",
      factorsStr,
      "",
      "[안전조치 이행사항 (해당 항목)]",
      safetyStr,
      "",
      "[위험요소 및 개선대책 (신청자 작성)]",
      riskRowsStr,
      "",
      "[특별 조건]",
      "- 밀폐공간 작업: " + needConfined,
      "- 화기작업: " + needFire,
      "- 내연기관 사용: " + useEngine,
      "",
      "위 신청 내용을 바탕으로, 이 작업에서 반드시 지켜야 할 특별조치 필요사항을 작성해주세요.",
      "",
      "작성 규칙:",
      "1. 반드시 위 신청 내용(작업내용, 위험공종, 위험요소 등)을 구체적으로 반영할 것",
      "2. 일반적인 안전수칙이 아닌, 이 작업에 특화된 조치사항을 작성할 것",
      "3. 각 항목은 '- '로 시작하고 구체적인 수치나 방법을 포함할 것",
      "4. 반드시 5개 이상 항목 작성(최대 8개), 각 항목은 완전한 문장 1~2줄로 작성할 것",
      "5. 한국어로 작성하고, 다른 설명이나 제목 없이 항목만 출력할 것",
      "6. 매우 중요: 각 항목은 '~할 것.' 또는 '~하여야 한다.' 식으로 나라하는 완전한 문장으로 끝내야 함",
      "7. 절대 문장 도중에 끊어서는 안 됨 - 한 항목을 완전히 작성한 후 다음 항목으로 넘어갈 것",
      "8. 잘만든 예시: '- 방조제 제방시면 배수갑문 작업시 납님방지를 위해 안전대(Y형 갑, 로프 쭐결)를 착용하고, 작업진해진에 돌입하기 전 채결기 연결 상태를 관리감독자가 친히 확인한 후 작업을 시작할 것.'",
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
          generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
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
