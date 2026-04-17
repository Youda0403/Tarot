"use client";

type Props = {
  text: string;
  loading: boolean;
};

export default function ReadingResult({ text, loading }: Props) {
  if (!text && !loading) return null;

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
          {text && (
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
