# Sprint 15 — Polish & Launch Prep

**Duration**: 2 weeks
**Dependencies**: All previous sprints (01-14)

## Goals

Final polish pass: responsive design, dark mode, accessibility audit, security hardening (headers, rate limiting, CSP), end-to-end testing of critical flows, performance optimization, and production deployment preparation.

## Deliverables

1. **Responsive design**:
   - Desktop (>1200px): full sidebar + main content + context panel
   - Tablet (768-1200px): collapsible sidebar, context panel as bottom sheet/tab
   - Mobile (<768px): bottom navigation bar, full-screen wizard with swipeable steps
2. **Dark mode**:
   - Tailwind `dark:` variants on all components
   - System detection as default, localStorage preference override
   - Theme toggle in user menu
   - Company branding primary color adapts to both themes
3. **Accessibility audit (WCAG AA)**:
   - All interactive elements keyboard navigable
   - ARIA labels on all form controls
   - Focus indicators on all focusable elements
   - Color never the only indicator (paired with text/icons)
   - Rating scales keyboard-operable (arrow keys)
   - 4.5:1 minimum contrast ratio
   - Screen reader announcements for wizard step changes
4. **Security hardening**:
   - Security headers (CSP, X-Frame-Options, etc.)
   - Rate limiting on all endpoint groups
   - CSRF verification on all mutations
   - Input sanitization audit
5. **End-to-end testing** of critical paths:
   - Company registration → setup wizard → dashboard
   - Invite user → accept → login
   - Create template → create series → start session → complete session
   - Create action item → complete action item
   - Analytics data visible after sessions
6. **Performance optimization**:
   - Server Component data fetching (no unnecessary client fetches)
   - TanStack Query cache tuning
   - Image optimization (Next.js Image component for avatars/logos)
   - Bundle analysis and code splitting review
7. **Production deployment prep**:
   - Environment variables documentation finalized
   - Database migration strategy for production
   - Vercel deployment configuration
   - Health check endpoint

## Acceptance Criteria

- [ ] All pages render correctly on desktop, tablet, and mobile breakpoints
- [ ] Sidebar collapses correctly on tablet, bottom nav appears on mobile
- [ ] Session wizard works on mobile (swipeable steps, responsive inputs)
- [ ] Dark mode toggle works and persists across sessions
- [ ] All components look correct in both light and dark modes
- [ ] Keyboard navigation works through entire session wizard
- [ ] All form inputs have ARIA labels
- [ ] Focus indicators visible on all interactive elements
- [ ] Contrast ratio meets WCAG AA (4.5:1) in both themes
- [ ] Security headers present on all responses
- [ ] Rate limiting blocks excess requests (returns 429)
- [ ] E2E: full registration → session completion flow works
- [ ] E2E: invite → accept → participate flow works
- [ ] E2E: analytics display after completing sessions
- [ ] No console errors on any page in production build
- [ ] `npm run build` succeeds without errors
- [ ] Lighthouse score > 90 for Performance, Accessibility, Best Practices
- [ ] Health check endpoint responds at `/api/health`

## Key Files

```
src/app/(dashboard)/layout.tsx          # Responsive layout updates
src/components/layout/sidebar.tsx       # Collapsible + mobile nav
src/components/layout/bottom-nav.tsx    # Mobile navigation
src/components/ui/theme-toggle.tsx      # Dark mode toggle
src/app/globals.css                     # Dark mode CSS variables
next.config.ts                         # Security headers
src/app/api/health/route.ts            # Health check
middleware.ts                          # Rate limiting
e2e/                                   # E2E test files (if Playwright)
```
