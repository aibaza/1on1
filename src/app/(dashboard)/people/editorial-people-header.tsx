import { InviteButton } from "@/components/people/invite-button";

interface EditorialPeopleHeaderProps {
  memberCount: number;
  isAdmin: boolean;
}

export function EditorialPeopleHeader({ memberCount, isAdmin }: EditorialPeopleHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight font-headline">
            People
          </h1>
          <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold">
            {memberCount} members
          </span>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Manage your organization&apos;s team members and reporting lines
        </p>
      </div>
      {isAdmin && <InviteButton />}
    </div>
  );
}
