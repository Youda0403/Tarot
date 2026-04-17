"use client";

import { forwardRef } from "react";

type Props = {
  text: string;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
};

const ReadingResult = forwardRef<HTMLDivElement, Props>(
  ({ text, loading, isError, onRetry }, ref) => {
    if (!text && !loading && !isError) return null;

    return (
      <div ref={ref} className="w-full max-w-2xl mx-auto">
        <div className="rounded-2xl border border-sky-300 bg-white/70 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-sky-200 flex items-center gap-2 bg-sky-50/80">
            <span className="text-lg">🔮</span>
            <h3 className="text-sky-800 font-semibold text-sm tracking-wide">타로 해석</h3>
          </div>
          <div className="px-5 py-4">
            {loading && !text && (
              <div className="flex items-center gap-3 text-sky-600">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <span className="text-sm">별자리의 기운을 읽는 중...</span>
              </div>
            )}

            {isError && !loading && (
              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-sky-700 text-sm text-center leading-relaxed">
                  🌫️ AI 서버가 잠시 혼잡해요.<br />
                  카드는 그대로 유지되니 해석만 다시 요청해보세요.
                </p>
                <button
                  onClick={onRetry}
                  className="px-6 py-2.5 rounded-2xl bg-sky-600 border border-sky-500 text-white text-sm hover:bg-sky-700 transition-colors"
                >
                  ✨ 해석 재생성
                </button>
              </div>
            )}

            {text && !isError && (
              <div className="text-sky-900 text-sm leading-relaxed whitespace-pre-wrap">
                {text}
                {loading && (
                  <span className="inline-block w-0.5 h-4 bg-sky-500 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ReadingResult.displayName = "ReadingResult";

export default ReadingResult;
