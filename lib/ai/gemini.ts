const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export class AIProviderError extends Error {
  status: number;
  provider: string;

  constructor(message: string, status: number, provider: string) {
    super(message);
    this.name = "AIProviderError";
    this.status = status;
    this.provider = provider;
  }
}

export async function generateWithGemini(
  prompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey) {
    throw new AIProviderError(
      "GEMINI_API_KEY no está configurada.",
      500,
      "Gemini"
    );
  }

  if (!model) {
    throw new AIProviderError(
      "GEMINI_MODEL no está configurado.",
      500,
      "Gemini"
    );
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new AIProviderError(
      `Gemini respondió con ${response.status}: ${errorText}`,
      response.status,
      "Gemini"
    );
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AIProviderError(
      "Gemini no devolvió contenido.",
      502,
      "Gemini"
    );
  }

  return text;
}