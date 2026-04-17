import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const DEFAULT = {
  count: 3,
  positions: ["과거", "현재", "미래"],
  description: "과거·현재·미래의 흐름을 3장으로 살펴보세요.",
};

async function callWithRetry(fn: () => Promise<string>, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is503 = msg.includes("503") || msg.includes("UNAVAILABLE");
      if (is503 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, (i + 1) * 1500));
        continue;
      }
      throw err;
    }
  }
  throw new Error("최대 재시도 횟수 초과");
}

export async function POST(req: Request) {
  const { question } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json(DEFAULT);

  const ai = new GoogleGenAI({ apiKey, apiVersion: "v1" });

  const prompt = `당신은 타로 마스터입니다. 아래 고민에 가장 잘 맞는 타로 스프레드를 설계해주세요.

고민: "${question}"

카드 수 기준:
- 1장: 간단한 yes/no, 오늘의 메시지
- 3장: 일반적인 상황, 감정, 인간관계 (가장 일반적)
- 5장: 복잡한 진로, 깊은 관계 갈등, 여러 요소가 얽힌 고민

반드시 아래 JSON 형식만 출력하세요 (다른 텍스트 없이):
{"count": 3, "positions": ["위치1", "위치2", "위치3"], "description": "한 문장 설명"}

positions 길이는 count와 같아야 합니다. 위치 이름은 2~6글자로 이 고민에 딱 맞게 지어주세요.`;

  try {
    const text = await callWithRetry(async () => {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return result.text ?? "";
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const parsed = JSON.parse(jsonMatch[0]);

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
