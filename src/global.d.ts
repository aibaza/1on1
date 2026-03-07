import type en_common from "../messages/en/common.json";
import type en_auth from "../messages/en/auth.json";
import type en_navigation from "../messages/en/navigation.json";
import type en_dashboard from "../messages/en/dashboard.json";
import type en_sessions from "../messages/en/sessions.json";
import type en_people from "../messages/en/people.json";
import type en_teams from "../messages/en/teams.json";
import type en_templates from "../messages/en/templates.json";
import type en_actionItems from "../messages/en/actionItems.json";
import type en_analytics from "../messages/en/analytics.json";
import type en_history from "../messages/en/history.json";
import type en_search from "../messages/en/search.json";
import type en_settings from "../messages/en/settings.json";
import type en_validation from "../messages/en/validation.json";
import type en_admin from "../messages/en/admin.json";
import type en_spec from "../messages/en/spec.json";

type Messages = typeof en_common &
  typeof en_auth &
  typeof en_navigation &
  typeof en_dashboard &
  typeof en_sessions &
  typeof en_people &
  typeof en_teams &
  typeof en_templates &
  typeof en_actionItems &
  typeof en_analytics &
  typeof en_history &
  typeof en_search &
  typeof en_settings &
  typeof en_validation &
  typeof en_admin &
  typeof en_spec;

declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "ro";
    Messages: Messages;
  }
}
