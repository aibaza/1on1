import { WizardShell } from "@/components/session/wizard-shell";

interface WizardPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function WizardPage({ params }: WizardPageProps) {
  const { sessionId } = await params;

  return <WizardShell sessionId={sessionId} />;
}
