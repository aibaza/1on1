"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { MoreHorizontal, UserX, UserCheck, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface UserActionsMenuProps {
  user: {
    id: string;
    email: string;
    status: "active" | "pending" | "deactivated";
  };
  currentUserRole: string;
  currentUserId: string;
}

export function UserActionsMenu({
  user,
  currentUserRole,
  currentUserId,
}: UserActionsMenuProps) {
  const t = useTranslations("people");
  const queryClient = useQueryClient();
  const { showApiError } = useApiErrorToast();
  const isAdmin = currentUserRole === "admin";
  const isSelf = user.id === currentUserId;

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deactivate user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("actions.deactivated"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reactivate user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("actions.reactivated"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invites/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend invite");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("actions.inviteResent"));
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/people/${user.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              {t("actions.viewProfile")}
            </Link>
          </DropdownMenuItem>

          {isAdmin && user.status === "pending" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => resendInviteMutation.mutate()}
                disabled={resendInviteMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {t("actions.resendInvite")}
              </DropdownMenuItem>
            </>
          )}

          {isAdmin && user.status === "active" && !isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                {t("actions.deactivate")}
              </DropdownMenuItem>
            </>
          )}

          {isAdmin && user.status === "deactivated" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                {t("actions.reactivate")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
