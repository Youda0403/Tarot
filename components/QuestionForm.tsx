"use client";

import { useState } from "react";

type Props = {
  onSubmit: (question: string) => void;
  loading: boolean;
};

export default function QuestionForm({ onSubmit, loading }: Props) {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) onSubmit(question.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-4">
      <div className="relative">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="지금 가장 고민되는 것이 무엇인가요?&#10;예) 새로운 직장으로 이직해야 할까요? / 이 사람과의 관계는 어디로 가는 걸까요?"
          rows={4}
          className="w-full bg-mystic-950/60 border border-mystic-700/50 rounded-2xl px-5 py-4 text-white placeholder-mystic-400 resize-none focus:outline-none focus:border-mystic-400 focus:ring-1 focus:ring-mystic-400 transition-colors text-sm leading-relaxed"
          disabled={loading}
        />
        <div className="absolute bottom-3 right-4 text-mystic-500 text-xs">
          {question.length}
        </div>
      </div>
      <button
        type="submit"
        disabled={!question.trim() || loading}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-mystic-700 to-mystic-600 text-white font-medium tracking-wide hover:from-mystic-600 hover:to-mystic-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-mystic-900/50"
      >
        {loading ? "카드를 뽑는 중..." : "✨ 타로 보기"}
      </button>
    </form>
  );
}
