"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form values type (avoiding z.coerce for hookform/resolvers compatibility)
interface FormValues {
  reportId: string;
  cadence: "weekly" | "biweekly" | "monthly" | "custom";
  cadenceCustomDays?: number;
  defaultTemplateId?: string;
  preferredDay?: string;
  preferredTime?: string;
  defaultDurationMinutes: number;
}

const formSchema = z.object({
  reportId: z.string().min(1, "Please select a report"),
  cadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  cadenceCustomDays: z.number().int().min(1).max(365).optional(),
  defaultTemplateId: z.string().optional(),
  preferredDay: z.string().optional(),
  preferredTime: z.string().optional(),
  defaultDurationMinutes: z.number().int().min(15).max(180),
});

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
}

interface SeriesFormProps {
  userGroups: [string, User[]][];
  templates: Template[];
}

const cadenceOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom interval" },
] as const;

const dayOptions = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
] as const;

export function SeriesForm({ userGroups, templates }: SeriesFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportId: "",
      cadence: "biweekly",
      defaultDurationMinutes: 30,
    },
  });

  const cadence = form.watch("cadence");

  const createSeries = useMutation({
    mutationFn: async (values: FormValues) => {
      // Validate custom cadence
      if (values.cadence === "custom" && !values.cadenceCustomDays) {
        throw new Error("Custom interval days is required for custom cadence");
      }

      const payload: Record<string, unknown> = {
        reportId: values.reportId,
        cadence: values.cadence,
        defaultDurationMinutes: values.defaultDurationMinutes,
      };

      if (values.cadenceCustomDays)
        payload.cadenceCustomDays = values.cadenceCustomDays;
      if (values.defaultTemplateId)
        payload.defaultTemplateId = values.defaultTemplateId;
      if (values.preferredDay) payload.preferredDay = values.preferredDay;
      if (values.preferredTime) payload.preferredTime = values.preferredTime;

      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create series");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Meeting series created");
      router.refresh();
      router.push("/sessions");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => createSeries.mutate(values))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="reportId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Report</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {userGroups.map(([teamName, members]) => (
                    <SelectGroup key={teamName}>
                      <SelectLabel>{teamName}</SelectLabel>
                      {members.map((user) => (
                        <SelectItem key={`${teamName}-${user.id}`} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The team member you will have 1:1s with.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cadence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cadence</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  {cadenceOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem
                        value={option.value}
                        id={`cadence-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`cadence-${option.value}`}
                        className="flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {cadence === "custom" && (
          <FormField
            control={form.control}
            name="cadenceCustomDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom interval (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    placeholder="e.g. 21"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="preferredDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred day</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferredTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="defaultTemplateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default template</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Questions to use in each session.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultDurationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseInt(e.target.value, 10) : 30
                    )
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={createSeries.isPending}
          >
            {createSeries.isPending ? "Creating..." : "Create Series"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
