/**
 * Development seed script.
 *
 * Creates realistic data for two tenants (Acme Corp and Beta Inc) to support
 * multi-tenancy testing, RLS verification, and UI development.
 *
 * Idempotent: uses deterministic UUIDs and upsert behavior (onConflictDoUpdate).
 * Connects as postgres superuser to bypass RLS during seeding.
 *
 * Usage: bun run db:seed
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { encryptNote } from '../encryption/private-notes';

// Connect as postgres superuser for seeding (bypasses RLS)
// Uses node-postgres (pg) for direct TCP connection to local PostgreSQL.
// The Neon serverless driver requires WebSocket which doesn't work locally.
const connectionString = process.env.SEED_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or SEED_DATABASE_URL must be set');
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool, { schema });

// =============================================================================
// Shared test password: "password123" (bcrypt-hashed)
// =============================================================================
const TEST_PASSWORD_HASH = '$2b$10$IoZkuZQFUmBdtHHesZzXmuxYhVLSQIFFaVQaUCFhOtJxZx0dv5bre';

// =============================================================================
// Deterministic UUIDs for all seed entities
// =============================================================================

// Tenants
const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const BETA_TENANT_ID = '22222222-2222-2222-2222-222222222222';

// Acme Corp Users
const ALICE_ID = 'aaaaaaaa-0001-4000-a000-000000000001'; // admin
const BOB_ID = 'aaaaaaaa-0002-4000-a000-000000000002'; // manager
const CAROL_ID = 'aaaaaaaa-0003-4000-a000-000000000003'; // manager
const DAVE_ID = 'aaaaaaaa-0004-4000-a000-000000000004'; // member (Bob's report)
const EVE_ID = 'aaaaaaaa-0005-4000-a000-000000000005'; // member (Bob's report)
const FRANK_ID = 'aaaaaaaa-0006-4000-a000-000000000006'; // member (Carol's report)
const GRACE_ID = 'aaaaaaaa-0007-4000-a000-000000000007'; // member (Carol's report)

// Beta Inc Users
const ZARA_ID = 'bbbbbbbb-0001-4000-b000-000000000001'; // admin
const YURI_ID = 'bbbbbbbb-0002-4000-b000-000000000002'; // manager
const XENA_ID = 'bbbbbbbb-0003-4000-b000-000000000003'; // member (Yuri's report)

// Acme Templates
const WEEKLY_TEMPLATE_ID = 'dddddddd-0001-4000-a000-000000000001';
const CAREER_TEMPLATE_ID = 'dddddddd-0002-4000-a000-000000000002';

// Structured 1:1 Template (Acme default)
const STRUCTURED_TEMPLATE_ID = 'dddddddd-0004-4000-a000-000000000004';

// Beta Template
const BETA_TEMPLATE_ID = 'dddddddd-0003-4000-a000-000000000003';

// Acme Template Sections (Weekly Check-in)
const SEC_WEEKLY_WELLBEING_ID = 'aaaabbbb-0001-4000-ab00-000000000001';
const SEC_WEEKLY_PERFORMANCE_ID = 'aaaabbbb-0002-4000-ab00-000000000002';
const SEC_WEEKLY_CHECKIN_ID = 'aaaabbbb-0003-4000-ab00-000000000003';

// Acme Template Sections (Career Development)
const SEC_CAREER_GOALS_ID = 'aaaabbbb-0004-4000-ab00-000000000004';
const SEC_CAREER_FEEDBACK_ID = 'aaaabbbb-0005-4000-ab00-000000000005';

// Structured 1:1 Sections
const SEC_S11_FOLLOWUP_ID = 'aaaabbbb-0010-4000-ab00-000000000010';
const SEC_S11_ENERGY_ID = 'aaaabbbb-0011-4000-ab00-000000000011';
const SEC_S11_PROGRESS_ID = 'aaaabbbb-0012-4000-ab00-000000000012';
const SEC_S11_BLOCKERS_ID = 'aaaabbbb-0013-4000-ab00-000000000013';
const SEC_S11_COLLAB_ID = 'aaaabbbb-0014-4000-ab00-000000000014';
const SEC_S11_LEARNING_ID = 'aaaabbbb-0015-4000-ab00-000000000015';
const SEC_S11_CAPACITY_ID = 'aaaabbbb-0016-4000-ab00-000000000016';

// Structured 1:1 Questions
const Q_S11_RESOLVE_SCORE_ID = 'eeeeeeee-0020-4000-a000-000000000020';
const Q_S11_RESOLVE_COMMENT_ID = 'eeeeeeee-0021-4000-a000-000000000021';
const Q_S11_ENERGY_SCORE_ID = 'eeeeeeee-0022-4000-a000-000000000022';
const Q_S11_ENERGY_COMMENT_ID = 'eeeeeeee-0023-4000-a000-000000000023';
const Q_S11_PROGRESS_SCORE_ID = 'eeeeeeee-0024-4000-a000-000000000024';
const Q_S11_PROGRESS_COMMENT_ID = 'eeeeeeee-0025-4000-a000-000000000025';
const Q_S11_BLOCKERS_SCORE_ID = 'eeeeeeee-0026-4000-a000-000000000026';
const Q_S11_BLOCKERS_MAIN_ID = 'eeeeeeee-0027-4000-a000-000000000027';
const Q_S11_BLOCKERS_HELP_ID = 'eeeeeeee-0028-4000-a000-000000000028';
const Q_S11_COLLAB_SCORE_ID = 'eeeeeeee-0029-4000-a000-000000000029';
const Q_S11_COLLAB_COMMENT_ID = 'eeeeeeee-0030-4000-a000-000000000030';
const Q_S11_LEARNED_YN_ID = 'eeeeeeee-0031-4000-a000-000000000031';
const Q_S11_LEARNED_WHAT_ID = 'eeeeeeee-0032-4000-a000-000000000032';
const Q_S11_EXPLORE_ID = 'eeeeeeee-0033-4000-a000-000000000033';
const Q_S11_CAPACITY_SCORE_ID = 'eeeeeeee-0034-4000-a000-000000000034';
const Q_S11_CAPACITY_COMMENT_ID = 'eeeeeeee-0035-4000-a000-000000000035';

// Beta Template Sections
const SEC_BETA_CHECKIN_ID = 'aaaabbbb-0006-4000-ab00-000000000006';

// Acme Labels
const LABEL_CHECKIN_ID = 'aabbccee-0001-4000-ab00-000000000001';
const LABEL_CAREER_ID = 'aabbccee-0002-4000-ab00-000000000002';
const LABEL_STRUCTURED_ID = 'aabbccee-0003-4000-ab00-000000000003';

// Acme Template Questions (Weekly Check-in)
const Q_MOOD_ID = 'eeeeeeee-0001-4000-a000-000000000001';
const Q_WORKLOAD_ID = 'eeeeeeee-0002-4000-a000-000000000002';
const Q_BLOCKERS_ID = 'eeeeeeee-0003-4000-a000-000000000003';
const Q_HELP_ID = 'eeeeeeee-0004-4000-a000-000000000004';
const Q_SATISFACTION_ID = 'eeeeeeee-0005-4000-a000-000000000005';

// Acme Template Questions (Career Development)
const Q_CAREER_GOALS_ID = 'eeeeeeee-0006-4000-a000-000000000006';
const Q_GROWTH_ID = 'eeeeeeee-0007-4000-a000-000000000007';
const Q_LEARNING_ID = 'eeeeeeee-0008-4000-a000-000000000008';
const Q_FEEDBACK_ID = 'eeeeeeee-0009-4000-a000-000000000009';

// Beta Template Questions
const Q_BETA_MOOD_ID = 'eeeeeeee-0010-4000-a000-000000000010';

// Acme Meeting Series
const SERIES_BOB_DAVE_ID = 'ffffffff-0001-4000-a000-000000000001';
const SERIES_BOB_EVE_ID = 'ffffffff-0002-4000-a000-000000000002';
const SERIES_CAROL_FRANK_ID = 'ffffffff-0003-4000-a000-000000000003';

// Beta Meeting Series
const SERIES_YURI_XENA_ID = 'ffffffff-0004-4000-a000-000000000004';

// Acme Sessions (Bob <-> Dave)
const SESSION_1_ID = '99999999-0001-4000-9000-000000000001';
const SESSION_2_ID = '99999999-0002-4000-9000-000000000002';
const SESSION_3_ID = '99999999-0003-4000-9000-000000000003';

// Acme Action Items
const ACTION_OPEN_1_ID = '88888888-0001-4000-8000-000000000001';
const ACTION_OPEN_2_ID = '88888888-0002-4000-8000-000000000002';
const ACTION_DONE_ID = '88888888-0003-4000-8000-000000000003';
const ACTION_DONE_DAVE_1_ID = '88888888-0004-4000-8000-000000000004';
const ACTION_DONE_DAVE_2_ID = '88888888-0005-4000-8000-000000000005';
const ACTION_DONE_DAVE_3_ID = '88888888-0006-4000-8000-000000000006';

// Analytics Snapshots
const SNAPSHOT_S1_SCORE_ID = '55555555-0001-4000-a000-000000000001';
const SNAPSHOT_S1_WELLBEING_ID = '55555555-0002-4000-a000-000000000002';
const SNAPSHOT_S1_PERFORMANCE_ID = '55555555-0003-4000-a000-000000000003';
const SNAPSHOT_S1_CHECKIN_ID = '55555555-0004-4000-a000-000000000004';
const SNAPSHOT_S2_SCORE_ID = '55555555-0005-4000-a000-000000000005';
const SNAPSHOT_S2_WELLBEING_ID = '55555555-0006-4000-a000-000000000006';
const SNAPSHOT_S2_PERFORMANCE_ID = '55555555-0007-4000-a000-000000000007';
const SNAPSHOT_S2_CHECKIN_ID = '55555555-0008-4000-a000-000000000008';
const SNAPSHOT_S3_SCORE_ID = '55555555-0009-4000-a000-000000000009';
const SNAPSHOT_S3_WELLBEING_ID = '55555555-0010-4000-a000-000000000010';
const SNAPSHOT_S3_PERFORMANCE_ID = '55555555-0011-4000-a000-000000000011';
const SNAPSHOT_S3_CHECKIN_ID = '55555555-0012-4000-a000-000000000012';

// Eve Sessions (Bob <-> Eve)
const SESSION_EVE_1_ID = '99999999-0004-4000-9000-000000000004';
const SESSION_EVE_2_ID = '99999999-0005-4000-9000-000000000005';

// Frank Sessions (Carol <-> Frank)
const SESSION_FRANK_1_ID = '99999999-0006-4000-9000-000000000006';
const SESSION_FRANK_2_ID = '99999999-0007-4000-9000-000000000007';

// Eve Session Answers
const ANSWER_EVE_S1_MOOD_ID = '66666666-0020-4000-8000-000000000020';
const ANSWER_EVE_S1_WORKLOAD_ID = '66666666-0021-4000-8000-000000000021';
const ANSWER_EVE_S1_BLOCKERS_ID = '66666666-0022-4000-8000-000000000022';
const ANSWER_EVE_S1_HELP_ID = '66666666-0023-4000-8000-000000000023';
const ANSWER_EVE_S1_SATISFACTION_ID = '66666666-0024-4000-8000-000000000024';
const ANSWER_EVE_S2_MOOD_ID = '66666666-0025-4000-8000-000000000025';
const ANSWER_EVE_S2_WORKLOAD_ID = '66666666-0026-4000-8000-000000000026';
const ANSWER_EVE_S2_BLOCKERS_ID = '66666666-0027-4000-8000-000000000027';
const ANSWER_EVE_S2_HELP_ID = '66666666-0028-4000-8000-000000000028';
const ANSWER_EVE_S2_SATISFACTION_ID = '66666666-0029-4000-8000-000000000029';

// Frank Session Answers
const ANSWER_FRANK_S1_MOOD_ID = '66666666-0030-4000-8000-000000000030';
const ANSWER_FRANK_S1_WORKLOAD_ID = '66666666-0031-4000-8000-000000000031';
const ANSWER_FRANK_S1_BLOCKERS_ID = '66666666-0032-4000-8000-000000000032';
const ANSWER_FRANK_S1_HELP_ID = '66666666-0033-4000-8000-000000000033';
const ANSWER_FRANK_S1_SATISFACTION_ID = '66666666-0034-4000-8000-000000000034';
const ANSWER_FRANK_S2_MOOD_ID = '66666666-0035-4000-8000-000000000035';
const ANSWER_FRANK_S2_WORKLOAD_ID = '66666666-0036-4000-8000-000000000036';
const ANSWER_FRANK_S2_BLOCKERS_ID = '66666666-0037-4000-8000-000000000037';
const ANSWER_FRANK_S2_HELP_ID = '66666666-0038-4000-8000-000000000038';
const ANSWER_FRANK_S2_SATISFACTION_ID = '66666666-0039-4000-8000-000000000039';

// Eve & Frank Analytics Snapshots
const SNAPSHOT_EVE_S1_SCORE_ID = '55555555-0020-4000-a000-000000000020';
const SNAPSHOT_EVE_S1_WELLBEING_ID = '55555555-0021-4000-a000-000000000021';
const SNAPSHOT_EVE_S1_CHECKIN_ID = '55555555-0022-4000-a000-000000000022';
const SNAPSHOT_EVE_S2_SCORE_ID = '55555555-0023-4000-a000-000000000023';
const SNAPSHOT_EVE_S2_WELLBEING_ID = '55555555-0024-4000-a000-000000000024';
const SNAPSHOT_EVE_S2_CHECKIN_ID = '55555555-0025-4000-a000-000000000025';
const SNAPSHOT_FRANK_S1_SCORE_ID = '55555555-0030-4000-a000-000000000030';
const SNAPSHOT_FRANK_S1_WELLBEING_ID = '55555555-0031-4000-a000-000000000031';
const SNAPSHOT_FRANK_S1_CHECKIN_ID = '55555555-0032-4000-a000-000000000032';
const SNAPSHOT_FRANK_S2_SCORE_ID = '55555555-0033-4000-a000-000000000033';
const SNAPSHOT_FRANK_S2_WELLBEING_ID = '55555555-0034-4000-a000-000000000034';
const SNAPSHOT_FRANK_S2_CHECKIN_ID = '55555555-0035-4000-a000-000000000035';

// Grace Sessions (Carol <-> Grace)
const SESSION_GRACE_1_ID = '99999999-0008-4000-9000-000000000008';
const SESSION_GRACE_2_ID = '99999999-0009-4000-9000-000000000009';

// Grace series
const SERIES_CAROL_GRACE_ID = 'ffffffff-0005-4000-a000-000000000005';

// Grace Session Answers
const ANSWER_GRACE_S1_MOOD_ID = '66666666-0040-4000-8000-000000000040';
const ANSWER_GRACE_S1_WORKLOAD_ID = '66666666-0041-4000-8000-000000000041';
const ANSWER_GRACE_S1_BLOCKERS_ID = '66666666-0042-4000-8000-000000000042';
const ANSWER_GRACE_S1_HELP_ID = '66666666-0043-4000-8000-000000000043';
const ANSWER_GRACE_S1_SATISFACTION_ID = '66666666-0044-4000-8000-000000000044';
const ANSWER_GRACE_S2_MOOD_ID = '66666666-0045-4000-8000-000000000045';
const ANSWER_GRACE_S2_WORKLOAD_ID = '66666666-0046-4000-8000-000000000046';
const ANSWER_GRACE_S2_BLOCKERS_ID = '66666666-0047-4000-8000-000000000047';
const ANSWER_GRACE_S2_HELP_ID = '66666666-0048-4000-8000-000000000048';
const ANSWER_GRACE_S2_SATISFACTION_ID = '66666666-0049-4000-8000-000000000049';

// Grace Analytics Snapshots
const SNAPSHOT_GRACE_S1_SCORE_ID = '55555555-0040-4000-a000-000000000040';
const SNAPSHOT_GRACE_S1_WELLBEING_ID = '55555555-0041-4000-a000-000000000041';
const SNAPSHOT_GRACE_S1_CHECKIN_ID = '55555555-0042-4000-a000-000000000042';
const SNAPSHOT_GRACE_S2_SCORE_ID = '55555555-0043-4000-a000-000000000043';
const SNAPSHOT_GRACE_S2_WELLBEING_ID = '55555555-0044-4000-a000-000000000044';
const SNAPSHOT_GRACE_S2_CHECKIN_ID = '55555555-0045-4000-a000-000000000045';

// Alice's Series and Sessions (Alice manages Bob and Carol)
const SERIES_ALICE_BOB_ID = 'ffffffff-0010-4000-a000-000000000010';
const SERIES_ALICE_CAROL_ID = 'ffffffff-0011-4000-a000-000000000011';
const SESSION_ALICE_BOB_1_ID = '99999999-0010-4000-9000-000000000010';
const SESSION_ALICE_BOB_2_ID = '99999999-0011-4000-9000-000000000011';
const SESSION_ALICE_BOB_3_ID = '99999999-0012-4000-9000-000000000012';
const SESSION_ALICE_CAROL_1_ID = '99999999-0013-4000-9000-000000000013';
const SESSION_ALICE_CAROL_2_ID = '99999999-0014-4000-9000-000000000014';
const SESSION_ALICE_BOB_UPCOMING_ID = '99999999-0015-4000-9000-000000000015';
const SESSION_ALICE_CAROL_UPCOMING_ID = '99999999-0016-4000-9000-000000000016';
const ACTION_ALICE_1_ID = '88888888-0010-4000-8000-000000000010';
const ACTION_ALICE_2_ID = '88888888-0011-4000-8000-000000000011';
const ACTION_ALICE_3_ID = '88888888-0012-4000-8000-000000000012';
const ACTION_ALICE_4_ID = '88888888-0013-4000-8000-000000000013';
const ACTION_ALICE_OVERDUE_ID = '88888888-0014-4000-8000-000000000014';
const ACTION_ALICE_OWN_1_ID = '88888888-0015-4000-8000-000000000015';
const ACTION_ALICE_OWN_2_ID = '88888888-0016-4000-8000-000000000016';
const ACTION_ALICE_OWN_3_ID = '88888888-0017-4000-8000-000000000017';
const ACTION_ALICE_OWN_OVERDUE_1_ID = '88888888-0018-4000-8000-000000000018';
const ACTION_ALICE_OWN_OVERDUE_2_ID = '88888888-0019-4000-8000-000000000019';
const ACTION_ALICE_OWN_OVERDUE_3_ID = '88888888-0020-4000-8000-000000000020';

// Acme Private Note
const PRIVATE_NOTE_ID = '77777777-0001-4000-a000-000000000001';

// Session Answers
const ANSWER_S1_MOOD_ID = '66666666-0001-4000-8000-000000000001';
const ANSWER_S1_WORKLOAD_ID = '66666666-0002-4000-8000-000000000002';
const ANSWER_S1_BLOCKERS_ID = '66666666-0003-4000-8000-000000000003';
const ANSWER_S1_HELP_ID = '66666666-0004-4000-8000-000000000004';
const ANSWER_S1_SATISFACTION_ID = '66666666-0005-4000-8000-000000000005';
const ANSWER_S2_MOOD_ID = '66666666-0006-4000-8000-000000000006';
const ANSWER_S2_WORKLOAD_ID = '66666666-0007-4000-8000-000000000007';
const ANSWER_S2_BLOCKERS_ID = '66666666-0008-4000-8000-000000000008';
const ANSWER_S2_HELP_ID = '66666666-0009-4000-8000-000000000009';
const ANSWER_S2_SATISFACTION_ID = '66666666-0010-4000-8000-000000000010';
const ANSWER_S3_MOOD_ID = '66666666-0011-4000-8000-000000000011';
const ANSWER_S3_WORKLOAD_ID = '66666666-0012-4000-8000-000000000012';
const ANSWER_S3_BLOCKERS_ID = '66666666-0013-4000-8000-000000000013';
const ANSWER_S3_HELP_ID = '66666666-0014-4000-8000-000000000014';
const ANSWER_S3_SATISFACTION_ID = '66666666-0015-4000-8000-000000000015';

// Sample Notifications
const NOTIF_PRE_MEETING_BOB_ID = 'aaccddee-0001-4000-ac00-000000000001';
const NOTIF_PRE_MEETING_DAVE_ID = 'aaccddee-0002-4000-ac00-000000000002';
const NOTIF_AGENDA_PREP_BOB_ID = 'aaccddee-0003-4000-ac00-000000000003';
const NOTIF_AGENDA_PREP_DAVE_ID = 'aaccddee-0004-4000-ac00-000000000004';

// =============================================================================
// Techvibe SRL — Romanian test tenant
// =============================================================================

const TV_TENANT_ID = 'eeeeeeee-eeee-4000-a000-eeeeeeeeeeee';

// Users
const TV_CIPRIAN_ID = 'eeeeeeee-0001-4000-a000-eeeeeeeeeeee'; // manager, also report of Elena
const TV_ELENA_ID   = 'eeeeeeee-0002-4000-a000-eeeeeeeeeeee'; // admin / CEO
const TV_ANDREI_ID  = 'eeeeeeee-0003-4000-a000-eeeeeeeeeeee'; // member, report of Ciprian
const TV_MARIA_ID   = 'eeeeeeee-0004-4000-a000-eeeeeeeeeeee'; // member, report of Ciprian
const TV_RADU_ID    = 'eeeeeeee-0005-4000-a000-eeeeeeeeeeee'; // manager, report of Elena
const TV_IOANA_ID   = 'eeeeeeee-0006-4000-a000-eeeeeeeeeeee'; // member, report of Radu
const TV_ALEX_ID    = 'eeeeeeee-0007-4000-a000-eeeeeeeeeeee'; // member, report of Radu

// Templates
const TV_CHECKIN_TEMPLATE_ID = 'dddddddd-0010-4000-a000-dddddddddddd';
const TV_RETRO_TEMPLATE_ID   = 'dddddddd-0011-4000-a000-dddddddddddd';

// Template labels
const TV_LABEL_CHECKIN_ID = 'eeeedddd-0010-4000-a000-eeeeeeeeeeee';
const TV_LABEL_RETRO_ID   = 'eeeedddd-0011-4000-a000-eeeeeeeeeeee';

// Template sections — Check-in
const TV_SEC_STARE_ID     = 'eeeeffff-0001-4000-a000-eeeeeeeeeeee';
const TV_SEC_PROGRES_ID   = 'eeeeffff-0002-4000-a000-eeeeeeeeeeee';
const TV_SEC_COLLAB_ID    = 'eeeeffff-0003-4000-a000-eeeeeeeeeeee';
// Template sections — Retro
const TV_SEC_REALIZARI_ID  = 'eeeeffff-0004-4000-a000-eeeeeeeeeeee';
const TV_SEC_OBIECTIVE_ID  = 'eeeeffff-0005-4000-a000-eeeeeeeeeeee';
const TV_SEC_DEZVOLTARE_ID = 'eeeeffff-0006-4000-a000-eeeeeeeeeeee';

// Template questions — Check-in
const TV_Q_MOOD_ID         = 'eeee0000-0001-4000-a000-eeeeeeeeeeee';
const TV_Q_ENERGIE_ID      = 'eeee0000-0002-4000-a000-eeeeeeeeeeee';
const TV_Q_BLOCKERS_TV_ID  = 'eeee0000-0003-4000-a000-eeeeeeeeeeee';
const TV_Q_HELP_TV_ID      = 'eeee0000-0004-4000-a000-eeeeeeeeeeee';
const TV_Q_SATISFACTION_TV = 'eeee0000-0005-4000-a000-eeeeeeeeeeee';
// Template questions — Retro
const TV_Q_REALIZARE_ID    = 'eeee0000-0006-4000-a000-eeeeeeeeeeee';
const TV_Q_OBJ_SCORE_ID    = 'eeee0000-0007-4000-a000-eeeeeeeeeeee';
const TV_Q_IMBUNATATI_ID   = 'eeee0000-0008-4000-a000-eeeeeeeeeeee';
const TV_Q_COLLAB_SCORE_ID = 'eeee0000-0009-4000-a000-eeeeeeeeeeee';

// Meeting series
const TV_SERIES_EC_ID = 'ffffffff-0010-4000-a000-ffffffffffff'; // Elena -> Ciprian
const TV_SERIES_CA_ID = 'ffffffff-0011-4000-a000-ffffffffffff'; // Ciprian -> Andrei
const TV_SERIES_CM_ID = 'ffffffff-0012-4000-a000-ffffffffffff'; // Ciprian -> Maria
const TV_SERIES_RI_ID = 'ffffffff-0013-4000-a000-ffffffffffff'; // Radu -> Ioana
const TV_SERIES_RA_ID = 'ffffffff-0014-4000-a000-ffffffffffff'; // Radu -> Alexandru

// Sessions
const TV_S_EC_1 = '99999999-0010-4000-9000-999999999999'; // Elena/Ciprian S1
const TV_S_EC_2 = '99999999-0011-4000-9000-999999999999'; // S2
const TV_S_EC_3 = '99999999-0012-4000-9000-999999999999'; // S3
const TV_S_EC_4 = '99999999-0013-4000-9000-999999999999'; // S4 in_progress
const TV_S_CA_1 = '99999999-0014-4000-9000-999999999999'; // Ciprian/Andrei S1
const TV_S_CA_2 = '99999999-0015-4000-9000-999999999999';
const TV_S_CA_3 = '99999999-0016-4000-9000-999999999999';
const TV_S_CA_4 = '99999999-0017-4000-9000-999999999999'; // S4 in_progress
const TV_S_CM_1 = '99999999-0018-4000-9000-999999999999'; // Ciprian/Maria S1
const TV_S_CM_2 = '99999999-0019-4000-9000-999999999999';
const TV_S_CM_3 = '99999999-0020-4000-9000-999999999999'; // S3 in_progress
const TV_S_RI_1 = '99999999-0021-4000-9000-999999999999'; // Radu/Ioana S1
const TV_S_RI_2 = '99999999-0022-4000-9000-999999999999';
const TV_S_RA_1 = '99999999-0023-4000-9000-999999999999'; // Radu/Alexandru S1
const TV_S_RA_2 = '99999999-0024-4000-9000-999999999999';

// Talking points
const TV_TP_1 = '77777777-0001-4000-a000-777777777777';
const TV_TP_2 = '77777777-0002-4000-a000-777777777777';
const TV_TP_3 = '77777777-0003-4000-a000-777777777777';
const TV_TP_4 = '77777777-0004-4000-a000-777777777777';
const TV_TP_5 = '77777777-0005-4000-a000-777777777777';

// Action items
const TV_AI_01 = '88888888-0001-4000-8000-888888888888';
const TV_AI_02 = '88888888-0002-4000-8000-888888888888';
const TV_AI_03 = '88888888-0003-4000-8000-888888888888';
const TV_AI_04 = '88888888-0004-4000-8000-888888888888';
const TV_AI_05 = '88888888-0005-4000-8000-888888888888';
const TV_AI_06 = '88888888-0006-4000-8000-888888888888';
const TV_AI_07 = '88888888-0007-4000-8000-888888888888';
const TV_AI_08 = '88888888-0008-4000-8000-888888888888';
const TV_AI_09 = '88888888-0009-4000-8000-888888888888';
const TV_AI_10 = '88888888-0010-4000-8000-888888888888';

// Private notes
const TV_NOTE_1 = '44440000-0001-4000-a400-eeeeeeeeeeee';
const TV_NOTE_2 = '44440000-0002-4000-a400-eeeeeeeeeeee';

// =============================================================================
// Seed functions
// =============================================================================

async function seedTenants() {
  console.log('  Seeding tenants...');
  await db
    .insert(schema.tenants)
    .values([
      {
        id: ACME_TENANT_ID,
        name: 'Acme Corp',
        slug: 'acme-corp',
        orgType: 'for_profit' as const,
        plan: 'pro',
        settings: {
          timezone: 'America/New_York',
          defaultCadence: 'biweekly',
          defaultDurationMinutes: 30,
          preferredLanguage: 'en',
          companyContext: 'Acme Corp is a mid-size SaaS company (120 employees) building developer tools. We value transparency, async-first communication, and continuous learning. Currently scaling from Series A to Series B, with a focus on product-led growth. Engineering culture emphasizes code review, pair programming, and blameless post-mortems. We run quarterly OKRs and monthly retrospectives at the team level.',
        },
      },
      {
        id: BETA_TENANT_ID,
        name: 'Beta Inc',
        slug: 'beta-inc',
        orgType: 'non_profit' as const,
        plan: 'free',
        settings: {
          timezone: 'Europe/London',
          defaultCadence: 'weekly',
          defaultDurationMinutes: 45,
          preferredLanguage: 'en',
        },
      },
    ])
    .onConflictDoUpdate({
      target: schema.tenants.id,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        orgType: sql`excluded.org_type`,
        plan: sql`excluded.plan`,
        settings: sql`excluded.settings`,
        updatedAt: sql`now()`,
      },
    });
}

async function seedUsers() {
  console.log('  Seeding users...');

  // Acme Corp users (managers first, then members with manager references)
  const acmeUsers = [
    {
      id: ALICE_ID,
      tenantId: ACME_TENANT_ID,
      email: 'alice@acme.example.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      level: 'admin' as const,
      jobTitle: 'VP of Engineering',
      teamName: 'Alice',
      passwordHash: TEST_PASSWORD_HASH,
      isActive: true,
    },
    {
      id: BOB_ID,
      tenantId: ACME_TENANT_ID,
      email: 'bob@acme.example.com',
      firstName: 'Bob',
      lastName: 'Smith',
      level: 'manager' as const,
      jobTitle: 'Engineering Manager',
      teamName: 'Bob',
      passwordHash: TEST_PASSWORD_HASH,
      isActive: true,
      managerId: ALICE_ID,
    },
    {
      id: CAROL_ID,
      tenantId: ACME_TENANT_ID,
      email: 'carol@acme.example.com',
      firstName: 'Carol',
      lastName: 'Williams',
      level: 'manager' as const,
      jobTitle: 'Product Manager',
      teamName: 'Carol',
      managerId: ALICE_ID,
      isActive: true,
    },
    {
      id: DAVE_ID,
      tenantId: ACME_TENANT_ID,
      email: 'dave@acme.example.com',
      firstName: 'Dave',
      lastName: 'Brown',
      level: 'member' as const,
      jobTitle: 'Senior Software Engineer',
      passwordHash: TEST_PASSWORD_HASH,
      managerId: BOB_ID,
      isActive: true,
    },
    {
      id: EVE_ID,
      tenantId: ACME_TENANT_ID,
      email: 'eve@acme.example.com',
      firstName: 'Eve',
      lastName: 'Davis',
      level: 'member' as const,
      jobTitle: 'Software Engineer',
      managerId: BOB_ID,
      isActive: true,
    },
    {
      id: FRANK_ID,
      tenantId: ACME_TENANT_ID,
      email: 'frank@acme.example.com',
      firstName: 'Frank',
      lastName: 'Miller',
      level: 'member' as const,
      jobTitle: 'Product Designer',
      managerId: CAROL_ID,
      isActive: true,
    },
    {
      id: GRACE_ID,
      tenantId: ACME_TENANT_ID,
      email: 'grace@acme.example.com',
      firstName: 'Grace',
      lastName: 'Wilson',
      level: 'member' as const,
      jobTitle: 'UX Researcher',
      managerId: CAROL_ID,
      isActive: true,
    },
  ];

  // Beta Inc users
  const betaUsers = [
    {
      id: ZARA_ID,
      tenantId: BETA_TENANT_ID,
      email: 'zara@beta.example.com',
      firstName: 'Zara',
      lastName: 'Admin',
      level: 'admin' as const,
      jobTitle: 'CEO',
      isActive: true,
    },
    {
      id: YURI_ID,
      tenantId: BETA_TENANT_ID,
      email: 'yuri@beta.example.com',
      firstName: 'Yuri',
      lastName: 'Manager',
      level: 'manager' as const,
      jobTitle: 'Team Lead',
      teamName: 'Yuri',
      isActive: true,
    },
    {
      id: XENA_ID,
      tenantId: BETA_TENANT_ID,
      email: 'xena@beta.example.com',
      firstName: 'Xena',
      lastName: 'Member',
      level: 'member' as const,
      jobTitle: 'Developer',
      managerId: YURI_ID,
      isActive: true,
    },
  ];

  for (const user of [...acmeUsers, ...betaUsers]) {
    await db
      .insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: sql`excluded.email`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          level: sql`excluded.level`,
          jobTitle: sql`excluded.job_title`,
          passwordHash: sql`excluded.password_hash`,
          managerId: sql`excluded.manager_id`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function seedTemplates() {
  console.log('  Seeding templates...');

  // Acme Templates
  await db
    .insert(schema.questionnaireTemplates)
    .values([
      {
        id: WEEKLY_TEMPLATE_ID,
        tenantId: ACME_TENANT_ID,
        name: 'Weekly Check-in',
        description: 'Quick weekly pulse check covering mood, workload, blockers, and satisfaction',
        isDefault: true,
        isPublished: true,
        createdBy: ALICE_ID,
        version: 1,
      },
      {
        id: CAREER_TEMPLATE_ID,
        tenantId: ACME_TENANT_ID,
        name: 'Career Development',
        description: 'Quarterly career growth discussion covering goals, opportunities, and feedback',
        isDefault: false,
        isPublished: true,
        createdBy: ALICE_ID,
        version: 1,
      },
    ])
    .onConflictDoUpdate({
      target: schema.questionnaireTemplates.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        isDefault: sql`excluded.is_default`,
        isPublished: sql`excluded.is_published`,
        updatedAt: sql`now()`,
      },
    });

  // Beta Template
  await db
    .insert(schema.questionnaireTemplates)
    .values({
      id: BETA_TEMPLATE_ID,
      tenantId: BETA_TENANT_ID,
      name: 'Simple Check-in',
      description: 'Basic mood check for small teams',
      isDefault: true,
      isPublished: true,
      createdBy: ZARA_ID,
      version: 1,
    })
    .onConflictDoUpdate({
      target: schema.questionnaireTemplates.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        updatedAt: sql`now()`,
      },
    });

  // Structured 1:1 Template (Acme)
  await db
    .insert(schema.questionnaireTemplates)
    .values({
      id: STRUCTURED_TEMPLATE_ID,
      tenantId: ACME_TENANT_ID,
      name: 'Structured 1:1',
      description: 'Comprehensive weekly 1:1 covering follow-up, energy, progress, blockers, collaboration, learning, and capacity',
      isDefault: false,
      isPublished: true,
      createdBy: ALICE_ID,
      version: 1,
    })
    .onConflictDoUpdate({
      target: schema.questionnaireTemplates.id,
      set: { name: sql`excluded.name`, description: sql`excluded.description`, updatedAt: sql`now()` },
    });

  // Acme Labels
  console.log('  Seeding labels...');
  await db
    .insert(schema.templateLabels)
    .values([
      { id: LABEL_CHECKIN_ID, tenantId: ACME_TENANT_ID, name: 'Check-in', color: '#3b82f6' },
      { id: LABEL_CAREER_ID, tenantId: ACME_TENANT_ID, name: 'Career', color: '#8b5cf6' },
      { id: LABEL_STRUCTURED_ID, tenantId: ACME_TENANT_ID, name: '1:1 Structurat', color: '#10b981' },
    ])
    .onConflictDoUpdate({
      target: schema.templateLabels.id,
      set: {
        name: sql`excluded.name`,
        color: sql`excluded.color`,
      },
    });

  // Label assignments
  await db
    .insert(schema.templateLabelAssignments)
    .values([
      { templateId: WEEKLY_TEMPLATE_ID, labelId: LABEL_CHECKIN_ID },
      { templateId: CAREER_TEMPLATE_ID, labelId: LABEL_CAREER_ID },
      { templateId: STRUCTURED_TEMPLATE_ID, labelId: LABEL_STRUCTURED_ID },
    ])
    .onConflictDoNothing();

  // Template Sections
  console.log('  Seeding template sections...');
  const sections = [
    { id: SEC_WEEKLY_WELLBEING_ID, templateId: WEEKLY_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Wellbeing', sortOrder: 0 },
    { id: SEC_WEEKLY_PERFORMANCE_ID, templateId: WEEKLY_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Performance', sortOrder: 1 },
    { id: SEC_WEEKLY_CHECKIN_ID, templateId: WEEKLY_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Check-in', sortOrder: 2 },
    { id: SEC_CAREER_GOALS_ID, templateId: CAREER_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Career Goals', sortOrder: 0 },
    { id: SEC_CAREER_FEEDBACK_ID, templateId: CAREER_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Feedback', sortOrder: 1 },
    { id: SEC_S11_FOLLOWUP_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Follow-up', sortOrder: 0 },
    { id: SEC_S11_ENERGY_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Energie & Productivitate', sortOrder: 1 },
    { id: SEC_S11_PROGRESS_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Progres pe obiective', sortOrder: 2 },
    { id: SEC_S11_BLOCKERS_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Blocaje / Fricțiuni', sortOrder: 3 },
    { id: SEC_S11_COLLAB_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Colaborare & Context', sortOrder: 4 },
    { id: SEC_S11_LEARNING_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Învățare & Creștere', sortOrder: 5 },
    { id: SEC_S11_CAPACITY_ID, templateId: STRUCTURED_TEMPLATE_ID, tenantId: ACME_TENANT_ID, name: 'Capacitate & Încărcare', sortOrder: 6 },
    { id: SEC_BETA_CHECKIN_ID, templateId: BETA_TEMPLATE_ID, tenantId: BETA_TENANT_ID, name: 'Check-in', sortOrder: 0 },
  ];

  for (const sec of sections) {
    await db
      .insert(schema.templateSections)
      .values(sec)
      .onConflictDoUpdate({
        target: schema.templateSections.id,
        set: {
          name: sql`excluded.name`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }

  // Weekly Check-in Questions
  const weeklyQuestions = [
    {
      id: Q_MOOD_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sectionId: SEC_WEEKLY_WELLBEING_ID,
      questionText: 'How are you feeling this week?',
      helpText: 'Pick the emoji that best represents your overall mood',
      answerType: 'mood' as const,
      answerConfig: { options: ['great', 'good', 'okay', 'struggling', 'bad'] },
      isRequired: true,
      sortOrder: 1,
    },
    {
      id: Q_WORKLOAD_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sectionId: SEC_WEEKLY_WELLBEING_ID,
      questionText: 'How would you rate your workload this week?',
      helpText: '1 = too little, 3 = just right, 5 = overwhelmed',
      answerType: 'rating_1_5' as const,
      answerConfig: { labels: { 1: 'Too little', 3: 'Just right', 5: 'Overwhelmed' } },
      isRequired: true,
      sortOrder: 2,
    },
    {
      id: Q_BLOCKERS_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sectionId: SEC_WEEKLY_PERFORMANCE_ID,
      questionText: 'What blockers or challenges are you facing?',
      helpText: 'Describe any issues preventing you from doing your best work',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 3,
    },
    {
      id: Q_HELP_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sectionId: SEC_WEEKLY_CHECKIN_ID,
      questionText: 'Do you need any help from me this week?',
      answerType: 'yes_no' as const,
      answerConfig: {},
      isRequired: true,
      sortOrder: 4,
    },
    {
      id: Q_SATISFACTION_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sectionId: SEC_WEEKLY_CHECKIN_ID,
      questionText: 'How satisfied are you with your work this week?',
      helpText: '1 = very unsatisfied, 10 = extremely satisfied',
      answerType: 'rating_1_10' as const,
      answerConfig: {},
      isRequired: true,
      sortOrder: 5,
    },
  ];

  // Career Development Questions
  const careerQuestions = [
    {
      id: Q_CAREER_GOALS_ID,
      templateId: CAREER_TEMPLATE_ID,
      sectionId: SEC_CAREER_GOALS_ID,
      questionText: 'What are your career goals for the next 6-12 months?',
      helpText: 'Think about skills, roles, or projects you want to pursue',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: true,
      sortOrder: 1,
    },
    {
      id: Q_GROWTH_ID,
      templateId: CAREER_TEMPLATE_ID,
      sectionId: SEC_CAREER_GOALS_ID,
      questionText: 'How would you rate your growth opportunities here?',
      helpText: '1 = no opportunities, 5 = excellent opportunities',
      answerType: 'rating_1_5' as const,
      answerConfig: {},
      isRequired: true,
      sortOrder: 2,
    },
    {
      id: Q_LEARNING_ID,
      templateId: CAREER_TEMPLATE_ID,
      sectionId: SEC_CAREER_GOALS_ID,
      questionText: 'What is your preferred way of learning?',
      answerType: 'multiple_choice' as const,
      answerConfig: {
        options: [
          'Hands-on projects',
          'Online courses',
          'Mentoring / pair programming',
          'Conferences / workshops',
          'Reading / documentation',
        ],
      },
      isRequired: false,
      sortOrder: 3,
    },
    {
      id: Q_FEEDBACK_ID,
      templateId: CAREER_TEMPLATE_ID,
      sectionId: SEC_CAREER_FEEDBACK_ID,
      questionText: 'What feedback do you have for the team or organization?',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 4,
    },
  ];

  // Beta Template Question
  const betaQuestions = [
    {
      id: Q_BETA_MOOD_ID,
      templateId: BETA_TEMPLATE_ID,
      sectionId: SEC_BETA_CHECKIN_ID,
      questionText: 'How is everything going?',
      answerType: 'mood' as const,
      answerConfig: { options: ['great', 'good', 'okay', 'struggling', 'bad'] },
      isRequired: true,
      sortOrder: 1,
    },
  ];

  // Structured 1:1 Questions
  const structuredQuestions = [
    // Section 1: Follow-up
    {
      id: Q_S11_RESOLVE_SCORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_FOLLOWUP_ID,
      questionText: 'În ce măsură taskurile discutate la ultima întâlnire au fost rezolvate?',
      helpText: 'Rezolvat complet / Parțial / Nerezolvat',
      answerType: 'multiple_choice' as const,
      answerConfig: { options: ['Rezolvat complet', 'Parțial', 'Nerezolvat'] },
      isRequired: true,
      sortOrder: 1,
    },
    {
      id: Q_S11_RESOLVE_COMMENT_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_FOLLOWUP_ID,
      questionText: 'Comentariu scurt pe follow-up',
      helpText: 'Numirea taskurilor, blocaje, suport necesar, observații',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 2,
    },
    // Section 2: Energie & Productivitate
    {
      id: Q_S11_ENERGY_SCORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_ENERGY_ID,
      questionText: 'Cum îți evaluezi energia și productivitatea?',
      helpText: '1 = foarte scăzută, 5 = excelentă',
      answerType: 'rating_1_5' as const,
      answerConfig: { labels: { 1: 'Foarte scăzută', 3: 'Medie', 5: 'Excelentă' } },
      isRequired: true,
      sortOrder: 3,
    },
    {
      id: Q_S11_ENERGY_COMMENT_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_ENERGY_ID,
      questionText: 'Ce a influențat cel mai mult scorul?',
      helpText: '1-2 rânduri',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 4,
    },
    // Section 3: Progres pe obiective
    {
      id: Q_S11_PROGRESS_SCORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_PROGRESS_ID,
      questionText: 'Scor progres pe obiective',
      helpText: '1 = stagnare | 3 = progres moderat | 5 = progres semnificativ',
      answerType: 'rating_1_5' as const,
      answerConfig: { labels: { 1: 'Stagnare', 3: 'Moderat', 5: 'Semnificativ' } },
      isRequired: true,
      sortOrder: 5,
    },
    {
      id: Q_S11_PROGRESS_COMMENT_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_PROGRESS_ID,
      questionText: 'Cum ai avansat concret?',
      helpText: 'Max 3 bullet-uri scurte',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 6,
    },
    // Section 4: Blocaje / Fricțiuni
    {
      id: Q_S11_BLOCKERS_SCORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_BLOCKERS_ID,
      questionText: 'Cât de liber ești de blocaje?',
      helpText: '1 = blocaje majore | 5 = fără blocaje',
      answerType: 'rating_1_5' as const,
      answerConfig: { labels: { 1: 'Blocaje majore', 3: 'Câteva minore', 5: 'Fără blocaje' } },
      isRequired: true,
      sortOrder: 7,
    },
    {
      id: Q_S11_BLOCKERS_MAIN_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_BLOCKERS_ID,
      questionText: 'Care este principalul blocaj?',
      helpText: '1 frază',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 8,
    },
    {
      id: Q_S11_BLOCKERS_HELP_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_BLOCKERS_ID,
      questionText: 'Ce ar ajuta cel mai mult?',
      helpText: 'Timp / Claritate / Decizie / Suport tehnic / Altceva',
      answerType: 'multiple_choice' as const,
      answerConfig: { options: ['Timp', 'Claritate', 'Decizie', 'Suport tehnic', 'Altceva'] },
      isRequired: false,
      sortOrder: 9,
    },
    // Section 5: Colaborare & Context
    {
      id: Q_S11_COLLAB_SCORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_COLLAB_ID,
      questionText: 'Scor colaborare',
      helpText: '1 = probleme | 3 = normal | 5 = impresionant',
      answerType: 'rating_1_5' as const,
      answerConfig: { labels: { 1: 'Probleme', 3: 'Normal', 5: 'Impresionant' } },
      isRequired: true,
      sortOrder: 10,
    },
    {
      id: Q_S11_COLLAB_COMMENT_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_COLLAB_ID,
      questionText: 'Ce a funcționat bine / ce poate fi îmbunătățit?',
      helpText: '1-2 rânduri',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 11,
    },
    // Section 6: Învățare & Creștere
    {
      id: Q_S11_LEARNED_YN_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_LEARNING_ID,
      questionText: 'Ai învățat ceva nou aplicabil?',
      answerType: 'yes_no' as const,
      answerConfig: {},
      isRequired: true,
      sortOrder: 12,
    },
    {
      id: Q_S11_LEARNED_WHAT_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_LEARNING_ID,
      questionText: 'Dacă da: ce anume?',
      helpText: 'Exemplu concret, 1-2 rânduri',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 13,
      conditionalOnQuestionId: Q_S11_LEARNED_YN_ID,
      conditionalOperator: 'eq' as const,
      conditionalValue: '1',
    },
    {
      id: Q_S11_EXPLORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_LEARNING_ID,
      questionText: 'Vrei să explorezi ceva nou în următoarea perioadă?',
      helpText: 'Opțional, 1 frază',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 14,
    },
    // Section 7: Capacitate & Încărcare
    {
      id: Q_S11_CAPACITY_SCORE_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_CAPACITY_ID,
      questionText: 'Cât de echilibrată e încărcarea?',
      helpText: '1 = supraîncărcat | 5 = perfect echilibrat',
      answerType: 'rating_1_5' as const,
      answerConfig: { labels: { 1: 'Supraîncărcat', 3: 'Acceptabil', 5: 'Perfect echilibrat' } },
      isRequired: true,
      sortOrder: 15,
    },
    {
      id: Q_S11_CAPACITY_COMMENT_ID,
      templateId: STRUCTURED_TEMPLATE_ID,
      sectionId: SEC_S11_CAPACITY_ID,
      questionText: 'Comentariu scurt (dacă e cazul)',
      answerType: 'text' as const,
      answerConfig: {},
      isRequired: false,
      sortOrder: 16,
    },
  ];

  for (const q of [...weeklyQuestions, ...careerQuestions, ...betaQuestions, ...structuredQuestions]) {
    await db
      .insert(schema.templateQuestions)
      .values(q)
      .onConflictDoUpdate({
        target: schema.templateQuestions.id,
        set: {
          questionText: sql`excluded.question_text`,
          helpText: sql`excluded.help_text`,
          sectionId: sql`excluded.section_id`,
          answerType: sql`excluded.answer_type`,
          answerConfig: sql`excluded.answer_config`,
          isRequired: sql`excluded.is_required`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }
}

async function seedMeetingSeries() {
  console.log('  Seeding meeting series...');

  const series = [
    {
      id: SERIES_BOB_DAVE_ID,
      tenantId: ACME_TENANT_ID,
      managerId: BOB_ID,
      reportId: DAVE_ID,
      cadence: 'weekly' as const,
      defaultDurationMinutes: 30,
      defaultTemplateId: WEEKLY_TEMPLATE_ID,
      preferredDay: 'mon' as const,
      preferredTime: '10:00',
      status: 'active' as const,
    },
    {
      id: SERIES_BOB_EVE_ID,
      tenantId: ACME_TENANT_ID,
      managerId: BOB_ID,
      reportId: EVE_ID,
      cadence: 'biweekly' as const,
      defaultDurationMinutes: 30,
      defaultTemplateId: WEEKLY_TEMPLATE_ID,
      preferredDay: 'wed' as const,
      preferredTime: '14:00',
      status: 'active' as const,
    },
    {
      id: SERIES_CAROL_FRANK_ID,
      tenantId: ACME_TENANT_ID,
      managerId: CAROL_ID,
      reportId: FRANK_ID,
      cadence: 'monthly' as const,
      defaultDurationMinutes: 45,
      defaultTemplateId: CAREER_TEMPLATE_ID,
      preferredDay: 'fri' as const,
      preferredTime: '15:00',
      status: 'active' as const,
    },
    {
      id: SERIES_CAROL_GRACE_ID,
      tenantId: ACME_TENANT_ID,
      managerId: CAROL_ID,
      reportId: GRACE_ID,
      cadence: 'biweekly' as const,
      defaultDurationMinutes: 30,
      defaultTemplateId: WEEKLY_TEMPLATE_ID,
      preferredDay: 'thu' as const,
      preferredTime: '11:00',
      status: 'active' as const,
    },
    {
      id: SERIES_YURI_XENA_ID,
      tenantId: BETA_TENANT_ID,
      managerId: YURI_ID,
      reportId: XENA_ID,
      cadence: 'biweekly' as const,
      defaultDurationMinutes: 30,
      defaultTemplateId: BETA_TEMPLATE_ID,
      preferredDay: 'tue' as const,
      preferredTime: '11:00',
      status: 'active' as const,
    },
  ];

  for (const s of series) {
    await db
      .insert(schema.meetingSeries)
      .values(s)
      .onConflictDoUpdate({
        target: schema.meetingSeries.id,
        set: {
          cadence: sql`excluded.cadence`,
          defaultDurationMinutes: sql`excluded.default_duration_minutes`,
          defaultTemplateId: sql`excluded.default_template_id`,
          preferredDay: sql`excluded.preferred_day`,
          preferredTime: sql`excluded.preferred_time`,
          status: sql`excluded.status`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function seedSessions() {
  console.log('  Seeding sessions...');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  const sessions = [
    {
      id: SESSION_1_ID,
      seriesId: SERIES_BOB_DAVE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 1,
      scheduledAt: threeWeeksAgo,
      startedAt: threeWeeksAgo,
      completedAt: new Date(threeWeeksAgo.getTime() + 30 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'First 1:1 session. Dave is settling in well. Discussed project priorities for the sprint.' },
      durationMinutes: 30,
      sessionScore: '3.75',
    },
    {
      id: SESSION_2_ID,
      seriesId: SERIES_BOB_DAVE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 2,
      scheduledAt: twoWeeksAgo,
      startedAt: twoWeeksAgo,
      completedAt: new Date(twoWeeksAgo.getTime() + 25 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Good progress on the API refactor. Dave raised concerns about test coverage.' },
      durationMinutes: 25,
      sessionScore: '4.00',
    },
    {
      id: SESSION_3_ID,
      seriesId: SERIES_BOB_DAVE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 3,
      scheduledAt: oneWeekAgo,
      startedAt: oneWeekAgo,
      completedAt: new Date(oneWeekAgo.getTime() + 35 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Discussed career growth. Dave interested in leading the next feature project.' },
      durationMinutes: 35,
      sessionScore: '4.25',
    },
    // Eve sessions (Bob <-> Eve)
    {
      id: SESSION_EVE_1_ID,
      seriesId: SERIES_BOB_EVE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 1,
      scheduledAt: twoWeeksAgo,
      startedAt: twoWeeksAgo,
      completedAt: new Date(twoWeeksAgo.getTime() + 25 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Eve is ramping up well on the frontend. Discussed component library choices.' },
      durationMinutes: 25,
      sessionScore: '3.50',
    },
    {
      id: SESSION_EVE_2_ID,
      seriesId: SERIES_BOB_EVE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 2,
      scheduledAt: oneWeekAgo,
      startedAt: oneWeekAgo,
      completedAt: new Date(oneWeekAgo.getTime() + 30 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Great progress on the dashboard redesign. Eve wants to explore accessibility testing.' },
      durationMinutes: 30,
      sessionScore: '4.00',
    },
    // Frank sessions (Carol <-> Frank) — use weekly template for numeric data
    {
      id: SESSION_FRANK_1_ID,
      seriesId: SERIES_CAROL_FRANK_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 1,
      scheduledAt: threeWeeksAgo,
      startedAt: threeWeeksAgo,
      completedAt: new Date(threeWeeksAgo.getTime() + 40 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'First monthly check-in. Frank settling into the product team nicely.' },
      durationMinutes: 40,
      sessionScore: '3.25',
    },
    {
      id: SESSION_FRANK_2_ID,
      seriesId: SERIES_CAROL_FRANK_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 2,
      scheduledAt: oneWeekAgo,
      startedAt: oneWeekAgo,
      completedAt: new Date(oneWeekAgo.getTime() + 45 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Frank raised concerns about deadline pressure. Discussed prioritization strategies.' },
      durationMinutes: 45,
      sessionScore: '3.75',
    },
    // Grace sessions (Carol <-> Grace)
    {
      id: SESSION_GRACE_1_ID,
      seriesId: SERIES_CAROL_GRACE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 1,
      scheduledAt: twoWeeksAgo,
      startedAt: twoWeeksAgo,
      completedAt: new Date(twoWeeksAgo.getTime() + 30 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Grace is doing great work on user research. Discussed synthesis methods.' },
      durationMinutes: 30,
      sessionScore: '4.00',
    },
    {
      id: SESSION_GRACE_2_ID,
      seriesId: SERIES_CAROL_GRACE_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 2,
      scheduledAt: oneWeekAgo,
      startedAt: oneWeekAgo,
      completedAt: new Date(oneWeekAgo.getTime() + 25 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Grace presented usability findings. Excellent stakeholder communication.' },
      durationMinutes: 25,
      sessionScore: '4.25',
    },
  ];

  for (const s of sessions) {
    await db
      .insert(schema.sessions)
      .values(s)
      .onConflictDoUpdate({
        target: schema.sessions.id,
        set: {
          sessionNumber: sql`excluded.session_number`,
          scheduledAt: sql`excluded.scheduled_at`,
          startedAt: sql`excluded.started_at`,
          completedAt: sql`excluded.completed_at`,
          status: sql`excluded.status`,
          sharedNotes: sql`excluded.shared_notes`,
          durationMinutes: sql`excluded.duration_minutes`,
          sessionScore: sql`excluded.session_score`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function seedAnswers() {
  console.log('  Seeding session answers...');

  // Delete any rows with old non-RFC4122 UUID variant (6000 clock_seq_hi_res).
  // This handles re-seeding after the UUID fix so onConflictDoUpdate(id) works correctly.
  await db.execute(sql`
    DELETE FROM session_answer
    WHERE id::text LIKE '66666666-%-4000-a%'
  `);

  const answers = [
    // Session 1 answers (Dave responding)
    {
      id: ANSWER_S1_MOOD_ID,
      sessionId: SESSION_1_ID,
      questionId: Q_MOOD_ID,
      respondentId: DAVE_ID,
      answerJson: { value: 'good' },
    },
    {
      id: ANSWER_S1_WORKLOAD_ID,
      sessionId: SESSION_1_ID,
      questionId: Q_WORKLOAD_ID,
      respondentId: DAVE_ID,
      answerNumeric: '3.00',
    },
    {
      id: ANSWER_S1_BLOCKERS_ID,
      sessionId: SESSION_1_ID,
      questionId: Q_BLOCKERS_ID,
      respondentId: DAVE_ID,
      answerText: 'Still getting familiar with the codebase. Need access to the staging environment.',
    },
    {
      id: ANSWER_S1_HELP_ID,
      sessionId: SESSION_1_ID,
      questionId: Q_HELP_ID,
      respondentId: DAVE_ID,
      answerJson: { value: true },
    },
    {
      id: ANSWER_S1_SATISFACTION_ID,
      sessionId: SESSION_1_ID,
      questionId: Q_SATISFACTION_ID,
      respondentId: DAVE_ID,
      answerNumeric: '7.00',
    },

    // Session 2 answers
    {
      id: ANSWER_S2_MOOD_ID,
      sessionId: SESSION_2_ID,
      questionId: Q_MOOD_ID,
      respondentId: DAVE_ID,
      answerJson: { value: 'great' },
    },
    {
      id: ANSWER_S2_WORKLOAD_ID,
      sessionId: SESSION_2_ID,
      questionId: Q_WORKLOAD_ID,
      respondentId: DAVE_ID,
      answerNumeric: '4.00',
    },
    {
      id: ANSWER_S2_BLOCKERS_ID,
      sessionId: SESSION_2_ID,
      questionId: Q_BLOCKERS_ID,
      respondentId: DAVE_ID,
      answerText: 'Test suite is slow. CI takes 15 minutes. Would benefit from parallelization.',
    },
    {
      id: ANSWER_S2_HELP_ID,
      sessionId: SESSION_2_ID,
      questionId: Q_HELP_ID,
      respondentId: DAVE_ID,
      answerJson: { value: false },
    },
    {
      id: ANSWER_S2_SATISFACTION_ID,
      sessionId: SESSION_2_ID,
      questionId: Q_SATISFACTION_ID,
      respondentId: DAVE_ID,
      answerNumeric: '8.00',
    },

    // Session 3 answers
    {
      id: ANSWER_S3_MOOD_ID,
      sessionId: SESSION_3_ID,
      questionId: Q_MOOD_ID,
      respondentId: DAVE_ID,
      answerJson: { value: 'great' },
    },
    {
      id: ANSWER_S3_WORKLOAD_ID,
      sessionId: SESSION_3_ID,
      questionId: Q_WORKLOAD_ID,
      respondentId: DAVE_ID,
      answerNumeric: '3.00',
    },
    {
      id: ANSWER_S3_BLOCKERS_ID,
      sessionId: SESSION_3_ID,
      questionId: Q_BLOCKERS_ID,
      respondentId: DAVE_ID,
      answerText: 'No major blockers this week. CI is much faster after parallelization.',
    },
    {
      id: ANSWER_S3_HELP_ID,
      sessionId: SESSION_3_ID,
      questionId: Q_HELP_ID,
      respondentId: DAVE_ID,
      answerJson: { value: false },
    },
    {
      id: ANSWER_S3_SATISFACTION_ID,
      sessionId: SESSION_3_ID,
      questionId: Q_SATISFACTION_ID,
      respondentId: DAVE_ID,
      answerNumeric: '9.00',
    },

    // Eve Session 1 answers
    { id: ANSWER_EVE_S1_MOOD_ID, sessionId: SESSION_EVE_1_ID, questionId: Q_MOOD_ID, respondentId: EVE_ID, answerJson: { value: 'good' } },
    { id: ANSWER_EVE_S1_WORKLOAD_ID, sessionId: SESSION_EVE_1_ID, questionId: Q_WORKLOAD_ID, respondentId: EVE_ID, answerNumeric: '4.00' },
    { id: ANSWER_EVE_S1_BLOCKERS_ID, sessionId: SESSION_EVE_1_ID, questionId: Q_BLOCKERS_ID, respondentId: EVE_ID, answerText: 'Design system tokens are not fully documented. Some color variables are missing.' },
    { id: ANSWER_EVE_S1_HELP_ID, sessionId: SESSION_EVE_1_ID, questionId: Q_HELP_ID, respondentId: EVE_ID, answerJson: { value: true } },
    { id: ANSWER_EVE_S1_SATISFACTION_ID, sessionId: SESSION_EVE_1_ID, questionId: Q_SATISFACTION_ID, respondentId: EVE_ID, answerNumeric: '7.00' },

    // Eve Session 2 answers
    { id: ANSWER_EVE_S2_MOOD_ID, sessionId: SESSION_EVE_2_ID, questionId: Q_MOOD_ID, respondentId: EVE_ID, answerJson: { value: 'great' } },
    { id: ANSWER_EVE_S2_WORKLOAD_ID, sessionId: SESSION_EVE_2_ID, questionId: Q_WORKLOAD_ID, respondentId: EVE_ID, answerNumeric: '4.00' },
    { id: ANSWER_EVE_S2_BLOCKERS_ID, sessionId: SESSION_EVE_2_ID, questionId: Q_BLOCKERS_ID, respondentId: EVE_ID, answerText: 'No blockers. Accessibility audit went well.' },
    { id: ANSWER_EVE_S2_HELP_ID, sessionId: SESSION_EVE_2_ID, questionId: Q_HELP_ID, respondentId: EVE_ID, answerJson: { value: false } },
    { id: ANSWER_EVE_S2_SATISFACTION_ID, sessionId: SESSION_EVE_2_ID, questionId: Q_SATISFACTION_ID, respondentId: EVE_ID, answerNumeric: '8.00' },

    // Frank Session 1 answers
    { id: ANSWER_FRANK_S1_MOOD_ID, sessionId: SESSION_FRANK_1_ID, questionId: Q_MOOD_ID, respondentId: FRANK_ID, answerJson: { value: 'okay' } },
    { id: ANSWER_FRANK_S1_WORKLOAD_ID, sessionId: SESSION_FRANK_1_ID, questionId: Q_WORKLOAD_ID, respondentId: FRANK_ID, answerNumeric: '2.00' },
    { id: ANSWER_FRANK_S1_BLOCKERS_ID, sessionId: SESSION_FRANK_1_ID, questionId: Q_BLOCKERS_ID, respondentId: FRANK_ID, answerText: 'Getting familiar with the product roadmap. Need more context on Q2 priorities.' },
    { id: ANSWER_FRANK_S1_HELP_ID, sessionId: SESSION_FRANK_1_ID, questionId: Q_HELP_ID, respondentId: FRANK_ID, answerJson: { value: true } },
    { id: ANSWER_FRANK_S1_SATISFACTION_ID, sessionId: SESSION_FRANK_1_ID, questionId: Q_SATISFACTION_ID, respondentId: FRANK_ID, answerNumeric: '6.00' },

    // Frank Session 2 answers
    { id: ANSWER_FRANK_S2_MOOD_ID, sessionId: SESSION_FRANK_2_ID, questionId: Q_MOOD_ID, respondentId: FRANK_ID, answerJson: { value: 'good' } },
    { id: ANSWER_FRANK_S2_WORKLOAD_ID, sessionId: SESSION_FRANK_2_ID, questionId: Q_WORKLOAD_ID, respondentId: FRANK_ID, answerNumeric: '3.00' },
    { id: ANSWER_FRANK_S2_BLOCKERS_ID, sessionId: SESSION_FRANK_2_ID, questionId: Q_BLOCKERS_ID, respondentId: FRANK_ID, answerText: 'Deadline pressure on the feature launch. Could use help with QA.' },
    { id: ANSWER_FRANK_S2_HELP_ID, sessionId: SESSION_FRANK_2_ID, questionId: Q_HELP_ID, respondentId: FRANK_ID, answerJson: { value: true } },
    { id: ANSWER_FRANK_S2_SATISFACTION_ID, sessionId: SESSION_FRANK_2_ID, questionId: Q_SATISFACTION_ID, respondentId: FRANK_ID, answerNumeric: '7.00' },

    // Grace Session 1 answers
    { id: ANSWER_GRACE_S1_MOOD_ID, sessionId: SESSION_GRACE_1_ID, questionId: Q_MOOD_ID, respondentId: GRACE_ID, answerJson: { value: 'great' } },
    { id: ANSWER_GRACE_S1_WORKLOAD_ID, sessionId: SESSION_GRACE_1_ID, questionId: Q_WORKLOAD_ID, respondentId: GRACE_ID, answerNumeric: '4.00' },
    { id: ANSWER_GRACE_S1_BLOCKERS_ID, sessionId: SESSION_GRACE_1_ID, questionId: Q_BLOCKERS_ID, respondentId: GRACE_ID, answerText: 'Waiting on engineering for API changes to unblock prototype testing.' },
    { id: ANSWER_GRACE_S1_HELP_ID, sessionId: SESSION_GRACE_1_ID, questionId: Q_HELP_ID, respondentId: GRACE_ID, answerJson: { value: false } },
    { id: ANSWER_GRACE_S1_SATISFACTION_ID, sessionId: SESSION_GRACE_1_ID, questionId: Q_SATISFACTION_ID, respondentId: GRACE_ID, answerNumeric: '8.00' },

    // Grace Session 2 answers
    { id: ANSWER_GRACE_S2_MOOD_ID, sessionId: SESSION_GRACE_2_ID, questionId: Q_MOOD_ID, respondentId: GRACE_ID, answerJson: { value: 'great' } },
    { id: ANSWER_GRACE_S2_WORKLOAD_ID, sessionId: SESSION_GRACE_2_ID, questionId: Q_WORKLOAD_ID, respondentId: GRACE_ID, answerNumeric: '3.00' },
    { id: ANSWER_GRACE_S2_BLOCKERS_ID, sessionId: SESSION_GRACE_2_ID, questionId: Q_BLOCKERS_ID, respondentId: GRACE_ID, answerText: 'No blockers. Prototype validated with 5 users successfully.' },
    { id: ANSWER_GRACE_S2_HELP_ID, sessionId: SESSION_GRACE_2_ID, questionId: Q_HELP_ID, respondentId: GRACE_ID, answerJson: { value: false } },
    { id: ANSWER_GRACE_S2_SATISFACTION_ID, sessionId: SESSION_GRACE_2_ID, questionId: Q_SATISFACTION_ID, respondentId: GRACE_ID, answerNumeric: '9.00' },
  ];

  for (const a of answers) {
    await db
      .insert(schema.sessionAnswers)
      .values(a)
      .onConflictDoUpdate({
        target: schema.sessionAnswers.id,
        set: {
          answerText: sql`excluded.answer_text`,
          answerNumeric: sql`excluded.answer_numeric`,
          answerJson: sql`excluded.answer_json`,
          answeredAt: sql`excluded.answered_at`,
        },
      });
  }
}

async function seedActionItems() {
  console.log('  Seeding action items...');

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const items = [
    {
      id: ACTION_OPEN_1_ID,
      sessionId: SESSION_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: DAVE_ID,
      createdById: BOB_ID,
      title: 'Set up CI parallelization for test suite',
      description: 'Investigate and implement parallel test execution to reduce CI time from 15 to under 5 minutes.',
      category: 'performance',
      dueDate: nextWeek.toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_OPEN_2_ID,
      sessionId: SESSION_3_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: BOB_ID,
      createdById: BOB_ID,
      title: 'Share tech lead expectations doc with Dave',
      description: 'Prepare and share the document outlining responsibilities and growth path for tech lead role.',
      category: 'career',
      dueDate: nextWeek.toISOString().split('T')[0],
      status: 'in_progress' as const,
    },
    {
      id: ACTION_DONE_ID,
      sessionId: SESSION_1_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: BOB_ID,
      createdById: BOB_ID,
      title: 'Grant Dave access to staging environment',
      description: 'Set up Dave\'s credentials for the staging environment and add him to the deployment group.',
      category: 'check_in',
      dueDate: lastWeek.toISOString().split('T')[0],
      status: 'completed' as const,
      completedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    // Completed action items assigned to Dave (for velocity chart)
    {
      id: ACTION_DONE_DAVE_1_ID,
      sessionId: SESSION_1_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: DAVE_ID,
      createdById: BOB_ID,
      title: 'Refactor authentication module',
      description: 'Modernize the auth module to use the new session middleware pattern.',
      category: 'performance',
      dueDate: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'completed' as const,
      completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000 + 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: ACTION_DONE_DAVE_2_ID,
      sessionId: SESSION_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: DAVE_ID,
      createdById: BOB_ID,
      title: 'Write unit tests for API endpoints',
      description: 'Add comprehensive test coverage for the user and team management API routes.',
      category: 'performance',
      dueDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'completed' as const,
      completedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: ACTION_DONE_DAVE_3_ID,
      sessionId: SESSION_3_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: DAVE_ID,
      createdById: BOB_ID,
      title: 'Update deployment documentation',
      description: 'Revise the deployment docs to reflect the new CI/CD pipeline and staging setup.',
      category: 'check_in',
      dueDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'completed' as const,
      completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const item of items) {
    await db
      .insert(schema.actionItems)
      .values(item)
      .onConflictDoUpdate({
        target: schema.actionItems.id,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          dueDate: sql`excluded.due_date`,
          status: sql`excluded.status`,
          completedAt: sql`excluded.completed_at`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function seedPrivateNotes() {
  console.log('  Seeding private notes...');

  // Encrypt the note content using the encryption infrastructure
  const noteContent = 'Dave seems energized but may be overcommitting. Watch for burnout signs next session. Consider suggesting he delegate the CI task.';
  const encrypted = encryptNote(noteContent, ACME_TENANT_ID, 1);

  await db
    .insert(schema.privateNotes)
    .values({
      id: PRIVATE_NOTE_ID,
      sessionId: SESSION_1_ID,
      authorId: BOB_ID,
      content: JSON.stringify(encrypted),
      category: 'general',
      keyVersion: 1,
    })
    .onConflictDoUpdate({
      target: schema.privateNotes.id,
      set: {
        content: sql`excluded.content`,
        keyVersion: sql`excluded.key_version`,
        updatedAt: sql`now()`,
      },
    });
}

async function seedAnalyticsSnapshots() {
  console.log('  Seeding analytics snapshots...');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  // Compute period boundaries (month of completion)
  function monthRange(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = new Date(y, m, 1).toISOString().split('T')[0]!;
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0]!;
    return { start, end };
  }

  // Session 1 completed ~3 weeks ago: Wellbeing avg 3.00 (workload), Check-in avg 7.00 (satisfaction), score 7.50
  const s1Period = monthRange(threeWeeksAgo);
  // Session 2 completed ~2 weeks ago: Wellbeing avg 4.00, Check-in avg 8.00, score 8.00
  const s2Period = monthRange(twoWeeksAgo);
  // Session 3 completed ~1 week ago: Wellbeing avg 3.00, Check-in avg 9.00, score 8.25
  const s3Period = monthRange(oneWeekAgo);

  const snapshots = [
    // Session 1 snapshots
    { id: SNAPSHOT_S1_SCORE_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'session_score', metricValue: '7.500', sampleCount: 1 },
    { id: SNAPSHOT_S1_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'Wellbeing', metricValue: '3.000', sampleCount: 1 },
    { id: SNAPSHOT_S1_PERFORMANCE_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'Performance', metricValue: '0.000', sampleCount: 0 },
    { id: SNAPSHOT_S1_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'Check-in', metricValue: '7.000', sampleCount: 1 },

    // Session 2 snapshots
    { id: SNAPSHOT_S2_SCORE_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'session_score', metricValue: '8.000', sampleCount: 1 },
    { id: SNAPSHOT_S2_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Wellbeing', metricValue: '4.000', sampleCount: 1 },
    { id: SNAPSHOT_S2_PERFORMANCE_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Performance', metricValue: '0.000', sampleCount: 0 },
    { id: SNAPSHOT_S2_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Check-in', metricValue: '8.000', sampleCount: 1 },

    // Session 3 snapshots
    { id: SNAPSHOT_S3_SCORE_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'session_score', metricValue: '8.250', sampleCount: 1 },
    { id: SNAPSHOT_S3_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Wellbeing', metricValue: '3.000', sampleCount: 1 },
    { id: SNAPSHOT_S3_PERFORMANCE_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Performance', metricValue: '0.000', sampleCount: 0 },
    { id: SNAPSHOT_S3_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: DAVE_ID, seriesId: SERIES_BOB_DAVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Check-in', metricValue: '9.000', sampleCount: 1 },

    // Eve Session 1 snapshots (2 weeks ago): Wellbeing 4.00, Check-in 7.00, score 7.00
    { id: SNAPSHOT_EVE_S1_SCORE_ID, tenantId: ACME_TENANT_ID, userId: EVE_ID, seriesId: SERIES_BOB_EVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'session_score', metricValue: '7.000', sampleCount: 1 },
    { id: SNAPSHOT_EVE_S1_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: EVE_ID, seriesId: SERIES_BOB_EVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Wellbeing', metricValue: '4.000', sampleCount: 1 },
    { id: SNAPSHOT_EVE_S1_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: EVE_ID, seriesId: SERIES_BOB_EVE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Check-in', metricValue: '7.000', sampleCount: 1 },

    // Eve Session 2 snapshots (1 week ago): Wellbeing 4.00, Check-in 8.00, score 8.00
    { id: SNAPSHOT_EVE_S2_SCORE_ID, tenantId: ACME_TENANT_ID, userId: EVE_ID, seriesId: SERIES_BOB_EVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'session_score', metricValue: '8.000', sampleCount: 1 },
    { id: SNAPSHOT_EVE_S2_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: EVE_ID, seriesId: SERIES_BOB_EVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Wellbeing', metricValue: '4.000', sampleCount: 1 },
    { id: SNAPSHOT_EVE_S2_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: EVE_ID, seriesId: SERIES_BOB_EVE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Check-in', metricValue: '8.000', sampleCount: 1 },

    // Frank Session 1 snapshots (3 weeks ago): Wellbeing 2.00, Check-in 6.00, score 6.50
    { id: SNAPSHOT_FRANK_S1_SCORE_ID, tenantId: ACME_TENANT_ID, userId: FRANK_ID, seriesId: SERIES_CAROL_FRANK_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'session_score', metricValue: '6.500', sampleCount: 1 },
    { id: SNAPSHOT_FRANK_S1_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: FRANK_ID, seriesId: SERIES_CAROL_FRANK_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'Wellbeing', metricValue: '2.000', sampleCount: 1 },
    { id: SNAPSHOT_FRANK_S1_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: FRANK_ID, seriesId: SERIES_CAROL_FRANK_ID, periodType: 'month' as const, periodStart: s1Period.start, periodEnd: s1Period.end, metricName: 'Check-in', metricValue: '6.000', sampleCount: 1 },

    // Frank Session 2 snapshots (1 week ago): Wellbeing 3.00, Check-in 7.00, score 7.50
    { id: SNAPSHOT_FRANK_S2_SCORE_ID, tenantId: ACME_TENANT_ID, userId: FRANK_ID, seriesId: SERIES_CAROL_FRANK_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'session_score', metricValue: '7.500', sampleCount: 1 },
    { id: SNAPSHOT_FRANK_S2_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: FRANK_ID, seriesId: SERIES_CAROL_FRANK_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Wellbeing', metricValue: '3.000', sampleCount: 1 },
    { id: SNAPSHOT_FRANK_S2_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: FRANK_ID, seriesId: SERIES_CAROL_FRANK_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Check-in', metricValue: '7.000', sampleCount: 1 },

    // Grace Session 1 snapshots (2 weeks ago): Wellbeing 4.00, Check-in 8.00, score 8.00
    { id: SNAPSHOT_GRACE_S1_SCORE_ID, tenantId: ACME_TENANT_ID, userId: GRACE_ID, seriesId: SERIES_CAROL_GRACE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'session_score', metricValue: '8.000', sampleCount: 1 },
    { id: SNAPSHOT_GRACE_S1_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: GRACE_ID, seriesId: SERIES_CAROL_GRACE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Wellbeing', metricValue: '4.000', sampleCount: 1 },
    { id: SNAPSHOT_GRACE_S1_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: GRACE_ID, seriesId: SERIES_CAROL_GRACE_ID, periodType: 'month' as const, periodStart: s2Period.start, periodEnd: s2Period.end, metricName: 'Check-in', metricValue: '8.000', sampleCount: 1 },

    // Grace Session 2 snapshots (1 week ago): Wellbeing 3.00, Check-in 9.00, score 8.50
    { id: SNAPSHOT_GRACE_S2_SCORE_ID, tenantId: ACME_TENANT_ID, userId: GRACE_ID, seriesId: SERIES_CAROL_GRACE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'session_score', metricValue: '8.500', sampleCount: 1 },
    { id: SNAPSHOT_GRACE_S2_WELLBEING_ID, tenantId: ACME_TENANT_ID, userId: GRACE_ID, seriesId: SERIES_CAROL_GRACE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Wellbeing', metricValue: '3.000', sampleCount: 1 },
    { id: SNAPSHOT_GRACE_S2_CHECKIN_ID, tenantId: ACME_TENANT_ID, userId: GRACE_ID, seriesId: SERIES_CAROL_GRACE_ID, periodType: 'month' as const, periodStart: s3Period.start, periodEnd: s3Period.end, metricName: 'Check-in', metricValue: '9.000', sampleCount: 1 },
  ];

  for (const snap of snapshots) {
    // Delete-then-insert pattern for NULL-safe unique index (consistent with compute.ts)
    await db.delete(schema.analyticsSnapshots).where(
      sql`id = ${snap.id}`,
    );
    await db.insert(schema.analyticsSnapshots).values(snap);
  }
}

// =============================================================================
// Techvibe SRL seed
// =============================================================================

async function seedTechvibe() {
  console.log('  Seeding Techvibe SRL...');

  const now = new Date();
  const fourWeeksAgo   = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo  = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo    = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo     = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeekDate   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  function monthRange(d: Date) {
    const y = d.getFullYear(), m = d.getMonth();
    return {
      start: new Date(y, m, 1).toISOString().split('T')[0]!,
      end:   new Date(y, m + 1, 0).toISOString().split('T')[0]!,
    };
  }

  // --------------------------------------------------------------------------
  // Tenant
  // --------------------------------------------------------------------------
  await db
    .insert(schema.tenants)
    .values({
      id: TV_TENANT_ID,
      name: 'Techvibe SRL',
      slug: 'techvibe-srl',
      orgType: 'for_profit' as const,
      plan: 'pro',
      settings: {
        timezone: 'Europe/Bucharest',
        defaultCadence: 'weekly',
        defaultDurationMinutes: 30,
        preferredLanguage: 'ro',
      },
    })
    .onConflictDoUpdate({
      target: schema.tenants.id,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        plan: sql`excluded.plan`,
        settings: sql`excluded.settings`,
        updatedAt: sql`now()`,
      },
    });

  // --------------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------------
  const tvUsers = [
    { id: TV_ELENA_ID,   tenantId: TV_TENANT_ID, email: 'elena@techvibe.example.com',   firstName: 'Elena',     lastName: 'Constantin', level: 'admin' as const,   jobTitle: 'CEO',               teamName: 'Elena', passwordHash: TEST_PASSWORD_HASH, isActive: true },
    { id: TV_CIPRIAN_ID, tenantId: TV_TENANT_ID, email: 'ciprian@techvibe.example.com', firstName: 'Ciprian',   lastName: 'Surmont',    level: 'manager' as const, jobTitle: 'Director Produs',   teamName: 'Ciprian', passwordHash: TEST_PASSWORD_HASH, isActive: true, managerId: TV_ELENA_ID },
    { id: TV_RADU_ID,    tenantId: TV_TENANT_ID, email: 'radu@techvibe.example.com',    firstName: 'Radu',      lastName: 'Dumitru',    level: 'manager' as const, jobTitle: 'Manager Operațiuni', teamName: 'Radu', passwordHash: TEST_PASSWORD_HASH, isActive: true, managerId: TV_ELENA_ID },
    { id: TV_ANDREI_ID,  tenantId: TV_TENANT_ID, email: 'andrei@techvibe.example.com',  firstName: 'Andrei',    lastName: 'Ionescu',    level: 'member' as const,  jobTitle: 'Inginer Software',  passwordHash: TEST_PASSWORD_HASH, isActive: true, managerId: TV_CIPRIAN_ID },
    { id: TV_MARIA_ID,   tenantId: TV_TENANT_ID, email: 'maria@techvibe.example.com',   firstName: 'Maria',     lastName: 'Popa',       level: 'member' as const,  jobTitle: 'Designer UX',       passwordHash: TEST_PASSWORD_HASH, isActive: true, managerId: TV_CIPRIAN_ID },
    { id: TV_IOANA_ID,   tenantId: TV_TENANT_ID, email: 'ioana@techvibe.example.com',   firstName: 'Ioana',     lastName: 'Munteanu',   level: 'member' as const,  jobTitle: 'Analist Date',      passwordHash: TEST_PASSWORD_HASH, isActive: true, managerId: TV_RADU_ID },
    { id: TV_ALEX_ID,    tenantId: TV_TENANT_ID, email: 'alex@techvibe.example.com',    firstName: 'Alexandru', lastName: 'Vasile',     level: 'member' as const,  jobTitle: 'DevOps Engineer',   passwordHash: TEST_PASSWORD_HASH, isActive: true, managerId: TV_RADU_ID },
  ];

  for (const user of tvUsers) {
    await db
      .insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: sql`excluded.email`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          level: sql`excluded.level`,
          jobTitle: sql`excluded.job_title`,
          passwordHash: sql`excluded.password_hash`,
          managerId: sql`excluded.manager_id`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Templates
  // --------------------------------------------------------------------------
  await db
    .insert(schema.questionnaireTemplates)
    .values([
      {
        id: TV_CHECKIN_TEMPLATE_ID,
        tenantId: TV_TENANT_ID,
        name: 'Check-in Săptămânal',
        description: 'Check-in săptămânal acoperind starea generală, progresul și colaborarea',
        isDefault: true,
        isPublished: true,
        createdBy: TV_ELENA_ID,
        version: 1,
      },
      {
        id: TV_RETRO_TEMPLATE_ID,
        tenantId: TV_TENANT_ID,
        name: 'Retrospectivă Lunară',
        description: 'Retrospectivă lunară acoperind realizările, obiectivele și dezvoltarea',
        isDefault: false,
        isPublished: true,
        createdBy: TV_ELENA_ID,
        version: 1,
      },
    ])
    .onConflictDoUpdate({
      target: schema.questionnaireTemplates.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        updatedAt: sql`now()`,
      },
    });

  // Labels
  await db
    .insert(schema.templateLabels)
    .values([
      { id: TV_LABEL_CHECKIN_ID, tenantId: TV_TENANT_ID, name: 'Check-in',       color: '#3b82f6' },
      { id: TV_LABEL_RETRO_ID,   tenantId: TV_TENANT_ID, name: 'Retrospectivă',  color: '#8b5cf6' },
    ])
    .onConflictDoUpdate({
      target: schema.templateLabels.id,
      set: { name: sql`excluded.name`, color: sql`excluded.color` },
    });

  await db
    .insert(schema.templateLabelAssignments)
    .values([
      { templateId: TV_CHECKIN_TEMPLATE_ID, labelId: TV_LABEL_CHECKIN_ID },
      { templateId: TV_RETRO_TEMPLATE_ID,   labelId: TV_LABEL_RETRO_ID },
    ])
    .onConflictDoNothing();

  // Sections
  const tvSections = [
    { id: TV_SEC_STARE_ID,     templateId: TV_CHECKIN_TEMPLATE_ID, tenantId: TV_TENANT_ID, name: 'Stare generală', sortOrder: 0 },
    { id: TV_SEC_PROGRES_ID,   templateId: TV_CHECKIN_TEMPLATE_ID, tenantId: TV_TENANT_ID, name: 'Progres',        sortOrder: 1 },
    { id: TV_SEC_COLLAB_ID,    templateId: TV_CHECKIN_TEMPLATE_ID, tenantId: TV_TENANT_ID, name: 'Colaborare',     sortOrder: 2 },
    { id: TV_SEC_REALIZARI_ID, templateId: TV_RETRO_TEMPLATE_ID,   tenantId: TV_TENANT_ID, name: 'Realizări',      sortOrder: 0 },
    { id: TV_SEC_OBIECTIVE_ID, templateId: TV_RETRO_TEMPLATE_ID,   tenantId: TV_TENANT_ID, name: 'Obiective',      sortOrder: 1 },
    { id: TV_SEC_DEZVOLTARE_ID,templateId: TV_RETRO_TEMPLATE_ID,   tenantId: TV_TENANT_ID, name: 'Dezvoltare',     sortOrder: 2 },
  ];

  for (const sec of tvSections) {
    await db
      .insert(schema.templateSections)
      .values(sec)
      .onConflictDoUpdate({
        target: schema.templateSections.id,
        set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` },
      });
  }

  // Questions
  const tvQuestions = [
    // Check-in questions
    { id: TV_Q_MOOD_ID,        templateId: TV_CHECKIN_TEMPLATE_ID, sectionId: TV_SEC_STARE_ID,     questionText: 'Cum te simți săptămâna aceasta?',                answerType: 'mood' as const,        answerConfig: { options: ['great', 'good', 'okay', 'struggling', 'bad'] }, isRequired: true,  sortOrder: 1 },
    { id: TV_Q_ENERGIE_ID,     templateId: TV_CHECKIN_TEMPLATE_ID, sectionId: TV_SEC_STARE_ID,     questionText: 'Cum îți evaluezi nivelul de energie?',           answerType: 'rating_1_5' as const,  answerConfig: { labels: { 1: 'Foarte scăzut', 3: 'Mediu', 5: 'Excelent' } },  isRequired: true,  sortOrder: 2 },
    { id: TV_Q_BLOCKERS_TV_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sectionId: TV_SEC_PROGRES_ID,   questionText: 'Cu ce te-ai confruntat ca blocaj?',             answerType: 'text' as const,        answerConfig: {},                                                             isRequired: false, sortOrder: 3 },
    { id: TV_Q_HELP_TV_ID,     templateId: TV_CHECKIN_TEMPLATE_ID, sectionId: TV_SEC_PROGRES_ID,   questionText: 'Ai nevoie de ajutor din partea mea?',           answerType: 'yes_no' as const,      answerConfig: {},                                                             isRequired: true,  sortOrder: 4 },
    { id: TV_Q_SATISFACTION_TV,templateId: TV_CHECKIN_TEMPLATE_ID, sectionId: TV_SEC_COLLAB_ID,    questionText: 'Cât de mulțumit ești de activitatea săptămânii?',answerType: 'rating_1_10' as const, answerConfig: {},                                                             isRequired: true,  sortOrder: 5 },
    // Retro questions
    { id: TV_Q_REALIZARE_ID,   templateId: TV_RETRO_TEMPLATE_ID,   sectionId: TV_SEC_REALIZARI_ID, questionText: 'Care a fost cea mai importantă realizare a lunii?', answerType: 'text' as const,      answerConfig: {},                                                             isRequired: true,  sortOrder: 1 },
    { id: TV_Q_OBJ_SCORE_ID,   templateId: TV_RETRO_TEMPLATE_ID,   sectionId: TV_SEC_OBIECTIVE_ID, questionText: 'Cât de bine ai avansat pe obiectivele lunare?',      answerType: 'rating_1_5' as const,answerConfig: { labels: { 1: 'Deloc', 3: 'Moderat', 5: 'Excelent' } },          isRequired: true,  sortOrder: 2 },
    { id: TV_Q_IMBUNATATI_ID,  templateId: TV_RETRO_TEMPLATE_ID,   sectionId: TV_SEC_OBIECTIVE_ID, questionText: 'Ce ai vrea să îmbunătățești luna viitoare?',        answerType: 'text' as const,      answerConfig: {},                                                             isRequired: false, sortOrder: 3 },
    { id: TV_Q_COLLAB_SCORE_ID,templateId: TV_RETRO_TEMPLATE_ID,   sectionId: TV_SEC_DEZVOLTARE_ID,questionText: 'Cum evaluezi colaborarea cu echipa?',               answerType: 'rating_1_5' as const,answerConfig: { labels: { 1: 'Dificilă', 3: 'Normală', 5: 'Excelentă' } },      isRequired: true,  sortOrder: 4 },
  ];

  for (const q of tvQuestions) {
    await db
      .insert(schema.templateQuestions)
      .values(q)
      .onConflictDoUpdate({
        target: schema.templateQuestions.id,
        set: {
          questionText: sql`excluded.question_text`,
          sectionId:    sql`excluded.section_id`,
          answerType:   sql`excluded.answer_type`,
          answerConfig: sql`excluded.answer_config`,
          sortOrder:    sql`excluded.sort_order`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Meeting Series
  // --------------------------------------------------------------------------
  const tvSeries = [
    { id: TV_SERIES_EC_ID, tenantId: TV_TENANT_ID, managerId: TV_ELENA_ID,   reportId: TV_CIPRIAN_ID, cadence: 'weekly' as const,    defaultDurationMinutes: 30, defaultTemplateId: TV_CHECKIN_TEMPLATE_ID, preferredDay: 'mon' as const, preferredTime: '09:00', status: 'active' as const, nextSessionAt: nextWeekDate },
    { id: TV_SERIES_CA_ID, tenantId: TV_TENANT_ID, managerId: TV_CIPRIAN_ID, reportId: TV_ANDREI_ID,  cadence: 'biweekly' as const,  defaultDurationMinutes: 30, defaultTemplateId: TV_CHECKIN_TEMPLATE_ID, preferredDay: 'tue' as const, preferredTime: '10:00', status: 'active' as const, nextSessionAt: nextWeekDate },
    { id: TV_SERIES_CM_ID, tenantId: TV_TENANT_ID, managerId: TV_CIPRIAN_ID, reportId: TV_MARIA_ID,   cadence: 'weekly' as const,    defaultDurationMinutes: 30, defaultTemplateId: TV_CHECKIN_TEMPLATE_ID, preferredDay: 'thu' as const, preferredTime: '11:00', status: 'active' as const, nextSessionAt: nextWeekDate },
    { id: TV_SERIES_RI_ID, tenantId: TV_TENANT_ID, managerId: TV_RADU_ID,    reportId: TV_IOANA_ID,   cadence: 'biweekly' as const,  defaultDurationMinutes: 30, defaultTemplateId: TV_CHECKIN_TEMPLATE_ID, preferredDay: 'wed' as const, preferredTime: '14:00', status: 'active' as const, nextSessionAt: nextWeekDate },
    { id: TV_SERIES_RA_ID, tenantId: TV_TENANT_ID, managerId: TV_RADU_ID,    reportId: TV_ALEX_ID,    cadence: 'weekly' as const,    defaultDurationMinutes: 30, defaultTemplateId: TV_RETRO_TEMPLATE_ID,   preferredDay: 'fri' as const, preferredTime: '15:00', status: 'active' as const, nextSessionAt: nextWeekDate },
  ];

  for (const s of tvSeries) {
    await db
      .insert(schema.meetingSeries)
      .values(s)
      .onConflictDoUpdate({
        target: schema.meetingSeries.id,
        set: {
          cadence: sql`excluded.cadence`,
          defaultTemplateId: sql`excluded.default_template_id`,
          preferredDay: sql`excluded.preferred_day`,
          preferredTime: sql`excluded.preferred_time`,
          status: sql`excluded.status`,
          nextSessionAt: sql`excluded.next_session_at`,
          updatedAt: sql`now()`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Sessions
  // --------------------------------------------------------------------------
  const tvSessions = [
    // Elena ↔ Ciprian (Ciprian is report)
    { id: TV_S_EC_1, seriesId: TV_SERIES_EC_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 1, scheduledAt: fourWeeksAgo,  startedAt: fourWeeksAgo,  completedAt: new Date(fourWeeksAgo.getTime()  + 30*60*1000), status: 'completed' as const, sessionScore: '3.50', durationMinutes: 30 },
    { id: TV_S_EC_2, seriesId: TV_SERIES_EC_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 2, scheduledAt: threeWeeksAgo, startedAt: threeWeeksAgo, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), status: 'completed' as const, sessionScore: '4.00', durationMinutes: 30 },
    { id: TV_S_EC_3, seriesId: TV_SERIES_EC_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 3, scheduledAt: twoWeeksAgo,   startedAt: twoWeeksAgo,   completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), status: 'completed' as const, sessionScore: '3.75', durationMinutes: 30 },
    { id: TV_S_EC_4, seriesId: TV_SERIES_EC_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 4, scheduledAt: now,            startedAt: now,           status: 'in_progress' as const },
    // Ciprian ↔ Andrei
    { id: TV_S_CA_1, seriesId: TV_SERIES_CA_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 1, scheduledAt: fourWeeksAgo,  startedAt: fourWeeksAgo,  completedAt: new Date(fourWeeksAgo.getTime()  + 30*60*1000), status: 'completed' as const, sessionScore: '3.25', durationMinutes: 30 },
    { id: TV_S_CA_2, seriesId: TV_SERIES_CA_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 2, scheduledAt: threeWeeksAgo, startedAt: threeWeeksAgo, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), status: 'completed' as const, sessionScore: '3.50', durationMinutes: 30 },
    { id: TV_S_CA_3, seriesId: TV_SERIES_CA_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 3, scheduledAt: twoWeeksAgo,   startedAt: twoWeeksAgo,   completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), status: 'completed' as const, sessionScore: '4.00', durationMinutes: 30 },
    { id: TV_S_CA_4, seriesId: TV_SERIES_CA_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 4, scheduledAt: now,            startedAt: now,           status: 'in_progress' as const },
    // Ciprian ↔ Maria
    { id: TV_S_CM_1, seriesId: TV_SERIES_CM_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 1, scheduledAt: threeWeeksAgo, startedAt: threeWeeksAgo, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), status: 'completed' as const, sessionScore: '4.00', durationMinutes: 30 },
    { id: TV_S_CM_2, seriesId: TV_SERIES_CM_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 2, scheduledAt: twoWeeksAgo,   startedAt: twoWeeksAgo,   completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), status: 'completed' as const, sessionScore: '3.75', durationMinutes: 30 },
    { id: TV_S_CM_3, seriesId: TV_SERIES_CM_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 3, scheduledAt: now,            startedAt: now,           status: 'in_progress' as const },
    // Radu ↔ Ioana
    { id: TV_S_RI_1, seriesId: TV_SERIES_RI_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 1, scheduledAt: threeWeeksAgo, startedAt: threeWeeksAgo, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), status: 'completed' as const, sessionScore: '3.50', durationMinutes: 30 },
    { id: TV_S_RI_2, seriesId: TV_SERIES_RI_ID, tenantId: TV_TENANT_ID, templateId: TV_CHECKIN_TEMPLATE_ID, sessionNumber: 2, scheduledAt: oneWeekAgo,    startedAt: oneWeekAgo,    completedAt: new Date(oneWeekAgo.getTime()    + 30*60*1000), status: 'completed' as const, sessionScore: '4.00', durationMinutes: 30 },
    // Radu ↔ Alexandru
    { id: TV_S_RA_1, seriesId: TV_SERIES_RA_ID, tenantId: TV_TENANT_ID, templateId: TV_RETRO_TEMPLATE_ID,   sessionNumber: 1, scheduledAt: twoWeeksAgo,   startedAt: twoWeeksAgo,   completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), status: 'completed' as const, sessionScore: '3.00', durationMinutes: 30 },
    { id: TV_S_RA_2, seriesId: TV_SERIES_RA_ID, tenantId: TV_TENANT_ID, templateId: TV_RETRO_TEMPLATE_ID,   sessionNumber: 2, scheduledAt: oneWeekAgo,    startedAt: oneWeekAgo,    completedAt: new Date(oneWeekAgo.getTime()    + 30*60*1000), status: 'completed' as const, sessionScore: '3.50', durationMinutes: 30 },
  ];

  for (const s of tvSessions) {
    await db
      .insert(schema.sessions)
      .values(s)
      .onConflictDoUpdate({
        target: schema.sessions.id,
        set: {
          sessionNumber: sql`excluded.session_number`,
          scheduledAt:   sql`excluded.scheduled_at`,
          startedAt:     sql`excluded.started_at`,
          completedAt:   sql`excluded.completed_at`,
          status:        sql`excluded.status`,
          sessionScore:  sql`excluded.session_score`,
          durationMinutes: sql`excluded.duration_minutes`,
          updatedAt:     sql`now()`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Session Answers (completed sessions only)
  // --------------------------------------------------------------------------
  // Helper: answer ID using block/session/question indexes
  const aid = (b: number, s: number, q: number) =>
    `66660000-${b}${s}0${q}-4000-a600-eeeeeeeeeeee`;

  const tvAnswers = [
    // Elena↔Ciprian S1 (Ciprian responds): mood=good, energie=3, blocker="Lipsă context pe decizia de roadmap", help=yes, satisfaction=7
    { id: aid(1,1,1), sessionId: TV_S_EC_1, questionId: TV_Q_MOOD_ID,        respondentId: TV_CIPRIAN_ID, answerJson: { value: 'good' } },
    { id: aid(1,1,2), sessionId: TV_S_EC_1, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_CIPRIAN_ID, answerNumeric: '3.00' },
    { id: aid(1,1,3), sessionId: TV_S_EC_1, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_CIPRIAN_ID, answerText: 'Lipsă context pe decizia de roadmap' },
    { id: aid(1,1,4), sessionId: TV_S_EC_1, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_CIPRIAN_ID, answerJson: { value: true } },
    { id: aid(1,1,5), sessionId: TV_S_EC_1, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_CIPRIAN_ID, answerNumeric: '7.00' },
    // Elena↔Ciprian S2: mood=great, energie=4, blocker="Nimic semnificativ", help=no, satisfaction=8
    { id: aid(1,2,1), sessionId: TV_S_EC_2, questionId: TV_Q_MOOD_ID,        respondentId: TV_CIPRIAN_ID, answerJson: { value: 'great' } },
    { id: aid(1,2,2), sessionId: TV_S_EC_2, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_CIPRIAN_ID, answerNumeric: '4.00' },
    { id: aid(1,2,3), sessionId: TV_S_EC_2, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_CIPRIAN_ID, answerText: 'Nimic semnificativ' },
    { id: aid(1,2,4), sessionId: TV_S_EC_2, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_CIPRIAN_ID, answerJson: { value: false } },
    { id: aid(1,2,5), sessionId: TV_S_EC_2, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_CIPRIAN_ID, answerNumeric: '8.00' },
    // Elena↔Ciprian S3: mood=good, energie=3, blocker="Prea multe meeting-uri", help=yes, satisfaction=7
    { id: aid(1,3,1), sessionId: TV_S_EC_3, questionId: TV_Q_MOOD_ID,        respondentId: TV_CIPRIAN_ID, answerJson: { value: 'good' } },
    { id: aid(1,3,2), sessionId: TV_S_EC_3, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_CIPRIAN_ID, answerNumeric: '3.00' },
    { id: aid(1,3,3), sessionId: TV_S_EC_3, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_CIPRIAN_ID, answerText: 'Prea multe meeting-uri' },
    { id: aid(1,3,4), sessionId: TV_S_EC_3, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_CIPRIAN_ID, answerJson: { value: true } },
    { id: aid(1,3,5), sessionId: TV_S_EC_3, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_CIPRIAN_ID, answerNumeric: '7.00' },

    // Ciprian↔Andrei S1 (Andrei responds): mood=okay, energie=2, blocker=long text, help=yes, satisfaction=6
    { id: aid(2,1,1), sessionId: TV_S_CA_1, questionId: TV_Q_MOOD_ID,        respondentId: TV_ANDREI_ID, answerJson: { value: 'okay' } },
    { id: aid(2,1,2), sessionId: TV_S_CA_1, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_ANDREI_ID, answerNumeric: '2.00' },
    { id: aid(2,1,3), sessionId: TV_S_CA_1, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_ANDREI_ID, answerText: 'Documentația lipsă pentru modulul de autentificare' },
    { id: aid(2,1,4), sessionId: TV_S_CA_1, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_ANDREI_ID, answerJson: { value: true } },
    { id: aid(2,1,5), sessionId: TV_S_CA_1, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_ANDREI_ID, answerNumeric: '6.00' },
    // Ciprian↔Andrei S2: mood=good, energie=3, blocker="Review-uri întârziate", help=yes, satisfaction=7
    { id: aid(2,2,1), sessionId: TV_S_CA_2, questionId: TV_Q_MOOD_ID,        respondentId: TV_ANDREI_ID, answerJson: { value: 'good' } },
    { id: aid(2,2,2), sessionId: TV_S_CA_2, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_ANDREI_ID, answerNumeric: '3.00' },
    { id: aid(2,2,3), sessionId: TV_S_CA_2, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_ANDREI_ID, answerText: 'Review-uri întârziate' },
    { id: aid(2,2,4), sessionId: TV_S_CA_2, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_ANDREI_ID, answerJson: { value: true } },
    { id: aid(2,2,5), sessionId: TV_S_CA_2, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_ANDREI_ID, answerNumeric: '7.00' },
    // Ciprian↔Andrei S3: mood=great, energie=4, blocker="", help=no, satisfaction=8
    { id: aid(2,3,1), sessionId: TV_S_CA_3, questionId: TV_Q_MOOD_ID,        respondentId: TV_ANDREI_ID, answerJson: { value: 'great' } },
    { id: aid(2,3,2), sessionId: TV_S_CA_3, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_ANDREI_ID, answerNumeric: '4.00' },
    { id: aid(2,3,3), sessionId: TV_S_CA_3, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_ANDREI_ID, answerText: '' },
    { id: aid(2,3,4), sessionId: TV_S_CA_3, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_ANDREI_ID, answerJson: { value: false } },
    { id: aid(2,3,5), sessionId: TV_S_CA_3, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_ANDREI_ID, answerNumeric: '8.00' },

    // Ciprian↔Maria S1 (Maria responds): mood=great, energie=4, blocker="", help=no, satisfaction=8
    { id: aid(3,1,1), sessionId: TV_S_CM_1, questionId: TV_Q_MOOD_ID,        respondentId: TV_MARIA_ID, answerJson: { value: 'great' } },
    { id: aid(3,1,2), sessionId: TV_S_CM_1, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_MARIA_ID, answerNumeric: '4.00' },
    { id: aid(3,1,3), sessionId: TV_S_CM_1, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_MARIA_ID, answerText: '' },
    { id: aid(3,1,4), sessionId: TV_S_CM_1, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_MARIA_ID, answerJson: { value: false } },
    { id: aid(3,1,5), sessionId: TV_S_CM_1, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_MARIA_ID, answerNumeric: '8.00' },
    // Ciprian↔Maria S2: mood=good, energie=3, blocker="Feedback lent pe mockup-uri", help=yes, satisfaction=7
    { id: aid(3,2,1), sessionId: TV_S_CM_2, questionId: TV_Q_MOOD_ID,        respondentId: TV_MARIA_ID, answerJson: { value: 'good' } },
    { id: aid(3,2,2), sessionId: TV_S_CM_2, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_MARIA_ID, answerNumeric: '3.00' },
    { id: aid(3,2,3), sessionId: TV_S_CM_2, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_MARIA_ID, answerText: 'Feedback lent pe mockup-uri' },
    { id: aid(3,2,4), sessionId: TV_S_CM_2, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_MARIA_ID, answerJson: { value: true } },
    { id: aid(3,2,5), sessionId: TV_S_CM_2, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_MARIA_ID, answerNumeric: '7.00' },

    // Radu↔Ioana S1 (Ioana responds): mood=good, energie=3, blocker="", help=no, satisfaction=7
    { id: aid(4,1,1), sessionId: TV_S_RI_1, questionId: TV_Q_MOOD_ID,        respondentId: TV_IOANA_ID, answerJson: { value: 'good' } },
    { id: aid(4,1,2), sessionId: TV_S_RI_1, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_IOANA_ID, answerNumeric: '3.00' },
    { id: aid(4,1,3), sessionId: TV_S_RI_1, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_IOANA_ID, answerText: '' },
    { id: aid(4,1,4), sessionId: TV_S_RI_1, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_IOANA_ID, answerJson: { value: false } },
    { id: aid(4,1,5), sessionId: TV_S_RI_1, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_IOANA_ID, answerNumeric: '7.00' },
    // Radu↔Ioana S2: mood=great, energie=4, blocker="", help=no, satisfaction=8
    { id: aid(4,2,1), sessionId: TV_S_RI_2, questionId: TV_Q_MOOD_ID,        respondentId: TV_IOANA_ID, answerJson: { value: 'great' } },
    { id: aid(4,2,2), sessionId: TV_S_RI_2, questionId: TV_Q_ENERGIE_ID,     respondentId: TV_IOANA_ID, answerNumeric: '4.00' },
    { id: aid(4,2,3), sessionId: TV_S_RI_2, questionId: TV_Q_BLOCKERS_TV_ID, respondentId: TV_IOANA_ID, answerText: '' },
    { id: aid(4,2,4), sessionId: TV_S_RI_2, questionId: TV_Q_HELP_TV_ID,     respondentId: TV_IOANA_ID, answerJson: { value: false } },
    { id: aid(4,2,5), sessionId: TV_S_RI_2, questionId: TV_Q_SATISFACTION_TV,respondentId: TV_IOANA_ID, answerNumeric: '8.00' },

    // Radu↔Alexandru S1 (Alexandru responds, retro template): realizare/obj_score/imbunatati/collab
    { id: aid(5,1,1), sessionId: TV_S_RA_1, questionId: TV_Q_REALIZARE_ID,    respondentId: TV_ALEX_ID, answerText: 'Am finalizat migrarea la pipeline CI nou' },
    { id: aid(5,1,2), sessionId: TV_S_RA_1, questionId: TV_Q_OBJ_SCORE_ID,    respondentId: TV_ALEX_ID, answerNumeric: '2.00' },
    { id: aid(5,1,3), sessionId: TV_S_RA_1, questionId: TV_Q_IMBUNATATI_ID,   respondentId: TV_ALEX_ID, answerText: 'Eliminare deploy-uri manuale, automatizare completă' },
    { id: aid(5,1,4), sessionId: TV_S_RA_1, questionId: TV_Q_COLLAB_SCORE_ID, respondentId: TV_ALEX_ID, answerNumeric: '3.00' },
    // Radu↔Alexandru S2: realizare/obj_score/imbunatati/collab
    { id: aid(5,2,1), sessionId: TV_S_RA_2, questionId: TV_Q_REALIZARE_ID,    respondentId: TV_ALEX_ID, answerText: 'Automatizat deploy-ul cu GitHub Actions' },
    { id: aid(5,2,2), sessionId: TV_S_RA_2, questionId: TV_Q_OBJ_SCORE_ID,    respondentId: TV_ALEX_ID, answerNumeric: '3.00' },
    { id: aid(5,2,3), sessionId: TV_S_RA_2, questionId: TV_Q_IMBUNATATI_ID,   respondentId: TV_ALEX_ID, answerText: 'Documentație mai bună pentru procesele DevOps' },
    { id: aid(5,2,4), sessionId: TV_S_RA_2, questionId: TV_Q_COLLAB_SCORE_ID, respondentId: TV_ALEX_ID, answerNumeric: '4.00' },
  ];

  for (const a of tvAnswers) {
    await db
      .insert(schema.sessionAnswers)
      .values(a)
      .onConflictDoUpdate({
        target: schema.sessionAnswers.id,
        set: {
          answerText:    sql`excluded.answer_text`,
          answerNumeric: sql`excluded.answer_numeric`,
          answerJson:    sql`excluded.answer_json`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Talking Points (in_progress sessions)
  // --------------------------------------------------------------------------
  const tvTalkingPoints = [
    // Ciprian↔Andrei S4 (in_progress)
    { id: TV_TP_1, sessionId: TV_S_CA_4, authorId: TV_CIPRIAN_ID, content: 'Reviziurea arhitecturii modulului de notificări',       category: 'performance', sortOrder: 0 },
    { id: TV_TP_2, sessionId: TV_S_CA_4, authorId: TV_ANDREI_ID,  content: 'Discuție despre creșterea în carieră — tech lead track', category: 'career',      sortOrder: 1 },
    { id: TV_TP_3, sessionId: TV_S_CA_4, authorId: TV_CIPRIAN_ID, content: 'Feedback pe PR-ul #247 — patterns de testare',           category: 'performance', sortOrder: 2 },
    // Ciprian↔Maria S3 (in_progress)
    { id: TV_TP_4, sessionId: TV_S_CM_3, authorId: TV_MARIA_ID,   content: 'Prezentarea noului design system propus',                category: 'performance', sortOrder: 0 },
    { id: TV_TP_5, sessionId: TV_S_CM_3, authorId: TV_CIPRIAN_ID, content: 'Timeline pentru redesign-ul paginii de onboarding',      category: 'performance', sortOrder: 1 },
  ];

  for (const tp of tvTalkingPoints) {
    await db
      .insert(schema.talkingPoints)
      .values(tp)
      .onConflictDoUpdate({
        target: schema.talkingPoints.id,
        set: {
          content:   sql`excluded.content`,
          category:  sql`excluded.category`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Action Items
  // --------------------------------------------------------------------------
  const fiveDaysAgo   = new Date(now.getTime() - 5  * 24 * 60 * 60 * 1000);
  const threeDaysAgo  = new Date(now.getTime() - 3  * 24 * 60 * 60 * 1000);
  const fiveDaysOut   = new Date(now.getTime() + 5  * 24 * 60 * 60 * 1000);
  const sevenDaysOut  = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);
  const tenDaysOut    = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const threeDaysOut  = new Date(now.getTime() + 3  * 24 * 60 * 60 * 1000);

  const tvActionItems = [
    // Ciprian (assigned to him from Elena series)
    { id: TV_AI_01, sessionId: TV_S_EC_3, tenantId: TV_TENANT_ID, assigneeId: TV_CIPRIAN_ID, createdById: TV_ELENA_ID,   title: 'Pregătire document strategie produs Q2',              category: 'performance', dueDate: fiveDaysAgo.toISOString().split('T')[0],  status: 'open' as const },
    { id: TV_AI_02, sessionId: TV_S_EC_4, tenantId: TV_TENANT_ID, assigneeId: TV_CIPRIAN_ID, createdById: TV_ELENA_ID,   title: 'Organizare workshop de prioritizare cu echipa',       category: 'check_in',    dueDate: sevenDaysOut.toISOString().split('T')[0], status: 'in_progress' as const },
    { id: TV_AI_03, sessionId: TV_S_EC_1, tenantId: TV_TENANT_ID, assigneeId: TV_CIPRIAN_ID, createdById: TV_ELENA_ID,   title: 'Actualizare roadmap cu feedback de la investitori',   category: 'performance', dueDate: threeWeeksAgo.toISOString().split('T')[0],status: 'completed' as const, completedAt: new Date(threeWeeksAgo.getTime() + 2*24*60*60*1000) },
    // Andrei (assigned to him from Ciprian series)
    { id: TV_AI_04, sessionId: TV_S_CA_1, tenantId: TV_TENANT_ID, assigneeId: TV_ANDREI_ID,  createdById: TV_CIPRIAN_ID, title: 'Scriere documentație pentru API-ul de autentificare', category: 'performance', dueDate: threeDaysAgo.toISOString().split('T')[0],  status: 'open' as const },
    { id: TV_AI_05, sessionId: TV_S_CA_3, tenantId: TV_TENANT_ID, assigneeId: TV_ANDREI_ID,  createdById: TV_CIPRIAN_ID, title: 'Refactorizare modulul de upload fișiere',             category: 'performance', dueDate: tenDaysOut.toISOString().split('T')[0],   status: 'open' as const },
    { id: TV_AI_06, sessionId: TV_S_CA_2, tenantId: TV_TENANT_ID, assigneeId: TV_ANDREI_ID,  createdById: TV_CIPRIAN_ID, title: 'Rezolvare bug critic #189 — sesiuni expirate',        category: 'performance', dueDate: twoWeeksAgo.toISOString().split('T')[0],  status: 'completed' as const, completedAt: new Date(twoWeeksAgo.getTime() + 24*60*60*1000) },
    // Maria (assigned to her from Ciprian series)
    { id: TV_AI_07, sessionId: TV_S_CM_2, tenantId: TV_TENANT_ID, assigneeId: TV_MARIA_ID,   createdById: TV_CIPRIAN_ID, title: 'Prototip nou pentru fluxul de onboarding',            category: 'performance', dueDate: fiveDaysOut.toISOString().split('T')[0],  status: 'open' as const },
    { id: TV_AI_08, sessionId: TV_S_CM_1, tenantId: TV_TENANT_ID, assigneeId: TV_MARIA_ID,   createdById: TV_CIPRIAN_ID, title: 'Audit accesibilitate pe componentele existente',      category: 'performance', dueDate: threeWeeksAgo.toISOString().split('T')[0],status: 'completed' as const, completedAt: new Date(threeWeeksAgo.getTime() + 3*24*60*60*1000) },
    // Ioana (assigned to her from Radu series)
    { id: TV_AI_09, sessionId: TV_S_RI_2, tenantId: TV_TENANT_ID, assigneeId: TV_IOANA_ID,   createdById: TV_RADU_ID,    title: 'Analiză date utilizatori Q1',                        category: 'performance', dueDate: threeDaysOut.toISOString().split('T')[0], status: 'open' as const },
    { id: TV_AI_10, sessionId: TV_S_RI_1, tenantId: TV_TENANT_ID, assigneeId: TV_IOANA_ID,   createdById: TV_RADU_ID,    title: 'Prezentare raport lunar ops',                        category: 'performance', dueDate: oneWeekAgo.toISOString().split('T')[0],   status: 'completed' as const, completedAt: new Date(oneWeekAgo.getTime() + 24*60*60*1000) },
  ];

  for (const item of tvActionItems) {
    await db
      .insert(schema.actionItems)
      .values(item)
      .onConflictDoUpdate({
        target: schema.actionItems.id,
        set: {
          title:       sql`excluded.title`,
          description: sql`excluded.description`,
          dueDate:     sql`excluded.due_date`,
          status:      sql`excluded.status`,
          completedAt: sql`excluded.completed_at`,
          updatedAt:   sql`now()`,
        },
      });
  }

  // --------------------------------------------------------------------------
  // Private Notes (encrypted)
  // --------------------------------------------------------------------------
  const note1Content = 'Andrei pare motivat dar se blochează ușor când nu are context suficient. Ar beneficia de mai multă autonomie pe taskuri mici.';
  const note2Content = 'Maria are potențial mare de leadership. De explorat posibilitatea unui rol senior în H2.';
  const encNote1 = encryptNote(note1Content, TV_TENANT_ID, 1);
  const encNote2 = encryptNote(note2Content, TV_TENANT_ID, 1);

  await db
    .insert(schema.privateNotes)
    .values([
      { id: TV_NOTE_1, sessionId: TV_S_CA_2, authorId: TV_CIPRIAN_ID, content: JSON.stringify(encNote1), category: 'general', keyVersion: 1 },
      { id: TV_NOTE_2, sessionId: TV_S_CM_1, authorId: TV_CIPRIAN_ID, content: JSON.stringify(encNote2), category: 'general', keyVersion: 1 },
    ])
    .onConflictDoUpdate({
      target: schema.privateNotes.id,
      set: {
        content:    sql`excluded.content`,
        keyVersion: sql`excluded.key_version`,
        updatedAt:  sql`now()`,
      },
    });

  // --------------------------------------------------------------------------
  // Analytics Snapshots (per completed session, session_score + Stare generală)
  // --------------------------------------------------------------------------
  const tvSnapshots = [];
  let snapIdx = 1;

  const snapEntries: Array<{ sessionId: string; userId: string; seriesId: string; completedAt: Date; score: string; stare: string }> = [
    // Ciprian as report in EC series
    { sessionId: TV_S_EC_1, userId: TV_CIPRIAN_ID, seriesId: TV_SERIES_EC_ID, completedAt: new Date(fourWeeksAgo.getTime()  + 30*60*1000), score: '7.000', stare: '3.000' },
    { sessionId: TV_S_EC_2, userId: TV_CIPRIAN_ID, seriesId: TV_SERIES_EC_ID, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), score: '8.000', stare: '4.000' },
    { sessionId: TV_S_EC_3, userId: TV_CIPRIAN_ID, seriesId: TV_SERIES_EC_ID, completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), score: '7.500', stare: '3.000' },
    // Andrei as report in CA series
    { sessionId: TV_S_CA_1, userId: TV_ANDREI_ID,  seriesId: TV_SERIES_CA_ID, completedAt: new Date(fourWeeksAgo.getTime()  + 30*60*1000), score: '6.500', stare: '2.000' },
    { sessionId: TV_S_CA_2, userId: TV_ANDREI_ID,  seriesId: TV_SERIES_CA_ID, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), score: '7.000', stare: '3.000' },
    { sessionId: TV_S_CA_3, userId: TV_ANDREI_ID,  seriesId: TV_SERIES_CA_ID, completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), score: '8.000', stare: '4.000' },
    // Maria as report in CM series
    { sessionId: TV_S_CM_1, userId: TV_MARIA_ID,   seriesId: TV_SERIES_CM_ID, completedAt: new Date(threeWeeksAgo.getTime() + 30*60*1000), score: '8.000', stare: '4.000' },
    { sessionId: TV_S_CM_2, userId: TV_MARIA_ID,   seriesId: TV_SERIES_CM_ID, completedAt: new Date(twoWeeksAgo.getTime()   + 30*60*1000), score: '7.500', stare: '3.000' },
  ];

  for (const entry of snapEntries) {
    const period = monthRange(entry.completedAt);
    const idScore = `55550000-${String(snapIdx).padStart(4, '0')}-4000-a500-eeeeeeeeeeee`;
    snapIdx++;
    const idStare = `55550000-${String(snapIdx).padStart(4, '0')}-4000-a500-eeeeeeeeeeee`;
    snapIdx++;

    tvSnapshots.push(
      { id: idScore, tenantId: TV_TENANT_ID, userId: entry.userId, seriesId: entry.seriesId, periodType: 'month' as const, periodStart: period.start, periodEnd: period.end, metricName: 'session_score', metricValue: entry.score, sampleCount: 1 },
      { id: idStare, tenantId: TV_TENANT_ID, userId: entry.userId, seriesId: entry.seriesId, periodType: 'month' as const, periodStart: period.start, periodEnd: period.end, metricName: 'Stare generală', metricValue: entry.stare, sampleCount: 1 },
    );
  }

  for (const snap of tvSnapshots) {
    await db.delete(schema.analyticsSnapshots).where(sql`id = ${snap.id}`);
    await db.insert(schema.analyticsSnapshots).values(snap);
  }
}

// =============================================================================
// Main
// =============================================================================

async function seedNotifications() {
  console.log('  Seeding notifications...');

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const notifs = [
    {
      id: NOTIF_PRE_MEETING_BOB_ID,
      tenantId: ACME_TENANT_ID,
      userId: BOB_ID,
      type: 'pre_meeting' as const,
      channel: 'email' as const,
      referenceType: 'series',
      referenceId: SERIES_BOB_DAVE_ID,
      scheduledFor: twoDaysFromNow,
      status: 'pending' as const,
    },
    {
      id: NOTIF_PRE_MEETING_DAVE_ID,
      tenantId: ACME_TENANT_ID,
      userId: DAVE_ID,
      type: 'pre_meeting' as const,
      channel: 'email' as const,
      referenceType: 'series',
      referenceId: SERIES_BOB_DAVE_ID,
      scheduledFor: twoDaysFromNow,
      status: 'pending' as const,
    },
    {
      id: NOTIF_AGENDA_PREP_BOB_ID,
      tenantId: ACME_TENANT_ID,
      userId: BOB_ID,
      type: 'agenda_prep' as const,
      channel: 'email' as const,
      referenceType: 'series',
      referenceId: SERIES_BOB_DAVE_ID,
      scheduledFor: threeDaysFromNow,
      status: 'pending' as const,
    },
    {
      id: NOTIF_AGENDA_PREP_DAVE_ID,
      tenantId: ACME_TENANT_ID,
      userId: DAVE_ID,
      type: 'agenda_prep' as const,
      channel: 'email' as const,
      referenceType: 'series',
      referenceId: SERIES_BOB_DAVE_ID,
      scheduledFor: threeDaysFromNow,
      status: 'pending' as const,
    },
  ];

  for (const notif of notifs) {
    await db
      .insert(schema.notifications)
      .values(notif)
      .onConflictDoUpdate({
        target: schema.notifications.id,
        set: {
          scheduledFor: sql`excluded.scheduled_for`,
          status: sql`excluded.status`,
        },
      });
  }
}

async function seedAnswerHistory() {
  console.log('  Seeding answer history (corrections)...');
  // One correction on Session 1 / Blockers answer — required by corrections.spec.ts E2E tests
  await db
    .insert(schema.sessionAnswerHistory)
    .values({
      id: 'cccccccc-0001-4000-a000-000000000001',
      sessionAnswerId: ANSWER_S1_BLOCKERS_ID,
      sessionId: SESSION_1_ID,
      tenantId: ACME_TENANT_ID,
      correctedById: BOB_ID,
      originalAnswerText: 'Having some difficulty with the codebase, no staging access yet.',
      originalSkipped: false,
      correctionReason: 'Dave clarified in person that the original phrasing was overly negative; updated to reflect his actual sentiment.',
    })
    .onConflictDoNothing();
}

async function seedAliceData() {
  console.log('  Seeding Alice leadership data (series, sessions, AI, actions)...');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // --- Series: Alice → Bob, Alice → Carol ---
  const series = [
    {
      id: SERIES_ALICE_BOB_ID,
      tenantId: ACME_TENANT_ID,
      managerId: ALICE_ID,
      reportId: BOB_ID,
      cadence: 'biweekly' as const,
      defaultTemplateId: WEEKLY_TEMPLATE_ID,
      preferredDay: 'tue' as const,
      preferredTime: '10:00',
      status: 'active' as const,
      nextSessionAt: inTwoDays,
    },
    {
      id: SERIES_ALICE_CAROL_ID,
      tenantId: ACME_TENANT_ID,
      managerId: ALICE_ID,
      reportId: CAROL_ID,
      cadence: 'biweekly' as const,
      defaultTemplateId: WEEKLY_TEMPLATE_ID,
      preferredDay: 'thu' as const,
      preferredTime: '14:00',
      status: 'active' as const,
      nextSessionAt: inFiveDays,
    },
  ];

  for (const s of series) {
    await db
      .insert(schema.meetingSeries)
      .values(s)
      .onConflictDoUpdate({
        target: schema.meetingSeries.id,
        set: {
          cadence: sql`excluded.cadence`,
          defaultTemplateId: sql`excluded.default_template_id`,
          preferredDay: sql`excluded.preferred_day`,
          preferredTime: sql`excluded.preferred_time`,
          status: sql`excluded.status`,
          nextSessionAt: sql`excluded.next_session_at`,
          updatedAt: sql`now()`,
        },
      });
  }

  // --- AI Summary templates ---
  const aiSummaryBob1 = {
    cardBlurb: 'Solid quarter for team delivery. Bob flagged hiring bottleneck as primary concern.',
    keyTakeaways: [
      'Team velocity improved 15% after sprint restructure',
      'Hiring pipeline needs acceleration — 2 open reqs stalled',
      'Bob interested in cross-team mentoring program',
      'Sprint retro format working well',
    ],
    discussionHighlights: [
      { category: 'Wellbeing', summary: 'Bob reports good energy levels despite heavy workload. Gym routine helping with stress management.' },
      { category: 'Performance', summary: 'Successfully shipped 3 features this sprint. Code review turnaround improved from 48h to 12h average.' },
      { category: 'Check In', summary: 'Discussed upcoming architecture review. Bob prepared technical proposal for microservices migration.' },
    ],
    followUpItems: [
      'Review hiring pipeline for senior engineer role',
      'Connect Bob with mentoring program coordinator',
      'Schedule architecture review for next sprint',
    ],
    overallSentiment: 'positive' as const,
  };

  const aiSummaryBob2 = {
    cardBlurb: 'Excellent progress on team initiatives. Architecture proposal well-received by stakeholders.',
    keyTakeaways: [
      'Architecture proposal approved by CTO',
      'New hire starting next month — onboarding plan needed',
      'Team morale high after successful launch',
      'Bob considering tech lead certification',
    ],
    discussionHighlights: [
      { category: 'Wellbeing', summary: 'Feeling energized after architecture win. Some concern about upcoming deadline pressure.' },
      { category: 'Performance', summary: 'Led successful Q2 feature launch. Received positive feedback from product team.' },
      { category: 'Check In', summary: 'Discussed leadership development. Bob wants to improve his public speaking for upcoming conference.' },
    ],
    followUpItems: [
      'Prepare new hire onboarding checklist',
      'Discuss conference talk proposal',
      'Review Q3 OKRs together',
    ],
    overallSentiment: 'positive' as const,
  };

  const aiSummaryBob3 = {
    cardBlurb: 'Mixed session — strong delivery but signs of burnout starting. Need to address workload balance.',
    keyTakeaways: [
      'Sprint delivery on track but Bob working late frequently',
      'Delegation skills improving — junior devs taking more ownership',
      'Need to revisit workload distribution',
      'Conference abstract submitted successfully',
    ],
    discussionHighlights: [
      { category: 'Wellbeing', summary: 'Working late 3 nights this week. Skipping lunches. Needs better boundaries.' },
      { category: 'Performance', summary: 'Shipping consistently but at personal cost. Quality remains high.' },
      { category: 'Check In', summary: 'Flagged that Dave is ready for more responsibility. Wants to delegate API ownership.' },
    ],
    followUpItems: [
      'Discuss workload reduction strategies',
      'Review Dave delegation plan',
      'Check on work-life balance next session',
    ],
    overallSentiment: 'mixed' as const,
  };

  const aiSummaryCarol1 = {
    cardBlurb: 'Product roadmap alignment session. Carol driving strong cross-functional collaboration.',
    keyTakeaways: [
      'Product roadmap finalized for Q3',
      'User research insights shaping feature priorities',
      'Carol mentoring two junior PMs effectively',
      'Stakeholder communication improving',
    ],
    discussionHighlights: [
      { category: 'Wellbeing', summary: 'Carol feeling confident and motivated. Good work-life balance maintained.' },
      { category: 'Performance', summary: 'Led 3 successful user research sessions this month. Insights directly informed roadmap.' },
      { category: 'Check In', summary: 'Discussed expanding user research program. Carol proposed a quarterly research sprint format.' },
    ],
    followUpItems: [
      'Review quarterly research sprint proposal',
      'Introduce Carol to UX lead at partner company',
      'Discuss PM career ladder progression',
    ],
    overallSentiment: 'positive' as const,
  };

  const aiSummaryCarol2 = {
    cardBlurb: 'Carol flagged team capacity concerns ahead of Q4 push. Research program gaining traction.',
    keyTakeaways: [
      'Research sprint format approved and funded',
      'Team capacity tight for Q4 scope',
      'Frank needs more support on technical specs',
      'Grace exceeding expectations on user research',
    ],
    discussionHighlights: [
      { category: 'Wellbeing', summary: 'Some stress about Q4 timeline. Concerned about team being stretched too thin.' },
      { category: 'Performance', summary: 'Research program generating valuable insights. Stakeholder buy-in increasing.' },
      { category: 'Check In', summary: 'Discussed Frank performance concerns. Carol working on a development plan for him.' },
    ],
    followUpItems: [
      'Review Q4 scope and capacity plan',
      'Check on Frank development progress',
      'Schedule stakeholder presentation for research findings',
    ],
    overallSentiment: 'mixed' as const,
  };

  const addendumBob = {
    sentimentAnalysis: 'Bob remains highly engaged and productive. Watch for early burnout signals — increased late hours and skipped breaks.',
    patterns: ['Consistent high delivery', 'Growing leadership confidence', 'Work-life balance declining'],
    coachingSuggestions: [
      'Help Bob establish firm boundaries on working hours',
      'Encourage more delegation to Dave who is ready for ownership',
      'Support conference speaking as a growth opportunity',
    ],
    followUpPriority: 'medium' as const,
  };

  const addendumCarol = {
    sentimentAnalysis: 'Carol demonstrates strong product intuition and team care. Her proactive mentoring of junior PMs is a strength.',
    patterns: ['Research-driven decision making', 'Strong mentoring instinct', 'Capacity planning awareness'],
    coachingSuggestions: [
      'Support Carol in pushing back on over-scoped Q4 plans',
      'Create visibility for her research program with exec team',
      'Discuss path to Senior PM or Head of Product',
    ],
    followUpPriority: 'low' as const,
  };

  // --- Completed sessions for Alice's series ---
  const aliceSessions = [
    {
      id: SESSION_ALICE_BOB_1_ID,
      seriesId: SERIES_ALICE_BOB_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 1,
      scheduledAt: fourWeeksAgo,
      startedAt: fourWeeksAgo,
      completedAt: new Date(fourWeeksAgo.getTime() + 35 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Discussed team velocity improvements and hiring challenges. Bob is positive about sprint restructure.' },
      durationMinutes: 35,
      sessionScore: '4.00',
      aiSummary: aiSummaryBob1,
      aiManagerAddendum: addendumBob,
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_ALICE_BOB_2_ID,
      seriesId: SERIES_ALICE_BOB_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 2,
      scheduledAt: twoWeeksAgo,
      startedAt: twoWeeksAgo,
      completedAt: new Date(twoWeeksAgo.getTime() + 40 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Architecture proposal success. Discussed leadership growth and conference talk plans.' },
      durationMinutes: 40,
      sessionScore: '4.50',
      aiSummary: aiSummaryBob2,
      aiManagerAddendum: addendumBob,
      aiStatus: 'completed' as const,
      aiAssessmentScore: 5,
    },
    {
      id: SESSION_ALICE_BOB_3_ID,
      seriesId: SERIES_ALICE_BOB_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 3,
      scheduledAt: threeDaysAgo,
      startedAt: threeDaysAgo,
      completedAt: new Date(threeDaysAgo.getTime() + 30 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Warning signs on work-life balance. Bob working late frequently. Need to address delegation.' },
      durationMinutes: 30,
      sessionScore: '3.50',
      aiSummary: aiSummaryBob3,
      aiManagerAddendum: addendumBob,
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_ALICE_CAROL_1_ID,
      seriesId: SERIES_ALICE_CAROL_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 1,
      scheduledAt: threeWeeksAgo,
      startedAt: threeWeeksAgo,
      completedAt: new Date(threeWeeksAgo.getTime() + 45 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Q3 roadmap alignment. Carol research program is gaining executive support.' },
      durationMinutes: 45,
      sessionScore: '4.25',
      aiSummary: aiSummaryCarol1,
      aiManagerAddendum: addendumCarol,
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_ALICE_CAROL_2_ID,
      seriesId: SERIES_ALICE_CAROL_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 2,
      scheduledAt: oneWeekAgo,
      startedAt: oneWeekAgo,
      completedAt: new Date(oneWeekAgo.getTime() + 35 * 60 * 1000),
      status: 'completed' as const,
      sharedNotes: { general: 'Capacity concerns for Q4. Frank needs development support. Grace excelling.' },
      durationMinutes: 35,
      sessionScore: '3.75',
      aiSummary: aiSummaryCarol2,
      aiManagerAddendum: addendumCarol,
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    // Upcoming sessions (scheduled, not started)
    {
      id: SESSION_ALICE_BOB_UPCOMING_ID,
      seriesId: SERIES_ALICE_BOB_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 4,
      scheduledAt: inTwoDays,
      status: 'scheduled' as const,
    },
    {
      id: SESSION_ALICE_CAROL_UPCOMING_ID,
      seriesId: SERIES_ALICE_CAROL_ID,
      tenantId: ACME_TENANT_ID,
      templateId: WEEKLY_TEMPLATE_ID,
      sessionNumber: 3,
      scheduledAt: inFiveDays,
      status: 'scheduled' as const,
    },
  ];

  for (const s of aliceSessions) {
    await db
      .insert(schema.sessions)
      .values(s)
      .onConflictDoUpdate({
        target: schema.sessions.id,
        set: {
          sessionNumber: sql`excluded.session_number`,
          scheduledAt: sql`excluded.scheduled_at`,
          startedAt: sql`excluded.started_at`,
          completedAt: sql`excluded.completed_at`,
          status: sql`excluded.status`,
          sharedNotes: sql`excluded.shared_notes`,
          durationMinutes: sql`excluded.duration_minutes`,
          sessionScore: sql`excluded.session_score`,
          aiSummary: sql`excluded.ai_summary`,
          aiManagerAddendum: sql`excluded.ai_manager_addendum`,
          aiStatus: sql`excluded.ai_status`,
          aiAssessmentScore: sql`excluded.ai_assessment_score`,
          updatedAt: sql`now()`,
        },
      });
  }

  // --- Action items for Alice's sessions ---
  const aliceActions = [
    {
      id: ACTION_ALICE_1_ID,
      sessionId: SESSION_ALICE_BOB_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: BOB_ID,
      createdById: ALICE_ID,
      title: 'Prepare new hire onboarding checklist',
      description: 'Create detailed onboarding plan for the senior engineer starting next month.',
      category: 'check_in',
      dueDate: inFiveDays.toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_ALICE_2_ID,
      sessionId: SESSION_ALICE_BOB_3_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Discuss workload reduction plan with Bob',
      description: 'Review current sprint commitments and identify tasks to delegate to Dave.',
      category: 'wellbeing',
      dueDate: inTwoDays.toISOString().split('T')[0],
      status: 'in_progress' as const,
    },
    {
      id: ACTION_ALICE_3_ID,
      sessionId: SESSION_ALICE_CAROL_1_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: CAROL_ID,
      createdById: ALICE_ID,
      title: 'Draft quarterly research sprint proposal',
      description: 'Formalize the research sprint format with budget and timeline.',
      category: 'performance',
      dueDate: lastWeek.toISOString().split('T')[0],
      status: 'completed' as const,
      completedAt: threeDaysAgo,
    },
    {
      id: ACTION_ALICE_4_ID,
      sessionId: SESSION_ALICE_CAROL_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: CAROL_ID,
      createdById: ALICE_ID,
      title: 'Review Q4 scope and capacity plan',
      description: 'Assess whether current team size can handle Q4 feature scope.',
      category: 'performance',
      dueDate: inTwoDays.toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_ALICE_OVERDUE_ID,
      sessionId: SESSION_ALICE_BOB_1_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: BOB_ID,
      createdById: ALICE_ID,
      title: 'Accelerate senior engineer hiring pipeline',
      description: 'Follow up with recruiting on the two stalled senior engineer requisitions.',
      category: 'check_in',
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open' as const,
    },
    // Actions assigned TO Alice
    {
      id: ACTION_ALICE_OWN_1_ID,
      sessionId: SESSION_ALICE_BOB_3_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Schedule skip-level meetings with Dave and Eve',
      description: 'Set up monthly skip-level 1:1s to get direct signal from Bob team members.',
      category: 'check_in',
      dueDate: inFiveDays.toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_ALICE_OWN_2_ID,
      sessionId: SESSION_ALICE_CAROL_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Present research program ROI to executive team',
      description: 'Prepare deck showing impact of Carol research sprints on product decisions.',
      category: 'performance',
      dueDate: inTwoDays.toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_ALICE_OWN_3_ID,
      sessionId: SESSION_ALICE_BOB_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Review Bob conference talk abstract',
      description: 'Provide feedback on the conference submission before deadline.',
      category: 'performance',
      dueDate: lastWeek.toISOString().split('T')[0],
      status: 'completed' as const,
      completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    // Overdue actions assigned to Alice
    {
      id: ACTION_ALICE_OWN_OVERDUE_1_ID,
      sessionId: SESSION_ALICE_BOB_1_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Finalize engineering headcount plan for Q4',
      description: 'Budget approval needed — finance waiting on headcount numbers from engineering leadership.',
      category: 'performance',
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_ALICE_OWN_OVERDUE_2_ID,
      sessionId: SESSION_ALICE_CAROL_1_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Share PM career ladder with Carol',
      description: 'Carol asked about Senior PM path. Need to share the updated career framework document.',
      category: 'check_in',
      dueDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open' as const,
    },
    {
      id: ACTION_ALICE_OWN_OVERDUE_3_ID,
      sessionId: SESSION_ALICE_BOB_2_ID,
      tenantId: ACME_TENANT_ID,
      assigneeId: ALICE_ID,
      createdById: ALICE_ID,
      title: 'Set up mentoring program coordinator intro for Bob',
      description: 'Bob wants to join the cross-team mentoring program. Needs intro to program coordinator.',
      category: 'check_in',
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'open' as const,
    },
  ];

  for (const a of aliceActions) {
    await db
      .insert(schema.actionItems)
      .values(a)
      .onConflictDoUpdate({
        target: schema.actionItems.id,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          dueDate: sql`excluded.due_date`,
          status: sql`excluded.status`,
          completedAt: sql`excluded.completed_at`,
        },
      });
  }

  // --- Also add AI summaries to existing Bob<->Dave sessions ---
  const existingSessionAI = [
    {
      id: SESSION_1_ID,
      aiSummary: {
        cardBlurb: 'Good first session. Dave settling in well and eager to contribute.',
        keyTakeaways: ['Dave adapting quickly to codebase', 'Needs staging access', 'Sprint priorities aligned'],
        discussionHighlights: [{ category: 'Check In', summary: 'First 1:1. Dave positive about team culture and project scope.' }],
        followUpItems: ['Set up staging access', 'Pair Dave with senior on first feature'],
        overallSentiment: 'positive' as const,
      },
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_2_ID,
      aiSummary: {
        cardBlurb: 'API refactor progressing well. Dave raised valid concerns about test coverage gaps.',
        keyTakeaways: ['API refactor on track', 'Test coverage needs improvement', 'Dave showing initiative'],
        discussionHighlights: [{ category: 'Performance', summary: 'Good progress on API refactor. Dave identified critical test gaps proactively.' }],
        followUpItems: ['Review test coverage strategy', 'Set up CI parallelization'],
        overallSentiment: 'positive' as const,
      },
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_3_ID,
      aiSummary: {
        cardBlurb: 'Career growth discussion. Dave interested in tech lead path and feature ownership.',
        keyTakeaways: ['Dave wants tech lead growth path', 'Feature project leadership interest', 'Strong technical foundation'],
        discussionHighlights: [{ category: 'Check In', summary: 'Dave expressed desire to lead next feature project. Discussed tech lead expectations.' }],
        followUpItems: ['Share tech lead expectations doc', 'Identify feature for Dave to lead'],
        overallSentiment: 'positive' as const,
      },
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_EVE_1_ID,
      aiSummary: {
        cardBlurb: 'Eve ramping up on frontend. Good foundation but needs more component library experience.',
        keyTakeaways: ['Frontend ramp-up progressing', 'Component library guidance needed', 'Positive attitude'],
        discussionHighlights: [{ category: 'Performance', summary: 'Eve making steady progress on frontend work. Discussed component library patterns.' }],
        followUpItems: ['Share component library docs', 'Pair Eve with senior frontend dev'],
        overallSentiment: 'positive' as const,
      },
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
    {
      id: SESSION_EVE_2_ID,
      aiSummary: {
        cardBlurb: 'Dashboard redesign going well. Eve keen on accessibility testing — strong growth signal.',
        keyTakeaways: ['Dashboard redesign on schedule', 'Accessibility interest — growth area', 'Increasing confidence'],
        discussionHighlights: [{ category: 'Performance', summary: 'Great progress on dashboard. Eve proactively exploring accessibility testing.' }],
        followUpItems: ['Set up accessibility testing tools', 'Review dashboard with design team'],
        overallSentiment: 'positive' as const,
      },
      aiStatus: 'completed' as const,
      aiAssessmentScore: 4,
    },
  ];

  for (const s of existingSessionAI) {
    await db
      .execute(sql`
        UPDATE session
        SET ai_summary = ${JSON.stringify(s.aiSummary)}::jsonb,
            ai_status = ${s.aiStatus},
            ai_assessment_score = ${s.aiAssessmentScore},
            updated_at = now()
        WHERE id = ${s.id}
      `);
  }
}

async function seed() {
  console.log('Seeding database...\n');

  await seedTenants();
  await seedUsers();
  await seedTemplates();
  await seedMeetingSeries();
  await seedSessions();
  await seedAnswers();
  await seedAnswerHistory();
  await seedAnalyticsSnapshots();
  await seedActionItems();
  await seedPrivateNotes();
  await seedNotifications();
  await seedTechvibe();
  await seedAliceData();

  console.log('\nSeed complete!');
  console.log(`  Acme Corp      (${ACME_TENANT_ID}): 7 users, 2 templates, 4 series, 9 sessions`);
  console.log(`  Beta Inc       (${BETA_TENANT_ID}): 3 users, 1 template, 1 series, 0 sessions`);
  console.log(`  Techvibe SRL   (${TV_TENANT_ID}): 7 users, 2 templates, 5 series, 15 sessions`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
