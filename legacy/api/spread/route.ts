import Groq from "groq-sdk";
import { detectSpread } from "@/lib/spread";
import { stripForeign } from "@/lib/cleanText";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { question } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return Response.json(detectSpread(question));

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a tarot spread designer. Respond ONLY with a single valid JSON object. No explanation, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Design the most fitting tarot spread for this question: "${question}"

Return ONLY this JSON:
{"count": <1|3|5>, "positions": [<Korean strings>], "description": "<one sentence in Korean>"}

Rules:
- 1 card: yes/no or very short questions
- 3 cards: most questions — invent CREATIVE Korean position names that match this exact question's theme
- 5 cards: major life decisions, complex conflicts

Creative 3-card position examples (match the theme, don't just copy):
- Love: ["나의 마음", "상대의 마음", "우리의 앞날"]
- Career choice: ["현재 에너지", "넘어야 할 관문", "결실"]
- Self-doubt: ["지금의 나", "내가 놓친 것", "나아갈 방향"]
- Conflict: ["상황의 본질", "숨겨진 요소", "해결의 실마리"]
- Decision: ["선택의 에너지", "고려해야 할 것", "최선의 방향"]

positions array length MUST equal count. Respond ONLY with JSON.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON");

    const parsed = JSON.parse(jsonMatch[0]);
    const count: number = [1, 3, 5].includes(parsed.count) ? parsed.count : 3;
    // Validate positions: correct length, each name ≥ 2 chars, none starting with "의 " (truncated genitive)
    const rawPositions: string[] = Array.isArray(parsed.positions) ? parsed.positions : [];
    const positionsValid =
      rawPositions.length === count &&
      rawPositions.every((p: string) => typeof p === "string" && p.trim().length >= 2 && !p.trim().startsWith("의 "));
    const positions: string[] = positionsValid ? rawPositions : detectSpread(question).positions;

    const type = count === 1 ? "one" : count === 5 ? "five" : "three";

    const description = typeof parsed.description === "string" ? stripForeign(parsed.description) : "";
    const cleanPositions = positions.map((p: string) => stripForeign(p));

    return Response.json({ type, count, positions: cleanPositions, description });
  } catch {
    return Response.json(detectSpread(question));
  }
}
