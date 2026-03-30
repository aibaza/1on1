import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingNav } from "@/app/(marketing)/_components/marketing-nav";
import { MarketingFooter } from "@/app/(marketing)/_components/marketing-footer";

export const metadata: Metadata = {
  title: "Terms of Service | 1on1",
  description: "Terms and conditions for using the 1on1 platform.",
};

export default async function TermsPage() {
  const t = await getTranslations("legal");
  const terms = await getTranslations("legal.terms");
  const s = await getTranslations("legal.terms.sections");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <MarketingNav />

      <main className="flex-1 max-w-3xl mx-auto px-8 py-20">
        <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold mb-2">
          {terms("title")}
        </h1>
        <p className="text-muted-foreground text-sm mb-12">{t("lastUpdated")}</p>

        <p className="text-muted-foreground leading-relaxed mb-12">{terms("intro")}</p>

        <div className="space-y-10">
          {/* 1. The Service */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("service.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("service.content")}</p>
          </section>

          {/* 2. Accounts */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("accounts.title")}
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>{s("accounts.item1")}</li>
              <li>{s("accounts.item2")}</li>
              <li>{s("accounts.item3")}</li>
              <li>{s("accounts.item4")}</li>
            </ul>
          </section>

          {/* 3. Plans and Billing */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("plans.title")}
            </h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed">
              <li>{s("plans.free")}</li>
              <li>{s("plans.paid")}</li>
              <li>{s("plans.trial")}</li>
              <li>{s("plans.refunds")}</li>
            </ul>
          </section>

          {/* 4. Acceptable Use */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("acceptable.title")}
            </h2>
            <p className="text-muted-foreground mb-3">{s("acceptable.intro")}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
              <li>{s("acceptable.item1")}</li>
              <li>{s("acceptable.item2")}</li>
              <li>{s("acceptable.item3")}</li>
              <li>{s("acceptable.item4")}</li>
              <li>{s("acceptable.item5")}</li>
            </ul>
          </section>

          {/* 5. Your Data */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("data.title")}
            </h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed">
              <li>{s("data.ownership")}</li>
              <li>{s("data.license")}</li>
              <li>{s("data.export")}</li>
              <li>{s("data.deletion")}</li>
            </ul>
          </section>

          {/* 6. AI Features */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("ai.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-2">{s("ai.content")}</p>
            <p className="text-muted-foreground leading-relaxed">{s("ai.noTraining")}</p>
          </section>

          {/* 7. Open Source */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("openSource.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("openSource.content")}</p>
          </section>

          {/* 8. Liability */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("liability.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("liability.content")}</p>
          </section>

          {/* 9. Termination */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("termination.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("termination.content")}</p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("changes.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("changes.content")}</p>
          </section>

          {/* 11. Governing Law */}
          <section>
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-4">
              {s("governing.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{s("governing.content")}</p>
          </section>

          {/* 12. Contact */}
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
