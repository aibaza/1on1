The audit log records every significant action in your company account. Use it to monitor security events, track configuration changes, and investigate issues. Only admins can access the audit log.

![Audit log](en/settings-audit-log.jpg)

## What gets logged

The audit log captures actions across three categories:

- **Authentication** -- Logins, logouts, failed sign-in attempts, and password changes.
- **Data changes** -- Creating, updating, or deleting sessions, templates, action items, and user records.
- **Admin actions** -- Inviting users, changing roles, updating company settings, and modifying billing.

Each entry includes the timestamp, the user who performed the action, the action type, and the affected resource.

## Filter the log

Use the filters at the top of the page to narrow results:

1. **Action type** -- Select a category such as "login", "user.updated", or "session.created".
2. **User** -- Search for a specific user to see only their actions.
3. **Date range** -- Set a start and end date to focus on a specific period.

Click **Apply Filters** to update the results. Click **Clear** to reset all filters.

## Read a log entry

Each row shows:

- **Timestamp** -- When the action occurred, displayed in your timezone.
- **User** -- The person who performed the action, with their role.
- **Action** -- A description of what happened (e.g., "Updated template: Weekly Check-in").
- **IP address** -- The source IP, useful for identifying unusual access patterns.

Click a row to expand details, including the before-and-after values for data changes.

## Retention

Log entries are retained based on your plan. Pro plans keep 90 days of history. Enterprise plans offer extended retention.
