"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  jobTitle: z.string().max(200).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileEditFormProps {
  userId: string;
  defaultValues: {
    firstName: string;
    lastName: string;
    jobTitle: string;
  };
}

export function ProfileEditForm({
  userId,
  defaultValues,
}: ProfileEditFormProps) {
  const t = useTranslations("people");
  const router = useRouter();
  const { showApiError } = useApiErrorToast();
  useZodI18nErrors();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  async function onSubmit(data: ProfileFormValues) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          jobTitle: data.jobTitle || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update profile");
      }

      toast.success(t("profileForm.updated"));
      router.refresh();
    } catch (error) {
      showApiError(error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("profileForm.firstName")}</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">{t("profileForm.lastName")}</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobTitle">{t("profileForm.jobTitle")}</Label>
        <Input
          id="jobTitle"
          placeholder={t("profileForm.jobTitlePlaceholder")}
          {...register("jobTitle")}
        />
        {errors.jobTitle && (
          <p className="text-xs text-destructive">{errors.jobTitle.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? t("profileForm.saving") : t("profileForm.saveChanges")}
      </Button>
    </form>
  );
}
