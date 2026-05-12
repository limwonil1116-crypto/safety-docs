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

    const docTypeLabel =
      documentType === "SAFETY_WORK_PERMIT" ? "안전작업허가서" :
      documentType === "POWER_OUTAGE" ? "정전작업허가서" :
      documentType === "CONFINED_SPACE" ? "밀폐공간작업허가서" :
      documentType === "HOLIDAY_WORK" ? "휴일작업신고서" : "안전서류";

    // HOLIDAY_WORK: 위험요소/개선대유 리스트 반환
    if (documentType === "HOLIDAY_WORK") {
      const prompt = [
        "당신은 한국 건설현장 안전관리 전문가입니다.",
        "다음 휴일작업에 대해 위험요소 3가지와 개선대유 3가지를 작성하세요.",
        "",
        "[작업 정보]",
        "- 용역명: " + (taskName || "미입력"),
        "- 작업위치: " + (workPosition + " " + workLocation).trim(),
        "- 작업공종: " + (workContent || "미입력"),
        "",
        "응답 형식: 백틱 없이 JSON만 응답하세요.",
        '{"riskFactors":"1. 위험요소1\n2. 위험요소2\n3. 위험요소3","improvementMeasures":"1. 개선대유\n2. 개선대유\n3. 개선대유"}',
      ].join("\n");

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
          }),
        }
      );
      const data = await response.json();
      const rawText = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({
          riskFactors: parsed.riskFactors || "",
          improvementMeasures: parsed.improvementMeasures || "",
        });
      } catch {
        return NextResponse.json({ riskFactors: cleaned, improvementMeasures: "" });
      }
    }

    // 기타 문서타입: 특별조치사항 생성
    const riskItems: string[] = [];
    if (fd.riskHighPlace) riskItems.push("고소작업(2m이상)" + (fd.riskHighPlaceDetail ? ": " + fd.riskHighPlaceDetail : ""));
    if (fd.riskWaterWork) riskItems.push("수상·수변작업" + (fd.riskWaterWorkDetail ? ": " + fd.riskWaterWorkDetail : ""));
    if (fd.riskConfinedSpace) riskItems.push("밀폐공간작업" + (fd.riskConfinedSpaceDetail ? ": " + fd.riskConfinedSpaceDetail : ""));
    if (fd.riskPowerOutage) riskItems.push("정전작업" + (fd.riskPowerOutageDetail ? ": " + fd.riskPowerOutageDetail : ""));
    if (fd.riskFireWork) riskItems.push("화기작업" + (fd.riskFireWorkDetail ? ": " + fd.riskFireWorkDetail : ""));

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

    const prompt = [
      "당신은 한국 건설현장 안전관리 전문가입니다.",
      `다음 ${docTypeLabel} 정보를 바탕으로 특별조치 필요사항을 작성해주세요.`,
      "",
      "[작업 정보]",
      "- 용역명: " + (taskName || "미입력"),
      "- 작업위치: " + (workLocation || "미입력"),
      "- 작업내용: " + (workContent || "미입력"),
      "- 위험공종: " + (riskItems.join(", ") || "없음"),
      "- 위험요소: " + (checkedFactors.join(", ") || "없음"),
      "",
      "조건:",
      "- 실제 현장에서 적용 가능한 구체적인 안전조치 5~8개",
      '- 각 항목은 "- "로 시작',
      "- 한국어로 작성",
    ].join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
        }),
      }
    );
    const data = await response.json();
    const specialMeasures = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
    return NextResponse.json({ specialMeasures });
  } catch (error) {
    console.error("[POST /api/ai/special-measures]", error);
    return NextResponse.json({ error: `AI 오류: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
