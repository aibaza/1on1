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

// Acme Teams
const ENGINEERING_TEAM_ID = 'cccccccc-0001-4000-c000-000000000001';
const PRODUCT_TEAM_ID = 'cccccccc-0002-4000-c000-000000000002';

// Acme Templates
const WEEKLY_TEMPLATE_ID = 'dddddddd-0001-4000-d000-000000000001';
const CAREER_TEMPLATE_ID = 'dddddddd-0002-4000-d000-000000000002';

// Beta Template
const BETA_TEMPLATE_ID = 'dddddddd-0003-4000-d000-000000000003';

// Acme Template Sections (Weekly Check-in)
const SEC_WEEKLY_WELLBEING_ID = 'aaaabbbb-0001-4000-ab00-000000000001';
const SEC_WEEKLY_PERFORMANCE_ID = 'aaaabbbb-0002-4000-ab00-000000000002';
const SEC_WEEKLY_CHECKIN_ID = 'aaaabbbb-0003-4000-ab00-000000000003';

// Acme Template Sections (Career Development)
const SEC_CAREER_GOALS_ID = 'aaaabbbb-0004-4000-ab00-000000000004';
const SEC_CAREER_FEEDBACK_ID = 'aaaabbbb-0005-4000-ab00-000000000005';

// Beta Template Sections
const SEC_BETA_CHECKIN_ID = 'aaaabbbb-0006-4000-ab00-000000000006';

// Acme Labels
const LABEL_CHECKIN_ID = 'aabbccee-0001-4000-ab00-000000000001';
const LABEL_CAREER_ID = 'aabbccee-0002-4000-ab00-000000000002';

// Acme Template Questions (Weekly Check-in)
const Q_MOOD_ID = 'eeeeeeee-0001-4000-e000-000000000001';
const Q_WORKLOAD_ID = 'eeeeeeee-0002-4000-e000-000000000002';
const Q_BLOCKERS_ID = 'eeeeeeee-0003-4000-e000-000000000003';
const Q_HELP_ID = 'eeeeeeee-0004-4000-e000-000000000004';
const Q_SATISFACTION_ID = 'eeeeeeee-0005-4000-e000-000000000005';

// Acme Template Questions (Career Development)
const Q_CAREER_GOALS_ID = 'eeeeeeee-0006-4000-e000-000000000006';
const Q_GROWTH_ID = 'eeeeeeee-0007-4000-e000-000000000007';
const Q_LEARNING_ID = 'eeeeeeee-0008-4000-e000-000000000008';
const Q_FEEDBACK_ID = 'eeeeeeee-0009-4000-e000-000000000009';

// Beta Template Questions
const Q_BETA_MOOD_ID = 'eeeeeeee-0010-4000-e000-000000000010';

// Acme Meeting Series
const SERIES_BOB_DAVE_ID = 'ffffffff-0001-4000-f000-000000000001';
const SERIES_BOB_EVE_ID = 'ffffffff-0002-4000-f000-000000000002';
const SERIES_CAROL_FRANK_ID = 'ffffffff-0003-4000-f000-000000000003';

// Beta Meeting Series
const SERIES_YURI_XENA_ID = 'ffffffff-0004-4000-f000-000000000004';

// Acme Sessions (Bob <-> Dave)
const SESSION_1_ID = '99999999-0001-4000-9000-000000000001';
const SESSION_2_ID = '99999999-0002-4000-9000-000000000002';
const SESSION_3_ID = '99999999-0003-4000-9000-000000000003';

// Acme Action Items
const ACTION_OPEN_1_ID = '88888888-0001-4000-8000-000000000001';
const ACTION_OPEN_2_ID = '88888888-0002-4000-8000-000000000002';
const ACTION_DONE_ID = '88888888-0003-4000-8000-000000000003';

// Acme Private Note
const PRIVATE_NOTE_ID = '77777777-0001-4000-7000-000000000001';

// Session Answers
const ANSWER_S1_MOOD_ID = '66666666-0001-4000-6000-000000000001';
const ANSWER_S1_WORKLOAD_ID = '66666666-0002-4000-6000-000000000002';
const ANSWER_S1_BLOCKERS_ID = '66666666-0003-4000-6000-000000000003';
const ANSWER_S1_HELP_ID = '66666666-0004-4000-6000-000000000004';
const ANSWER_S1_SATISFACTION_ID = '66666666-0005-4000-6000-000000000005';
const ANSWER_S2_MOOD_ID = '66666666-0006-4000-6000-000000000006';
const ANSWER_S2_WORKLOAD_ID = '66666666-0007-4000-6000-000000000007';
const ANSWER_S2_BLOCKERS_ID = '66666666-0008-4000-6000-000000000008';
const ANSWER_S2_HELP_ID = '66666666-0009-4000-6000-000000000009';
const ANSWER_S2_SATISFACTION_ID = '66666666-0010-4000-6000-000000000010';
const ANSWER_S3_MOOD_ID = '66666666-0011-4000-6000-000000000011';
const ANSWER_S3_WORKLOAD_ID = '66666666-0012-4000-6000-000000000012';
const ANSWER_S3_BLOCKERS_ID = '66666666-0013-4000-6000-000000000013';
const ANSWER_S3_HELP_ID = '66666666-0014-4000-6000-000000000014';
const ANSWER_S3_SATISFACTION_ID = '66666666-0015-4000-6000-000000000015';

// Team member junction table IDs
const TM_BOB_ENG_ID = 'aabbccdd-0001-4000-ab00-000000000001';
const TM_DAVE_ENG_ID = 'aabbccdd-0002-4000-ab00-000000000002';
const TM_EVE_ENG_ID = 'aabbccdd-0003-4000-ab00-000000000003';
const TM_CAROL_PROD_ID = 'aabbccdd-0004-4000-ab00-000000000004';
const TM_FRANK_PROD_ID = 'aabbccdd-0005-4000-ab00-000000000005';
const TM_GRACE_PROD_ID = 'aabbccdd-0006-4000-ab00-000000000006';

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
      role: 'admin' as const,
      jobTitle: 'VP of Engineering',
      passwordHash: TEST_PASSWORD_HASH,
      isActive: true,
    },
    {
      id: BOB_ID,
      tenantId: ACME_TENANT_ID,
      email: 'bob@acme.example.com',
      firstName: 'Bob',
      lastName: 'Smith',
      role: 'manager' as const,
      jobTitle: 'Engineering Manager',
      passwordHash: TEST_PASSWORD_HASH,
      isActive: true,
    },
    {
      id: CAROL_ID,
      tenantId: ACME_TENANT_ID,
      email: 'carol@acme.example.com',
      firstName: 'Carol',
      lastName: 'Williams',
      role: 'manager' as const,
      jobTitle: 'Product Manager',
      isActive: true,
    },
    {
      id: DAVE_ID,
      tenantId: ACME_TENANT_ID,
      email: 'dave@acme.example.com',
      firstName: 'Dave',
      lastName: 'Brown',
      role: 'member' as const,
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
      role: 'member' as const,
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
      role: 'member' as const,
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
      role: 'member' as const,
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
      role: 'admin' as const,
      jobTitle: 'CEO',
      isActive: true,
    },
    {
      id: YURI_ID,
      tenantId: BETA_TENANT_ID,
      email: 'yuri@beta.example.com',
      firstName: 'Yuri',
      lastName: 'Manager',
      role: 'manager' as const,
      jobTitle: 'Team Lead',
      isActive: true,
    },
    {
      id: XENA_ID,
      tenantId: BETA_TENANT_ID,
      email: 'xena@beta.example.com',
      firstName: 'Xena',
      lastName: 'Member',
      role: 'member' as const,
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
          role: sql`excluded.role`,
          jobTitle: sql`excluded.job_title`,
          passwordHash: sql`excluded.password_hash`,
          managerId: sql`excluded.manager_id`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }
}

async function seedTeams() {
  console.log('  Seeding teams...');
  await db
    .insert(schema.teams)
    .values([
      {
        id: ENGINEERING_TEAM_ID,
        tenantId: ACME_TENANT_ID,
        name: 'Engineering',
        description: 'Backend and frontend engineering team',
        managerId: BOB_ID,
      },
      {
        id: PRODUCT_TEAM_ID,
        tenantId: ACME_TENANT_ID,
        name: 'Product',
        description: 'Product design and research team',
        managerId: CAROL_ID,
      },
    ])
    .onConflictDoUpdate({
      target: schema.teams.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        managerId: sql`excluded.manager_id`,
        updatedAt: sql`now()`,
      },
    });

  // Team members
  const teamMembers = [
    { id: TM_BOB_ENG_ID, teamId: ENGINEERING_TEAM_ID, userId: BOB_ID, role: 'lead' as const },
    { id: TM_DAVE_ENG_ID, teamId: ENGINEERING_TEAM_ID, userId: DAVE_ID, role: 'member' as const },
    { id: TM_EVE_ENG_ID, teamId: ENGINEERING_TEAM_ID, userId: EVE_ID, role: 'member' as const },
    { id: TM_CAROL_PROD_ID, teamId: PRODUCT_TEAM_ID, userId: CAROL_ID, role: 'lead' as const },
    { id: TM_FRANK_PROD_ID, teamId: PRODUCT_TEAM_ID, userId: FRANK_ID, role: 'member' as const },
    { id: TM_GRACE_PROD_ID, teamId: PRODUCT_TEAM_ID, userId: GRACE_ID, role: 'member' as const },
  ];

  for (const member of teamMembers) {
    await db
      .insert(schema.teamMembers)
      .values(member)
      .onConflictDoUpdate({
        target: schema.teamMembers.id,
        set: {
          teamId: sql`excluded.team_id`,
          userId: sql`excluded.user_id`,
          role: sql`excluded.role`,
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

  // Acme Labels
  console.log('  Seeding labels...');
  await db
    .insert(schema.templateLabels)
    .values([
      { id: LABEL_CHECKIN_ID, tenantId: ACME_TENANT_ID, name: 'Check-in', color: '#3b82f6' },
      { id: LABEL_CAREER_ID, tenantId: ACME_TENANT_ID, name: 'Career', color: '#8b5cf6' },
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

  for (const q of [...weeklyQuestions, ...careerQuestions, ...betaQuestions]) {
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
      sessionScore: '7.50',
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
      sessionScore: '8.00',
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
      sessionScore: '8.50',
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

// =============================================================================
// Main
// =============================================================================

async function seed() {
  console.log('Seeding database...\n');

  await seedTenants();
  await seedUsers();
  await seedTeams();
  await seedTemplates();
  await seedMeetingSeries();
  await seedSessions();
  await seedAnswers();
  await seedActionItems();
  await seedPrivateNotes();

  console.log('\nSeed complete!');
  console.log(`  Acme Corp (${ACME_TENANT_ID}): 7 users, 2 teams, 2 templates, 3 series, 3 sessions`);
  console.log(`  Beta Inc  (${BETA_TENANT_ID}): 3 users, 0 teams, 1 template, 1 series, 0 sessions`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
