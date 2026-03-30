import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingNav } from "@/app/(marketing)/_components/marketing-nav";
import { MarketingFooter } from "@/app/(marketing)/_components/marketing-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | 1on1",
  description: "How 1on1 collects, uses, and protects your personal data.",
};

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  const p = await getTranslations("legal.privacy");
  const s = await getTranslations("legal.privacy.sections");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <MarketingNav />

      <main className="flex-1 max-w-3xl mx-auto px-8 py-20">
        <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold mb-2">
          {p("title")}
        </h1>
        <p className="text-muted-foreground text-sm mb-12">{t("lastUpdated")}</p>

        <p className="text-muted-foreground leading-relaxed mb-12">{p("intro")}</p>

        <div className="space-y-10">
          {/* 1. Data We Collect */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("dataWeCollect.title")}
            </h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed">
              <li>{s("dataWeCollect.account")}</li>
              <li>{s("dataWeCollect.session")}</li>
              <li>{s("dataWeCollect.ai")}</li>
              <li>{s("dataWeCollect.calendar")}</li>
              <li>{s("dataWeCollect.usage")}</li>
              <li>{s("dataWeCollect.cookies")}</li>
            </ul>
          </section>

          {/* 2. How We Use */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("howWeUse.title")}
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>{s("howWeUse.item1")}</li>
              <li>{s("howWeUse.item2")}</li>
              <li>{s("howWeUse.item3")}</li>
              <li>{s("howWeUse.item4")}</li>
              <li>{s("howWeUse.item5")}</li>
              <li>{s("howWeUse.item6")}</li>
            </ul>
          </section>

          {/* 3. Data Protection */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("dataProtection.title")}
            </h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed">
              <li>{s("dataProtection.encryption")}</li>
              <li>{s("dataProtection.isolation")}</li>
              <li>{s("dataProtection.access")}</li>
            </ul>
          </section>

          {/* 4. Third Parties */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("thirdParties.title")}
            </h2>
            <p className="text-muted-foreground mb-3">{s("thirdParties.intro")}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>{s("thirdParties.vercel")}</li>
              <li>{s("thirdParties.neon")}</li>
              <li>{s("thirdParties.anthropic")}</li>
              <li>{s("thirdParties.google")}</li>
              <li>{s("thirdParties.resend")}</li>
            </ul>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("dataRetention.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-2">{s("dataRetention.content")}</p>
            <p className="text-muted-foreground leading-relaxed">{s("dataRetention.calendar")}</p>
          </section>

          {/* 6. GDPR */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("gdpr.title")}
            </h2>
            <p className="text-muted-foreground mb-3">{s("gdpr.intro")}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>{s("gdpr.access")}</li>
              <li>{s("gdpr.rectify")}</li>
              <li>{s("gdpr.erase")}</li>
              <li>{s("gdpr.port")}</li>
              <li>{s("gdpr.restrict")}</li>
            </ul>
            <p className="text-muted-foreground mt-3">{s("gdpr.contact")}</p>
          </section>

          {/* 7. Self-Hosting */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("selfHost.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("selfHost.content")}</p>
          </section>

          {/* 8. Changes */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("changes.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("changes.content")}</p>
          </section>

          {/* 9. Contact */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("contact.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("contact.content")}</p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
