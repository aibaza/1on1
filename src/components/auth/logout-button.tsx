"use client";

import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button variant="outline" type="submit">
        Sign out
      </Button>
    </form>
  );
}
