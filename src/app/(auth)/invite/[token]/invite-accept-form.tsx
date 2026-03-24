"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { InlineAlert } from "@/components/ui/inline-alert";

// Combined form schema for both steps
const formSchema = z.object({
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  confirmPassword: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().max(200).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

interface InviteAcceptFormProps {
  token: string;
  email: string;
  organizationName: string;
  role: string;
  inviterName?: string;
}

export function InviteAcceptForm({
  token,
  email,
  organizationName,
  role,
  inviterName,
}: InviteAcceptFormProps) {
  const t = useTranslations("auth");
  useZodI18nErrors();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
    },
    mode: "onTouched",
  });

  async function handleNext() {
    // Validate step 1 fields
    const valid = await form.trigger(["password", "confirmPassword"]);
    if (valid) {
      setStep(2);
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          jobTitle: values.jobTitle || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("invite.createError"));
        return;
      }

      // Auto-authenticate and redirect to dashboard
      await signIn("credentials", {
        email,
        password: values.password,
        callbackUrl: "/overview",
      });
    } catch {
      setError(t("invite.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 0) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("invite.welcomeTitle", { organization: organizationName })}
          </CardTitle>
          <CardDescription>
            {inviterName
              ? t("invite.welcomeBodyWithInviter", { inviterName, organization: organizationName })
              : t("invite.welcomeBody", { organization: organizationName })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("invite.emailLabel")}</span>
              <span className="text-sm font-medium">{email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("invite.roleLabel")}</span>
              <Badge variant="secondary" className="capitalize">{role}</Badge>
            </div>
          </div>
          <Button className="w-full" onClick={() => setStep(1)}>
            {t("invite.acceptButton")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {t("invite.title", { organization: organizationName })}
        </CardTitle>
        <CardDescription>
          {t("invite.description")}
        </CardDescription>
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm text-muted-foreground">{email}</span>
          <Badge variant="secondary" className="capitalize">
            {role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            1
          </div>
          <div className="h-px flex-1 bg-border" />
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
        </div>

        {error && (
          <InlineAlert variant="error" className="mb-4">
            {error}
          </InlineAlert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("invite.step1")}
                </p>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("invite.password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            autoFocus
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t("invite.passwordHelp")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("invite.confirmPassword")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirm(!showConfirm)}
                            tabIndex={-1}
                          >
                            {showConfirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={handleNext}
                >
                  {t("invite.continue")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("invite.step2")}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("invite.firstName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("invite.firstNamePlaceholder")}
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("invite.lastName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("invite.lastNamePlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("invite.jobTitle")}{" "}
                        <span className="text-muted-foreground font-normal">
                          {t("invite.jobTitleOptional")}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("invite.jobTitlePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("invite.back")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? t("invite.submitting")
                      : t("invite.submit")}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
