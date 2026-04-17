"use client";

type Props = {
  text: string;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export default function ReadingResult({ text, loading, isError, onRetry }: Props) {
  if (!text && !loading && !isError) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-mystic-700/40 bg-mystic-950/60 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-mystic-700/30 flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <h3 className="text-mystic-200 font-semibold text-sm tracking-wide">
            타로 해석
          </h3>
        </div>
        <div className="px-5 py-4">
          {loading && !text && (
            <div className="flex items-center gap-3 text-mystic-400">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-mystic-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-sm">별자리의 기운을 읽는 중...</span>
            </div>
          )}

          {isError && !loading && (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-mystic-300 text-sm text-center leading-relaxed">
                🌫️ AI 서버가 잠시 혼잡해요.<br />
                카드는 그대로 유지되니 해석만 다시 요청해보세요.
              </p>
              <button
                onClick={onRetry}
                className="px-6 py-2.5 rounded-2xl bg-mystic-700/60 border border-mystic-500/50 text-mystic-200 text-sm hover:bg-mystic-600/60 transition-colors"
              >
                ✨ 해석 재생성
              </button>
            </div>
          )}

          {text && !isError && (
            <div className="text-mystic-100 text-sm leading-relaxed whitespace-pre-wrap">
              {text}
              {loading && (
                <span className="inline-block w-0.5 h-4 bg-mystic-400 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
