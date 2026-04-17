import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SpreadType } from "@/lib/tarot";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { question } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ spreadType: "three" as SpreadType });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `다음 질문에 가장 어울리는 타로 스프레드를 골라주세요.

질문: "${question}"

스프레드 옵션:
- "one": 간단한 yes/no 질문, 오늘의 메시지, 짧은 조언 요청
- "three": 일반적인 상황 파악, 인간관계, 감정적 고민 (가장 일반적)
- "five": 복잡한 진로/직업 고민, 깊은 인간관계 분석, 여러 요소가 얽힌 상황

반드시 "one", "three", "five" 중 하나만 JSON으로 답하세요.
예시: {"spreadType": "three"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const match = text.match(/"spreadType"\s*:\s*"(one|three|five)"/);
    const spreadType: SpreadType = (match?.[1] as SpreadType) ?? "three";
    return Response.json({ spreadType });
  } catch {
    return Response.json({ spreadType: "three" as SpreadType });
  }
}
