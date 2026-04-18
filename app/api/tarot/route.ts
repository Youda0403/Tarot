import Groq from "groq-sdk";
import { type DrawnCard, type SpreadType, SPREADS } from "@/lib/tarot";
import { needsCleanup, fixBanmal, stripForeign, CLEANUP_PROMPT } from "@/lib/cleanText";

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
      return "따뜻하고 포근한 말투로, 상대방을 감싸안듯 위로하며 희망과 용기를 전해주세요.";
    case "sharp":
      return "직관적이고 핵심을 꿰뚫는 말투로, 군더더기 없이 본질적인 메시지를 전달해주세요.";
    default:
      return "균형 잡힌 전문적인 말투로, 객관적이면서도 공감 어린 시각으로 카드를 해석해주세요.";
  }
}

const SYSTEM_PROMPT = `당신은 한국어 타로 리더예요.

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

금지 표현: "에너지가 흐르다", "우주의 뜻", "내면의 목소리", "흐름에 맡기다"
어려운 현실은 솔직히 인정한 뒤 방향을 제시해요.`;

function buildMessages(question: string, cards: DrawnCard[], positions: string[], tone: Tone) {
  // Only use Korean card name (nameko) — no English name to avoid code-switching
  const cardLines = cards
    .map((card, i) => {
      const direction = card.isReversed ? "역방향" : "정방향";
      const meaning = card.isReversed ? card.reversedMeaning : card.upright;
      return `[${positions[i]}] ${card.nameko} — ${direction}\n  의미: ${meaning}`;
    })
    .join("\n\n");

  const toneInstruction = getToneInstruction(tone);

  const userContent = `말투: ${toneInstruction}

질문자의 고민: "${question}"

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
    { role: "system" as const, content: SYSTEM_PROMPT },
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
  const { question, cards, spreadType, positions, tone = "standard", model = "meta-llama/llama-4-scout-17b-16e-instruct" } = body;
  const resolvedPositions = positions ?? SPREADS[spreadType]?.positions ?? ["메시지"];
  const ALLOWED_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ];
  const resolvedModel = ALLOWED_MODELS.includes(model) ? model : "llama-3.3-70b-versatile";

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
