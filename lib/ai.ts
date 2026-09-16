import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export type CompatibilityReport = {
  score: number;
  compatible: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
};

const SYSTEM_PROMPT = `
Eres un analizador de compatibilidad de mods.

Tu tarea es analizar la información proporcionada y determinar
la compatibilidad entre un mod y un juego.

Debes responder EXCLUSIVAMENTE con un objeto JSON plano.

El objeto debe tener exactamente esta estructura:

{
  "score": number,
  "compatible": boolean,
  "errors": string[],
  "warnings": string[],
  "recommendations": string[]
}

Reglas:
- "score" debe ser un número entre 0 y 100.
- "compatible" debe ser true o false.
- "errors" debe ser un array de strings.
- "warnings" debe ser un array de strings.
- "recommendations" debe ser un array de strings.
- No añadas texto fuera del JSON.
- No utilices Markdown.
- No incluyas bloques de código.
- No añadas explicaciones antes o después del JSON.
`;

export async function analyzeCompatibility(
  input: string
): Promise<CompatibilityReport> {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: input,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("La IA no devolvió ninguna respuesta");
  }

  return JSON.parse(text) as CompatibilityReport;
}