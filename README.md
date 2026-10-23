# MoreLi Client

Hebrew student/tutor product with manual teacher access: React 19, TypeScript 6, Vite 8,
Clerk, TanStack Query, Tailwind 4, and existing shadcn/Radix components.
Marketplace data goes through NestJS, never a browser service-role client.
The browser does not use a Supabase client. `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are unused legacy settings and are not required
locally or in the client Vercel project. Supabase runtime credentials belong to
the backend project only.
The Vite configuration exposes only `VITE_API_URL`,
`VITE_CLERK_PUBLISHABLE_KEY`, and `VITE_ENABLE_QUERY_DEVTOOLS` to browser code,
including SDKs that read the complete environment object. Other environment
values, including the legacy Supabase settings, are not bundled.
Pending requests do not reserve a slot. Teacher acceptance protects the selected
time against other accepted awaiting lessons; attendance requires explicit confirmation.

## Setup And Checks

Use recent Node 24.x and npm. Populate `.env` from [.env.example](.env.example)
with `VITE_API_URL=http://localhost:5146/api` and your Clerk publishable key.
Configure the matching backend issuer/secret for verified email synchronization.

```powershell
npm ci
npm run dev
```

Client: http://localhost:5173. API: http://localhost:5146/api.
Checks: `npm run lint`, `npm test`, `npm run build`.
Browser acceptance: with API5146 and client5176 running, use `npm run test:e2e`;
view the report with `npm run test:e2e:report`. Tests create and clean disposable
Clerk development accounts and hosted database records. Live Clerk credentials and
enabled real email delivery are refused. Run against the configured development
database only. Fast multi-role runs need a higher temporary API `RATE_LIMIT_MAX`;
throttling itself has isolated backend tests. Windows uses installed Chrome;
other systems use Playwright Chromium. Reports/screenshots are ignored by Git;
auth traces and videos are disabled.
Catalog generation: `npm run catalogs:build`, using local files only, no scraping.
Selectors display Hebrew and submit slugs. Never add server secrets to `VITE_*`.
Query devtools are opt-in during development: set `VITE_ENABLE_QUERY_DEVTOOLS=true`
to show their floating launcher. They are hidden by default and in production.

## Initial Vercel Deployment

[.env.production](.env.production) supplies the public production API default:
`https://more-li-backend.vercel.app/api`. Local development keeps the API from
your local environment, normally `http://localhost:5146/api`. Vercel environment
variables override the committed defaults; remove or update any old production
`VITE_API_URL` value that still points to localhost or a previous API.

Connect this repository to a Vercel **Vite** project using Node 24.x,
`npm run build`, and output directory `dist`. Set
`VITE_CLERK_PUBLISHABLE_KEY` in Vercel to the existing `pk_test_...` value from
your ignored local client environment. It must belong to the same Clerk instance
as the backend. Do not copy the whole local environment into Vercel.
Only public defaults belong in the committed production environment file; keep
server secrets out of every `VITE_*` variable and out of this repository.

For this initial deployment, `.env.production` explicitly sets the build-only
`CLERK_ALLOW_DEVELOPMENT_INSTANCE=true`. A Vercel production build accepts a
`pk_test_` key only with that opt-in and prints a warning. Missing/invalid keys
and localhost/non-HTTPS API URLs still fail the build. The opt-in is not exposed
to browser code and does not change backend validation.

Deploy the client first to obtain its HTTPS URL. Then use that origin for backend
`PUBLIC_APP_URL` and `CORS_ORIGIN` and configure Clerk as needed. This initial
client deployment does not resolve the backend's production startup validation:
the backend must also explicitly support the temporary development Clerk instance
before API-dependent features can work. Changing CORS alone is not sufficient.

### Switch To Production Clerk

Create a production instance in Clerk and use its actual `pk_live_` publishable
key here. Its matching `sk_live_` secret and production issuer belong in the
backend environment, not the browser. Test keys cannot be converted by changing
their prefixes. Clerk's [production guide](https://clerk.com/docs/guides/development/deployment/production)
requires a domain you own and access to its DNS records; configure production
domains and any OAuth providers before switching the deployed client.
Set `CLERK_ALLOW_DEVELOPMENT_INSTANCE=false` in Vercel to override the temporary
file default and require a live key, then redeploy both projects with matching
Clerk settings.

Before release, `GET https://more-li-backend.vercel.app/api/health` must succeed.
Set the backend `PUBLIC_APP_URL` to the final client URL and include that exact
origin in `CORS_ORIGIN`; configure the same frontend domain and redirect URLs
in Clerk. These server/provider settings are not changed by building the client.
Rebuild after changing client environment values. Existing browser E2E tests
provision data and must not be run against the production backend.

## Teacher Search

- A subject ending in ` - הכל` includes its entire category. Specific subsubjects
  remain specific; results and counts use the same backend matching rules.
- With a city selected, in-person teachers serving that city appear first.
  Online teachers appear in a separate section below and are not restricted by city.
  Subject, price, verification, rating and sort apply to both sections. Each section
  has independent pagination (`page` and `onlinePage`); mode checkboxes hide the
  corresponding section. Teachers offering both modes can appear in both sections.
- Separate educational levels have been retired from search, requests, teacher
  onboarding, public profiles and admin review. Existing `level` URL parameters
  are ignored and omitted when filters are changed. Existing tab drafts still
  restore their other fields, discarding the retired level selection.
- Search regression coverage: `npx playwright test e2e/search.pw.ts`.
- Results use bounded square portraits, wrapping names, two-line subject summaries
  (full subjects remain in the profile), visible prices and 44px action targets.
  Profiles separate portrait, identity, metadata and booking into responsive grid
  areas; availability times keep LTR direction inside the Hebrew interface.
  Geometry checks cover 320, 390, 768, 1024 and 1280px viewports, with real image
  elements, long names/subjects and optional-comment ratings. The floating support
  shortcut is a compact, labeled 44px icon on both mobile and desktop.

For Vercel, current features, and remaining launch gates read
[client rollout](PRODUCTION_ROLLOUT.md) and [the current product plan](../PRODUCTION_MVP_PLAN.md).
The React Compiler is not enabled; follow the existing code style.

## Student And Tutor Workflows

- `/student/dashboard` is the student home; `/student/profile` remains the profile
  editor. Both account dashboards show the next five persisted lessons in server
  chronological order and separate lessons requiring the viewer's attendance update.
- `/student/lessons` and `/teacher/lessons` provide Sunday–Saturday, Israel-local
  weekly calendars, week navigation, paginated history and an action queue. Cancelled
  and off-hours lessons remain accessible; historical overlaps are shown side by side.
- Accepting an inquiry creates its first lesson atomically. Teachers can schedule
  additional lessons for accepted students, without another inquiry/contact charge
  or student acceptance. The student receives an in-app notification and queued email.
  Each student's card links to their upcoming lessons, history and scheduling action.
  A separate per-student action section also preserves older undated lessons instead
  of losing them between future and past lists.
- Canonical lesson detail supports reasoned cancellation/no-show reporting and
  separate post-end attendance confirmations. Teachers can change an unstarted,
  unconfirmed lesson's time; students receive the updated appointment. Existing
  inquiry links continue to update the same first lesson. Attendance confirmation is
  separate from rating eligibility.
- Any signed-in student account (including a teacher's student view) can rate another
  published teacher from their public profile, without an inquiry or completed lesson.
  An explicit integer rating from 1–5 is required; comments are optional. Empty comments
  render blank, with the score still visible. One rating per student/teacher remains;
  editing returns it to moderation as before. `/student/reviews` manages existing ratings.
- Teachers have a dashboard link in desktop/mobile navigation and a new-lesson action
  in `/teacher/dashboard`, using the same accepted-student scheduling dialog as the calendar.
- New/unconfigured availability defaults to Sunday–Thursday, 09:00–21:00. Existing
  custom and explicitly closed schedules are preserved. Onboarding and availability
  editing share a synchronized **7 days × 12 one-hour cells** grid; exact/off-grid
  times stay editable. Green indicates selected recurring hours, not booked slots or
  a promise of availability during Shabbat. Changes only persist after saving.
- Lesson support links preserve the exact lesson ID, including additional lessons.
  Admins see its schedule and both attendance confirmations; support closure never
  changes attendance. No retrospective lesson emails are sent by the migration.

- `/teacher/access` explains one lifetime free new-student contact, then ILS 60
  monthly access through manual Bit payment and administrator verification. No card
  collection, automatic renewal, or automatic charge is implemented. The versioned
  `/teacher-access-terms` page is linked before a payment claim is submitted.
- Student and teacher inquiry-detail routes reveal accepted contacts, show the
  selected lesson date and support completion/cancellation/no-show reporting. Both
  participants must confirm completion to mark a lesson completed, not to publish a rating.
- The student date picker uses server-calculated availability and exact slots only,
  including local Shabbat entry/exit and already accepted lessons. There is no
  arbitrary-time fallback. Missing location coordinates are disclosed.
- New teacher inquiries appear in a homepage banner/popup and actionable in-app
  notifications. Dismissal does not mark an inquiry read or accept it.
- `/support` supports help, bugs, billing, content reports and onboarding issues,
  with owned ticket conversations and admin replies. The public helper/contact
  controls link to support, not a fabricated external chat service.
- Submitting a teacher profile opens one customer-visible onboarding case; correction
  and resubmission reuse it. Bit reports also open linked cases automatically.
  The profile editor and access page link to those conversations instead of asking
  customers to open duplicate tickets.
- Admins can approve profiles and review payments from either their dedicated queue
  or the linked case. The domain decision automatically records a system message:
  approval resolves the case; rejection/correction sets `waiting_customer`. Existing
  decision notifications/emails are reused, with no extra manual reply needed.
  Customer replies reopen the same case; profile resubmission returns it to review.
  Manually closing a conversation never publishes a profile or activates access.
- Billing appeals also show the latest reviewed report and its reason. For a
  rejected report, "פתיחת בדיקה מחדש" creates a linked pending review using the
  original reference and consent; it does not activate access or overwrite the
  rejection. Admins can then approve or reject with a new reason. Both admin and
  teacher histories distinguish reconsideration from an additional payment.
  Missing requester data is a server-update error, not evidence of a non-teacher.
  Review navigation omits links back to the current ticket or exact payment and
  shows the teacher-history link only once per payment card.
- Lesson reports show the participants, requested time and lesson state, with an
  exact investigation link. Review/reply reports link the exact moderated item and
  expose the existing moderation controls inside the case. Removing content does
  not automatically resolve a complaint: the admin still replies and closes it.
  Normal lessons and reviews do not generate support cases.
- Resend is backend-only. Never add a Resend API key or webhook secret to `VITE_*`;
  production sender/domain/webhook setup is documented in the backend README.

- Tutor editing has one destination: `/teacher/onboarding`; `/teacher/profile`
  redirects there. `/teach` is a public explainer; signed-in students open the
  form at `/teach/start`. Every account starts as a student account. Final
  submission adds a tutor profile and flips the role to `teacher`, but tutors
  keep all student routes and abilities. Tutors switch between `/student/*`
  (student mode) and `/teacher/*` (tutor mode) with the "תלמיד | מורה" switch in
  the header, sidebar and mobile menu; the last mode is remembered per user in
  `localStorage`, and student mode is the default. The four-section Hebrew accordion reports
  missing fields on submit and uses 24-hour Israel-time selectors. Creation and
  role conversion use the atomic `POST /teachers/me/onboarding` endpoint.
  Existing teacher drafts retain separate save and review actions. All profile
  sections now save together in one backend transaction.
  Pending, rejected, published, and suspended profiles have distinct feedback.
- Subjects and service cities use searchable inputs with removable inline chips.
  They submit slugs through the existing Nest collection endpoints, which resolve
  active catalog IDs and transactionally replace `teacher_subjects` and
  `teacher_service_areas`. No additional schema is required for this interaction.
- Profile saving waits for catalogs to load and retains service cities when
  switching to online teaching. Invalid sections roll back the entire save;
  unsaved values remain in the form for correction and retry.
- Both inboxes offer server-side status filtering and pagination. Reading is an
  explicit tutor action; accepting or declining requires confirmation. Acceptance
  reveals contact details, not a reserved lesson or proof of attendance.
- Students retain account navigation on their profile, see persistent lesson-request
  confirmation, and can go directly to the inbox. Saving a learning request starts
  matching, with budget/city validation and Israel-time conversion.
- Dashboard pending work includes read-but-unanswered inquiries. Failed loads are
  not shown as zero activity, and counts from a partial list are identified.

Onboarding/edit drafts are scoped to the account and browser tab, expire after
24 hours, survive refresh, and clear after successful saving or sign-out. Consent
is not restored. Navigation and browser exit protect unsaved edits, including
restored drafts while catalogs load. If browser storage is unavailable, values
remain only while the page stays open. Uploaded avatars can persist independently.
Rescheduling remains outside the implemented workflow. Existing prematurely
converted accounts are not automatically reverted.

## Admin Workspace

Admin routes remain behind the existing authenticated admin-role guard. The
workspace has persistent navigation on desktop and scrollable tabs on mobile:

- `/admin`: pending payment, teacher and review queues, actionable support cases,
  and direct links to items awaiting a decision. Counts are bounded snapshots;
  `5+` means there are more results, not an exact total. Support counts only `open`
  and `in_progress`, not cases waiting for the customer or already closed.
- `/admin/payments`: filtered Bit reports with teacher contact details. Approval
  still requires checking receipt and confirming the decision; rejection requires
  a reason and confirmation. Navigation never approves a payment.
- `/admin/history`: persisted payment decisions and teacher-profile status
  transitions with recorded actor, time, previous/new state and reason. Filter by
  decision or exact teacher UUID, with server-side pagination. Historical records
  without an actor say so; the view does not claim to audit every edit, support
  action, or review moderation. Support conversations and email delivery have their
  own records on their existing pages. No migration/backfill is required.
- `/admin/onboarding` and `/admin/reviews`: separate teacher/profile and
  review/reply moderation queues with their existing approval controls.
- `/admin/support`: contextual quick actions and conversation; defaults to cases
  waiting for staff, with separate waiting-customer and closed-case filters.
  Apply `20261023160000_connected_support_cases.sql` and restart the rebuilt API.
- `/admin/emails`: sender readiness, latest 100 delivery jobs, search, status
  filtering and pagination. Provider acceptance is distinct from delivery.
  Processing/retry require explicit confirmation and are disabled when sending is
  unconfigured or in test mode.
- `/admin/activity`: read-only lookup by inquiry UUID and lesson context.

Old `/admin?payment=...#payments`, teacher, ticket and inquiry email links redirect
to their matching page while preserving the selected item. Hash-only payment,
teacher, support and activity links are preserved as well.

Focused browser checks use mocked API responses and do not send mail, create
accounts or review real payments:

```powershell
npm run test:e2e -- e2e/public.pw.ts -g "admin workspace|payment email deep link|saved admin history"
```

Payment notifications link to the exact teacher report. Rejection clearly shows
the reason and next steps: no added paid access, no revoked existing access or
accepted contacts, and no automatic decline of student inquiries. Teachers are
directed to billing support rather than encouraged to pay again. Admins retain a
visible outcome after the report leaves the pending queue. Rebuild/restart the API
for the admin-only `/admin/teacher-history` endpoint and payment-history filters.

## Original Tooling Reference

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
