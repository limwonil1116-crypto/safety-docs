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
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
          }),
        }
      );
      const data = await response.json();
      const cand = data.candidates?.[0];
      const text = ((cand?.content?.parts || []).map((p: any) => p.text || "").join("") as string).trim();
      if (!text) {
        const fr = cand?.finishReason || data?.promptFeedback?.blockReason || "EMPTY";
        throw new Error("Gemini empty response (" + fr + ")");
      }
      return text;
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
      const prompt = `당신은 \ud55c\uad6d\ub18d\uc5b4\ucd0c\uacf5\uc0ac 안전관리 용역감독원입니다.
${docLabel} 신청서를 검토하고 구체적인 안전조치 검토의견 초안을 작성해주세요.

[작업 정보]
- 용역명: ${taskName || "미입력"}
- 작업내용: ${workContent || "미입력"}
- 작업위치: ${workLocation || "미입력"}
- 위험공종: ${riskList}
- 안전조치 해당항목: ${safetyChecks || "미입력"}

\uc791\uc131 \uc694\ub839:
1. \uc81c\ucd9c\ub41c \uc791\uc5c5 \uc815\ubcf4\ub97c \uba74\ubc00\ud788 \ubd84\uc11d\ud558\uace0, \uc774 \ubb38\uc11c\uac00 ${docLabel}(\ubc95\uc815\uc11c\ub958)\uc784\uc744 \uace0\ub824\ud558\uc5ec \uadf8 \ubaa9\uc801\uc5d0 \ubd80\ud569\ud558\uac8c \uc791\uc131
2. \uac01 \uc704\ud5d8\uacf5\uc885\ubcc4 \uc704\ud5d8\uc694\uc778\uacfc \uc548\uc804\uc870\uce58\uc758 \uc801\uc815\uc131\uc744 \uad6c\uccb4\uc801\uc73c\ub85c \ud3c9\uac00
3. \uc704\ud5d8\uc131\ud3c9\uac00 \ub300\uccb4\uc758 \uc801\uc815\uc131 \ud3c9\uac00 \ud3ec\ud568
4. \uc548\uc804\uc870\uce58 \ud574\ub2f9\ud56d\ubaa9\uc5d0 \ub300\ud55c \ud604\uc7a5 \uc2e4\ud589 \uad8c\uace0\uc0ac\ud56d \uc11c\uc220
5. \uc0b0\uc5c5\uc548\uc804\ubcf4\uac74\ubc95 \ubc0f \uc0b0\uc5c5\uc548\uc804\ubcf4\uac74\uae30\uc900\uc5d0 \uad00\ud55c \uaddc\uce59 \ub4f1 \uad00\ub828 \ubc95\ub839\uc744 \uadfc\uac70\ub85c \uc81c\uc2dc\ud558\ub418, \uc815\ud655\ud788 \uc544\ub294 \uacbd\uc6b0\uc5d0\ub9cc \uc870\ubb38 \ubc88\ud638\ub97c \uc778\uc6a9\ud558\uace0 \ubd88\ud655\uc2e4\ud558\uba74 \uaddc\uce59\u00b7\uae30\uc900 \ubd84\uc57c\ub85c\ub9cc \uc5b8\uae09\ud558\uba70 \uc870\ubb38 \ubc88\ud638\ub97c \uc784\uc758\ub85c \ub9cc\ub4e4\uc9c0 \ub9d0 \uac83
6. "- "\ub85c \uc2dc\uc791\ud558\ub294 \ubb38\uc7a5\uc73c\ub85c 7\uac1c \uc774\uc0c1 \uc791\uc131
7. \ub9c8\ud06c\ub2e4\uc6b4 \uc5c6\uc774 \uc21c\uc218 \ud14d\uc2a4\ud2b8, \ud55c\uad6d\uc5b4 \uc11c\uc220\uccb4
8. \uac01 \ud56d\ubaa9\uc740 2~3\ubb38\uc7a5\uc73c\ub85c \uc791\uc131\ud558\uc5ec \ucda9\ubd84\ud55c \ubd84\ub7c9 \uc720\uc9c0`;
      const specialMeasures = await callGemini(prompt, 5000);
      return NextResponse.json({ specialMeasures });
    }

    // 휴일작업 - 위험요소/개선대유
    if (documentType === "HOLIDAY_WORK") {
      const prompt = `당신은 한국 건설현장 안전관리 전문가입니다.
\ub2e4\uc74c \ud734\uc77c\uc791\uc5c5\uc758 \uc81c\ucd9c \uc815\ubcf4\ub97c \ubd84\uc11d\ud558\uc5ec, \uc0b0\uc5c5\uc548\uc804\ubcf4\uac74\uae30\uc900\uc5d0 \uad00\ud55c \uaddc\uce59 \ub4f1 \uad00\ub828 \uae30\uc900\uc5d0 \ubd80\ud569\ud558\ub294 \uc704\ud5d8\uc694\uc18c 3\uac00\uc9c0\uc640 \uac1c\uc120\ub300\ucc45 3\uac00\uc9c0\ub97c \uc791\uc131\ud558\uc138\uc694.

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
      factorNarrowAccess: "진출입로 협소", factorSlippery: "미끄러짐(이끼, 습기)",
      factorSteepSlope: "급경사면", factorWaterHazard: "파랑·유수·수심",
      factorRockfall: "낙석·토사붕괴", factorNoRailing: "난간 미설치",
      factorLadderNoGuard: "사다리·방호울 미설치", factorSuffocation: "질식·화재·폭발",
      factorElectricFire: "감전·전기불꽃 화재", factorSparkFire: "스파크 화염 화재",
    };
    const checkedFactors = Object.entries(factorMap).filter(([k]) => fd[k]).map(([,v]) => v);
    const docLabel = typeLabel[documentType] || "안전서류";
    const prompt = `당신은 한국 건설현장 안전관리 전문가입니다.
\uc81c\ucd9c\ub41c \uc791\uc5c5 \uc815\ubcf4\ub97c \uba74\ubc00\ud788 \ubd84\uc11d\ud558\uace0, \uc774 \ubb38\uc11c\uac00 ${docLabel}(\ubc95\uc815\uc11c\ub958)\uc784\uc744 \uace0\ub824\ud558\uc5ec \ud2b9\ubcc4\uc870\uce58 \ud544\uc694\uc0ac\ud56d\uc744 \uc791\uc131\ud574\uc8fc\uc138\uc694.

[작업 정보]
- 용역명: ${taskName}
- 작업위치: ${workLocation}
- 작업내용: ${workContent}
- 위험공종: ${riskItems.join(", ") || "없음"}
- 위험요소: ${checkedFactors.join(", ") || "없음"}

\uc870\uac74: \uc0b0\uc5c5\uc548\uc804\ubcf4\uac74\ubc95 \ubc0f \uc0b0\uc5c5\uc548\uc804\ubcf4\uac74\uae30\uc900\uc5d0 \uad00\ud55c \uaddc\uce59 \ub4f1 \uad00\ub828 \ubc95\ub839\uc744 \uadfc\uac70\ub85c \ud55c \uad6c\uccb4\uc801 \uc548\uc804\uc870\uce58 5~8\uac1c, "- "\ub85c \uc2dc\uc791, \ud55c\uad6d\uc5b4\ub85c \uc791\uc131. \uc815\ud655\ud788 \uc544\ub294 \uacbd\uc6b0\uc5d0\ub9cc \uc870\ubb38 \ubc88\ud638\ub97c \uc778\uc6a9\ud558\uace0, \ubd88\ud655\uc2e4\ud558\uba74 \uaddc\uce59\u00b7\uae30\uc900 \ubd84\uc57c\ub85c\ub9cc \uc5b8\uae09\ud558\uba70 \uc870\ubb38 \ubc88\ud638\ub97c \uc784\uc758\ub85c \ub9cc\ub4e4\uc9c0 \ub9d0 \uac83.`;

    const specialMeasures = await callGemini(prompt, 1000);
    return NextResponse.json({ specialMeasures });
  } catch (error) {
    console.error("[POST /api/ai/special-measures]", error);
    return NextResponse.json({ error: `AI 오류: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
