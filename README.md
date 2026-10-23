# MoreLi Client

Hebrew student/tutor product with manual teacher access: React 19, TypeScript 6, Vite 8,
Clerk, TanStack Query, Tailwind 4, and existing shadcn/Radix components.
Marketplace data goes through NestJS, never a browser service-role client.
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

For Vercel, current features, and remaining launch gates read
[client rollout](PRODUCTION_ROLLOUT.md) and [the current product plan](../PRODUCTION_MVP_PLAN.md).
The React Compiler is not enabled; follow the existing code style.

## Student And Tutor Workflows

- `/teacher/access` explains one lifetime free new-student contact, then ILS 60
  monthly access through manual Bit payment and administrator verification. No card
  collection, automatic renewal, or automatic charge is implemented. The versioned
  `/teacher-access-terms` page is linked before a payment claim is submitted.
- Student and teacher inquiry-detail routes reveal accepted contacts, show the
  selected lesson date and support completion/cancellation/no-show reporting. Both
  participants must confirm completion before a new review can be published.
- The student date picker uses server-calculated availability and exact slots only,
  including local Shabbat entry/exit and already accepted lessons. There is no
  arbitrary-time fallback. Missing location coordinates are disclosed.
- New teacher inquiries appear in a homepage banner/popup and actionable in-app
  notifications. Dismissal does not mark an inquiry read or accept it.
- `/support` supports help, bugs, billing, content reports and onboarding issues,
  with owned ticket conversations and admin replies. The public helper/contact
  controls link to support, not a fabricated external chat service.
- Resend is backend-only. Never add a Resend API key or webhook secret to `VITE_*`;
  production sender/domain/webhook setup is documented in the backend README.

- Tutor editing has one destination: `/teacher/onboarding`; `/teacher/profile`
  redirects there. New applicants use `/teach` while remaining students until
  complete final submission succeeds. The four-section Hebrew accordion reports
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

- `/admin`: pending payment, teacher and review queues, recent support tickets,
  and direct links to items awaiting a decision. Counts are bounded snapshots;
  `5+` means there are more results, not an exact total. Support is recent activity,
  not a claim that every listed ticket is open.
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
- `/admin/support`: ticket queue and selected conversation with admin replies.
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
