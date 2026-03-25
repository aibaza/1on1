import { cookies } from "next/headers";
import { DESIGN_PREF_COOKIE, type DesignPreference } from "./design-preference";

/**
 * Read design preference from cookie (server-side only).
 * Returns "classic" if no cookie is set or value is invalid.
 */
export async function getDesignPreference(): Promise<DesignPreference> {
  const store = await cookies();
  const value = store.get(DESIGN_PREF_COOKIE)?.value;
  return value === "classic" ? "classic" : "editorial";
}
