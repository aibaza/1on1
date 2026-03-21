import { anthropic } from "@ai-sdk/anthropic";

/**
 * Model configuration per AI task.
 *
 * Switching models is a single-line change here.
 */
export const models = {
  /** Unified session analysis — single call replaces summary + addendum + action suggestions. */
  unified: anthropic("claude-sonnet-4-5"),
  /** Template AI editor — latest Sonnet for best domain reasoning quality. */
  templateEditor: anthropic("claude-sonnet-4-6"),
  /** Correction reason validator — short structured output, Haiku is sufficient. */
  correctionValidator: anthropic("claude-haiku-4-5"),
} as const;
