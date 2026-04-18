"use client";

import { useState, useEffect } from "react";
import { loadHistory, deleteReading, type HistoryEntry } from "@/lib/history";

export default function ReadingHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  if (history.length === 0) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteReading(id);
    setHistory(loadHistory());
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="w-full max-w-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/50 border border-sky-300/60 text-sky-700 text-sm hover:bg-white/70 transition-colors"
      >
        <span>📜 지난 리딩 ({history.length})</span>
        <span className="text-sky-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {history.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelected(entry)}
              className="flex items-start justify-between px-4 py-3 rounded-xl bg-white/60 border border-sky-200 cursor-pointer hover:bg-white/80 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sky-800 text-xs font-medium truncate">{entry.question}</p>
                <p className="text-sky-400 text-[10px] mt-0.5">
                  {new Date(entry.date).toLocaleDateString("ko-KR")} · {entry.spread.count}장
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(entry.id, e)}
                className="text-sky-300 hover:text-red-400 text-xs ml-3 shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-sky-900/20 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl border border-sky-300 shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-sky-200">
              <p className="text-sky-400 text-xs">
                {new Date(selected.date).toLocaleDateString("ko-KR")} · {selected.spread.count}장
              </p>
              <p className="text-sky-900 font-medium text-sm mt-0.5">{selected.question}</p>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sky-800 text-sm leading-relaxed whitespace-pre-wrap">
                {selected.readingText}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-sky-200">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-2xl bg-sky-600 text-white text-sm hover:bg-sky-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
