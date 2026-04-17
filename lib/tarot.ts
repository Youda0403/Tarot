import { TAROT_CARDS, type Card } from "@/data/cards";

export type DrawnCard = Card & { isReversed: boolean };

export type SpreadType = "one" | "three" | "five";

export type SpreadInfo = {
  type: SpreadType;
  count: number;
  positions: string[];
  description: string;
};

export const SPREADS: Record<SpreadType, SpreadInfo> = {
  one: {
    type: "one",
    count: 1,
    positions: ["메시지"],
    description: "오늘의 핵심 메시지를 한 장으로 확인하세요.",
  },
  three: {
    type: "three",
    count: 3,
    positions: ["과거", "현재", "미래"],
    description: "과거·현재·미래의 흐름을 3장으로 살펴보세요.",
  },
  five: {
    type: "five",
    count: 5,
    positions: ["현재 상황", "장애물", "조언", "가능한 결과", "핵심 메시지"],
    description: "상황을 5가지 관점에서 깊게 분석해 드립니다.",
  },
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function drawCards(count: number): DrawnCard[] {
  return shuffle(TAROT_CARDS)
    .slice(0, count)
    .map((card) => ({ ...card, isReversed: Math.random() < 0.5 }));
}
