import { GoogleGenerativeAI } from "@google/generative-ai";
import { type DrawnCard, type SpreadType, SPREADS } from "@/lib/tarot";

export const runtime = "nodejs";

type RequestBody = {
  question: string;
  cards: DrawnCard[];
  spreadType: SpreadType;
  positions?: string[];
};

function buildPrompt(
  question: string,
  cards: DrawnCard[],
  positions: string[]
): string {
  const cardLines = cards
    .map((card, i) => {
      const direction = card.isReversed ? "역방향" : "정방향";
      const meaning = card.isReversed ? card.reversedMeaning : card.upright;
      return `[${positions[i]}] ${card.nameko} (${card.name}) — ${direction}\n  의미: ${meaning}\n  키워드: ${card.keywords.join(", ")}`;
    })
    .join("\n\n");

  return `당신은 15년 경력의 타로 마스터입니다. 따뜻하고 공감적이며 영적인 분위기로 한국어로 답변해주세요.

질문자의 고민: "${question}"

뽑힌 카드:
${cardLines}

위 카드들을 바탕으로 다음 형식으로 타로 리딩을 해주세요:

1. 각 카드별 해석 (위치의 의미와 카드의 메시지를 연결해서 2-3문장)
2. 종합 메시지 (뽑힌 카드들 전체가 질문자에게 전하는 핵심 조언, 3-4문장)
3. 행동 제안 (질문자가 지금 당장 할 수 있는 작은 행동 1가지)

따뜻하고 구체적이며 희망적인 톤으로 작성해주세요. 절대 부정적이거나 무서운 예언은 하지 마세요.`;
}

export async function POST(req: Request) {
  const body: RequestBody = await req.json();
  const { question, cards, spreadType, positions } = body;
  const resolvedPositions = positions ?? SPREADS[spreadType]?.positions ?? ["메시지"];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = buildPrompt(question, cards, resolvedPositions);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        controller.enqueue(encoder.encode(`\n\n오류: ${msg}`));
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
}
