# OviTech Salary Portal

A full-stack employee salary, attendance, payroll, and HR management portal for OviTech Global Pvt Ltd. The current application is a Next.js 16 App Router application backed by Supabase. The repository also contains legacy PHP files and SQL exports from the earlier implementation; the Next.js application is the primary application to run and deploy.

## Project Links

- GitHub repository: https://github.com/TheDeveloperBilal/v0-ovi-tech-salary-portal
- Current development branch: `v0/thedeveloperbilal-abba3de7`
- Vercel project: https://vercel.com/dashboard
- Supabase dashboard: https://app.supabase.com/

> Never commit Supabase keys, service-role keys, database passwords, or `.env` files to GitHub.

## Technology Stack

### Application

- Next.js `16.0.10`
- React `19.2.0`
- TypeScript
- Next.js App Router
- Tailwind CSS `4.1.9`
- shadcn/ui-style components built with Radix UI
- Lucide React icons
- React Hook Form and Zod-compatible validation utilities
- Recharts for dashboard visualizations
- `date-fns` for date utilities
- `xlsx` for spreadsheet-related file support
- `jspdf`, `html2canvas`, and document helpers for salary-slip exports
- Vercel Analytics

### Backend and infrastructure

- Supabase Auth for authentication and sessions
- Supabase Postgres for application data
- Supabase Row Level Security (RLS)
- Supabase SSR helpers for browser/server clients
- Vercel for deployment and preview environments
- Next.js Route Handlers for server-side operations

## Main Features

### Authentication and access control

- Email/password sign up and login through Supabase Auth.
- Sign-up success flow and login error handling.
- Session refresh through `proxy.ts` and `lib/supabase/proxy.ts`.
- Authenticated dashboard access.
- Admin and employee experiences.
- Admin-only employee, attendance, salary-slip, and company-settings management.
- Employee users only see their own employee profile and salary slips.

### Admin dashboard

- Dashboard route: `/dashboard`.
- Header with authenticated user information and logout.
- Employee count and salary-slip count statistics.
- Tabbed interface for Employees, Attendance, Salary Slips, and Settings.
- Responsive layout for desktop and mobile screens.

### Employee management

- Add employees.
- Edit employee information.
- Delete employees.
- Search and browse employees.
- Store employee identifiers, names, email, phone, department, designation, joining date, banking information, PAN/Aadhaar-related fields, and account linkage.
- Reset employee passwords through the admin API.
- Employee profile association through `employees.user_id`.

### Salary structures and payroll

- Salary forms for base salary and allowances.
- Salary components including HRA, dearness allowance, medical allowance, transport allowance, other allowances, PF, ESI, professional tax, loan deductions, and other deductions.
- Salary-slip generation by employee and month/year.
- Unique salary slip per employee/month/year.
- Salary-slip preview.
- Salary-slip deletion.
- PDF download/export.
- Word/document export helpers.
- Bulk salary processing legacy files are retained for reference, while the Next.js salary generator is the active UI.

### Employee salary portal

- Employee dashboard route: `/employee`.
- Employee-specific salary slip retrieval.
- Employee-specific data scoping by `employee_id`.
- Salary-slip detail dialog.
- Net salary, earnings, deductions, leave deductions, and probation information.
- PDF download from the salary-slip preview.
- Probation status and probation end date display.

### Attendance management

- Attendance tab in the admin dashboard.
- Upload `.txt` or `.csv` attendance files.
- Client-side file validation and a 10 MB file-size limit.
- Flexible parsing for tab-separated and whitespace-separated files.
- Detection of combined timestamp and separate date/time columns.
- Employee-name matching against the Supabase `employees` table.
- Grouping of multiple scans for one employee on one date.
- First scan saved as check-in and last scan saved as check-out.
- Duplicate protection using the unique employee/date key.
- Upsert behavior so re-uploading a file updates existing attendance records instead of failing with a duplicate-key error.
- Month/year filtering in the attendance tab.
- Search by employee name.
- Click an attendance row to show employee details.
- Employee detail cards for designation, base salary, deductions, net payable, early-out days, and leaves deducted.
- Attendance statistics for total days, present days, absent days, and late days.
- Delete individual attendance records.
- Attendance routes:
  - `POST /api/attendance/upload`
  - `GET /api/attendance/records`
  - `POST /api/attendance/calculate-leaves`

#### Attendance file expectations

The upload parser expects a row containing a date/time and an employee name. Supported patterns include:

```text
# Space-separated date and time columns
ID 2026-03-03 08:55:00 970818 Employee Name
```

or:

```text
# Combined timestamp column, usually tab-separated in exported files
ID\t2026-03-03 08:55:00\t970818\tEmployee Name
```

The parser stores dates in `YYYY-MM-DD` format. Employee names must match the employee records in Supabase. Prefer exact first-name/last-name values or a consistent full-name format in the attendance export.

> Important: the current upload route writes `employee_id`, `attendance_date`, `check_in`, and `check_out`. If your database has additional required attendance columns, update the route and schema together. Do not assume columns such as `month`, `year`, or `employee_name` exist unless they are present in the live Supabase table.

### Company settings

- Company name and address.
- Company phone, email, and website.
- Banking details.
- IFSC, CIN, PAN, ESI, and PF information.
- Settings are stored in `company_settings` and are restricted by RLS for writes.

## Application Routes

| Route | Purpose |
|---|---|
| `/` | Landing/entry page |
| `/auth/login` | Supabase email/password login |
| `/auth/sign-up` | New account registration |
| `/auth/sign-up-success` | Post-registration confirmation |
| `/dashboard` | Admin dashboard and management tabs |
| `/employee` | Employee salary-slip portal |
| `/debug` | Development/debug page; do not expose as a production feature |

## API Routes

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/attendance/upload` | POST | Parse and upsert attendance file records |
| `/api/attendance/records` | GET | Retrieve attendance records |
| `/api/attendance/calculate-leaves` | POST | Calculate attendance/leave deductions |
| `/api/employees/add` | POST | Create an employee |
| `/api/employees/delete/[id]` | DELETE | Delete an employee |
| `/api/employees/reset-password` | POST | Reset an employee password |
| `/api/salary-slips/delete/[id]` | DELETE | Delete a salary slip |

## Important Project Files

```text
app/
├── api/
│   ├── attendance/
│   │   ├── calculate-leaves/route.ts
│   │   ├── records/route.ts
│   │   └── upload/route.ts
│   ├── employees/
│   │   ├── add/route.ts
│   │   ├── delete/[id]/route.ts
│   │   └── reset-password/route.ts
│   └── salary-slips/delete/[id]/route.ts
├── auth/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── sign-up/page.tsx
│   └── sign-up-success/page.tsx
├── dashboard/page.tsx
├── employee/page.tsx
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── attendance-manager.tsx
├── dashboard-content.tsx
├── employee-dashboard.tsx
├── employee-list.tsx
├── employee-management.tsx
├── salary-form.tsx
├── salary-slip-generator.tsx
├── salary-slip-preview.tsx
├── probation-manager.tsx
├── company-settings.tsx
├── admin-users.tsx
├── header.tsx
└── ui/

lib/
├── attendance-calculations.ts
├── supabase/client.ts
├── supabase/server.ts
├── supabase/proxy.ts
├── supabase/employees.ts
├── word-generator.tsx
└── utils.ts

scripts/
├── 001_create_tables.sql
├── 002_fix_rls_for_service_role.sql
├── 003_migrate_profiles_to_employees.sql
├── 004_check_schema.sql
├── 005_check_missing_auth_users.sql
├── 006_add_leaves_feature.sql
├── 007_fix_salary_slips.sql
├── 008_reset_employee_leaves.sql
├── 010_add_probation_to_salary_slips.sql
├── 011_create_attendance_tables.sql
└── 012_attendance_tables_clean.sql
```

## Supabase Setup

### 1. Create or open a Supabase project

1. Open https://app.supabase.com/.
2. Create a project or select the existing OviTech project.
3. Open **Project Settings → API**.
4. Copy the project URL and the publishable/anon key into your local environment file.
5. Keep the service-role key server-only. Never expose it in client components.

### 2. Configure authentication

In Supabase:

1. Open **Authentication → Providers**.
2. Enable Email provider.
3. Configure Site URL and Redirect URLs for local and production environments.
4. Add the production callback/site URL after deploying to Vercel.

Recommended local URL:

```text
http://localhost:3000
```

### 3. Create the database schema

Run the SQL scripts in Supabase SQL Editor in dependency order. At minimum, use:

1. `scripts/001_create_tables.sql`
2. `scripts/002_fix_rls_for_service_role.sql`
3. `scripts/003_migrate_profiles_to_employees.sql` if migrating an older schema
4. `scripts/006_add_leaves_feature.sql`
5. `scripts/007_fix_salary_slips.sql`
6. `scripts/010_add_probation_to_salary_slips.sql`
7. `scripts/011_create_attendance_tables.sql` or the cleaned version in `scripts/012_attendance_tables_clean.sql`
8. `scripts/004_check_schema.sql` to verify the live schema

Always inspect the live Supabase schema before applying a migration to a production database. Some scripts are historical repair/migration scripts and may not be safe to run repeatedly without review.

### 4. Core Supabase tables

The main schema includes:

- `profiles`: authenticated user profile and admin flag.
- `employees`: employee identity and HR information.
- `salary_structures`: reusable salary components and deduction structure.
- `salary_slips`: monthly generated salary results.
- `company_settings`: company branding and payment details.
- `attendance_records`: one attendance record per employee/date.
- `attendance_summary`: cached monthly attendance and leave calculations.

Important constraints include:

- `employees.employee_id` is unique.
- `salary_slips(employee_id, year, month)` is unique.
- `attendance_records(employee_id, attendance_date)` is unique.
- Employee and salary tables reference `employees.id`.

### 5. RLS and service-role behavior

RLS is enabled for application tables. Browser-side reads use the authenticated Supabase session and RLS. Server API routes use the service-role key where administrative writes are required. Keep the service-role key in server-only environment variables and never prefix it with `NEXT_PUBLIC_`.

The intended access model is:

- Admins can manage employees, salary slips, attendance, and company settings.
- Authenticated employees can read their own employee and salary-slip data.
- Employee queries must be scoped to the authenticated employee relationship.
- Attendance records are visible only according to the policies configured in the live Supabase schema.

## Environment Variables

Create `.env.local` in the project root for local development. Use the actual values from Supabase/Vercel; do not copy secrets into this README.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_KEY
SUPABASE_JWT_SECRET=YOUR_JWT_SECRET
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```

The project may also contain Postgres/Vercel-provided variables such as:

```env
POSTGRES_DATABASE=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_PRISMA_URL=
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
```

The current application uses Supabase as its primary data source. Do not replace Supabase with direct Postgres access unless the application architecture is intentionally migrated.

## Local Development in VS Code

### Requirements

- Node.js 20 or newer recommended.
- npm, pnpm, or Bun.
- A Supabase project with Auth and database configured.
- Git.

### Clone and install

```bash
git clone https://github.com/TheDeveloperBilal/v0-ovi-tech-salary-portal.git
cd v0-ovi-tech-salary-portal
npm install
```

If using the feature branch directly:

```bash
git checkout v0/thedeveloperbilal-abba3de7
```

### Configure local environment

Create `.env.local` and add the Supabase variables listed above. Do not commit this file.

### Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Validate before deployment

```bash
npm run lint
npm run build
npm run start
```

The build command must pass before deploying to Vercel. If Vercel uses Bun, the equivalent commands are `bun install`, `bun run lint`, and `bun run build`.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Select the Next.js framework preset.
4. Add all required Supabase environment variables in **Project Settings → Environment Variables**.
5. Add variables to Development, Preview, and Production as needed.
6. Configure Supabase Authentication Site URL and redirect URLs for the Vercel domain.
7. Deploy.
8. Check Vercel build logs and test login, dashboard access, employee access, salary-slip generation, and attendance upload.

Recommended production checks:

- `/auth/login` loads without a Supabase configuration error.
- A user can sign in and sign out.
- An admin sees management tabs.
- An employee sees only their own salary information.
- Attendance upload can match employee names and upsert records.
- Existing attendance records do not fail on duplicate employee/date keys.
- Salary PDFs download correctly.
- RLS prevents unauthorized data access.

## Exporting from Vercel to VS Code

### Option A: GitHub (recommended)

```bash
git clone https://github.com/TheDeveloperBilal/v0-ovi-tech-salary-portal.git
cd v0-ovi-tech-salary-portal
npm install
```

Then create `.env.local`, run the SQL scripts in Supabase, and start the app with `npm run dev`.

### Option B: Download ZIP from v0

1. Open the project in v0.
2. Open the project menu.
3. Choose **Download ZIP**.
4. Extract the ZIP in VS Code.
5. Open the extracted folder.
6. Install dependencies.
7. Create `.env.local`.
8. Configure Supabase and run the required SQL scripts.
9. Run `npm run dev`.

GitHub is preferred because it preserves branches, history, deployment integration, and future updates.

## Admin Setup

1. Register an account through `/auth/sign-up`.
2. Confirm the account in Supabase Auth if email confirmation is enabled.
3. In Supabase SQL Editor, mark the profile as admin:

```sql
update public.profiles
set is_admin = true
where email = 'admin@example.com';
```

4. Sign out and sign back in.
5. Open `/dashboard`.

Use the actual administrator email. Do not use default credentials from the legacy PHP implementation in production.

## Attendance Troubleshooting

### No attendance records found

- Confirm the selected month and year match `attendance_date`.
- Confirm the live table contains records:

```sql
select employee_id, attendance_date, check_in, check_out
from public.attendance_records
order by attendance_date desc
limit 20;
```

- Confirm dates are stored as `DATE`/`YYYY-MM-DD` values.
- Confirm employee IDs in attendance records exist in `employees`.
- Check browser console messages beginning with `[v0]`.
- Confirm the logged-in user has permission to read attendance records under RLS.

### Employee names do not match during upload

The upload route compares the file name with employee first/last names. Normalize the export so names match the database. For large organizations, use a stable employee number and update the upload matcher to compare against `employees.employee_id` instead of relying only on names.

### Duplicate attendance key

The unique key is:

```text
(employee_id, attendance_date)
```

The upload route uses an upsert and deduplicates records before sending them to Supabase. If a direct SQL import is used, remove duplicate employee/date rows first.

### Supabase schema-cache errors

Errors such as `Could not find the 'month' column` or `Could not find the 'employee_name' column` mean the application payload and live database schema are different. Inspect the live table in Supabase and keep the route payload aligned with the actual columns. Refresh the Supabase schema cache or wait briefly after applying migrations.

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Never commit `.env.local`, `.env.development.local`, or production secrets.
- Keep RLS enabled in production.
- Use server-side validation for admin operations.
- Scope employee reads by authenticated user/employee relationship.
- Do not trust salary or deduction values submitted by the client for final payroll calculations.
- Review legacy PHP files before deploying them; they are not required to run the Next.js application.
- Remove or protect development/debug routes before exposing a public production deployment.

## Legacy PHP Files

The earlier PHP implementation lives in `legacy/` (PHP entry points such as `login.php`, `dashboard.php`, `salary-slip.php`, `bulk-salary.php`, plus `legacy/config/`, `legacy/includes/`, and `legacy/database/ovitech_salary.sql`). Historical setup/fix documentation lives in `docs/`. They are retained for historical/reference purposes and are separate from the Next.js/Supabase application. Do not run both applications against the same domain without an explicit migration plan.

## Troubleshooting Vercel Builds

If Vercel reports a prerender error:

1. Check the exact route in the build log.
2. Confirm all environment variables exist in the correct Vercel environment.
3. Do not access browser-only APIs during server rendering.
4. Do not reference a client variable outside the scope where it is created.
5. Run `npm run build` locally with the same environment variable names.
6. Check that Next.js 16 async request APIs are awaited where used.

## Useful Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
git status
git log --oneline --decorate -10
```

## Support and Maintenance

For maintenance, start with:

- `components/dashboard-content.tsx` for dashboard tabs.
- `components/attendance-manager.tsx` for attendance UI, search, employee selection, and file upload.
- `app/api/attendance/upload/route.ts` for attendance parsing and database writes.
- `components/salary-slip-generator.tsx` for admin salary processing.
- `components/employee-dashboard.tsx` for employee-facing salary slips.
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `lib/supabase/proxy.ts` for Supabase access/session handling.
- `scripts/004_check_schema.sql` and the other SQL scripts for database verification and migrations.

## License

This project is proprietary software for OviTech Global Pvt Ltd. Add an explicit license file before distributing the code outside the organization.

## Project Status

The project is designed to run as a Next.js application on Vercel with Supabase Auth and Supabase Postgres. Before handing the project to another developer, provide the Supabase project access, required environment variables through a secure channel, the production Vercel project access, and the current database migration history separately from this README.

---

Maintained for OviTech Global Pvt Ltd.
