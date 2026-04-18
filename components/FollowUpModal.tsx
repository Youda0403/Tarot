"use client";

import { useState, useEffect } from "react";
import type { DrawnCard } from "@/lib/tarot";

type Props = {
  card: DrawnCard;
  position: string;
  question: string;
  model: string;
  onClose: () => void;
};

export default function FollowUpModal({ card, position, question, model, onClose }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchFollowUp = async () => {
    setLoading(true);
    setIsError(false);
    setText("");
    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card, position, question, model }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setText(result);
      }
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUp();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-sky-900/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl border border-sky-300 shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-sky-200 flex items-center gap-3">
          <span className="text-3xl">{card.image}</span>
          <div>
            <p className="text-sky-500 text-xs">{position}</p>
            <p className="text-sky-900 font-semibold text-sm">{card.nameko}</p>
          </div>
        </div>

        <div className="px-6 py-5 min-h-[120px]">
          {loading && !text && (
            <div className="flex items-center gap-2 text-sky-500 text-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span>카드의 메시지를 읽는 중...</span>
            </div>
          )}
          {isError && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sky-600 text-sm text-center">잠시 서버가 혼잡해요.</p>
              <button
                onClick={fetchFollowUp}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs hover:bg-sky-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}
          {text && (
            <p className="text-sky-900 text-sm leading-relaxed">
              {text}
              {loading && (
                <span className="inline-block w-0.5 h-4 bg-sky-400 ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-sky-600 text-white text-sm hover:bg-sky-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
