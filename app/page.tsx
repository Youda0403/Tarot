"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import QuestionForm from "@/components/QuestionForm";
import SpreadLayout from "@/components/SpreadLayout";
import ReadingResult from "@/components/ReadingResult";
import { drawCards, type DrawnCard, type SpreadInfo } from "@/lib/tarot";
import { detectSpread } from "@/lib/spread";
import type { SpreadType } from "@/lib/tarot";

type Stage = "input" | "cards" | "reading";
export type Tone = "soft" | "standard" | "sharp";

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: "soft", label: "🌸 부드럽게", desc: "따뜻하고 위로하는 말투" },
  { id: "standard", label: "✨ 표준", desc: "균형 잡힌 전문적 말투" },
  { id: "sharp", label: "🔮 날카롭게", desc: "직관적이고 핵심을 찌르는 말투" },
];

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "안정적" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick", desc: "다국어 강함" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout", desc: "빠름·여유" },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

export default function Home() {
  const [stage, setStage] = useState<Stage>("input");
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [spread, setSpread] = useState<SpreadInfo | null>(null);
  const [readingText, setReadingText] = useState("");
  const [loadingSpread, setLoadingSpread] = useState(false);
  const [loadingReading, setLoadingReading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [tone, setTone] = useState<Tone>("standard");
  const [model, setModel] = useState<ModelId>("llama-3.3-70b-versatile");
  const resultRef = useRef<HTMLDivElement>(null);

  // Push a history entry when leaving input, so browser back brings user back here
  useEffect(() => {
    if (stage !== "input") {
      history.pushState({ stage }, "");
    }
  }, [stage]);

  // Browser back button → return to input (keep question/tone/model)
  useEffect(() => {
    const handlePopState = () => {
      setStage("input");
      setCards([]);
      setSpread(null);
      setReadingText("");
      setLoadingReading(false);
      setIsError(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleBack = () => {
    setStage("input");
    setCards([]);
    setSpread(null);
    setReadingText("");
    setLoadingReading(false);
    setIsError(false);
  };

  const handleQuestionSubmit = async (q: string) => {
    setQuestion(q);
    setLoadingSpread(true);
    setReadingText("");

    let chosenSpread: SpreadInfo;
    try {
      const res = await fetch("/api/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("spread API failed");
      const data = await res.json();
      chosenSpread = {
        type: (data.type ?? "three") as SpreadType,
        count: data.count,
        positions: data.positions,
        description: data.description ?? "",
      };
    } catch {
      chosenSpread = detectSpread(q);
    }

    setSpread(chosenSpread);
    setCards(drawCards(chosenSpread.count));
    setLoadingSpread(false);
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
          model,
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
  }, [question, cards, spread, tone, model]);

  const handleSaveImage = async () => {
    if (!resultRef.current) return;
    setSavingImage(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: "#e0f2fe",
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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-700 via-ocean-500 to-sky-700 bg-clip-text text-transparent">
          ✨ 타로 리딩
        </h1>
        <p className="text-sky-600 text-sm">
          별자리와 카드가 당신의 이야기를 들려드립니다
        </p>
      </header>

      {stage === "input" && (
        <>
          {/* Tone selector */}
          <div className="w-full max-w-xl space-y-2">
            <p className="text-sky-600 text-xs text-center font-medium">리딩 톤</p>
            <div className="flex gap-2 justify-center">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  title={t.desc}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    tone === t.id
                      ? "bg-sky-600 border-sky-500 text-white shadow-md"
                      : "bg-white/60 border-sky-300 text-sky-700 hover:border-sky-500 hover:bg-white/80"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          <div className="w-full max-w-xl space-y-2">
            <p className="text-sky-600 text-xs text-center font-medium">AI 모델</p>
            <div className="flex gap-2 justify-center">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  title={m.desc}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                    model === m.id
                      ? "bg-sky-600 border-sky-500 text-white shadow-md"
                      : "bg-white/60 border-sky-300 text-sky-700 hover:border-sky-500 hover:bg-white/80"
                  }`}
                >
                  {m.label}
                  <span className="ml-1.5 opacity-70">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xl">
            {loadingSpread ? (
              <div className="flex flex-col items-center gap-3 py-8 text-sky-600">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-sky-500 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <p className="text-sm">고민을 읽고 스프레드를 짜는 중이에요...</p>
              </div>
            ) : (
              <QuestionForm onSubmit={handleQuestionSubmit} loading={false} />
            )}
          </div>
        </>
      )}

      {(stage === "cards" || stage === "reading") && spread && (
        <div className="w-full max-w-2xl space-y-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sky-600 text-sm hover:text-sky-800 transition-colors"
          >
            ← 뒤로 (모델/톤 변경)
          </button>

          {/* Question recap */}
          <div className="text-center bg-white/50 border border-sky-300/60 rounded-2xl px-5 py-3">
            <p className="text-sky-600 text-xs mb-1">질문</p>
            <p className="text-sky-900 text-sm">{question}</p>
          </div>

          {/* Spread badge */}
          <div className="flex flex-col items-center gap-1">
            <span className="px-4 py-1.5 rounded-full bg-sky-100 border border-sky-300 text-sky-700 text-xs font-medium">
              {spread.count}장 스프레드
            </span>
            {spread.description && (
              <p className="text-sky-600 text-xs">{spread.description}</p>
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
                className="px-6 py-2.5 rounded-2xl bg-sky-600 border border-sky-500 text-white text-sm hover:bg-sky-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {savingImage ? "저장 중..." : "🖼️ 이미지로 저장"}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-2xl bg-white/60 border border-sky-300 text-sky-700 text-sm hover:bg-white/80 transition-colors shadow-sm"
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
