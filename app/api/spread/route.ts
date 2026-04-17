import Groq from "groq-sdk";

export const runtime = "nodejs";

const DEFAULT = {
  count: 3,
  positions: ["과거의 영향", "현재 에너지", "미래의 가능성"],
  description: "흐름을 3장으로 살펴보세요.",
};

export async function POST(req: Request) {
  const { question } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return Response.json(DEFAULT);

  const groq = new Groq({ apiKey });

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
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const text = completion.choices[0]?.message?.content ?? "";
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
