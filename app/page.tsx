"use client";

import { useState, useCallback } from "react";
import QuestionForm from "@/components/QuestionForm";
import SpreadLayout from "@/components/SpreadLayout";
import ReadingResult from "@/components/ReadingResult";
import { drawCards, type DrawnCard, type SpreadInfo } from "@/lib/tarot";

type Stage = "input" | "cards" | "reading";

const DEFAULT_SPREAD: SpreadInfo = {
  type: "three",
  count: 3,
  positions: ["과거", "현재", "미래"],
  description: "과거·현재·미래의 흐름을 3장으로 살펴보세요.",
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("input");
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [spread, setSpread] = useState<SpreadInfo>(DEFAULT_SPREAD);
  const [readingText, setReadingText] = useState("");
  const [loadingReading, setLoadingReading] = useState(false);
  const [loadingSpread, setLoadingSpread] = useState(false);

  const determineSpread = async (q: string): Promise<SpreadInfo> => {
    try {
      const res = await fetch("/api/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) return DEFAULT_SPREAD;
      const data = await res.json();
      const count: number = data.count ?? 3;
      const type = count === 1 ? "one" : count === 5 ? "five" : "three";
      return {
        type,
        count,
        positions: data.positions ?? DEFAULT_SPREAD.positions,
        description: data.description ?? "",
      };
    } catch {
      return DEFAULT_SPREAD;
    }
  };

  const handleQuestionSubmit = async (q: string) => {
    setQuestion(q);
    setLoadingSpread(true);
    const chosenSpread = await determineSpread(q);
    setSpread(chosenSpread);
    setCards(drawCards(chosenSpread.count));
    setReadingText("");
    setLoadingSpread(false);
    setStage("cards");
  };

  const handleAllRevealed = useCallback(async () => {
    setStage("reading");
    setLoadingReading(true);
    setReadingText("");

    try {
      const res = await fetch("/api/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, cards, spreadType: spread.type, positions: spread.positions }),
      });

      if (!res.ok || !res.body) throw new Error("API 오류");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setReadingText(text);
      }
    } catch (err) {
      setReadingText("해석을 불러오는 중 오류가 발생했습니다. GEMINI_API_KEY를 확인해주세요.");
    } finally {
      setLoadingReading(false);
    }
  }, [question, cards, spread]);

  const handleReset = () => {
    setStage("input");
    setQuestion("");
    setCards([]);
    setReadingText("");
    setLoadingReading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 gap-10">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-mystic-300 via-purple-200 to-mystic-300 bg-clip-text text-transparent">
          ✨ 타로 리딩
        </h1>
        <p className="text-mystic-400 text-sm">
          별자리와 카드가 당신의 이야기를 들려드립니다
        </p>
      </header>

      {/* Stage: input */}
      {stage === "input" && (
        <div className="w-full max-w-xl animate-fade-in">
          <QuestionForm onSubmit={handleQuestionSubmit} loading={loadingSpread} />
        </div>
      )}

      {/* Stage: cards / reading */}
      {(stage === "cards" || stage === "reading") && (
        <div className="w-full max-w-2xl space-y-8">
          {/* Question recap */}
          <div className="text-center bg-mystic-950/50 border border-mystic-700/30 rounded-2xl px-5 py-3">
            <p className="text-mystic-400 text-xs mb-1">질문</p>
            <p className="text-mystic-100 text-sm">{question}</p>
          </div>

          {/* Spread type badge */}
          <div className="flex justify-center">
            <span className="px-4 py-1.5 rounded-full bg-mystic-800/60 border border-mystic-600/40 text-mystic-300 text-xs font-medium">
              {spread.type === "one" && "원 카드 스프레드"}
              {spread.type === "three" && "쓰리 카드 스프레드"}
              {spread.type === "five" && "파이브 카드 스프레드"}
            </span>
          </div>

          <SpreadLayout
            cards={cards}
            spread={spread}
            onAllRevealed={handleAllRevealed}
          />

          {stage === "reading" && (
            <ReadingResult text={readingText} loading={loadingReading} />
          )}

          {/* Reset button */}
          {stage === "reading" && !loadingReading && readingText && (
            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-2xl border border-mystic-600/50 text-mystic-300 text-sm hover:bg-mystic-800/40 transition-colors"
              >
                🔄 다시 뽑기
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
