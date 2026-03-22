import { InviteButton } from "@/components/people/invite-button";

interface EditorialPeopleHeaderProps {
  memberCount: number;
  isAdmin: boolean;
}

export function EditorialPeopleHeader({ memberCount, isAdmin }: EditorialPeopleHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-headline mb-2">
          People
        </h1>
        <p className="text-muted-foreground text-base font-medium max-w-xl leading-relaxed">
          Manage your organization&apos;s team members and reporting lines
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="px-3 py-1 rounded-full bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {memberCount} members
        </span>
        {isAdmin && <InviteButton />}
      </div>
    </div>
  );
}
