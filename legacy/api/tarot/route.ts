import Groq from "groq-sdk";
import { type DrawnCard, type SpreadType, SPREADS } from "@/lib/tarot";
import { needsCleanup, fixBanmal, stripForeign, CLEANUP_PROMPT } from "@/lib/cleanText";
import { getClient } from "@/lib/client";

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

function buildSystemPrompt(tone: Tone): string {
  const toneSection = {
    soft: `리딩 스타일:
따뜻하고 포근하게 이야기해요. 질문자의 불안과 아픔을 먼저 충분히 인정한 뒤 방향을 제시해요.
희망적인 면을 강조하되 현실을 외면하지 않아요. 문장이 감싸 안는 느낌이어야 해요.`,
    standard: `리딩 스타일:
균형 잡힌 시각으로 이야기해요. 공감하되 객관적으로, 솔직하되 배려 있게 전달해요.
어려운 현실은 인정하고 가능성도 함께 짚어줘요.`,
    sharp: `리딩 스타일:
핵심만 직접적으로 말해요. 감정적 완충 없이 본질적인 메시지를 먼저 던져요.
질문자가 회피하고 있는 것을 정확히 짚고, 행동 방향을 명확하게 제시해요. 불필요한 위로나 쿠션 없이 솔직하게요.`,
  }[tone];

  return `당신은 한국어 타로 리더예요.

${toneSection}

말투 (절대 규칙):
모든 문장의 어미는 ~해요/~예요/~아요/~어요예요. 예외 없어요.
반말(~야, ~거야, ~이야, ~잖아, ~했어, ~해, ~거든)은 단 하나도 쓰지 않아요.

언어:
한글과 숫자만 사용해요. 한자·영어·일본어·그리스어 등 외국 문자는 절대 쓰지 않아요.
핵심 구절 1~2개는 **굵게** 강조해도 돼요.
섹션 제목 예시: "각 카드 해석:" (콜론으로 끝내기)

반복 금지:
카드 한 장 안에서 같은 내용을 다른 표현으로 반복하지 않아요. 문장마다 새로운 정보예요.
카드마다 고민의 다른 측면(감정/상황/관계/시기 중 하나)을 다뤄요.
종합 메시지에서 개별 카드에서 한 말을 요약하지 않아요.

구조:
각 카드 해석: (카드당 2~3문장)
종합 메시지: (4~5문장. 카드를 합쳐야 보이는 새로운 통찰 — 질문자가 지금 어떤 지점에 서 있는지, 왜 이 상황이 생겼는지, 어느 방향으로 가야 하는지를 구체적으로 짚어줘요. 앞에서 한 말의 요약이 아니라 전체 그림을 본 뒤에만 나올 수 있는 말이어야 해요.)
지금 당신에게 필요한 것: (구체적 행동 하나, 2~3문장)

금지 표현: "에너지가 흐르다", "우주의 뜻", "내면의 목소리", "흐름에 맡기다"`;
}

function buildMessages(question: string, cards: DrawnCard[], positions: string[], tone: Tone) {
  // Only use Korean card name (nameko) — no English name to avoid code-switching
  const cardLines = cards
    .map((card, i) => {
      const direction = card.isReversed ? "역방향" : "정방향";
      const meaning = card.isReversed ? card.reversedMeaning : card.upright;
      return `[${positions[i]}] ${card.nameko} — ${direction}\n  의미: ${meaning}`;
    })
    .join("\n\n");

  const userContent = `질문자의 고민: "${question}"

뽑힌 카드:
${cardLines}

아래 형식으로 리딩을 작성해요. 중요: 각 카드는 서로 다른 측면을 다뤄야 해요. 이미 한 카드에서 말한 내용은 다른 카드에서 반복하지 않아요.

각 카드 해석:
카드 수만큼, 각각 2~3문장. 각 카드가 이 고민의 어떤 측면(감정, 외부 상황, 관계, 시기, 행동 패턴 중 하나)을 비추는지 다르게 접근해요. 질문자의 구체적인 상황에 직접 연결해서 써요.

종합 메시지:
개별 카드 해석에서 하지 않은 말을 해요. 카드 전체를 함께 봤을 때만 보이는 패턴이나 역설, 핵심 통찰을 3문장으로 전달해요. 질문자가 지금 어디에 서 있고 어느 방향으로 가야 하는지 명확하게 말해요.

지금 당신에게 필요한 것:
오늘 당장 실천할 수 있는 구체적인 행동 하나를 2~3문장으로 제안해요. 왜 그 행동이 지금 필요한지 간단히 설명해도 좋아요.`;

  return [
    { role: "system" as const, content: buildSystemPrompt(tone) },
    { role: "user" as const, content: userContent },
  ];
}

function streamText(text: string, encoder: TextEncoder): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const CHUNK = 15;
      const DELAY = 10;
      for (let i = 0; i < text.length; i += CHUNK) {
        controller.enqueue(encoder.encode(text.slice(i, i + CHUNK)));
        if (i + CHUNK < text.length) {
          await new Promise((r) => setTimeout(r, DELAY));
        }
      }
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  const body: RequestBody = await req.json();
  const { question, cards, spreadType, positions, tone = "standard", model } = body;
  const resolvedPositions = positions ?? SPREADS[spreadType]?.positions ?? ["메시지"];

  let llm: ReturnType<typeof getClient>;
  try {
    llm = getClient(model);
  } catch {
    return new Response(
      JSON.stringify({ error: "API 키가 없어요. .env.local을 확인해주세요." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { client: groq, model: resolvedModel } = llm;
  const messages = buildMessages(question, cards, resolvedPositions, tone);
  const encoder = new TextEncoder();
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      // Step 1: Generate reading
      const completion = await groq.chat.completions.create({
        model: resolvedModel,
        messages,
        stream: false,
        temperature: 0.85,
        max_tokens: 1800,
      });

      let finalText = completion.choices[0]?.message?.content ?? "";

      // Step 2: If issues detected, rewrite in pure Korean
      if (needsCleanup(finalText)) {
        const cleaned = await groq.chat.completions.create({
          model: resolvedModel,
          messages: [
            { role: "system" as const, content: CLEANUP_PROMPT },
            { role: "user" as const, content: finalText },
          ],
          stream: false,
          temperature: 0.2,
          max_tokens: 2000,
        });
        const cleanedText = cleaned.choices[0]?.message?.content ?? "";
        // Only use cleanup result if not suspiciously longer (repetition / meta-commentary guard)
        if (cleanedText.length > 0 && cleanedText.length <= finalText.length * 1.4) {
          finalText = cleanedText;
        }
      }

      // Step 3: Final safety — fix 반말 endings, strip foreign chars
      finalText = fixBanmal(finalText);
      finalText = stripForeign(finalText);
      finalText = finalText.replace(/\(\s*\)/g, "").trim();

      return new Response(streamText(finalText, encoder), {
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
