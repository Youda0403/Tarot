"use client";

import { useState, useEffect } from "react";
import TarotCard from "./TarotCard";
import type { DrawnCard, SpreadInfo } from "@/lib/tarot";

type Props = {
  cards: DrawnCard[];
  spread: SpreadInfo;
  onAllRevealed: () => void;
  onShowDetail: (card: DrawnCard, position: string) => void;
};

export default function SpreadLayout({ cards, spread, onAllRevealed, onShowDetail }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (revealedCount === cards.length) {
      onAllRevealed();
    }
  }, [revealedCount, cards.length, onAllRevealed]);

  return (
    <div className="w-full space-y-4">
      {revealedCount < cards.length && (
        <p className="text-sky-500 text-xs text-center">
          카드를 탭하여 하나씩 공개하세요 ({revealedCount}/{cards.length})
        </p>
      )}

      <div
        className={`flex flex-wrap justify-center gap-6 py-4 ${
          spread.type === "five" ? "max-w-2xl mx-auto" : ""
        }`}
      >
        {cards.map((card, i) => (
          <TarotCard
            key={card.id}
            card={card}
            position={spread.positions[i]}
            index={i}
            revealed={i < revealedCount}
            onReveal={() => setRevealedCount((c) => Math.max(c, i + 1))}
            onShowDetail={() => onShowDetail(card, spread.positions[i])}
          />
        ))}
      </div>
    </div>
  );
}
