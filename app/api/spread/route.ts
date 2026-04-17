import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { question } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({
      count: 3,
      positions: ["과거", "현재", "미래"],
      description: "과거·현재·미래의 흐름을 3장으로 살펴보세요.",
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `당신은 타로 마스터입니다. 아래 고민에 가장 잘 맞는 타로 스프레드를 설계해주세요.

고민: "${question}"

규칙:
- 카드 수는 1장, 3장, 5장 중 하나만 선택
  - 1장: 간단한 yes/no, 오늘의 메시지
  - 3장: 일반적인 상황, 감정, 인간관계
  - 5장: 복잡한 진로, 깊은 관계 갈등, 여러 요소가 얽힌 고민
- 각 카드 위치 이름은 이 고민에 딱 맞게 2-5글자로 창의적으로 지어주세요
- 설명은 한 문장으로

반드시 아래 JSON 형식만 출력하세요 (다른 텍스트 없이):
{"count": 3, "positions": ["위치1", "위치2", "위치3"], "description": "한 문장 설명"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const parsed = JSON.parse(jsonMatch[0]);

    const count = [1, 3, 5].includes(parsed.count) ? parsed.count : 3;
    const positions =
      Array.isArray(parsed.positions) && parsed.positions.length === count
        ? parsed.positions
        : count === 1
        ? ["메시지"]
        : count === 3
        ? ["과거", "현재", "미래"]
        : ["현재 상황", "장애물", "조언", "가능한 결과", "핵심 메시지"];

    return Response.json({
      count,
      positions,
      description: parsed.description ?? "",
    });
  } catch {
    return Response.json({
      count: 3,
      positions: ["과거", "현재", "미래"],
      description: "과거·현재·미래의 흐름을 3장으로 살펴보세요.",
    });
  }
}
