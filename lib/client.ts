import Groq from "groq-sdk";

const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";

// Cerebras model — Llama 3.3 70B (free, fast, less congested than Groq)
const CEREBRAS_MODEL = "llama-3.3-70b";

// Groq allowed models (passed through from UI)
const GROQ_ALLOWED = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

export type LLMClient = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: { role: "system" | "user" | "assistant"; content: string }[];
        stream: false;
        temperature: number;
        max_tokens: number;
      }) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
};

export function getClient(requestedModel?: string): { client: LLMClient; model: string } {
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    return {
      client: new Groq({ apiKey: cerebrasKey, baseURL: CEREBRAS_BASE_URL }) as unknown as LLMClient,
      model: CEREBRAS_MODEL,
    };
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("API 키가 없어요. .env.local에 CEREBRAS_API_KEY 또는 GROQ_API_KEY를 추가해주세요.");

  const model = requestedModel && GROQ_ALLOWED.includes(requestedModel)
    ? requestedModel
    : "llama-3.3-70b-versatile";

  return { client: new Groq({ apiKey: groqKey }) as unknown as LLMClient, model };
}
