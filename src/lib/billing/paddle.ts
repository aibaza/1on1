import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const apiKey = process.env.PADDLE_API_KEY;

if (!apiKey) {
  console.warn("PADDLE_API_KEY not set — billing features disabled");
}

export const paddle = apiKey
  ? new Paddle(apiKey, {
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
          ? Environment.sandbox
          : Environment.production,
    })
  : null;
