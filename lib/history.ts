import type { DrawnCard, SpreadInfo } from "./tarot";

export type HistoryEntry = {
  id: string;
  date: string;
  question: string;
  spread: SpreadInfo;
  cards: DrawnCard[];
  readingText: string;
};

const KEY = "tarot-history";
const MAX = 10;

export function saveReading(entry: Omit<HistoryEntry, "id" | "date">): void {
  const history = loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: Date.now().toString(),
    date: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([newEntry, ...history].slice(0, MAX)));
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function deleteReading(id: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(loadHistory().filter((e) => e.id !== id))
  );
}
