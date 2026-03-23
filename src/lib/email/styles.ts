/**
 * Shared email style constants — Editorial design system.
 * Uses inline styles for maximum email client compatibility.
 */

export const body = {
  backgroundColor: "#f8fafb",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "0",
};

export const container = {
  maxWidth: "640px",
  margin: "0 auto",
  padding: "40px 20px",
};

export const section = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "0",
  overflow: "hidden" as const,
};

// Brand header
export const brandHeader = {
  backgroundColor: "#29407d",
  padding: "24px 32px",
  textAlign: "center" as const,
};

export const brandText = {
  fontSize: "24px",
  fontWeight: "800" as const,
  color: "#ffffff",
  margin: "0",
  fontFamily: "'Manrope', -apple-system, sans-serif",
  letterSpacing: "-0.025em",
};

export const brandSubtext = {
  fontSize: "10px",
  fontWeight: "700" as const,
  color: "#b4c5ff",
  margin: "4px 0 0 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
};

export const contentSection = {
  padding: "40px 32px",
};

// Old exports kept for backward compatibility
export const brand = brandText;

export const heading = {
  fontSize: "28px",
  fontWeight: "800" as const,
  color: "#191c1d",
  marginBottom: "8px",
  fontFamily: "'Manrope', -apple-system, sans-serif",
  letterSpacing: "-0.025em",
};

export const eyebrow = {
  fontSize: "11px",
  fontWeight: "700" as const,
  color: "#004c47",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  margin: "0 0 8px 0",
};

export const subheading = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#191c1d",
  marginBottom: "12px",
  marginTop: "32px",
  fontFamily: "'Manrope', -apple-system, sans-serif",
};

export const paragraph = {
  fontSize: "15px",
  lineHeight: "26px",
  color: "#454652",
  marginBottom: "24px",
};

export const button = {
  backgroundColor: "#29407d",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "700" as const,
  padding: "14px 28px",
  borderRadius: "12px",
  textDecoration: "none",
  display: "inline-block" as const,
  fontFamily: "'Manrope', -apple-system, sans-serif",
};

export const secondaryButton = {
  backgroundColor: "#f2f4f5",
  color: "#29407d",
  fontSize: "15px",
  fontWeight: "700" as const,
  padding: "14px 28px",
  borderRadius: "12px",
  textDecoration: "none",
  display: "inline-block" as const,
};

export const hr = {
  borderColor: "#eceeef",
  margin: "32px 0",
};

export const footer = {
  fontSize: "11px",
  lineHeight: "18px",
  color: "#757684",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export const listItem = {
  fontSize: "15px",
  lineHeight: "26px",
  color: "#454652",
  marginBottom: "8px",
  paddingLeft: "16px",
};

export const badge = {
  display: "inline-block" as const,
  backgroundColor: "#dbe1ff",
  color: "#29407d",
  fontSize: "14px",
  fontWeight: "700" as const,
  padding: "6px 16px",
  borderRadius: "20px",
};

export const metadataRow = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#757684",
  marginBottom: "4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export const divider = {
  borderTop: "1px solid #eceeef",
  margin: "24px 0",
};

export const card = {
  backgroundColor: "#f8fafb",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "12px",
};

export const scoreCard = {
  backgroundColor: "#f8fafb",
  borderRadius: "12px",
  padding: "24px",
  borderLeft: "4px solid #29407d",
  textAlign: "center" as const,
  marginBottom: "32px",
};

export const insightCard = {
  background: "linear-gradient(135deg, #29407d 0%, #425797 100%)",
  borderRadius: "12px",
  padding: "32px",
  marginBottom: "16px",
  color: "#ffffff",
};

export const coachingCard = {
  backgroundColor: "#f0faf9",
  borderRadius: "12px",
  padding: "32px",
  borderLeft: "4px solid #004c47",
};

export const concernCard = {
  backgroundColor: "#ffdad6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "8px",
  opacity: "0.6" as unknown as number,
};

export const bulletDot = {
  display: "inline-block" as const,
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#004c47",
  marginRight: "12px",
  verticalAlign: "middle" as const,
};
