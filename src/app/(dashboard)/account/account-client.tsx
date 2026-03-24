"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw, Shield, Check, Eye, EyeOff } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";

interface AccountClientProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    avatarSeed: string | null;
    level: string;
    emailVerified: boolean;
  };
}

export function AccountClient({ user }: AccountClientProps) {
  const t = useTranslations("account");
  const fullName = `${user.firstName} ${user.lastName}`;

  // Avatar state
  const [avatarSeed, setAvatarSeed] = useState(user.avatarSeed);
  const [regenerating, setRegenerating] = useState(false);
  const [avatarFading, setAvatarFading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function regenerateAvatar() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const newUrl = getAvatarUrl(fullName, user.avatarUrl, data.seed, user.level);
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = newUrl;
        });
        setAvatarFading(true);
        await new Promise((r) => setTimeout(r, 200));
        setAvatarSeed(data.seed);
        await new Promise((r) => setTimeout(r, 50));
        setAvatarFading(false);
        toast.success(t("avatar.regenerated"));
      }
    } finally {
      setRegenerating(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error(t("password.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("password.mismatch"));
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("password.success"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error);
      }
    } finally {
      setChangingPassword(false);
    }
  }

  const avatarUrl = getAvatarUrl(fullName, user.avatarUrl, avatarSeed, user.level);

  const inputClass =
    "w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] outline-none transition-all placeholder:text-muted-foreground";
  const labelClass =
    "text-[11px] font-semibold text-[var(--editorial-outline,var(--muted-foreground))] uppercase tracking-widest";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Profile Card — 8 cols */}
      <section className="lg:col-span-8 bg-card rounded-xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Avatar Column */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-40 h-40 rounded-full border-4 border-[var(--editorial-surface-container-low,var(--muted))] overflow-hidden shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={avatarSeed}
                  src={avatarUrl}
                  alt={fullName}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${avatarFading ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
                />
              </div>
              <div
                className="absolute inset-0 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={regenerateAvatar}
              >
                <RefreshCw className={`h-8 w-8 text-primary ${regenerating ? "animate-spin" : ""}`} />
              </div>
            </div>
            <button
              onClick={regenerateAvatar}
              disabled={regenerating}
              className="flex items-center justify-center gap-2 min-w-[200px] px-6 py-2 bg-[var(--editorial-secondary-container,var(--secondary))] text-[var(--editorial-on-secondary-container,var(--secondary-foreground))] rounded-full text-xs font-headline font-bold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? t("avatar.regenerating") : t("avatar.regenerate")}
            </button>
          </div>

          {/* Info Column */}
          <div className="flex-1 w-full space-y-6">
            <h3 className="font-headline font-bold text-xl border-b border-[var(--editorial-surface-container-low,var(--border))] pb-4">
              {t("profile.title")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>{t("profile.firstName")}</label>
                <input
                  type="text"
                  value={user.firstName}
                  readOnly
                  className={`${inputClass} cursor-default`}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{t("profile.lastName")}</label>
                <input
                  type="text"
                  value={user.lastName}
                  readOnly
                  className={`${inputClass} cursor-default`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>{t("profile.email")}</label>
              <input
                type="email"
                value={user.email}
                disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
              {user.emailVerified && (
                <p className="text-[10px] text-[var(--editorial-tertiary,var(--color-success))] font-medium flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" />
                  {t("profile.verified")}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Security Sidebar — 4 cols */}
      <section className="lg:col-span-4 bg-card rounded-xl p-8 shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="font-headline font-bold text-xl">{t("password.title")}</h3>
        </div>

        <form onSubmit={changePassword} className="space-y-6">
          <div className="space-y-2">
            <label className={labelClass}>{t("password.currentPassword")}</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>{t("password.newPassword")}</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className={inputClass}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>{t("password.confirmPassword")}</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className={inputClass}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-headline font-bold text-sm shadow-md active:scale-95 transition-transform mt-4 disabled:opacity-50"
          >
            {changingPassword ? t("password.submitting") : t("password.submit")}
          </button>
        </form>
      </section>
    </div>
  );
}
