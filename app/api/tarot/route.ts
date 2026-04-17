import Groq from "groq-sdk";
import { type DrawnCard, type SpreadType, SPREADS } from "@/lib/tarot";

export const runtime = "nodejs";

type Tone = "soft" | "standard" | "sharp";

type RequestBody = {
  question: string;
  cards: DrawnCard[];
  spreadType: SpreadType;
  positions?: string[];
  tone?: Tone;
  model?: string;
};

function getToneInstruction(tone: Tone): string {
  switch (tone) {
    case "soft":
      return "따뜻하고 포근한 말투로, 상대방을 감싸안듯 위로하며 희망과 용기를 전해주세요. 부드럽고 다정한 표현을 사용해요.";
    case "sharp":
      return "직관적이고 핵심을 꿰뚫는 말투로, 군더더기 없이 본질적인 메시지를 전달해주세요. 강렬하고 인상적인 표현을 사용해요.";
    default:
      return "균형 잡힌 전문적인 말투로, 객관적이면서도 공감 어린 시각으로 카드를 해석해주세요.";
  }
}

const SYSTEM_PROMPT = `You are an expert tarot reader with 20 years of experience. You MUST follow these rules without exception:

LANGUAGE RULES (CRITICAL):
- Write ONLY in Korean (한국어). Do NOT use any Chinese characters (漢字), Japanese hiragana, katakana, or any CJK characters under any circumstances.
- Do NOT mix in any English words, Latin phrases, or foreign language terms.
- Use ONLY Korean Hangul (가-힣), standard Korean punctuation, and Arabic numerals.
- Card names in English (in parentheses) are the only exception.

FORMAT RULES (CRITICAL):
- Do NOT use any markdown: no **, no *, no #, no >, no - bullet points, no backticks.
- Section headers must use plain text with a colon only (e.g. "각 카드 해석:").
- Use natural paragraph breaks with blank lines between sections.

SPEECH STYLE:
- Always use polite Korean ending style: ~해요, ~예요, ~이에요, ~아요/어요.
- Never use formal ~합니다 style or casual 반말.`;

function buildMessages(question: string, cards: DrawnCard[], positions: string[], tone: Tone) {
  const cardLines = cards
    .map((card, i) => {
      const direction = card.isReversed ? "역방향" : "정방향";
      const meaning = card.isReversed ? card.reversedMeaning : card.upright;
      return `[${positions[i]}] ${card.nameko} (${card.name}) — ${direction}\n  의미: ${meaning}\n  키워드: ${card.keywords.join(", ")}`;
    })
    .join("\n\n");

  const toneInstruction = getToneInstruction(tone);

  const userContent = `${toneInstruction}

질문자의 고민: "${question}"

뽑힌 카드:
${cardLines}

아래 구조로 타로 리딩을 작성해요. 반드시 순수 한국어(한글)로만, 마크다운 없이 작성해요.

각 카드 해석:
각 카드의 위치 의미와 카드의 메시지를 연결하여 2~3문장씩 해석해요.

종합 메시지:
카드 전체가 전하는 핵심 흐름과 조언을 3~4문장으로 정리해요.

지금 당신에게 필요한 것:
지금 바로 실천할 수 있는 구체적인 행동이나 마음가짐 한 가지를 제안해요.

부정적인 예언은 하지 않아요. 역방향 카드도 성장과 변화의 기회로 해석해요.`;

  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];
}

export async function POST(req: Request) {
  const body: RequestBody = await req.json();
  const { question, cards, spreadType, positions, tone = "standard", model = "llama-3.3-70b-versatile" } = body;
  const resolvedPositions = positions ?? SPREADS[spreadType]?.positions ?? ["메시지"];
  const resolvedModel = ["llama-3.3-70b-versatile", "gemma2-9b-it"].includes(model)
    ? model
    : "llama-3.3-70b-versatile";

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY가 설정되지 않았습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const groq = new Groq({ apiKey });
  const messages = buildMessages(question, cards, resolvedPositions, tone);

  const encoder = new TextEncoder();
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const completion = await groq.chat.completions.create({
        model: resolvedModel,
        messages,
        stream: true,
        temperature: 0.85,
        max_tokens: 1800,
      });

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    } catch (err) {
      const isServiceError =
        err instanceof Error &&
        (err.message.includes("503") || err.message.includes("Service Unavailable") || err.message.includes("UNAVAILABLE"));

      if (isServiceError && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }

      return new Response(JSON.stringify({ status: "Service Unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ status: "Service Unavailable" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
