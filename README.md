# MoreLi Client

Hebrew no-payment student/tutor marketplace: React 19, TypeScript 6, Vite 8,
Clerk, TanStack Query, Tailwind 4, and existing shadcn/Radix components.
Marketplace data goes through NestJS, never a browser service-role client.
Lesson times are preferred-time requests, not reserved bookings.

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
Catalog generation: `npm run catalogs:build`, using local files only, no scraping.
Selectors display Hebrew and submit slugs. Never add server secrets to `VITE_*`.

For Vercel, current features, and remaining launch gates read
[client rollout](PRODUCTION_ROLLOUT.md) and [the no-payment plan](../PRODUCTION_MVP_PLAN.md).
The React Compiler is not enabled; follow the existing code style.

## Student And Tutor Workflows

- Tutor editing has one destination: `/teacher/onboarding`; `/teacher/profile`
  redirects there. New applicants use `/teach` while remaining students until
  complete final submission succeeds. The four-section Hebrew accordion reports
  missing fields on submit and uses 24-hour Israel-time selectors. Creation and
  role conversion use the atomic `POST /teachers/me/onboarding` endpoint.
  Existing teacher drafts retain separate save and review actions.
  Pending, rejected, published, and suspended profiles have distinct feedback.
- Subjects and service cities use searchable inputs with removable inline chips.
  They submit slugs through the existing Nest collection endpoints, which resolve
  active catalog IDs and transactionally replace `teacher_subjects` and
  `teacher_service_areas`. No additional schema is required for this interaction.
- Profile saving waits for catalogs to load and retains service cities when
  switching to online teaching. Published tutors' mode changes save prerequisite
  cities and availability first. Editing an existing profile still spans multiple
  requests; partial failures are reported rather than presented as complete saves.
- Both inboxes offer server-side status filtering and pagination. Reading is an
  explicit tutor action; accepting or declining requires confirmation. Acceptance
  reveals contact details, not a reserved lesson or proof of attendance.
- Students retain account navigation on their profile, see persistent lesson-request
  confirmation, and can go directly to the inbox. Saving a learning request starts
  matching, with budget/city validation and Israel-time conversion.
- Dashboard pending work includes read-but-unanswered inquiries. Failed loads are
  not shown as zero activity, and counts from a partial list are identified.

Remaining product work: confirmed lesson completion and review eligibility,
cancellation/rescheduling, unsaved-edit protection, and an atomic whole-profile
update for existing teachers. New-account submission is already atomic.
New signup fields do not survive leaving or refreshing the page; uploaded avatars
can persist independently. Existing prematurely converted accounts are not automatically reverted.

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
