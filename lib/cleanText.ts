// Shared text cleanup utilities for tarot API routes

/** Any non-Korean, non-digit, non-basic-punctuation character (Greek, Vietnamese, Arabic, etc.) */
const FOREIGN_RE = /[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F0-9\s.,!?:;()\-""''·~…%\/\n\r*]/g;

/** CJK characters (Chinese / Japanese) */
const CJK_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

/** 반말 endings at sentence boundaries
 *  이야·이라 제외 — fixBanmal에서 구두점 한정으로 처리 (이라 할 수 있어요 등 오탐 방지) */
const BANMAL_RE = /[가-힣](거야|잖아|했어|겠어|하자)([.?!\s]|$)/;

export const CLEANUP_PROMPT = `You are a Korean text corrector. A Korean tarot reading is given. Correct it and output ONLY the corrected text.

STRICT OUTPUT RULE — your entire response must be ONLY the corrected Korean text:
- Do NOT write "다음과 같아요", "수정본은", "수정 결과", "최종본", or any explanation whatsoever.
- Do NOT repeat the text or any paragraph more than once.
- Do NOT add any heading, label, or preamble.
- Start immediately with the first sentence of the corrected reading.

CORRECTIONS (make ONLY these changes, nothing else):
1. Replace foreign characters (Chinese, Japanese, Greek α β γ, Vietnamese đ ả, Arabic) with Korean.
2. Fix sentence-final 반말 ONLY (never touch ~해야/~아야/~어야/~여야 — those are correct):
   ~거야 → ~거예요, ~이야(sentence end) → ~이에요, ~잖아 → ~잖아요, ~했어 → ~했어요, ~겠어 → ~겠어요.
3. Preserve **bold** markers exactly as-is.
4. Change absolutely nothing else.`;

export function needsCleanup(text: string): boolean {
  if (CJK_RE.test(text)) return true;
  // non-ASCII and non-Korean characters (Greek, Vietnamese, etc.)
  if (/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\u0000-\u007F]/.test(text)) return true;
  // English words 5+ chars
  if (/[A-Za-z]{5,}/.test(text)) return true;
  // 반말 sentence endings
  if (BANMAL_RE.test(text)) return true;
  return false;
}

/** Regex-based 반말 → ~해요 fix as a fast final pass */
export function fixBanmal(text: string): string {
  return text
    .replace(/([가-힣])거야([.?!\s]|$)/g, "$1거예요$2")
    // 이야: 구두점/줄바꿈/문자열 끝에만 적용 (중간 '이야 함을' 오탐 방지)
    .replace(/([가-힣])이야([.?!\n]|$)/g, "$1이에요$2")
    .replace(/([가-힣])잖아([.?!\s]|$)/g, "$1잖아요$2")
    .replace(/([가-힣])했어([.?!\s]|$)/g, "$1했어요$2")
    .replace(/([가-힣])겠어([.?!\s]|$)/g, "$1겠어요$2")
    .replace(/([가-힣])하자([.?!\s]|$)/g, "$1해요$2")
    // 이라: 구두점/줄바꿈/끝에만 적용 (이라 할 수 있어요 / 이라 불리다 등 인용 표현 오탐 방지)
    .replace(/([가-힣])이라([.?!\n]|$)/g, "$1이에요$2");
}

/** Whitelist strip: remove anything that isn't Korean Hangul, digits, or common punctuation */
export function stripForeign(text: string): string {
  return text
    .replace(FOREIGN_RE, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
