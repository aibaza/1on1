import { anthropic } from "@ai-sdk/anthropic";

/**
 * Model configuration per AI task.
 *
 * Mapping task -> model tier optimizes the quality/cost balance:
 * - Summaries need quality and nuance -> Sonnet
 * - Manager addendum needs nuance for sentiment -> Sonnet
 * - Nudges are shorter, simpler -> Haiku (cost-effective)
 * - Action suggestions need accuracy -> Sonnet
 * - Template editor needs highest quality for expert domain reasoning -> Sonnet 4.6
 *
 * Switching models is a single-line change here.
 */
export const models = {
  summary: anthropic("claude-sonnet-4-5"),
  managerAddendum: anthropic("claude-sonnet-4-5"),
  nudges: anthropic("claude-haiku-4-5"),
  actionSuggestions: anthropic("claude-sonnet-4-5"),
  /** Template AI editor — latest Sonnet for best domain reasoning quality. */
  templateEditor: anthropic("claude-sonnet-4-6"),
} as const;
