"use client";

import { useState, useCallback, useRef } from "react";
import QuestionForm from "@/components/QuestionForm";
import SpreadLayout from "@/components/SpreadLayout";
import ReadingResult from "@/components/ReadingResult";
import { drawCards, type DrawnCard, type SpreadInfo } from "@/lib/tarot";
import { detectSpread } from "@/lib/spread";

type Stage = "input" | "cards" | "reading";

export default function Home() {
  const [stage, setStage] = useState<Stage>("input");
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [spread, setSpread] = useState<SpreadInfo | null>(null);
  const [readingText, setReadingText] = useState("");
  const [loadingReading, setLoadingReading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleQuestionSubmit = (q: string) => {
    setQuestion(q);
    const chosenSpread = detectSpread(q);
    setSpread(chosenSpread);
    setCards(drawCards(chosenSpread.count));
    setReadingText("");
    setStage("cards");
  };

  const handleAllRevealed = useCallback(async () => {
    if (!spread) return;
    setStage("reading");
    setLoadingReading(true);
    setIsError(false);
    setReadingText("");

    try {
      const res = await fetch("/api/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          cards,
          spreadType: spread.type,
          positions: spread.positions,
        }),
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
    } catch {
      setIsError(true);
    } finally {
      setLoadingReading(false);
    }
  }, [question, cards, spread]);

  const handleSaveImage = async () => {
    if (!resultRef.current) return;
    setSavingImage(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: "#0d0a1a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = "tarot-reading.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("이미지 저장에 실패했습니다.");
    } finally {
      setSavingImage(false);
    }
  };

  const handleReset = () => {
    setStage("input");
    setQuestion("");
    setCards([]);
    setSpread(null);
    setReadingText("");
    setLoadingReading(false);
    setIsError(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 gap-10">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-mystic-300 via-purple-200 to-mystic-300 bg-clip-text text-transparent">
          ✨ 타로 리딩
        </h1>
        <p className="text-mystic-400 text-sm">
          별자리와 카드가 당신의 이야기를 들려드립니다
        </p>
      </header>

      {stage === "input" && (
        <div className="w-full max-w-xl">
          <QuestionForm onSubmit={handleQuestionSubmit} loading={false} />
        </div>
      )}

      {(stage === "cards" || stage === "reading") && spread && (
        <div className="w-full max-w-2xl space-y-8">
          <div ref={resultRef} className="space-y-8">
            {/* Question recap */}
            <div className="text-center bg-mystic-950/50 border border-mystic-700/30 rounded-2xl px-5 py-3">
              <p className="text-mystic-400 text-xs mb-1">질문</p>
              <p className="text-mystic-100 text-sm">{question}</p>
            </div>

            {/* Spread badge */}
            <div className="flex flex-col items-center gap-1">
              <span className="px-4 py-1.5 rounded-full bg-mystic-800/60 border border-mystic-600/40 text-mystic-300 text-xs font-medium">
                {spread.count}장 스프레드
              </span>
              {spread.description && (
                <p className="text-mystic-500 text-xs">{spread.description}</p>
              )}
            </div>

            <SpreadLayout
              cards={cards}
              spread={spread}
              onAllRevealed={handleAllRevealed}
            />

            {stage === "reading" && (
              <ReadingResult
                text={readingText}
                loading={loadingReading}
                isError={isError}
                onRetry={handleAllRevealed}
              />
            )}
          </div>

          {/* Buttons */}
          {stage === "reading" && !loadingReading && readingText && (
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleSaveImage}
                disabled={savingImage}
                className="px-6 py-2.5 rounded-2xl bg-mystic-700/60 border border-mystic-500/50 text-mystic-200 text-sm hover:bg-mystic-600/60 transition-colors disabled:opacity-50"
              >
                {savingImage ? "저장 중..." : "🖼️ 이미지로 저장"}
              </button>
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
