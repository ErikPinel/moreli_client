# Client No-Payment MVP Launch

## Current Release Contract

Reviewed 2026-09-12. Governing scope: [source of truth](../PRODUCTION_MVP_PLAN.md).
This section replaces the historical rollout below. No payments, subscriptions,
commissions, or paid contact unlocks are included. Preferred-time requests are not
reserved bookings. Code is prepared for staging, not certified for public launch.

### Implemented

- Student signup and tutor claim, sign-in/sign-up return preservation, and
  backslash/control-character redirect rejection.
- Server-verified primary email sync; visible profile-sync failure/retry/sign-out.
  A fresh QueryClient per Clerk session prevents cached account data crossing users.
- Private pending tutors, actionable rejection and resubmission. `/admin` has a
  paginated review queue, submitted details, approve/reject, and delivery retry/status.
- Legacy approval page requires authenticated admin and says queued, not delivered.
- One scheduling dialog for profile/favorites/matches, with required contact data
  and explicit consent. Luxon handles Israel time and duration-aware availability.
- Accepted inquiries show counterpart contacts. `/teacher/students` groups accepted
  student relationships and shows authorized names/email/phone/request details.
  There is no arbitrary private student-profile endpoint.
- Student/tutor inboxes and accepted-students list load additional pages.
- `/match` uses the existing student requests/matching workflow. Dead articles/about
  links were removed from public navigation. Scheduling uses the existing Dialog.

### Vercel Setup

1. Import the separate client Git repository at its root as **Vite**, Node 24.x,
   `npm ci`, `npm run build`, output `dist`.
2. [vercel.json](vercel.json) supplies SPA deep-link rewrites and security headers.
   Do not deploy the Vite dev server.
3. [.env.production](.env.production) supplies
   `VITE_API_URL=https://more-li-backend.vercel.app/api` and the temporary build-only
   `CLERK_ALLOW_DEVELOPMENT_INSTANCE=true`. It also includes the client's existing
   public `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` from the same Clerk instance
   as the backend, so no separate Vercel key variable is needed initially. Vercel environment values
   override the file, so update/remove stale API or opt-in overrides. The file
   contains no server secrets; only the three supported public Vite settings are
   exposed to browser code.
4. Vercel production builds reject localhost/non-HTTPS API URLs and missing/invalid
   Clerk keys. Test keys require the explicit opt-in and emit a build warning.
   To switch to production Clerk, set `CLERK_ALLOW_DEVELOPMENT_INSTANCE=false`
   and a genuine matching `pk_live_...` key in Vercel. Local development is unchanged.
5. After obtaining the frontend URL, set backend `PUBLIC_APP_URL`/`CORS_ORIGIN` and
   matching Clerk origin/redirect settings. Backend production validation must also
   explicitly support development Clerk for the temporary MVP; changing CORS alone
   does not fix startup. A later production Clerk switch needs matching backend live
   secret/issuer settings. Rebuild/redeploy after environment changes.
6. Verify direct links and refresh, signup, account switching, all roles and inboxes
   on deployed domains. Actual Vercel deployment has not been run here.
7. Require a successful backend `/api/health` response before certifying integration.
   A deployed URL or successful client build does not prove the backend is healthy.
   Do not run the data-provisioning browser E2E suite against production.

The client and backend are separate Git repositories. No repository/commit or
client deployment was created automatically.
See [backend rollout](../backend/PRODUCTION_ROLLOUT.md).

### Remaining Public-Launch Gates

| Gate | Required proof/work |
| --- | --- |
| Legal/support | Approved Hebrew terms/privacy, operator contact, minor/guardian policy, contact disclosure and retention policy; checkbox is not legal sign-off |
| Live roles | Real Clerk signup/review/rejection/resubmission/request/decline/acceptance/contacts/students/sign-out journeys on actual domains |
| Email | Every matrix event received in three controlled inboxes, including retries; queue success is not inbox proof |
| Accessibility | Keyboard, screen reader, contrast, mobile and Safari checks; legacy review dialogs need scheduling's focus behavior |
| Monitoring | Error/release reporting with token/contact filtering; never collect inquiry bodies or private profiles |
| Dependencies | 13 moderate transitive advisories remain in Clerk UI's Solana chain (`stream-json`, `uuid`); seven high findings were removed. Disable unused wallet sign-in; do not force a breaking Clerk downgrade |
| Deletion | Resolve backend partial deletion/provider-widget deletion reconciliation and retention decisions |

### Known MVP Limits

- No reserved slot, rescheduling/cancellation/completion/no-show lifecycle,
  reminders, calendar sync, or automatic conflicts. Accepted means direct
  coordination/contact sharing, not proof of attendance or completed lesson.
- Dashboard inquiry counts cover loaded requests, not lifetime totals. Other
  lists such as notifications and student requests still use bounded first pages.
- Changes after initial tutor publication do not automatically require another
  review. Define a re-review policy if the business requires it.
- Accepted students are a relationship list, not a full CRM.
- Large initial bundle remains (~999 kB minified / 293 kB gzip). Route splitting is
  follow-up. Optional billing/wallet chunks are Clerk SDK artifacts, not enabled payments.
- No full authenticated browser regression suite was added. Backend tests verify
  authorization/state but do not replace production UI journeys.

### Validation

2026-09-12: TypeScript/Vite build passed (large-chunk warning), ESLint passed,
three Luxon scheduling tests passed. Hosted backend suite passed four tests in two
files. See the governing plan for current browser evidence and external gates.
Run `npm run lint`, `npm test`, `npm run build`, `npm audit`.
Development: `npm run dev`, normally http://localhost:5173, with API separately
at http://localhost:5146/api.

---

## Historical Pre-Outbox Notes (Superseded)

The following is historical context only. Its missing-feature lists, test results,
mobile viewport claims, approval behavior, and monetization requirements are not
the current contract. Use the current sections above and the governing plan.

Last reviewed: 2026-09-12

## Purpose

This document summarizes the React client's current features, recent workflow
changes, and remaining work before a public production launch. Backend and
database readiness are documented in `../backend/PRODUCTION_ROLLOUT.md` and the
repository-wide roadmap is in `../PRODUCTION_READINESS.md`.

## Frontend Stack

- React 19 and TypeScript 6
- Vite 8
- React Router 7
- TanStack Query
- Clerk React authentication
- Tailwind CSS 4 and shadcn-style components
- Sonner notifications and Lucide icons

The client authenticates with Clerk, obtains an access token, and sends it to
the NestJS API. It never connects directly to protected Supabase tables and
must never receive Supabase server keys, Brevo keys, or email-signing secrets.

## Recent Changes

### Public tutor discovery

- Tutor search supports URL-backed filters, deterministic sorting, pagination,
  totals, verified-only filtering, minimum rating, and responsive result cards.
- Public tutor pages show identity, subjects, levels, modes, price, recurring
  availability, and reviews.
- The primary profile action is now `Request lesson` rather than a generic
  contact action.

### Lesson request flow

- Logged-in students can select a preferred date, time, duration, lesson mode,
  and message from a public tutor profile.
- Recurring availability generates upcoming dates and half-hour start times.
- Tutors without recurring availability use manual date and time controls.
- Signed-out users are sent through Clerk with a return URL containing
  `schedule=1`; the scheduling dialog reopens after successful authentication.
- The dialog clearly states that contact information remains private until the
  tutor accepts.
- Desktop and 390 CSS-pixel mobile layouts were checked for clipping and
  horizontal overflow.

### Tutor account workflow

- Existing tutors visiting `/teach/start` are redirected to their tutor
  dashboard; the public `/teach` explainer offers them the mode switch instead.
- Existing tutor accounts see the "תלמיד | מורה" mode switch in the header
  rather than another create-profile action.
- The homepage tutor-acquisition section is hidden for tutor accounts.
- Tutor onboarding separates `draft`, `pending`, and `published` states.
- Tutor onboarding and account settings collect required first name, last name,
  email, phone, and residential city details.
- Saving a complete draft automatically sends it for review instead of directly
  publishing it; no separate submission action is required.
- Saving a pending or published profile updates its details without resubmitting
  it.
- Pending tutors see an explanatory review modal and persistent status label.
- Avatar selection opens a touch-friendly crop editor with drag, zoom, reset,
  and cancel controls; the selected crop is resized to an `800 x 800` WebP
  before upload.
- Homepage and search cards use square media so the saved crop is not cropped or
  zoomed a second time, and the complete card opens the tutor profile.
- The saved private avatar is loaded through the ownership-checked signed URL
  endpoint when the tutor returns to onboarding.
- Tutor inquiry cards show requested date, time, duration context, and mode.
- Student email and phone appear only on accepted inquiries.

### Approval and identity

- Clerk's primary email is synchronized into the private application profile.
- `/teacher-approval` previews a signed tutor approval token.
- Approval requires an explicit button press and POST request.
- Invalid or expired links show a safe error state and no approval action.

## Current Client Capabilities

### Public users

- Homepage and responsive navigation
- Tutor search and public tutor details
- Public taxonomies, availability, and reviews
- Clerk sign-in and sign-up entry points
- Authentication return to an interrupted lesson request

### Students

- Student profile workspace
- Search and favorites
- Student requests and ranked tutor matches
- Preferred-time lesson requests
- Inquiry status tracking
- Accepted tutor contact details
- Reviews and notifications

### Tutors

- Tutor claim and terms flow
- Profile, photo, subjects, levels, service areas, modes, pricing, and recurring
  availability editing
- Draft, pending-review, and published states
- Tutor dashboard and inquiry inbox
- Accept/decline actions
- Accepted student contact details
- Notifications

The UI currently requests a preferred lesson time. It must not describe that
time as a confirmed booking until the backend has conflict-safe reservations.

## Environment Configuration

The client uses:

```text
VITE_API_URL
VITE_CLERK_PUBLISHABLE_KEY
```

For local development, the API URL defaults to
`http://localhost:5146/api`. Production should set `VITE_API_URL` to the
deployed HTTPS API origin and use the production Clerk publishable key.

Only public browser-safe values may use the `VITE_` prefix.

## Missing Before Production

### Launch blockers

- Configure production Clerk allowed origins, redirect URLs, and account URLs.
- Configure the deployed HTTPS API URL and verify CORS from the production
  client origin.
- Add final privacy policy, terms, contact-disclosure consent, and support
  content.
- Verify every role and route against a production-like staging environment.
- Add error monitoring and release/source-map reporting with sensitive-data
  filtering.

### Scheduling experience

- Add availability exceptions, holidays, and explicit tutor/student timezones.
- Show conflicts and slot expiry once atomic reservation support exists.
- Add reschedule, cancellation, completion, and no-show interfaces.
- Add calendar export/integration after a request becomes a real reservation.
- Keep request language distinct from booking language until those contracts
  exist.

### Tutor review and administration

- Add tutor rejection and resubmission interfaces with review reasons.
- Add an approval audit/history view.
- Add a complete admin review queue if approvals will also happen in-app.
- Add clear operational states for email delivery delays without implying that
  an email is the source of truth.

### Monetization

- Add pricing and legal disclosure for paid leads or lessons.
- Add checkout/payment state, invoices, refund states, and payment history.
- Render server-authoritative entitlements at acceptance; do not unlock contact
  details based only on client state.

### Quality and accessibility

- Add Playwright tests for anonymous login return, request submission, pending
  tutor review, approval, decline, acceptance, and contact reveal.
- Test keyboard focus trapping, Escape behavior, and focus restoration for all
  dialogs.
- Run screen-reader and contrast audits across public and account pages.
- Add loading/error/offline recovery tests for critical mutations.
- Add cross-browser checks for current Chrome, Edge, Firefox, and Safari.
- Add production analytics and consent behavior without collecting private
  inquiry or contact content.

## Current Validation Status

Verified on 2026-09-12:

- Client lint passes with no ESLint errors.
- Production TypeScript/Vite build passes.
- The public tutor page renders against hosted data.
- Anonymous lesson requests preserve the tutor URL through Clerk login.
- The scheduling dialog renders correctly on desktop and mobile.
- Manual date/time fallback works when no recurring availability is present.
- The avatar cropper exports an `800 x 800` WebP and remains within desktop and
  390 CSS-pixel mobile viewports.
- Invalid approval links fail closed and show no approval button.
- Editor-only CSS diagnostics remain for Tailwind 4 directives and a
  pre-existing `line-clamp` compatibility hint; the Vite production build is
  unaffected.

Run client checks with:

```powershell
Set-Location C:\Users\erikp\Desktop\WorkSpace\MoreLi\client
npm run lint
npm run build
```

## Start The Client

Start the backend first. Then open a second PowerShell terminal at the workspace
root and run:

```powershell
Set-Location .\client
npm install
npm run dev
```

Vite normally serves the client at `http://localhost:5173`.

To expose the development server to other devices on the local network:

```powershell
Set-Location .\client
npm run dev -- --host
```

Production build and local preview:

```powershell
Set-Location .\client
npm install
npm run build
npm run preview
```

## Recommended Rollout Order

1. Configure the production Clerk and API environment values.
2. Deploy to staging and execute role-based browser journeys.
3. Complete legal pages, consent language, monitoring, and accessibility checks.
4. Add Playwright coverage for the approval and request/acceptance lifecycle.
5. Release preferred-time requests with accurate non-booking language.
6. Add reservation UI only after the backend provides conflict-safe booking.
7. Add monetization UI only after server-side acceptance entitlements exist.
