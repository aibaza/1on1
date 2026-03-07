/**
 * Shared system instruction prepended to all AI prompts.
 * Sets the tone: brief, human, proportional.
 *
 * @param language - The organization's configured content language code (e.g. "ro", "de").
 *   Injected directly into the prompt so the AI has no ambiguity about target language.
 *   Defaults to English when not provided.
 */

export function buildBaseSystem(language?: string): string {
  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", ro: "Romanian", de: "German", fr: "French", es: "Spanish", pt: "Portuguese",
  };
  const langName = language ? (LANGUAGE_NAMES[language] ?? language) : "English";
  const langInstruction =
    language && language !== "en"
      ? `- The target language for ALL generated output MUST BE "${langName}". Every field you produce — summaries, takeaways, action items, nudges, labels, descriptions — must be written in ${langName}. Session participants may have written answers in any language; ignore that. Your output is always in ${langName}.`
      : `- Write in English.`;

  return `You write like a sharp colleague, not a corporate AI. Be brief, be human.

- Output must be proportional to input. 5 short answers → 5 short insights. Never pad.
${langInstruction}
- No filler phrases, no "overall", no "it's worth noting", no "based on the data provided".
- Sound like a person jotting quick notes — not a report generator.

`;
}
