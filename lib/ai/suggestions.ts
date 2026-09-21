import {
  AIProviderError,
  generateWithGemini,
} from "./gemini";

import { generateWithGroq } from "./groq";
import { generateWithOpenAI } from "./openai";

export type AIProviderName =
  | "Gemini"
  | "Groq"
  | "OpenAI";

export interface AIResult {
  text: string;
  provider: AIProviderName;
}

function isRecoverableError(error: unknown): boolean {
  if (!(error instanceof AIProviderError)) {
    return false;
  }

  if (
    error.provider === "Groq" &&
    error.status === 400 &&
    error.message.includes("json_validate_failed")
  ) {
    return true;
  }

  return (
    error.status === 429 ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

export async function generateSuggestions(
  prompt: string
): Promise<AIResult> {
  const providers: Array<{
    name: AIProviderName;
    generate: (prompt: string) => Promise<string>;
  }> = [
    {
      name: "Gemini",
      generate: generateWithGemini,
    },
    {
      name: "Groq",
      generate: generateWithGroq,
    },
    {
      name: "OpenAI",
      generate: generateWithOpenAI,
    },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const text = await provider.generate(prompt);

      return {
        text,
        provider: provider.name,
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        errors.push(
          `${provider.name}: ${error.message}`
        );

        if (isRecoverableError(error)) {
          continue;
        }

        throw error;
      }

      errors.push(
        `${provider.name}: error desconocido`
      );

      continue;
    }
  }

  throw new Error(
    `Todos los proveedores de IA fallaron. ${errors.join(" | ")}`
  );
}