import {
  generateSuggestions,
  type AIResult,
} from "./suggestions";

/**
 * Genera un análisis de modpack utilizando el sistema
 * de proveedores de IA con fallback:
 *
 * Gemini -> Groq -> OpenAI
 */
export async function generateAnalysis(
  prompt: string,
): Promise<AIResult> {
  return generateSuggestions(prompt);
}