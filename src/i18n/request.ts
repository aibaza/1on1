import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "ro"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const locale = cookieLocale && isValidLocale(cookieLocale) ? cookieLocale : "en";

  // Merge namespace files into single messages object
  const messages = {
    ...(await import(`../../messages/${locale}/common.json`)).default,
    ...(await import(`../../messages/${locale}/auth.json`)).default,
    ...(await import(`../../messages/${locale}/navigation.json`)).default,
    ...(await import(`../../messages/${locale}/dashboard.json`)).default,
    ...(await import(`../../messages/${locale}/sessions.json`)).default,
    ...(await import(`../../messages/${locale}/people.json`)).default,
    ...(await import(`../../messages/${locale}/teams.json`)).default,
    ...(await import(`../../messages/${locale}/templates.json`)).default,
    ...(await import(`../../messages/${locale}/actionItems.json`)).default,
    ...(await import(`../../messages/${locale}/analytics.json`)).default,
    ...(await import(`../../messages/${locale}/history.json`)).default,
    ...(await import(`../../messages/${locale}/search.json`)).default,
    ...(await import(`../../messages/${locale}/settings.json`)).default,
    ...(await import(`../../messages/${locale}/validation.json`)).default,
    ...(await import(`../../messages/${locale}/admin.json`)).default,
    ...(await import(`../../messages/${locale}/spec.json`)).default,
    ...(await import(`../../messages/${locale}/account.json`)).default,
    ...(await import(`../../messages/${locale}/billing.json`)).default,
    ...(await import(`../../messages/${locale}/landing.json`)).default,
    ...(await import(`../../messages/${locale}/legal.json`)).default,
  };

  return {
    locale,
    messages,
    formats: {
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric" },
        long: {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        },
      },
      number: {
        decimal: { maximumFractionDigits: 2 },
      },
    },
  };
});
