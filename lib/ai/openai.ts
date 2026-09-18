import { AIProviderError } from "./gemini";

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

export async function generateWithOpenAI(
  prompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) {
    throw new AIProviderError(
      "OPENAI_API_KEY no está configurada.",
      500,
      "OpenAI"
    );
  }

  if (!model) {
    throw new AIProviderError(
      "OPENAI_MODEL no está configurado.",
      500,
      "OpenAI"
    );
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new AIProviderError(
      `OpenAI respondió con ${response.status}: ${errorText}`,
      response.status,
      "OpenAI"
    );
  }

  const data = await response.json();

  if (typeof data?.output_text === "string" && data.output_text) {
    return data.output_text;
  }

  const text = data?.output
    ?.flatMap((item: any) => item?.content ?? [])
    ?.find((item: any) => item?.type === "output_text")
    ?.text;

  if (!text) {
    throw new AIProviderError(
      "OpenAI no devolvió contenido.",
      502,
      "OpenAI"
    );
  }

  return text;
}