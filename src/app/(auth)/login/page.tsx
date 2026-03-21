import { getDesignPreference } from "@/lib/design-preference.server";
import { ClassicLogin } from "./classic-login";
import { EditorialLogin } from "./editorial-login";

export default async function LoginPage() {
  const pref = await getDesignPreference();
  return pref === "editorial" ? <EditorialLogin /> : <ClassicLogin />;
}
