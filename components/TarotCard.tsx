"use client";

import { useState } from "react";
import type { DrawnCard } from "@/lib/tarot";

type Props = {
  card: DrawnCard;
  position: string;
  index: number;
  revealed: boolean;
  onReveal: () => void;
  onShowDetail?: () => void;
};

export default function TarotCard({ card, position, index, revealed, onReveal, onShowDetail }: Props) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = () => {
    if (!flipped) {
      setFlipped(true);
      setTimeout(onReveal, 300);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sky-700 text-xs font-medium tracking-widest uppercase">
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
            className="absolute inset-0 rounded-2xl border border-sky-400 flex items-center justify-center overflow-hidden shadow-md"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-ocean-400 to-sky-500" />
            <div className="absolute inset-2 rounded-xl border border-white/40" />
            <span className="relative text-4xl">🌟</span>
          </div>

          {/* Card front */}
          <div
            className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center gap-2 overflow-hidden shadow-md ${
              card.isReversed ? "border-amber-400" : "border-sky-400"
            }`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className={`absolute inset-0 ${
              card.isReversed
                ? "bg-gradient-to-br from-amber-50 via-sky-50 to-amber-100"
                : "bg-gradient-to-br from-white via-sky-50 to-sky-100"
            }`} />
            <div
              className="relative flex flex-col items-center gap-1.5 px-2"
              style={{ transform: card.isReversed ? "rotate(180deg)" : "none" }}
            >
              <span className="text-3xl">{card.image}</span>
              <p className="text-sky-900 text-center text-xs font-semibold leading-tight">
                {card.nameko}
              </p>
              <p className="text-sky-600 text-center text-[10px]">{card.name}</p>
            </div>
            {card.isReversed && (
              <span className="absolute bottom-2 text-amber-600 text-[9px] font-medium tracking-wide">
                역방향
              </span>
            )}
          </div>
        </div>

        {flipped ? (
          <button
            onClick={(e) => { e.stopPropagation(); onShowDetail?.(); }}
            className="absolute -bottom-6 inset-x-0 flex justify-center"
          >
            <span className="text-sky-500 text-[10px] hover:text-sky-700 transition-colors">
              📖 상세
            </span>
          </button>
        ) : (
          <div className="absolute -bottom-5 inset-x-0 flex justify-center">
            <span className="text-sky-600 text-[10px]">탭하여 공개</span>
          </div>
        )}
      </div>
    </div>
  );
}
