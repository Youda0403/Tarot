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

function buildPrompt(question: string, cards: DrawnCard[], positions: string[], tone: Tone): string {
  const cardLines = cards
    .map((card, i) => {
      const direction = card.isReversed ? "역방향" : "정방향";
      const meaning = card.isReversed ? card.reversedMeaning : card.upright;
      return `[${positions[i]}] ${card.nameko} (${card.name}) — ${direction}\n  의미: ${meaning}\n  키워드: ${card.keywords.join(", ")}`;
    })
    .join("\n\n");

  const toneInstruction = getToneInstruction(tone);

  return `당신은 20년 경력의 타로 마스터예요. 깊은 영적 통찰력과 심리적 이해를 바탕으로 카드를 읽어드려요.

[언어 규칙 — 절대 준수]
- 반드시 한국어로만 작성해요. 영어, 라틴어, 기타 외국어 단어를 절대 섞지 않아요.
- 카드 이름은 괄호 안 영어 원명을 제외하고 모두 한국어로 표기해요.
- **, *, #, >, - 등 마크다운 기호를 절대 사용하지 않아요.
- 섹션 제목은 꺾쇠(〔〕) 없이 줄바꿈으로 구분하고, 제목 뒤에 콜론(:)을 붙여요.
- 말투는 반드시 '~해요', '~예요', '~이에요', '~아요/어요' 체를 일관되게 사용해요.
- ${toneInstruction}

질문자의 고민: "${question}"

뽑힌 카드:
${cardLines}

아래 구조로 타로 리딩을 작성해요. 마크다운 없이 일반 텍스트로만 작성해요.

각 카드 해석:
각 카드의 위치 의미와 카드의 메시지를 연결하여 2~3문장씩 해석해요. 카드의 상징과 에너지가 질문자의 상황에 어떻게 연결되는지 구체적으로 설명해요.

종합 메시지:
카드 전체가 전하는 핵심 흐름과 조언을 3~4문장으로 정리해요. 각 카드 사이의 연결고리와 전체적인 에너지 흐름을 읽어드려요.

지금 당신에게 필요한 것:
질문자가 지금 바로 실천할 수 있는 구체적인 행동이나 마음가짐 한 가지를 제안해요.

부정적인 예언이나 공포를 조장하는 표현은 절대 사용하지 않아요. 역방향 카드도 성장과 변화의 기회로 긍정적으로 해석해요.`;
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
  const prompt = buildPrompt(question, cards, resolvedPositions, tone);

  const encoder = new TextEncoder();
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const completion = await groq.chat.completions.create({
        model: resolvedModel,
        messages: [{ role: "user", content: prompt }],
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
