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
- Speech style: EVERY sentence must end with ~해요/~예요/~아요/~어요. NEVER use 반말 (~야, ~거야, ~해, ~잖아, ~이야). Not even once.
- Section headers: plain text ending with colon, e.g. "각 카드 해석:"

READING STRUCTURE (CRITICAL — read carefully):
1. Each card MUST reveal a completely different dimension of the situation. If card 1 talks about emotions, card 2 must talk about something else entirely (external circumstances, relationships, timing, etc). NEVER repeat the same theme across cards.
2. Within a single card's interpretation: every sentence must say something NEW. Do NOT restate the same idea in different words within the same paragraph. 2~3 sentences per card is enough — do not pad.
3. The 종합 메시지 must deliver insight that ONLY emerges from combining all cards together — something that wasn't said in any individual card section. Do NOT summarize what was already said.
4. The action suggestion must be a specific, physically doable action with brief reasoning (2~3 sentences total).

FORBIDDEN: vague phrases like "에너지가 흐르다", "우주의 뜻", "내면의 목소리", "흐름에 맡기다", "빛이 비추다". Every sentence must be grounded in the questioner's actual situation.
REQUIRED: acknowledge real difficulty honestly before offering direction. Do not only reassure.`;

const CLEANUP_PROMPT = `You are a Korean text editor. The text below is a Korean tarot reading that may contain Chinese characters (漢字) or English words mixed in by mistake.

Rewrite it in pure Korean (한글) only. Rules:
- Replace any Chinese/Japanese characters or English words with natural Korean equivalents.
- Keep the same meaning and paragraph structure.
- Keep section headers like "각 카드 해석:", "종합 메시지:", "지금 당신에게 필요한 것:".
- Speech style: EVERY sentence must end with ~해요/~예요/~아요/~어요. NEVER use 반말 (~야, ~거야, ~해, ~잖아, ~이야). Not even once.
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
  const ALLOWED_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
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
