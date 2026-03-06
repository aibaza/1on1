"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleSelectProps {
  userId: string;
  currentRole: string;
  disabled: boolean;
}

export function RoleSelect({ userId, currentRole, disabled }: RoleSelectProps) {
  const t = useTranslations("people");
  const queryClient = useQueryClient();
  const { showApiError } = useApiErrorToast();

  const mutation = useMutation({
    mutationFn: async (newRole: string) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      return res.json();
    },
    onMutate: async (newRole: string) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previous = queryClient.getQueryData(["users"]);
      queryClient.setQueryData(
        ["users"],
        (old: Array<Record<string, unknown>> | undefined) =>
          old?.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
      );
      return { previous };
    },
    onError: (error, _newRole, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["users"], context.previous);
      }
      showApiError(error);
    },
    onSuccess: () => {
      toast.success(t("role.updated"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (disabled) {
    return (
      <Badge variant="secondary">
        {currentRole === "admin" ? t("table.admin") : currentRole === "manager" ? t("table.manager") : t("table.member")}
      </Badge>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={currentRole}
        onValueChange={(value) => mutation.mutate(value)}
        disabled={mutation.isPending}
      >
        <SelectTrigger className="h-7 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">{t("table.admin")}</SelectItem>
          <SelectItem value="manager">{t("table.manager")}</SelectItem>
          <SelectItem value="member">{t("table.member")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
