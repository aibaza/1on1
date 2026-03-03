"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { registerAction } from "@/lib/auth/actions";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgType, setOrgType] = useState("for_profit");

  async function handleSubmit(formData: FormData) {
    setError("");
    setLoading(true);

    try {
      formData.set("orgType", orgType);
      const result = await registerAction(formData);

      if (result?.error) {
        setError(result.error);
      }
      // On success, registerAction redirects server-side
    } catch {
      // Redirect errors are re-thrown and handled by Next.js
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          Create your organization
        </CardTitle>
        <CardDescription>
          Set up your company account and start running better 1:1s
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder="Acme Inc"
              required
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label>Organization type</Label>
            <RadioGroup
              value={orgType}
              onValueChange={setOrgType}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="org-for-profit"
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  orgType === "for_profit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <RadioGroupItem value="for_profit" id="org-for-profit" />
                <div>
                  <span className="text-sm font-medium">For-profit</span>
                  <p className="text-xs text-muted-foreground">Company</p>
                </div>
              </Label>
              <Label
                htmlFor="org-non-profit"
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  orgType === "non_profit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <RadioGroupItem value="non_profit" id="org-non-profit" />
                <div>
                  <span className="text-sm font-medium">Non-profit</span>
                  <p className="text-xs text-muted-foreground">Organization</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Jane"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Smith"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@acme.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters with uppercase, lowercase, and a number
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
