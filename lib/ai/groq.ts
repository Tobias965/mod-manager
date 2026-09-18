import { AIProviderError } from "./gemini";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export async function generateWithGroq(
  prompt: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;

  if (!apiKey) {
    throw new AIProviderError(
      "GROQ_API_KEY no está configurada.",
      500,
      "Groq"
    );
  }

  if (!model) {
    throw new AIProviderError(
      "GROQ_MODEL no está configurado.",
      500,
      "Groq"
    );
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new AIProviderError(
      `Groq respondió con ${response.status}: ${errorText}`,
      response.status,
      "Groq"
    );
  }

  const data = await response.json();

  const text =
    data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new AIProviderError(
      "Groq no devolvió contenido.",
      502,
      "Groq"
    );
  }

  return text;
}