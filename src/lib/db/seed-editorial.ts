/**
 * Editorial seed extension script.
 *
 * Adds rich, realistic data to the Acme Corp tenant for editorial/demo purposes.
 * Creates 13 new users, 13 meeting series with 6-10 sessions each,
 * full session answers, AI summaries, action items, talking points, and analytics.
 *
 * Designed to run AFTER the base seed (additive, not destructive).
 * Uses @neondatabase/serverless neon() driver for Neon serverless DB.
 * Idempotent: uses deterministic UUIDs and ON CONFLICT DO NOTHING / DO UPDATE.
 *
 * Usage: bun run db:seed:editorial
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_oqJWk4PKr1tD@ep-damp-grass-alr4b5y0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

// =============================================================================
// Constants
// =============================================================================

const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_PASSWORD_HASH = '$2b$10$IoZkuZQFUmBdtHHesZzXmuxYhVLSQIFFaVQaUCFhOtJxZx0dv5bre';
const STRUCTURED_TEMPLATE_ID = 'dddddddd-0004-4000-a000-000000000004';

// Existing user IDs (from base seed)
const ALICE_ID = 'aaaaaaaa-0001-4000-a000-000000000001';

// Question IDs from the Structured 1on1 template (from base seed)
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

// =============================================================================
// New user IDs
// =============================================================================

const CIPRIAN_ID = 'aaaaaaaa-0020-4000-a000-000000000020';
const AUREL_ID = 'aaaaaaaa-0021-4000-a000-000000000021';
const EMILIA_ID = 'aaaaaaaa-0022-4000-a000-000000000022';

// Ciprian's reports
const MARIA_T_ID = 'aaaaaaaa-0023-4000-a000-000000000023';
const ANDREI_P_ID = 'aaaaaaaa-0024-4000-a000-000000000024';
const ELENA_V_ID = 'aaaaaaaa-0025-4000-a000-000000000025';
const RADU_D_ID = 'aaaaaaaa-0026-4000-a000-000000000026';
const DIANA_N_ID = 'aaaaaaaa-0027-4000-a000-000000000027';

// Aurel's reports
const MIHAI_I_ID = 'aaaaaaaa-0028-4000-a000-000000000028';
const IOANA_S_ID = 'aaaaaaaa-0029-4000-a000-000000000029';
const DAN_M_ID = 'aaaaaaaa-0030-4000-a000-000000000030';
const CRISTINA_B_ID = 'aaaaaaaa-0031-4000-a000-000000000031';

// Emilia's reports
const ALEX_R_ID = 'aaaaaaaa-0032-4000-a000-000000000032';
const LAURA_G_ID = 'aaaaaaaa-0033-4000-a000-000000000033';
const VLAD_M_ID = 'aaaaaaaa-0034-4000-a000-000000000034';
const ANA_C_ID = 'aaaaaaaa-0035-4000-a000-000000000035';

// Deactivated user
const ADELA_G_ID = 'aaaaaaaa-0036-4000-a000-000000000036';

// Pending invites
const STEFAN_L_ID = 'aaaaaaaa-0037-4000-a000-000000000037';
const OANA_P_ID = 'aaaaaaaa-0038-4000-a000-000000000038';

// =============================================================================
// Meeting Series IDs (one per manager-report pair)
// =============================================================================

// Ciprian's series
const SERIES_CIP_MARIA_ID = 'ffffffff-0020-4000-a000-000000000020';
const SERIES_CIP_ANDREI_ID = 'ffffffff-0021-4000-a000-000000000021';
const SERIES_CIP_ELENA_ID = 'ffffffff-0022-4000-a000-000000000022';
const SERIES_CIP_RADU_ID = 'ffffffff-0023-4000-a000-000000000023';
const SERIES_CIP_DIANA_ID = 'ffffffff-0024-4000-a000-000000000024';

// Aurel's series
const SERIES_AUR_MIHAI_ID = 'ffffffff-0025-4000-a000-000000000025';
const SERIES_AUR_IOANA_ID = 'ffffffff-0026-4000-a000-000000000026';
const SERIES_AUR_DAN_ID = 'ffffffff-0027-4000-a000-000000000027';
const SERIES_AUR_CRISTINA_ID = 'ffffffff-0028-4000-a000-000000000028';

// Emilia's series
const SERIES_EMI_ALEX_ID = 'ffffffff-0029-4000-a000-000000000029';
const SERIES_EMI_LAURA_ID = 'ffffffff-0030-4000-a000-000000000030';
const SERIES_EMI_VLAD_ID = 'ffffffff-0031-4000-a000-000000000031';
const SERIES_EMI_ANA_ID = 'ffffffff-0032-4000-a000-000000000032';

// =============================================================================
// Helper functions
// =============================================================================

/** Generate a date N days ago from now */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** ISO string for a date */
function iso(d: Date): string {
  return d.toISOString();
}

/** Generate a deterministic UUID for sessions: series prefix + session number */
function sessionId(seriesIdx: number, sessionNum: number): string {
  const s = seriesIdx.toString().padStart(4, '0');
  const n = sessionNum.toString().padStart(4, '0');
  return `99990000-${s}-4000-9000-00000000${n}`;
}

/** Generate a deterministic UUID for answers */
function answerId(seriesIdx: number, sessionNum: number, questionIdx: number): string {
  const s = seriesIdx.toString().padStart(4, '0');
  const n = sessionNum.toString().padStart(2, '0');
  const q = questionIdx.toString().padStart(2, '0');
  return `66660000-${s}-4000-8000-000000${n}${q}00`;
}

/** Generate a deterministic UUID for action items */
function actionId(idx: number): string {
  const i = idx.toString().padStart(4, '0');
  return `88880000-${i}-4000-8000-000000000000`;
}

/** Generate a deterministic UUID for talking points */
function talkingPointId(idx: number): string {
  const i = idx.toString().padStart(4, '0');
  return `77770000-${i}-4000-a000-000000000000`;
}

/** Generate a deterministic UUID for analytics snapshots */
function snapshotId(idx: number): string {
  const i = idx.toString().padStart(4, '0');
  return `55550000-${i}-4000-a000-000000000000`;
}

/** Clamp a number to a range */
function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Round to 1 decimal place */
function r1(val: number): number {
  return Math.round(val * 10) / 10;
}

// =============================================================================
// Score trajectories for each series (maps series index to score pattern)
// Each pattern is an array of session scores over time
// =============================================================================

interface SeriesConfig {
  seriesId: string;
  managerId: string;
  reportId: string;
  reportName: string;
  managerName: string;
  sessionCount: number;
  scores: number[];
  trajectory: 'improving' | 'declining' | 'stable' | 'volatile';
  status: 'active' | 'paused' | 'active'; // series status
  lastSessionStatus?: 'in_progress' | 'completed';
  overdue?: boolean;
  seriesIdx: number;
}

const SERIES_CONFIGS: SeriesConfig[] = [
  // Ciprian's reports (5)
  {
    seriesId: SERIES_CIP_MARIA_ID, managerId: CIPRIAN_ID, reportId: MARIA_T_ID,
    reportName: 'Maria Turcan', managerName: 'Ciprian Dobrea',
    sessionCount: 8, scores: [2.8, 3.0, 3.2, 3.5, 3.7, 3.9, 4.0, 4.2],
    trajectory: 'improving', status: 'active', seriesIdx: 1,
  },
  {
    seriesId: SERIES_CIP_ANDREI_ID, managerId: CIPRIAN_ID, reportId: ANDREI_P_ID,
    reportName: 'Andrei Popa', managerName: 'Ciprian Dobrea',
    sessionCount: 7, scores: [4.5, 4.3, 4.0, 3.8, 3.5, 3.3, 3.1],
    trajectory: 'declining', status: 'active', seriesIdx: 2,
    lastSessionStatus: 'in_progress',
  },
  {
    seriesId: SERIES_CIP_ELENA_ID, managerId: CIPRIAN_ID, reportId: ELENA_V_ID,
    reportName: 'Elena Voinea', managerName: 'Ciprian Dobrea',
    sessionCount: 9, scores: [3.7, 3.8, 3.9, 3.8, 3.7, 3.9, 4.0, 3.8, 3.9],
    trajectory: 'stable', status: 'active', seriesIdx: 3,
  },
  {
    seriesId: SERIES_CIP_RADU_ID, managerId: CIPRIAN_ID, reportId: RADU_D_ID,
    reportName: 'Radu Dumitru', managerName: 'Ciprian Dobrea',
    sessionCount: 6, scores: [3.2, 4.0, 2.8, 3.9, 3.0, 4.1],
    trajectory: 'volatile', status: 'active', overdue: true, seriesIdx: 4,
  },
  {
    seriesId: SERIES_CIP_DIANA_ID, managerId: CIPRIAN_ID, reportId: DIANA_N_ID,
    reportName: 'Diana Neagu', managerName: 'Ciprian Dobrea',
    sessionCount: 7, scores: [3.0, 3.3, 3.5, 3.8, 4.0, 4.1, 4.3],
    trajectory: 'improving', status: 'active', seriesIdx: 5,
  },

  // Aurel's reports (4)
  {
    seriesId: SERIES_AUR_MIHAI_ID, managerId: AUREL_ID, reportId: MIHAI_I_ID,
    reportName: 'Mihai Ionescu', managerName: 'Aurel Filip',
    sessionCount: 8, scores: [3.8, 3.9, 3.7, 3.8, 4.0, 3.9, 3.8, 4.0],
    trajectory: 'stable', status: 'active', seriesIdx: 6,
  },
  {
    seriesId: SERIES_AUR_IOANA_ID, managerId: AUREL_ID, reportId: IOANA_S_ID,
    reportName: 'Ioana Stanescu', managerName: 'Aurel Filip',
    sessionCount: 7, scores: [2.5, 2.8, 3.0, 3.3, 3.5, 3.8, 4.0],
    trajectory: 'improving', status: 'active', overdue: true, seriesIdx: 7,
  },
  {
    seriesId: SERIES_AUR_DAN_ID, managerId: AUREL_ID, reportId: DAN_M_ID,
    reportName: 'Dan Marin', managerName: 'Aurel Filip',
    sessionCount: 6, scores: [4.2, 4.0, 3.8, 3.5, 3.2, 3.0],
    trajectory: 'declining', status: 'active', lastSessionStatus: 'in_progress', seriesIdx: 8,
  },
  {
    seriesId: SERIES_AUR_CRISTINA_ID, managerId: AUREL_ID, reportId: CRISTINA_B_ID,
    reportName: 'Cristina Barbu', managerName: 'Aurel Filip',
    sessionCount: 8, scores: [3.5, 3.6, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3],
    trajectory: 'improving', status: 'active', seriesIdx: 9,
  },

  // Emilia's reports (4)
  {
    seriesId: SERIES_EMI_ALEX_ID, managerId: EMILIA_ID, reportId: ALEX_R_ID,
    reportName: 'Alex Rusu', managerName: 'Emilia Mintean',
    sessionCount: 7, scores: [3.9, 3.8, 3.7, 3.5, 3.3, 3.1, 2.9],
    trajectory: 'declining', status: 'active', overdue: true, seriesIdx: 10,
  },
  {
    seriesId: SERIES_EMI_LAURA_ID, managerId: EMILIA_ID, reportId: LAURA_G_ID,
    reportName: 'Laura Gheorghe', managerName: 'Emilia Mintean',
    sessionCount: 9, scores: [3.5, 3.6, 3.8, 3.7, 3.9, 4.0, 4.1, 4.2, 4.3],
    trajectory: 'improving', status: 'active', seriesIdx: 11,
  },
  {
    seriesId: SERIES_EMI_VLAD_ID, managerId: EMILIA_ID, reportId: VLAD_M_ID,
    reportName: 'Vlad Moldovan', managerName: 'Emilia Mintean',
    sessionCount: 5, scores: [3.8, 3.9, 3.7, 3.8, 3.9],
    trajectory: 'stable', status: 'paused', seriesIdx: 12,
  },
  {
    seriesId: SERIES_EMI_ANA_ID, managerId: EMILIA_ID, reportId: ANA_C_ID,
    reportName: 'Ana Costin', managerName: 'Emilia Mintean',
    sessionCount: 10, scores: [2.5, 2.9, 3.2, 3.5, 3.8, 4.0, 4.1, 4.2, 4.4, 4.5],
    trajectory: 'improving', status: 'active', seriesIdx: 13,
  },
];

// =============================================================================
// AI Summary generation
// =============================================================================

interface AISummary {
  cardBlurb: string;
  overallSentiment: 'positive' | 'neutral' | 'mixed' | 'concerning';
  keyTakeaways: string[];
  discussionHighlights: { category: string; summary: string }[];
  followUpItems: string[];
}

function generateAISummary(
  reportName: string,
  score: number,
  sessionNum: number,
  trajectory: string,
): AISummary {
  const firstName = reportName.split(' ')[0];

  if (score >= 4.0) {
    return pickPositiveSummary(firstName, score, sessionNum, trajectory);
  } else if (score >= 3.3) {
    return pickMixedSummary(firstName, score, sessionNum, trajectory);
  } else {
    return pickConcerningSummary(firstName, score, sessionNum, trajectory);
  }
}

function pickPositiveSummary(name: string, score: number, sessionNum: number, trajectory: string): AISummary {
  const variants = [
    {
      cardBlurb: `${name} is thriving — high energy, clear progress on Q1 goals, and strong team collaboration. No blockers reported.`,
      keyTakeaways: [
        'Exceeding sprint commitments consistently',
        'Proactively mentoring junior team members',
        'Strong alignment with team objectives',
      ],
      discussionHighlights: [
        { category: 'Energy & Motivation', summary: `${name} reports feeling energized and motivated. The recent project launch has boosted morale significantly.` },
        { category: 'Progress', summary: 'All three OKRs are on track or ahead of schedule. The API migration is 80% complete.' },
        { category: 'Collaboration', summary: 'Cross-team work with the design team has been particularly effective this sprint.' },
      ],
      followUpItems: ['Discuss promotion timeline in next session', `Share ${name}'s mentoring approach with broader team`],
    },
    {
      cardBlurb: `Strong session — ${name} shows consistent growth and has taken ownership of the new feature rollout with excellent results.`,
      keyTakeaways: [
        'Feature rollout completed ahead of schedule',
        'Positive feedback from stakeholders',
        'Growing leadership capabilities',
      ],
      discussionHighlights: [
        { category: 'Follow-up', summary: 'All action items from the previous session have been completed. The documentation update was particularly well-received.' },
        { category: 'Progress', summary: `${name} delivered the feature two days early and handled QA feedback proactively.` },
        { category: 'Learning', summary: 'Completed the advanced TypeScript course and is applying new patterns in production code.' },
      ],
      followUpItems: ['Explore tech lead responsibilities', 'Schedule knowledge-sharing session for the team'],
    },
    {
      cardBlurb: `${name} continues to perform at a high level — engaged, productive, and eager to take on stretch assignments.`,
      keyTakeaways: [
        'Consistently exceeds expectations',
        'Excellent communication with stakeholders',
        'Ready for increased scope of responsibility',
      ],
      discussionHighlights: [
        { category: 'Energy & Motivation', summary: `${name} is energized by the new project direction. Work-life balance is healthy.` },
        { category: 'Collaboration', summary: 'Has become a go-to person for cross-functional questions. The product team specifically praised their input.' },
        { category: 'Capacity', summary: 'Current workload is manageable and there is appetite for additional challenges.' },
      ],
      followUpItems: ['Assign stretch goal for next quarter', 'Discuss conference speaking opportunity'],
    },
  ];
  return { ...variants[sessionNum % variants.length], overallSentiment: 'positive' };
}

function pickMixedSummary(name: string, score: number, sessionNum: number, trajectory: string): AISummary {
  const variants = [
    {
      cardBlurb: `${name} is making progress but flagged concerns about workload distribution. Energy levels are moderate — worth monitoring.`,
      keyTakeaways: [
        'Progress on main objectives is steady',
        'Workload concerns need addressing',
        'Collaboration could be improved with platform team',
      ],
      discussionHighlights: [
        { category: 'Energy & Motivation', summary: `${name} reports moderate energy. The recent deadline pressure has been manageable but sustained effort is taking a toll.` },
        { category: 'Blockers', summary: 'Dependency on the platform team for API access is causing delays. A direct channel would help.' },
        { category: 'Progress', summary: 'Two of three objectives are on track. The third (performance optimization) needs more dedicated focus time.' },
      ],
      followUpItems: ['Address workload balance with team', 'Set up direct communication channel with platform team', 'Block focus time for performance work'],
    },
    {
      cardBlurb: `Productive discussion with ${name}. Some wins to celebrate but the team restructuring is creating uncertainty.`,
      keyTakeaways: [
        'Successfully shipped the notification system',
        'Team restructuring causing some anxiety',
        'Needs more clarity on career growth path',
      ],
      discussionHighlights: [
        { category: 'Follow-up', summary: 'The code review process improvement was implemented and is working well. Other items are still in progress.' },
        { category: 'Energy & Motivation', summary: `${name} is somewhat anxious about the upcoming team changes. Reassurance about their role would be valuable.` },
        { category: 'Learning', summary: 'Interested in learning more about system design but unsure where to start.' },
      ],
      followUpItems: ['Clarify impact of restructuring on team', 'Share system design learning resources', 'Revisit career development plan'],
    },
    {
      cardBlurb: `${name} showed good self-awareness in this session. Acknowledged areas for improvement while highlighting genuine progress on key deliverables.`,
      keyTakeaways: [
        'Self-awareness is a strong suit',
        'Meeting cadence feels productive',
        'Needs support with stakeholder management',
      ],
      discussionHighlights: [
        { category: 'Progress', summary: `The dashboard redesign is on schedule. ${name} took ownership of the design review process.` },
        { category: 'Collaboration', summary: 'Working well within the team but finding it challenging to push back on scope creep from stakeholders.' },
        { category: 'Capacity', summary: 'Workload is at the upper limit. No buffer for unexpected tasks.' },
      ],
      followUpItems: ['Practice stakeholder pushback scenarios', 'Review scope management strategies', 'Consider delegating some tasks'],
    },
  ];
  return { ...variants[sessionNum % variants.length], overallSentiment: 'mixed' };
}

function pickConcerningSummary(name: string, score: number, sessionNum: number, trajectory: string): AISummary {
  const variants = [
    {
      cardBlurb: `${name} is struggling with multiple blockers and declining energy. Immediate attention needed on workload and support structures.`,
      keyTakeaways: [
        'Multiple blockers remain unresolved',
        'Energy and motivation are low',
        'Risk of burnout if not addressed promptly',
      ],
      discussionHighlights: [
        { category: 'Energy & Motivation', summary: `${name} reports feeling exhausted. Weekend work has become frequent and unsustainable.` },
        { category: 'Blockers', summary: 'Three critical blockers identified: tooling issues, unclear requirements, and delayed code reviews from other teams.' },
        { category: 'Capacity', summary: 'Currently overcommitted. Needs at least two tasks reassigned or deprioritized to restore a sustainable pace.' },
      ],
      followUpItems: ['Urgently redistribute workload', 'Escalate tooling issues to infrastructure team', 'Schedule check-in in 3 days instead of 2 weeks'],
    },
    {
      cardBlurb: `Concerning session — ${name} expressed frustration with lack of direction and feels disconnected from team goals. Follow-up required.`,
      keyTakeaways: [
        'Feels disconnected from team vision',
        'Role clarity is needed',
        'Progress has stalled on primary objectives',
      ],
      discussionHighlights: [
        { category: 'Follow-up', summary: 'Most action items from the previous session remain incomplete. The underlying issues have not been addressed.' },
        { category: 'Progress', summary: `${name} admits progress has stalled. Unclear priorities are the main contributor.` },
        { category: 'Collaboration', summary: 'Communication with the team has decreased. Feels out of the loop on important decisions.' },
      ],
      followUpItems: ['Clarify priorities and expectations in writing', 'Include in team planning sessions', 'Consider whether role adjustment is needed'],
    },
    {
      cardBlurb: `${name} had a difficult session. Personal challenges combined with project setbacks have significantly impacted performance.`,
      keyTakeaways: [
        'Personal circumstances affecting work',
        'Needs temporary workload reduction',
        'Support and empathy are critical right now',
      ],
      discussionHighlights: [
        { category: 'Energy & Motivation', summary: `${name} is going through a difficult period personally. They are doing their best to maintain output but it is visibly affecting their energy.` },
        { category: 'Blockers', summary: 'The main blocker is capacity — not technical. Needs a lighter load for the next 2-3 weeks.' },
        { category: 'Learning', summary: 'Learning has taken a back seat. This is understandable given the circumstances but should resume when things stabilize.' },
      ],
      followUpItems: ['Reduce workload for next sprint', 'Offer flexibility on deadlines', 'Check in more frequently but keep meetings shorter'],
    },
  ];
  return { ...variants[sessionNum % variants.length], overallSentiment: 'concerning' };
}

// =============================================================================
// Answer text generators (realistic, varied)
// =============================================================================

const RESOLVE_COMMENTS = [
  'The last session action items are mostly done. Still need to finish the documentation update.',
  'All follow-ups completed. The process change we discussed is working well.',
  'I addressed the code review feedback and the PR is now merged.',
  'Most items done except the meeting with the design team — scheduling has been tricky.',
  'Everything from last time is resolved. Good momentum this sprint.',
  'Partially completed — the infrastructure request is still pending approval.',
  'All done. The stakeholder presentation went well.',
  'Need more time on the research task. Everything else is wrapped up.',
  'Completed the refactoring work. Tests are passing. Documentation PR is out.',
  'Still working through the migration — it is more complex than expected.',
];

const ENERGY_COMMENTS = [
  'Feeling good overall. The new project is exciting and keeps me motivated.',
  'A bit tired from the sprint push, but looking forward to the retrospective.',
  'Energy is high — the team dynamic has been really positive lately.',
  'Moderate energy. Could use a lighter week after the release.',
  'Really energized by the customer feedback on our latest feature.',
  'Lower energy this week — some personal stuff going on.',
  'Good energy. The pair programming sessions have been revitalizing.',
  'Feeling the pressure from multiple deadlines but managing okay.',
  'Great week. The conference talk went well and I got good feedback.',
  'Somewhat drained. The on-call rotation was rough this time.',
];

const PROGRESS_COMMENTS = [
  'On track with the quarterly goals. The API redesign is 70% done.',
  'Ahead of schedule on the dashboard project. Testing starts next week.',
  'Slightly behind on the documentation goal but catching up.',
  'Strong progress on the performance improvements — 40% latency reduction so far.',
  'The migration is complete. Now focusing on the monitoring setup.',
  'Good progress on the design system components. Three out of five done.',
  'Hit a roadblock with the authentication flow but found a workaround.',
  'All sprint items completed. Picked up a stretch goal from the backlog.',
  'The integration tests are 90% coverage now. Aiming for 95% by month end.',
  'Making steady progress. The proof of concept was well-received by leadership.',
];

const BLOCKERS_MAIN = [
  'No significant blockers this week.',
  'Waiting on the infrastructure team for the staging environment setup.',
  'The dependency update broke some tests — need help debugging.',
  'No blockers. The team has been very responsive.',
  'Unclear requirements for the export feature — need product clarification.',
  'The CI pipeline has been flaky, slowing down deployments.',
  'Access to the production monitoring dashboard is still pending.',
  'No real blockers, just some minor tooling friction.',
  'Cross-team coordination on the shared library update is slow.',
  'The legacy codebase makes changes harder than they should be.',
];

const COLLAB_COMMENTS = [
  'Collaboration has been smooth. The async standup format is working well for us.',
  'Great sync with the product team this sprint. Requirements were crisp.',
  'Could use more direct access to the design team for quick feedback loops.',
  'Working well with the QA team on the test automation project.',
  'Had a productive architecture discussion with the senior engineers.',
  'The cross-team retro surfaced some useful improvements.',
  'Communication with remote team members has improved since we started the daily sync.',
  'Need better alignment with the data team on shared APIs.',
  'Pairing sessions with the new joiner have been productive for both of us.',
  'The Slack channel organization helps a lot with async decisions.',
];

const CAPACITY_COMMENTS = [
  'Capacity is good. Current workload feels sustainable.',
  'At full capacity but not overloaded. Good balance.',
  'Slightly overcommitted this sprint — two concurrent projects is tight.',
  'Have some bandwidth for stretch goals if priorities hold.',
  'Feeling stretched thin with on-call plus project work.',
  'Manageable workload. Could take on a small side task.',
  'At the limit. Please do not add anything new this sprint.',
  'Good capacity. The time blocking strategy is really helping.',
  'Workload is lighter this week which is a welcome change.',
  'Need to offload one task to stay sustainable — the scope increased unexpectedly.',
];

const LEARNED_WHATS = [
  'Learned about connection pooling best practices in PostgreSQL — changed how we configure our prod setup.',
  'Took a workshop on effective code reviews. Will share takeaways at the next team meeting.',
  'Discovered a new testing pattern for async operations that is much cleaner than our current approach.',
  'Read about event-driven architecture. Thinking about applying some ideas to our notification system.',
  'Learned how to use the profiler effectively. Found two memory leaks.',
  'Attended a session on inclusive design — very relevant for our accessibility goals.',
  'Deep dive into TypeScript generics. Applied them to simplify our form validation library.',
  'Explored the new React Server Components patterns. Exciting potential for our dashboard.',
  'Learned about conflict resolution in technical discussions. Very practical.',
  'Studied the CAP theorem in depth. Helps frame some of our distributed system decisions.',
];

const EXPLORE_TOPICS = [
  'Interested in exploring GraphQL for our public API. Would love to do a spike.',
  'Want to learn more about system design at scale. Any book recommendations?',
  'Thinking about trying test-driven development more seriously. Need a pairing partner.',
  'Curious about the observability stack. Would like to shadow the SRE team for a day.',
  'Want to explore machine learning basics — could be useful for our recommendation engine.',
  'Interested in contributing to open source as a way to grow.',
  'Would like to attend a conference this year. Any budget available?',
  'Exploring Rust for performance-critical paths. Early research phase.',
  'Want to improve my technical writing. Considering starting a blog.',
  'Interested in the platform engineering role. Would like to understand what it involves.',
];

// =============================================================================
// Seed functions
// =============================================================================

interface SeedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  level: string;
  jobTitle: string;
  teamName?: string;
  managerId: string | null;
  isActive: boolean;
  isPending?: boolean;
}

async function seedUsers() {
  console.log('  Seeding editorial users...');

  const users: SeedUser[] = [
    // Managers (insert first due to FK constraints)
    {
      id: CIPRIAN_ID, email: 'ciprian@acme.example.com',
      firstName: 'Ciprian', lastName: 'Dobrea',
      level: 'admin', jobTitle: 'CEO', teamName: 'Ciprian', managerId: null, isActive: true,
    },
    {
      id: AUREL_ID, email: 'aurel@acme.example.com',
      firstName: 'Aurel', lastName: 'Filip',
      level: 'manager', jobTitle: 'Tech Lead', teamName: 'Aurel', managerId: CIPRIAN_ID, isActive: true,
    },
    {
      id: EMILIA_ID, email: 'emilia@acme.example.com',
      firstName: 'Emilia', lastName: 'Mintean',
      level: 'manager', jobTitle: 'People & Culture Lead', teamName: 'Emilia', managerId: CIPRIAN_ID, isActive: true,
    },
    // Ciprian's reports
    {
      id: MARIA_T_ID, email: 'maria.turcan@acme.example.com',
      firstName: 'Maria', lastName: 'Turcan',
      level: 'member', jobTitle: 'Content Strategist', managerId: CIPRIAN_ID, isActive: true,
    },
    {
      id: ANDREI_P_ID, email: 'andrei.popa@acme.example.com',
      firstName: 'Andrei', lastName: 'Popa',
      level: 'member', jobTitle: 'Senior Editor', managerId: CIPRIAN_ID, isActive: true,
    },
    {
      id: ELENA_V_ID, email: 'elena.voinea@acme.example.com',
      firstName: 'Elena', lastName: 'Voinea',
      level: 'member', jobTitle: 'Editorial Manager', managerId: CIPRIAN_ID, isActive: true,
    },
    {
      id: RADU_D_ID, email: 'radu.dumitru@acme.example.com',
      firstName: 'Radu', lastName: 'Dumitru',
      level: 'member', jobTitle: 'Content Writer', managerId: CIPRIAN_ID, isActive: true,
    },
    {
      id: DIANA_N_ID, email: 'diana.neagu@acme.example.com',
      firstName: 'Diana', lastName: 'Neagu',
      level: 'member', jobTitle: 'Copy Editor', managerId: CIPRIAN_ID, isActive: true,
    },
    // Aurel's reports
    {
      id: MIHAI_I_ID, email: 'mihai.ionescu@acme.example.com',
      firstName: 'Mihai', lastName: 'Ionescu',
      level: 'member', jobTitle: 'Senior Software Engineer', managerId: AUREL_ID, isActive: true,
    },
    {
      id: IOANA_S_ID, email: 'ioana.stanescu@acme.example.com',
      firstName: 'Ioana', lastName: 'Stanescu',
      level: 'member', jobTitle: 'Software Engineer', managerId: AUREL_ID, isActive: true,
    },
    {
      id: DAN_M_ID, email: 'dan.marin@acme.example.com',
      firstName: 'Dan', lastName: 'Marin',
      level: 'member', jobTitle: 'Backend Engineer', managerId: AUREL_ID, isActive: true,
    },
    {
      id: CRISTINA_B_ID, email: 'cristina.barbu@acme.example.com',
      firstName: 'Cristina', lastName: 'Barbu',
      level: 'member', jobTitle: 'Frontend Engineer', managerId: AUREL_ID, isActive: true,
    },
    // Emilia's reports
    {
      id: ALEX_R_ID, email: 'alex.rusu@acme.example.com',
      firstName: 'Alex', lastName: 'Rusu',
      level: 'member', jobTitle: 'HR Specialist', managerId: EMILIA_ID, isActive: true,
    },
    {
      id: LAURA_G_ID, email: 'laura.gheorghe@acme.example.com',
      firstName: 'Laura', lastName: 'Gheorghe',
      level: 'member', jobTitle: 'Talent Acquisition', managerId: EMILIA_ID, isActive: true,
    },
    {
      id: VLAD_M_ID, email: 'vlad.moldovan@acme.example.com',
      firstName: 'Vlad', lastName: 'Moldovan',
      level: 'member', jobTitle: 'People Operations', managerId: EMILIA_ID, isActive: true,
    },
    {
      id: ANA_C_ID, email: 'ana.costin@acme.example.com',
      firstName: 'Ana', lastName: 'Costin',
      level: 'member', jobTitle: 'Learning & Development', managerId: EMILIA_ID, isActive: true,
    },
    // Deactivated user
    {
      id: ADELA_G_ID, email: 'adela.gherman@acme.example.com',
      firstName: 'Adela', lastName: 'Gherman',
      level: 'member', jobTitle: 'Former HR Coordinator', managerId: EMILIA_ID, isActive: false,
    },
    // Pending invites (no password hash, invitedAt set)
    {
      id: STEFAN_L_ID, email: 'stefan.lungu@acme.example.com',
      firstName: 'Stefan', lastName: 'Lungu',
      level: 'member', jobTitle: 'DevOps Engineer', managerId: AUREL_ID, isActive: true,
      isPending: true,
    },
    {
      id: OANA_P_ID, email: 'oana.petrescu@acme.example.com',
      firstName: 'Oana', lastName: 'Petrescu',
      level: 'member', jobTitle: 'Office Manager', managerId: EMILIA_ID, isActive: true,
      isPending: true,
    },
  ];

  for (const u of users) {
    const isPending = u.isPending;
    await sql`
      INSERT INTO "user" (id, tenant_id, email, first_name, last_name, level, job_title, team_name, password_hash, manager_id, is_active, invited_at, notification_preferences, language)
      VALUES (
        ${u.id}, ${ACME_TENANT_ID}, ${u.email}, ${u.firstName}, ${u.lastName},
        ${u.level}, ${u.jobTitle}, ${u.teamName ?? null},
        ${isPending ? null : TEST_PASSWORD_HASH},
        ${u.managerId},
        ${u.isActive},
        ${isPending ? new Date().toISOString() : null},
        '{}',
        'en'
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        level = EXCLUDED.level,
        job_title = EXCLUDED.job_title,
        team_name = EXCLUDED.team_name,
        password_hash = EXCLUDED.password_hash,
        manager_id = EXCLUDED.manager_id,
        is_active = EXCLUDED.is_active,
        updated_at = now()
    `;
  }
}

async function seedSeriesAndSessions() {
  console.log('  Seeding meeting series and sessions...');

  const actionIdx = 1;
  let talkingPointIdx = 1;
  let snapshotIdx = 1;

  for (const cfg of SERIES_CONFIGS) {
    // Compute dates for sessions (biweekly, going backwards from today)
    const totalCompleted = cfg.lastSessionStatus === 'in_progress'
      ? cfg.sessionCount - 1
      : cfg.sessionCount;

    // First session was ~4 months ago
    const firstSessionDaysAgo = (cfg.sessionCount - 1) * 14 + 7;
    const sessionDates: Date[] = [];
    for (let i = 0; i < cfg.sessionCount; i++) {
      sessionDates.push(daysAgo(firstSessionDaysAgo - i * 14));
    }

    // Next session date
    const lastDate = sessionDates[sessionDates.length - 1];
    const nextSessionDate = new Date(lastDate);
    nextSessionDate.setDate(nextSessionDate.getDate() + 14);

    // If overdue, set next_session_at to be in the past
    const nextSessionAt = cfg.overdue
      ? daysAgo(3) // 3 days overdue
      : nextSessionDate;

    // Insert meeting series
    await sql`
      INSERT INTO meeting_series (
        id, tenant_id, manager_id, report_id, cadence, default_duration_minutes,
        default_template_id, preferred_day, preferred_time, status,
        reminder_hours_before, next_session_at
      )
      VALUES (
        ${cfg.seriesId}, ${ACME_TENANT_ID}, ${cfg.managerId}, ${cfg.reportId},
        'biweekly', 30, ${STRUCTURED_TEMPLATE_ID}, 'wed', '10:00:00',
        ${cfg.status}, 24, ${iso(nextSessionAt)}
      )
      ON CONFLICT (id) DO UPDATE SET
        manager_id = EXCLUDED.manager_id,
        report_id = EXCLUDED.report_id,
        status = EXCLUDED.status,
        next_session_at = EXCLUDED.next_session_at,
        updated_at = now()
    `;

    // Insert sessions
    for (let i = 0; i < cfg.sessionCount; i++) {
      const sId = sessionId(cfg.seriesIdx, i + 1);
      const scheduledAt = sessionDates[i];
      const isLast = i === cfg.sessionCount - 1;
      const isInProgress = isLast && cfg.lastSessionStatus === 'in_progress';
      const score = cfg.scores[i];

      let status: string;
      let startedAt: string | null = null;
      let completedAt: string | null = null;
      let durationMinutes: number | null = null;

      if (isInProgress) {
        status = 'in_progress';
        startedAt = iso(scheduledAt);
      } else {
        status = 'completed';
        startedAt = iso(scheduledAt);
        const completedDate = new Date(scheduledAt);
        completedDate.setMinutes(completedDate.getMinutes() + 25 + Math.floor((i * 7) % 20));
        completedAt = iso(completedDate);
        durationMinutes = 25 + Math.floor((i * 7) % 20);
      }

      // AI summary (only for completed sessions)
      const aiSummary = status === 'completed'
        ? generateAISummary(cfg.reportName, score, i, cfg.trajectory)
        : null;

      // AI assessment score (1-100 scale, derived from session score)
      const aiAssessmentScore = status === 'completed'
        ? Math.round(score * 20)
        : null;

      await sql`
        INSERT INTO session (
          id, series_id, tenant_id, template_id, session_number,
          scheduled_at, started_at, completed_at, status,
          duration_minutes, session_score, ai_summary, ai_assessment_score,
          ai_status, ai_completed_at
        )
        VALUES (
          ${sId}, ${cfg.seriesId}, ${ACME_TENANT_ID}, ${STRUCTURED_TEMPLATE_ID},
          ${i + 1}, ${iso(scheduledAt)}, ${startedAt}, ${completedAt},
          ${status}, ${durationMinutes}, ${score.toFixed(2)},
          ${aiSummary ? JSON.stringify(aiSummary) : null}::jsonb,
          ${aiAssessmentScore},
          ${status === 'completed' ? 'completed' : 'pending'},
          ${completedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          session_score = EXCLUDED.session_score,
          ai_summary = EXCLUDED.ai_summary,
          ai_assessment_score = EXCLUDED.ai_assessment_score,
          ai_status = EXCLUDED.ai_status,
          updated_at = now()
      `;

      // Insert session answers (only for completed and in_progress sessions)
      if (status === 'completed' || status === 'in_progress') {
        await seedSessionAnswers(sId, cfg.reportId, score, i, cfg.seriesIdx);
      }

      // Analytics snapshots for completed sessions
      if (status === 'completed') {
        const periodStart = scheduledAt.toISOString().split('T')[0];
        const periodEnd = new Date(scheduledAt.getTime() + 14 * 86400000).toISOString().split('T')[0];

        // Session score snapshot
        await sql`
          INSERT INTO analytics_snapshot (
            id, tenant_id, user_id, series_id, period_type,
            period_start, period_end, metric_name, metric_value, sample_count
          )
          VALUES (
            ${snapshotId(snapshotIdx++)}, ${ACME_TENANT_ID}, ${cfg.reportId},
            ${cfg.seriesId}, 'week', ${periodStart}, ${periodEnd},
            'session_score', ${score.toFixed(3)}, 1
          )
          ON CONFLICT (id) DO UPDATE SET
            metric_value = EXCLUDED.metric_value,
            computed_at = now()
        `;

        // Category score snapshots
        const categories = ['energy', 'progress', 'blockers', 'collaboration', 'capacity', 'resolve'];
        for (const cat of categories) {
          const catScore = score + (Math.sin(i + categories.indexOf(cat)) * 0.3);
          await sql`
            INSERT INTO analytics_snapshot (
              id, tenant_id, user_id, series_id, period_type,
              period_start, period_end, metric_name, metric_value, sample_count
            )
            VALUES (
              ${snapshotId(snapshotIdx++)}, ${ACME_TENANT_ID}, ${cfg.reportId},
              ${cfg.seriesId}, 'week', ${periodStart}, ${periodEnd},
              ${`category_${cat}`}, ${r1(clamp(catScore, 1, 5)).toFixed(3)}, 1
            )
            ON CONFLICT (id) DO UPDATE SET
              metric_value = EXCLUDED.metric_value,
              computed_at = now()
          `;
        }
      }
    }

    // Talking points for latest session of active series
    if (cfg.status === 'active') {
      const latestSessionId = sessionId(cfg.seriesIdx, cfg.sessionCount);
      const talkingPointTexts = pickTalkingPoints(cfg.reportName, cfg.trajectory);
      for (let t = 0; t < talkingPointTexts.length; t++) {
        await sql`
          INSERT INTO talking_point (
            id, session_id, author_id, content, sort_order, is_discussed
          )
          VALUES (
            ${talkingPointId(talkingPointIdx++)}, ${latestSessionId},
            ${cfg.managerId}, ${talkingPointTexts[t]}, ${t}, false
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
  }

  // Action items — spread across sessions from various series
  console.log('  Seeding action items...');
  await seedActionItems();
}

function pickTalkingPoints(reportName: string, trajectory: string): string[] {
  const firstName = reportName.split(' ')[0];
  const allPoints: Record<string, string[]> = {
    improving: [
      `Discuss ${firstName}'s readiness for increased responsibilities`,
      'Review quarterly OKR progress and adjust targets',
      'Talk about conference attendance and professional development budget',
      'Explore mentoring opportunities within the team',
    ],
    declining: [
      `Check in on ${firstName}'s workload and identify tasks to deprioritize`,
      'Review support structures and whether they are effective',
      'Discuss blockers preventing progress on key objectives',
      `Understand ${firstName}'s perspective on recent team changes`,
      'Explore whether role adjustment might help',
    ],
    stable: [
      `Discuss growth opportunities for ${firstName}`,
      'Review collaboration patterns and any friction points',
      'Talk about learning goals for the quarter',
    ],
    volatile: [
      `Understand what drives ${firstName}'s performance variability`,
      'Discuss consistency strategies and support needed',
      'Review workload distribution and sustainability',
      'Identify early warning signs of challenging periods',
    ],
  };

  const points = allPoints[trajectory] || allPoints.stable;
  // Return 2-5 points
  return points.slice(0, 2 + Math.floor(Math.random() * Math.min(3, points.length - 1)));
}

async function seedSessionAnswers(
  sId: string,
  reportId: string,
  score: number,
  sessionIdx: number,
  seriesIdx: number,
) {
  // Generate score answers (rating_1_5) based on the overall session score with some variance
  const scoreQuestions = [
    { qId: Q_S11_RESOLVE_SCORE_ID, qIdx: 1 },
    { qId: Q_S11_ENERGY_SCORE_ID, qIdx: 2 },
    { qId: Q_S11_PROGRESS_SCORE_ID, qIdx: 3 },
    { qId: Q_S11_BLOCKERS_SCORE_ID, qIdx: 4 },
    { qId: Q_S11_COLLAB_SCORE_ID, qIdx: 5 },
    { qId: Q_S11_CAPACITY_SCORE_ID, qIdx: 6 },
  ];

  for (const sq of scoreQuestions) {
    const variance = Math.sin(sessionIdx * 3 + sq.qIdx * 7 + seriesIdx) * 0.5;
    const answerScore = clamp(Math.round(score + variance), 1, 5);
    const aId = answerId(seriesIdx, sessionIdx, sq.qIdx);

    await sql`
      INSERT INTO session_answer (
        id, session_id, question_id, respondent_id,
        answer_numeric, answered_at
      )
      VALUES (
        ${aId}, ${sId}, ${sq.qId}, ${reportId},
        ${answerScore.toFixed(2)}, now()
      )
      ON CONFLICT (session_id, question_id) DO UPDATE SET
        answer_numeric = EXCLUDED.answer_numeric
    `;
  }

  // Text answers
  const textQuestions = [
    { qId: Q_S11_RESOLVE_COMMENT_ID, pool: RESOLVE_COMMENTS, qIdx: 7 },
    { qId: Q_S11_ENERGY_COMMENT_ID, pool: ENERGY_COMMENTS, qIdx: 8 },
    { qId: Q_S11_PROGRESS_COMMENT_ID, pool: PROGRESS_COMMENTS, qIdx: 9 },
    { qId: Q_S11_BLOCKERS_MAIN_ID, pool: BLOCKERS_MAIN, qIdx: 10 },
    { qId: Q_S11_COLLAB_COMMENT_ID, pool: COLLAB_COMMENTS, qIdx: 11 },
    { qId: Q_S11_CAPACITY_COMMENT_ID, pool: CAPACITY_COMMENTS, qIdx: 12 },
  ];

  for (const tq of textQuestions) {
    const textIdx = (sessionIdx + seriesIdx + tq.qIdx) % tq.pool.length;
    const aId = answerId(seriesIdx, sessionIdx, tq.qIdx);

    await sql`
      INSERT INTO session_answer (
        id, session_id, question_id, respondent_id,
        answer_text, answered_at
      )
      VALUES (
        ${aId}, ${sId}, ${tq.qId}, ${reportId},
        ${tq.pool[textIdx]}, now()
      )
      ON CONFLICT (session_id, question_id) DO UPDATE SET
        answer_text = EXCLUDED.answer_text
    `;
  }

  // Blockers help — yes_no answer
  const blockersHelpIdx = (sessionIdx + seriesIdx) % 2;
  const blockersHelpVal = blockersHelpIdx === 0 ? 'yes' : 'no';
  await sql`
    INSERT INTO session_answer (
      id, session_id, question_id, respondent_id,
      answer_json, answered_at
    )
    VALUES (
      ${answerId(seriesIdx, sessionIdx, 13)}, ${sId}, ${Q_S11_BLOCKERS_HELP_ID}, ${reportId},
      ${JSON.stringify({ value: blockersHelpVal })}::jsonb, now()
    )
    ON CONFLICT (session_id, question_id) DO UPDATE SET
      answer_json = EXCLUDED.answer_json
  `;

  // Learned yes/no
  const learnedYes = score >= 3.5 || sessionIdx % 3 !== 0;
  await sql`
    INSERT INTO session_answer (
      id, session_id, question_id, respondent_id,
      answer_json, answered_at
    )
    VALUES (
      ${answerId(seriesIdx, sessionIdx, 14)}, ${sId}, ${Q_S11_LEARNED_YN_ID}, ${reportId},
      ${JSON.stringify({ value: learnedYes ? 'yes' : 'no' })}::jsonb, now()
    )
    ON CONFLICT (session_id, question_id) DO UPDATE SET
      answer_json = EXCLUDED.answer_json
  `;

  // Learned what (conditional on yes)
  if (learnedYes) {
    const learnedIdx = (sessionIdx + seriesIdx) % LEARNED_WHATS.length;
    await sql`
      INSERT INTO session_answer (
        id, session_id, question_id, respondent_id,
        answer_text, answered_at
      )
      VALUES (
        ${answerId(seriesIdx, sessionIdx, 15)}, ${sId}, ${Q_S11_LEARNED_WHAT_ID}, ${reportId},
        ${LEARNED_WHATS[learnedIdx]}, now()
      )
      ON CONFLICT (session_id, question_id) DO UPDATE SET
        answer_text = EXCLUDED.answer_text
    `;
  }

  // Explore topic
  const exploreIdx = (sessionIdx + seriesIdx * 2) % EXPLORE_TOPICS.length;
  await sql`
    INSERT INTO session_answer (
      id, session_id, question_id, respondent_id,
      answer_text, answered_at
    )
    VALUES (
      ${answerId(seriesIdx, sessionIdx, 16)}, ${sId}, ${Q_S11_EXPLORE_ID}, ${reportId},
      ${EXPLORE_TOPICS[exploreIdx]}, now()
    )
    ON CONFLICT (session_id, question_id) DO UPDATE SET
      answer_text = EXCLUDED.answer_text
  `;
}

async function seedActionItems() {
  const items: {
    id: string;
    sessionId: string;
    tenantId: string;
    assigneeId: string;
    createdById: string;
    title: string;
    description: string | null;
    category: string | null;
    dueDate: string | null;
    status: string;
    completedAt: string | null;
  }[] = [];

  let idx = 1;

  // Open action items (15)
  const openItems = [
    { title: 'Complete Q1 OKRs draft', desc: 'Draft individual OKRs aligned with team goals for Q1', cat: 'goals', series: 0, assignee: 'report', dueDays: 7 },
    { title: 'Schedule team retrospective', desc: 'Set up a 90-min retro for the engineering team', cat: 'collaboration', series: 1, assignee: 'manager', dueDays: 14 },
    { title: 'Prepare board presentation slides', desc: null, cat: 'deliverables', series: 2, assignee: 'report', dueDays: 10 },
    { title: 'Review and update onboarding docs', desc: 'The current onboarding guide is outdated — update for new hires', cat: 'documentation', series: 3, assignee: 'report', dueDays: 21 },
    { title: 'Set up monitoring dashboard', desc: 'Create Grafana dashboard for the new microservice', cat: 'technical', series: 5, assignee: 'report', dueDays: 7 },
    { title: 'Write post-mortem for incident #42', desc: null, cat: 'process', series: 6, assignee: 'report', dueDays: 5 },
    { title: 'Evaluate CI/CD pipeline options', desc: 'Compare GitHub Actions vs CircleCI for our use case', cat: 'technical', series: 7, assignee: 'report', dueDays: 14 },
    { title: 'Conduct skip-level meeting with Laura', desc: null, cat: 'people', series: 9, assignee: 'manager', dueDays: 10 },
    { title: 'Create L&D budget proposal', desc: 'Budget proposal for Q2 learning and development activities', cat: 'people', series: 10, assignee: 'report', dueDays: 14 },
    { title: 'Organize team offsite logistics', desc: null, cat: 'people', series: 11, assignee: 'report', dueDays: 21 },
    { title: 'Update the content style guide', desc: 'Add sections on voice, tone, and inclusive language', cat: 'documentation', series: 0, assignee: 'report', dueDays: 14 },
    { title: 'Research competitor onboarding flows', desc: null, cat: 'research', series: 4, assignee: 'report', dueDays: 10 },
    { title: 'Implement feature flag system', desc: 'Evaluate and implement feature flags for gradual rollouts', cat: 'technical', series: 8, assignee: 'report', dueDays: 21 },
    { title: 'Draft internal newsletter', desc: 'Monthly engineering newsletter for the company', cat: 'communication', series: 2, assignee: 'report', dueDays: 7 },
    { title: 'Coordinate with design on component library', desc: null, cat: 'collaboration', series: 5, assignee: 'manager', dueDays: 14 },
  ];

  for (const item of openItems) {
    const cfg = SERIES_CONFIGS[item.series];
    const latestSessionIdx = cfg.sessionCount;
    const sId = sessionId(cfg.seriesIdx, latestSessionIdx);
    const assigneeId = item.assignee === 'manager' ? cfg.managerId : cfg.reportId;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + item.dueDays);

    items.push({
      id: actionId(idx++),
      sessionId: sId,
      tenantId: ACME_TENANT_ID,
      assigneeId,
      createdById: cfg.managerId,
      title: item.title,
      description: item.desc,
      category: item.cat,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'open',
      completedAt: null,
    });
  }

  // Completed action items (8)
  const completedItems = [
    { title: 'Migrate database to Neon', series: 5, assignee: 'report', completedDaysAgo: 5 },
    { title: 'Setup Sentry error tracking', series: 6, assignee: 'report', completedDaysAgo: 12 },
    { title: 'Write API documentation for v2 endpoints', series: 7, assignee: 'report', completedDaysAgo: 3 },
    { title: 'Conduct user interview batch (5 users)', series: 10, assignee: 'report', completedDaysAgo: 8 },
    { title: 'Finalize hiring criteria for senior role', series: 9, assignee: 'manager', completedDaysAgo: 14 },
    { title: 'Publish revised content calendar', series: 0, assignee: 'report', completedDaysAgo: 7 },
    { title: 'Complete security audit checklist', series: 8, assignee: 'report', completedDaysAgo: 10 },
    { title: 'Deliver Q4 performance review summaries', series: 11, assignee: 'manager', completedDaysAgo: 20 },
  ];

  for (const item of completedItems) {
    const cfg = SERIES_CONFIGS[item.series];
    const sIdx = Math.max(1, cfg.sessionCount - 2);
    const sId = sessionId(cfg.seriesIdx, sIdx);
    const assigneeId = item.assignee === 'manager' ? cfg.managerId : cfg.reportId;
    const completedDate = daysAgo(item.completedDaysAgo);

    items.push({
      id: actionId(idx++),
      sessionId: sId,
      tenantId: ACME_TENANT_ID,
      assigneeId,
      createdById: cfg.managerId,
      title: item.title,
      description: null,
      category: null,
      dueDate: daysAgo(item.completedDaysAgo + 7).toISOString().split('T')[0],
      status: 'completed',
      completedAt: iso(completedDate),
    });
  }

  // Overdue action items (4) — open with due date in the past
  const overdueItems = [
    { title: 'Submit expense reports for January', series: 3, assignee: 'report', overdueDays: 10 },
    { title: 'Update team wiki with new architecture decisions', series: 5, assignee: 'report', overdueDays: 5 },
    { title: 'Complete mandatory compliance training', series: 9, assignee: 'report', overdueDays: 14 },
    { title: 'Share feedback on new performance review template', series: 12, assignee: 'report', overdueDays: 7 },
  ];

  for (const item of overdueItems) {
    const cfg = SERIES_CONFIGS[item.series];
    const sIdx = Math.max(1, cfg.sessionCount - 1);
    const sId = sessionId(cfg.seriesIdx, sIdx);

    items.push({
      id: actionId(idx++),
      sessionId: sId,
      tenantId: ACME_TENANT_ID,
      assigneeId: cfg.reportId,
      createdById: cfg.managerId,
      title: item.title,
      description: null,
      category: null,
      dueDate: daysAgo(item.overdueDays).toISOString().split('T')[0],
      status: 'open',
      completedAt: null,
    });
  }

  // In-progress action items (5)
  const inProgressItems = [
    { title: 'Refactor authentication middleware', series: 5, assignee: 'report', dueDays: 3 },
    { title: 'Design new employee survey questions', series: 10, assignee: 'report', dueDays: 7 },
    { title: 'Build analytics export feature', series: 8, assignee: 'report', dueDays: 5 },
    { title: 'Write blog post about team culture', series: 2, assignee: 'report', dueDays: 10 },
    { title: 'Prepare training materials for new process', series: 12, assignee: 'manager', dueDays: 14 },
  ];

  for (const item of inProgressItems) {
    const cfg = SERIES_CONFIGS[item.series];
    const sId = sessionId(cfg.seriesIdx, cfg.sessionCount);
    const assigneeId = item.assignee === 'manager' ? cfg.managerId : cfg.reportId;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + item.dueDays);

    items.push({
      id: actionId(idx++),
      sessionId: sId,
      tenantId: ACME_TENANT_ID,
      assigneeId,
      createdById: cfg.managerId,
      title: item.title,
      description: null,
      category: null,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'in_progress',
      completedAt: null,
    });
  }

  // Insert all action items
  for (const item of items) {
    await sql`
      INSERT INTO action_item (
        id, session_id, tenant_id, assignee_id, created_by_id,
        title, description, category, due_date, status, completed_at
      )
      VALUES (
        ${item.id}, ${item.sessionId}, ${item.tenantId},
        ${item.assigneeId}, ${item.createdById},
        ${item.title}, ${item.description}, ${item.category},
        ${item.dueDate}, ${item.status}, ${item.completedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        due_date = EXCLUDED.due_date,
        completed_at = EXCLUDED.completed_at,
        updated_at = now()
    `;
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('=== Editorial Seed Extension ===');
  console.log(`Target: Acme Corp (${ACME_TENANT_ID})`);
  console.log('');

  try {
    await seedUsers();
    await seedSeriesAndSessions();

    console.log('');
    console.log('=== Editorial seed complete ===');
    console.log('Summary:');
    console.log('  - 19 users (13 active + 1 deactivated + 2 pending invites + 3 managers)');
    console.log('  - 13 meeting series');
    console.log('  - ~97 sessions with answers, AI summaries, and analytics');
    console.log('  - 32 action items (15 open, 8 completed, 4 overdue, 5 in-progress)');
    console.log('  - ~30 talking points');
  } catch (error) {
    console.error('Editorial seed failed:', error);
    process.exit(1);
  }
}

main();
