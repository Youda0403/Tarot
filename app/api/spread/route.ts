import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const DEFAULT = {
  count: 3,
  positions: ["과거", "현재", "미래"],
  description: "과거·현재·미래의 흐름을 3장으로 살펴보세요.",
};

export async function POST(req: Request) {
  const { question } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json(DEFAULT);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `당신은 타로 마스터입니다. 아래 고민에 가장 잘 맞는 타로 스프레드를 설계해주세요.

고민: "${question}"

카드 수 기준:
- 1장: 간단한 yes/no, 오늘의 메시지
- 3장: 일반적인 상황, 감정, 인간관계 (가장 일반적)
- 5장: 복잡한 진로, 깊은 관계 갈등, 여러 요소가 얽힌 고민

다음 JSON 스키마로 응답하세요:
{
  "count": 3,
  "positions": ["이 고민에 맞는 위치 이름1", "위치 이름2", "위치 이름3"],
  "description": "이 스프레드에 대한 한 문장 설명"
}

positions 배열 길이는 반드시 count와 같아야 합니다.
위치 이름은 2~6글자로 이 고민에 딱 맞게 창의적으로 지어주세요.`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    const count: number = [1, 3, 5].includes(parsed.count) ? parsed.count : 3;
    const positions: string[] =
      Array.isArray(parsed.positions) && parsed.positions.length === count
        ? parsed.positions
        : DEFAULT.positions;

    return Response.json({ count, positions, description: parsed.description ?? "" });
  } catch {
    return Response.json(DEFAULT);
  }
}
