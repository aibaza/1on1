"use client";

import { useEffect, useState, useCallback } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useRouter } from "next/navigation";

let paddleInstance: Paddle | null = null;
let paddleInitPromise: Promise<Paddle | undefined> | null = null;

function getPaddleInstance(): Promise<Paddle | undefined> {
  if (paddleInstance) return Promise.resolve(paddleInstance);
  if (paddleInitPromise) return paddleInitPromise;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.warn("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN not set");
    return Promise.resolve(undefined);
  }

  paddleInitPromise = initializePaddle({
    token,
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
        ? "production"
        : "sandbox",
  }).then((p) => {
    if (p) paddleInstance = p;
    return p;
  });

  return paddleInitPromise;
}

interface UsePaddleCheckoutOptions {
  customerEmail?: string;
  customData?: Record<string, string>;
  onSuccess?: () => void;
}

export function usePaddleCheckout(options: UsePaddleCheckoutOptions = {}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getPaddleInstance().then((p) => {
      if (p) setPaddle(p);
    });
  }, []);

  const openCheckout = useCallback(
    async (priceId: string, quantity: number = 1) => {
      if (!paddle) {
        console.error("Paddle not initialized");
        return;
      }

      setIsLoading(true);

      try {
        paddle.Checkout.open({
          items: [{ priceId, quantity }],
          customer: options.customerEmail
            ? { email: options.customerEmail }
            : undefined,
          customData: options.customData,
          settings: {
            displayMode: "overlay",
            theme: "light",
            successUrl: `${window.location.origin}/settings/billing?checkout=success`,
          },
        });
      } catch (error) {
        console.error("Failed to open Paddle checkout:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [paddle, options.customerEmail, options.customData]
  );

  const isReady = !!paddle;

  return { openCheckout, isReady, isLoading };
}
