"use client";

import { useState, useCallback, useRef } from "react";
import QuestionForm from "@/components/QuestionForm";
import SpreadLayout from "@/components/SpreadLayout";
import ReadingResult from "@/components/ReadingResult";
import { drawCards, type DrawnCard, type SpreadInfo } from "@/lib/tarot";
import { detectSpread } from "@/lib/spread";

type Stage = "input" | "cards" | "reading";
export type Tone = "soft" | "standard" | "sharp";

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: "soft", label: "🌸 부드럽게", desc: "따뜻하고 위로하는 말투" },
  { id: "standard", label: "✨ 표준", desc: "균형 잡힌 전문적 말투" },
  { id: "sharp", label: "🔮 날카롭게", desc: "직관적이고 핵심을 찌르는 말투" },
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("input");
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [spread, setSpread] = useState<SpreadInfo | null>(null);
  const [readingText, setReadingText] = useState("");
  const [loadingReading, setLoadingReading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [tone, setTone] = useState<Tone>("standard");
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
          tone,
        }),
      });

      if (!res.ok) throw new Error("API 오류");
      if (!res.body) throw new Error("응답 없음");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setReadingText(text);
      }

      if (text.includes('"code":503') || text.includes("UNAVAILABLE") || text.includes('"status":"Service Unavailable"')) {
        setReadingText("");
        setIsError(true);
      }
    } catch {
      setIsError(true);
    } finally {
      setLoadingReading(false);
    }
  }, [question, cards, spread, tone]);

  const handleSaveImage = async () => {
    if (!resultRef.current) return;
    setSavingImage(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: "#07192b",
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
    <main className="min-h-screen flex flex-col items-center px-4 py-12 gap-8">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-300 via-ocean-200 to-sky-300 bg-clip-text text-transparent">
          ✨ 타로 리딩
        </h1>
        <p className="text-sky-400 text-sm">
          별자리와 카드가 당신의 이야기를 들려드립니다
        </p>
      </header>

      {stage === "input" && (
        <>
          {/* Tone selector */}
          <div className="w-full max-w-xl space-y-2">
            <p className="text-sky-400 text-xs text-center">리딩 톤 선택</p>
            <div className="flex gap-2 justify-center">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  title={t.desc}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    tone === t.id
                      ? "bg-sky-700/70 border-sky-400 text-white shadow-lg shadow-sky-900/40"
                      : "bg-transparent border-sky-700/40 text-sky-400 hover:border-sky-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xl">
            <QuestionForm onSubmit={handleQuestionSubmit} loading={false} />
          </div>
        </>
      )}

      {(stage === "cards" || stage === "reading") && spread && (
        <div className="w-full max-w-2xl space-y-8">
          {/* Question recap */}
          <div className="text-center bg-sky-950/50 border border-sky-700/30 rounded-2xl px-5 py-3">
            <p className="text-sky-400 text-xs mb-1">질문</p>
            <p className="text-sky-100 text-sm">{question}</p>
          </div>

          {/* Spread badge */}
          <div className="flex flex-col items-center gap-1">
            <span className="px-4 py-1.5 rounded-full bg-sky-900/60 border border-sky-600/40 text-sky-300 text-xs font-medium">
              {spread.count}장 스프레드
            </span>
            {spread.description && (
              <p className="text-sky-500 text-xs">{spread.description}</p>
            )}
          </div>

          <SpreadLayout cards={cards} spread={spread} onAllRevealed={handleAllRevealed} />

          {/* Result — only this section is saved as image */}
          {stage === "reading" && (
            <ReadingResult
              ref={resultRef}
              text={readingText}
              loading={loadingReading}
              isError={isError}
              onRetry={handleAllRevealed}
            />
          )}

          {/* Buttons */}
          {stage === "reading" && !loadingReading && readingText && (
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleSaveImage}
                disabled={savingImage}
                className="px-6 py-2.5 rounded-2xl bg-sky-700/60 border border-sky-500/50 text-sky-200 text-sm hover:bg-sky-600/60 transition-colors disabled:opacity-50"
              >
                {savingImage ? "저장 중..." : "🖼️ 이미지로 저장"}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-2xl border border-sky-600/50 text-sky-300 text-sm hover:bg-sky-800/40 transition-colors"
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
