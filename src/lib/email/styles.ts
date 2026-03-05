/**
 * Shared email style constants for all email templates.
 * Apple-style aesthetic: dark text on light, system fonts, rounded elements.
 */

export const body = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

export const container = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "40px 20px",
};

export const section = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px 32px",
};

export const brand = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#0a0a0a",
  marginBottom: "24px",
};

export const heading = {
  fontSize: "24px",
  fontWeight: "600" as const,
  color: "#0a0a0a",
  marginBottom: "8px",
};

export const subheading = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#0a0a0a",
  marginBottom: "8px",
  marginTop: "24px",
};

export const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#525252",
  marginBottom: "24px",
};

export const button = {
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: "500" as const,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block" as const,
};

export const secondaryButton = {
  backgroundColor: "#f4f4f5",
  color: "#0a0a0a",
  fontSize: "15px",
  fontWeight: "500" as const,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block" as const,
};

export const hr = {
  borderColor: "#e5e5e5",
  margin: "24px 0",
};

export const footer = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#a3a3a3",
};

export const listItem = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#525252",
  marginBottom: "8px",
};

export const badge = {
  display: "inline-block" as const,
  backgroundColor: "#f0f9ff",
  color: "#0369a1",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "6px 14px",
  borderRadius: "20px",
};

export const metadataRow = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#737373",
  marginBottom: "4px",
};

export const divider = {
  borderColor: "#f4f4f5",
  margin: "16px 0",
};

export const card = {
  backgroundColor: "#fafafa",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
};
