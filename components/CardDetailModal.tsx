"use client";

import type { DrawnCard } from "@/lib/tarot";

type Props = {
  card: DrawnCard;
  position: string;
  onClose: () => void;
};

export default function CardDetailModal({ card, position, onClose }: Props) {
  const meaning = card.isReversed ? card.reversedMeaning : card.upright;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-sky-900/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl border border-sky-300 shadow-xl max-w-sm w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sky-500 text-xs mb-0.5">{position}</p>
            <h2 className="text-sky-900 font-bold text-xl">{card.nameko}</h2>
            <p className="text-sky-400 text-xs">{card.name}</p>
          </div>
          <span className="text-5xl">{card.image}</span>
        </div>

        <span
          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
            card.isReversed ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
          }`}
        >
          {card.isReversed ? "역방향" : "정방향"}
        </span>

        <div>
          <p className="text-sky-500 text-xs font-medium mb-1">의미</p>
          <p className="text-sky-900 text-sm leading-relaxed">{meaning}</p>
        </div>

        <div>
          <p className="text-sky-500 text-xs font-medium mb-1.5">키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {card.keywords.map((k) => (
              <span key={k} className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">
                {k}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
