import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await req.json();
    const { documentType, formData } = body;
    const fd = formData ?? {};

    const taskName = fd.taskName || fd.serviceName || fd.projectName || "";
    const workLocation = fd.facilityLocation || fd.facilityAddress || fd.workLocation || "";
    const workContent = fd.workContents || fd.workContent || "";
    const workPosition = fd.workPosition || "";

    if (documentType === "HOLIDAY_WORK") {
      const prompt = `당신은 한국 건설현장 안전관리 전문가입니다.
다음 휴일작업에 대해 위험요소 3가지와 개선대유 3가지를 작성하세요.

용역명: ${taskName}
작업위치: ${workPosition} ${workLocation}
작업공종: ${workContent}

아래 JSON 형식으로만 응답하세요 (설명 없이):
{
  "riskFactors": "1. (위험요소 1)
2. (위험요소 2)
3. (위험요소 3)",
  "improvementMeasures": "1. (개선대유 1)
2. (개선대유 2)
3. (개선대유 3)"
}`;

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const aiData = await aiRes.json();
      const text = aiData.content?.[0]?.text || "";
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json({
          riskFactors: parsed.riskFactors || "",
          improvementMeasures: parsed.improvementMeasures || "",
        });
      } catch {
        return NextResponse.json({ riskFactors: text, improvementMeasures: "" });
      }
    }

    // 기존 특별조치사항 생성
    const riskItems: string[] = [];
    if (fd.riskHighPlace) riskItems.push("고소작업(2m이상)" + (fd.riskHighPlaceDetail ? ": " + fd.riskHighPlaceDetail : ""));
    if (fd.riskWaterWork) riskItems.push("수상·수변작업" + (fd.riskWaterWorkDetail ? ": " + fd.riskWaterWorkDetail : ""));
    if (fd.riskConfinedSpace) riskItems.push("밀폐공간작업" + (fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""));
    if (fd.riskPowerOutage) riskItems.push("정전작업" + (fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""));
    if (fd.riskFireWork) riskItems.push("화기작업" + (fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""));
    if (fd.riskOther) riskItems.push("기타위험작업" + (fd.riskOtherDetail ? ": " + fd.riskOtherDetail : ""));

    const checkedFactors: string[] = [];
    const factorMap: Record<string, string> = {
      factorNarrowAccess: "진출입로 협소",
      factorSlippery: "미끔러짐(이끼, 습기)",
      factorSteepSlope: "급경사면",
      factorWaterHazard: "파랑·유수·수심",
      factorRockfall: "낙석·토사붕괴",
      factorNoRailing: "난간 미설치",
      factorLadderNoGuard: "사다리·방호울 미설치",
      factorSuffocation: "질식·화재·폭발",
      factorElectricFire: "감전·전기불꽃 화재",
      factorSparkFire: "스파크, 화염에 의한 화재",
    };
    for (const [key, label] of Object.entries(factorMap)) {
      if (fd[key]) checkedFactors.push(label);
    }

    const docTypeLabel =
      documentType === "SAFETY_WORK_PERMIT" ? "안전작업허가서" :
      documentType === "POWER_OUTAGE" ? "정전작업허가서" :
      documentType === "CONFINED_SPACE" ? "밀폐공간작업허가서" : "안전작업허가서";

    const prompt = `당신은 한국 건설현장 안전관리 전문가입니다.
다음 ${docTypeLabel} 정보를 바탕으로 특별조치 필요사항을 작성해주세요.

용역명: ${taskName}
작업위치: ${workLocation}
작업내용: ${workContent}
위험공종: ${riskItems.join(", ") || "없음"}
위험요소: ${checkedFactors.join(", ") || "없음"}

조건:
- 실제 현장에서 적용 가능한 구체적인 안전조치 사항 5~8개 작성
- 각 항목은 "- "로 시작
- 법적 기준과 현장 실무를 반영
- 한국어로 작성`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const aiData = await aiRes.json();
    const specialMeasures = aiData.content?.[0]?.text || "AI 생성 실패";
    return NextResponse.json({ specialMeasures });
  } catch (error) {
    console.error("[POST /api/ai/special-measures]", error);
    return NextResponse.json({ error: `AI 생성 오류: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
