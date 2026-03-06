"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ManagerSelectProps {
  userId: string;
  currentManagerId: string | null;
  currentManagerName: string | null;
  users: { id: string; firstName: string; lastName: string }[];
  disabled: boolean;
}

export function ManagerSelect({
  userId,
  currentManagerId,
  currentManagerName,
  users: allUsers,
  disabled,
}: ManagerSelectProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showApiError } = useApiErrorToast();

  // Filter out the user themselves from the manager list
  const managerOptions = allUsers.filter((u) => u.id !== userId);

  const mutation = useMutation({
    mutationFn: async (managerId: string | null) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign manager");
      }
      return res.json();
    },
    onMutate: async (managerId: string | null) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previous = queryClient.getQueryData(["users"]);
      const manager = managerId
        ? allUsers.find((u) => u.id === managerId)
        : null;
      queryClient.setQueryData(
        ["users"],
        (old: Array<Record<string, unknown>> | undefined) =>
          old?.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  managerId,
                  managerName: manager
                    ? `${manager.firstName} ${manager.lastName}`
                    : null,
                }
              : user
          )
      );
      return { previous };
    },
    onError: (error, _managerId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["users"], context.previous);
      }
      showApiError(error);
    },
    onSuccess: () => {
      toast.success("Manager updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (disabled) {
    return (
      <span className="text-sm text-muted-foreground">
        {currentManagerName || "None"}
      </span>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="h-7 w-[160px] justify-between text-xs font-normal"
            disabled={mutation.isPending}
          >
            <span className="truncate">
              {currentManagerName || "None"}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="none"
                  onSelect={() => {
                    mutation.mutate(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !currentManagerId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  None
                </CommandItem>
                {managerOptions.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.firstName} ${user.lastName}`}
                    onSelect={() => {
                      mutation.mutate(user.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentManagerId === user.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {user.firstName} {user.lastName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
