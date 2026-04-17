"use client";

import { useState } from "react";
import type { DrawnCard } from "@/lib/tarot";

type Props = {
  card: DrawnCard;
  position: string;
  index: number;
  revealed: boolean;
  onReveal: () => void;
};

export default function TarotCard({ card, position, index, revealed, onReveal }: Props) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = () => {
    if (!flipped) {
      setFlipped(true);
      setTimeout(onReveal, 300);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sky-300 text-xs font-medium tracking-widest uppercase">
        {position}
      </span>
      <div
        className="relative w-28 h-48 cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={handleClick}
      >
        <div
          className="relative w-full h-full transition-transform duration-700"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Card back */}
          <div
            className="absolute inset-0 rounded-2xl border border-sky-700/60 flex items-center justify-center overflow-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-950 via-ocean-900 to-sky-950" />
            <div className="absolute inset-2 rounded-xl border border-sky-600/30" />
            <span className="relative text-4xl">🌟</span>
          </div>

          {/* Card front */}
          <div
            className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center gap-2 overflow-hidden ${
              card.isReversed ? "border-amber-500/60" : "border-sky-400/60"
            }`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className={`absolute inset-0 ${
              card.isReversed
                ? "bg-gradient-to-br from-amber-950 via-sky-950 to-amber-950"
                : "bg-gradient-to-br from-sky-900 via-ocean-800 to-sky-950"
            }`} />
            <div
              className="relative flex flex-col items-center gap-1.5 px-2"
              style={{ transform: card.isReversed ? "rotate(180deg)" : "none" }}
            >
              <span className="text-3xl">{card.image}</span>
              <p className="text-white text-center text-xs font-semibold leading-tight">
                {card.nameko}
              </p>
              <p className="text-sky-300 text-center text-[10px]">{card.name}</p>
            </div>
            {card.isReversed && (
              <span className="absolute bottom-2 text-amber-400 text-[9px] font-medium tracking-wide">
                역방향
              </span>
            )}
          </div>
        </div>

        {!flipped && (
          <div className="absolute -bottom-5 inset-x-0 flex justify-center">
            <span className="text-sky-500 text-[10px]">탭하여 공개</span>
          </div>
        )}
      </div>
    </div>
  );
}
