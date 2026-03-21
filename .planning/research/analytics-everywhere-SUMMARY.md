# Research Summary: Analytics Everywhere -- Contextual Data Surfacing

**Domain:** Embedded contextual analytics for 1:1 meeting management SaaS
**Researched:** 2026-03-21
**Overall confidence:** HIGH

## Executive Summary

The "Analytics Everywhere" vision is well-supported by industry trends. Modern HR platforms (15Five, Lattice, Culture Amp) and best-in-class SaaS products (Linear, Stripe) all surface analytics contextually rather than isolating them on report pages. The key pattern: one hero metric per context, progressively disclosed to deeper detail on click.

The 1on1 platform already has strong analytics infrastructure (pre-computed snapshots, sparklines, AI summaries, sentiment analysis). The gap is surfacing breadth -- deep insights require navigating to `/analytics/*` pages. The highest-ROI improvements are: score delta badges on series cards (zero new queries), "last time" session recap in the wizard context panel (data already exists in `ai_summary`), attention-needed cards on the manager dashboard (simple comparison query), and a personal analytics view for the report role (biggest underserved surface).

AI-generated narrative insights are cost-effective ($3-5/month for a typical company) but should always be pre-generated and cached -- never block page loads with LLM calls. Most contextual insights should use template sentences with interpolated data, reserving AI for synthesis tasks (recaps, growth narratives).

## Key Findings

**Stack:** No new libraries needed. Recharts (existing) handles all new chart types. New components are presentational (badges, cards, arrows).
**Architecture:** Extend the existing `analytics_snapshot` job with anomaly detection flags. Add a family of `InsightCard` components under `src/components/insights/`.
**Critical pitfall:** Alert fatigue. Cap attention cards at 2 per dashboard, use amber (not red), make dismissable with cooldown.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Quick Wins** (1-2 sprints) - Score delta badges, "last time" recap, overdue indicators, member profile view
   - Addresses: Founder's "data visible always" with zero new infrastructure
   - Avoids: Over-engineering by reusing data already fetched

2. **Dashboard Intelligence** (2-3 sprints) - Attention cards, cadence health, sentence insights, velocity KPI
   - Addresses: Manager decision-support, the core differentiator
   - Avoids: Alert fatigue via strict max-2 card limit and severity gating

3. **Team & Profile Views** (2-3 sprints) - Heatmap promotion, report self-service analytics, inline wizard nudges
   - Addresses: Biggest gap (report role sees no analytics)
   - Avoids: Privacy violations by following existing access matrix

4. **Advanced Patterns** (2-3 sprints) - Anomaly detection, AI weekly insights, focus areas, streaks
   - Addresses: Automated intelligence layer
   - Avoids: AI cost surprises by caching all narratives

**Phase ordering rationale:**
- Phase 1 uses data already available in existing queries (zero new DB work)
- Phase 2 requires new queries but simple aggregations (comparison, counting)
- Phase 3 requires new pages and routes but uses existing chart components
- Phase 4 involves AI pipeline extensions and snapshot job modifications

**Research flags for phases:**
- Phase 2: Attention card UX needs user testing to validate severity thresholds
- Phase 4: AI generation frequency and caching strategy needs monitoring for cost
- All phases: Accessibility audit needed after implementation (screen reader testing)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies. All within existing Recharts + shadcn/ui. |
| Features | HIGH | Surface-by-surface recommendations grounded in competitive analysis + codebase review. |
| Architecture | HIGH | Extends existing patterns (Server Components + query functions + presentational components). |
| Pitfalls | HIGH | Alert fatigue and mobile adaptation are well-documented in UX research. |
| AI Cost | MEDIUM | Cost estimates based on current Anthropic pricing, subject to change. |

## Gaps to Address

- User testing for attention card severity thresholds (what delta feels "significant" to managers?)
- Mobile gesture patterns for mini-charts (swipe behavior not validated)
- Performance impact of additional queries on dashboard page load (benchmark needed after Phase 2)
- Privacy implications of surfacing more data to reports (verify with access matrix for each new surface)
