import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  sendDefaultPii: true,

  tracesSampleRate:
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE !== undefined
      ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
      : process.env.NODE_ENV === "development"
        ? 1.0
        : 0.1,

  enableLogs: true,

  integrations: [Sentry.vercelAIIntegration()],
});
