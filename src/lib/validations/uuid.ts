import { z } from "zod";

/**
 * Lenient UUID validation — accepts any 8-4-4-4-12 hex string.
 *
 * Zod 4's built-in .uuid() enforces strict RFC 4122 (version 1-8, variant [89ab]),
 * which rejects deterministic seed UUIDs and UUIDs from some generators.
 * This schema validates the format without restricting version/variant nibbles.
 */
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuid = z.string().regex(UUID_PATTERN, "Invalid UUID");
