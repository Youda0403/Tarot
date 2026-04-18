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
      return "따뜻하고 포근한 말투로, 상대방을 감싸안듯 위로하며 희망과 용기를 전해주세요.";
    case "sharp":
      return "직관적이고 핵심을 꿰뚫는 말투로, 군더더기 없이 본질적인 메시지를 전달해주세요.";
    default:
      return "균형 잡힌 전문적인 말투로, 객관적이면서도 공감 어린 시각으로 카드를 해석해주세요.";
  }
}

const SYSTEM_PROMPT = `You are a Korean tarot reader giving a focused, practical reading. Respond ONLY in Korean (한글). Rules:
- Use ONLY Korean Hangul, Korean punctuation, and Arabic numerals. Zero exceptions.
- Do NOT write any Chinese characters, Japanese characters, English words, or any non-Korean script.
- Do NOT use markdown (no **, *, #, -, >).
- Speech style: ~해요 / ~예요 / ~아요/어요 endings throughout.
- Section headers: plain text ending with colon, e.g. "각 카드 해석:"

READING QUALITY (CRITICAL):
- Every sentence must directly connect to the questioner's specific situation. Never write generic lines that could apply to anyone.
- FORBIDDEN vague phrases: "에너지가 흐르다", "우주의 뜻", "내면의 목소리를 따르다", "흐름에 맡기다", "빛이 비추다", "별이 말하다", "운명이 이끌다" — these add no value.
- Instead: tell the person what is actually happening in their situation, what the card reveals about their mindset or circumstances, and what concrete shift is needed.
- The action suggestion must be something the person can physically do TODAY (e.g. 특정 대화를 시작하기, 특정 결정을 미루기, 특정 습관을 하루 멈추기) — not a vague mindset shift.
- Acknowledge real difficulty. Do not only say positive things. Cards show both challenges and paths forward.
- Give a clear perspective, not just reassurance. The reader should feel like they got actual guidance.`;

const CLEANUP_PROMPT = `You are a Korean text editor. The text below is a Korean tarot reading that may contain Chinese characters (漢字) or English words mixed in by mistake.

Rewrite it in pure Korean (한글) only. Rules:
- Replace any Chinese/Japanese characters or English words with natural Korean equivalents.
- Keep the same meaning and paragraph structure.
- Keep section headers like "각 카드 해석:", "종합 메시지:", "지금 당신에게 필요한 것:".
- Speech style: ~해요 / ~예요 endings.
- No markdown.
Output ONLY the rewritten Korean text.`;

const CJK_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

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

위 고민과 카드를 바탕으로 아래 형식으로 리딩을 작성해요.
각 문장은 반드시 질문자의 구체적인 상황에 연결되어야 해요. 누구에게나 해당될 수 있는 일반적인 말은 쓰지 않아요.

각 카드 해석:
카드마다: 이 위치(${"{위치 이름}"})가 이 고민에서 무엇을 뜻하는지 → 이 카드가 그 위치에서 드러내는 것이 무엇인지 → 질문자가 지금 어떤 상황이나 심리 상태인지를 구체적으로 2~3문장으로 서술해요.

종합 메시지:
세 카드가 합쳐져서 이 고민에 대해 말하는 핵심 메시지를 3~4문장으로 명확하게 전달해요. "어떻게 해야 한다"는 방향을 분명히 제시해요. 모호한 위로가 아니라 진짜 관점을 줘요.

지금 당신에게 필요한 것:
오늘 당장 실천 가능한 아주 구체적인 행동 하나를 제안해요. (예: "오늘 밤 그 사람에게 먼저 연락해보세요", "지금 당장 지원서 초안을 한 줄만 써보세요") 추상적인 마음가짐이 아니라 실제 행동이어야 해요.`;

  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];
}

function needsCleanup(text: string): boolean {
  if (CJK_RE.test(text)) return true;
  // Check for English words longer than 4 chars (card names in parens already excluded by not using them)
  if (/[A-Za-z]{5,}/.test(text)) return true;
  return false;
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
      // Step 1: Generate reading
      const completion = await groq.chat.completions.create({
        model: resolvedModel,
        messages,
        stream: false,
        temperature: 0.85,
        max_tokens: 1800,
      });

      let finalText = completion.choices[0]?.message?.content ?? "";

      // Step 2: If CJK or English gibberish detected, rewrite in pure Korean
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
        finalText = cleaned.choices[0]?.message?.content ?? finalText;
      }

      // Step 3: Final safety strip of any remaining CJK
      finalText = finalText
        .replace(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]+/g, "")
        .replace(/\(\s*\)/g, "")
        .replace(/ {2,}/g, " ")
        .trim();

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
