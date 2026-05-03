import type { DrawnCard } from "@/lib/tarot";
import { needsCleanup, fixBanmal, stripForeign, CLEANUP_PROMPT } from "@/lib/cleanText";
import { getClient } from "@/lib/client";

export const runtime = "nodejs";

type RequestBody = {
  card: DrawnCard;
  position: string;
  question: string;
  model?: string;
};

export async function POST(req: Request) {
  const { card, position, question, model }: RequestBody = await req.json();

  let llm: ReturnType<typeof getClient>;
  try {
    llm = getClient(model);
  } catch {
    return new Response(JSON.stringify({ status: "no key" }), { status: 500 });
  }

  const { client: groq, model: resolvedModel } = llm;
  const direction = card.isReversed ? "역방향" : "정방향";
  const meaning = card.isReversed ? card.reversedMeaning : card.upright;

  try {
    const completion = await groq.chat.completions.create({
      model: resolvedModel,
      messages: [
        {
          role: "system",
          content:
            "You are a Korean tarot reader. Rules: Write ONLY in Korean (한글). No Chinese/Japanese characters. No markdown. " +
            "SPEECH STYLE (CRITICAL): Use ONLY ~해요/~예요/~아요/~어요 endings. NEVER use casual 반말 endings (~야, ~거야, ~해, ~잖아, ~이야, ~겠어). Every single sentence must end in ~해요 or ~예요 style. " +
            "NO REPETITION: Each sentence must say something completely different. Do not restate the same idea in different words. 3~4 sentences only, each adding new insight.",
        },
        {
          role: "user",
          content: `질문자의 고민: "${question}"

아래 카드에 대해 더 깊이 알고 싶어해요:
위치: ${position}
카드: ${card.nameko} — ${direction}
의미: ${meaning}
키워드: ${card.keywords.join(", ")}

이 카드 하나에만 집중해서 이 고민과의 연결고리를 더 깊이 풀어주세요. 3~4문장으로, 메인 리딩에서 미처 다루지 못한 새로운 시각이나 구체적인 통찰을 담아주세요.`,
        },
      ],
      stream: false,
      temperature: 0.8,
      max_tokens: 500,
    });

    let text = completion.choices[0]?.message?.content ?? "";

    if (needsCleanup(text)) {
      const cleaned = await groq.chat.completions.create({
        model: resolvedModel,
        messages: [
          { role: "system", content: CLEANUP_PROMPT },
          { role: "user", content: text },
        ],
        stream: false,
        temperature: 0.2,
        max_tokens: 600,
      });
      const cleanedText = cleaned.choices[0]?.message?.content ?? "";
      if (cleanedText.length > 0 && cleanedText.length <= text.length * 1.4) {
        text = cleanedText;
      }
    }

    text = fixBanmal(text);
    text = stripForeign(text);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const CHUNK = 15;
        for (let i = 0; i < text.length; i += CHUNK) {
          controller.enqueue(encoder.encode(text.slice(i, i + CHUNK)));
          if (i + CHUNK < text.length) await new Promise((r) => setTimeout(r, 10));
        }
        controller.close();
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    return new Response(JSON.stringify({ status: "error" }), { status: 503 });
  }
}
