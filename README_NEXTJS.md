# OviTech Salary Portal - Next.js + Supabase

A modern, secure salary slip management system built with Next.js 16, Supabase, and TypeScript.

## Features

✅ **Authentication**: Secure email/password authentication with Supabase Auth
✅ **Employee Management**: Add, edit, and delete employee records
✅ **Salary Slip Generation**: Create detailed salary slips with custom allowances/deductions
✅ **PDF Export**: Download salary slips as PDF documents
✅ **Word Export**: Download salary slips as DOCX documents
✅ **Role-Based Access**: Separate admin and employee dashboards
✅ **Row Level Security**: Database-level security with RLS policies
✅ **Responsive Design**: Works perfectly on desktop and mobile
✅ **Company Branding**: Customized with OviTech Global branding (#67499E purple)

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## Project Structure

```
├── app/
│   ├── page.tsx                 # Home redirect
│   ├── dashboard/               # Protected dashboard routes
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── auth/                    # Authentication routes
│   │   ├── login/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── sign-up-success/page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── header.tsx               # Navigation header
│   ├── dashboard-content.tsx    # Main dashboard
│   ├── employee-management.tsx  # Employee CRUD
│   ├── salary-slip-generator.tsx# Salary slips
│   ├── company-settings.tsx     # Settings
│   └── ui/                      # shadcn/ui components
├── lib/
│   └── supabase/
│       ├── client.ts            # Client-side Supabase
│       ├── server.ts            # Server-side Supabase
│       └── proxy.ts             # Auth middleware
├── scripts/
│   └── 001_create_tables.sql    # Database schema
├── proxy.ts                     # Middleware configuration
└── public/
    └── images/
        └── image.png            # OviTech logo

## Getting Started

### Local Development

1. Clone and install:
```bash
git clone <your-repo>
cd ovitech-salary-portal
npm install
```

2. Setup Supabase:
   - Create account at supabase.com
   - Copy Project URL and Anon Key

3. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

4. Setup database:
   - Go to Supabase SQL Editor
   - Run `scripts/001_create_tables.sql`

5. Run locally:
```bash
npm run dev
```

### Deploy to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

See `DEPLOYMENT.md` for detailed instructions.

## Usage

### Admin Dashboard
- Manage employees (add, edit, delete)
- Generate salary slips
- Configure company settings
- View statistics and reports

### Employee Dashboard
- View personal salary slips
- Download as PDF/Word
- View salary history

## Database Schema

### Tables
- `profiles`: User profiles with roles
- `employees`: Employee information
- `salary_structures`: Salary templates
- `salary_slips`: Generated salary slips
- `company_settings`: Company information

All tables have Row Level Security enabled:
- Employees can only view their own data
- Admins can manage all data
- Policies enforce user ownership

## API Documentation

### Authentication
- `POST /auth/sign-up`: Create new account
- `POST /auth/sign-in`: Login
- `POST /auth/sign-out`: Logout

### Employees (Admin only)
- `GET /api/employees`: List employees
- `POST /api/employees`: Create employee
- `PUT /api/employees/:id`: Update employee
- `DELETE /api/employees/:id`: Delete employee

### Salary Slips
- `GET /api/salary-slips`: Get user's slips
- `POST /api/salary-slips`: Generate slip (admin)
- `GET /api/salary-slips/:id/pdf`: Download PDF
- `GET /api/salary-slips/:id/docx`: Download Word

## Security Features

- ✅ Supabase Auth with email verification
- ✅ Row Level Security (RLS) on all tables
- ✅ Password hashing with bcrypt
- ✅ HTTPS-only cookies
- ✅ CSRF protection with middleware
- ✅ Input validation and sanitization
- ✅ No sensitive data in localStorage
- ✅ Server-side rendering where possible

## Colors & Branding

- **Primary Purple**: #67499E
- **White**: #fff
- **Black**: #000
- **Company**: OviTech Global Pvt Ltd
- **Industry**: Digital Marketing Agency

## Customization

### Change Company Details
1. Edit `components/company-settings.tsx`
2. Update `app/auth/login/page.tsx` for branding

### Modify Salary Components
1. Update `scripts/001_create_tables.sql` for new fields
2. Edit `components/salary-slip-generator.tsx` UI
3. Update database schema accordingly

### Add New Features
- Create API routes in `app/api/`
- Add components in `components/`
- Update Supabase schema as needed

## Environment Variables

```
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=          # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Anon key (public)

# Optional
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=  # Development redirect
```

## Support & Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please follow the existing code style and create pull requests for new features.

---

Built with ❤️ for OviTech Global Pvt Ltd
