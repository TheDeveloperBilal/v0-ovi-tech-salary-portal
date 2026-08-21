# Local Development Setup

## Prerequisites
- Node.js 18+ and npm/yarn
- Git
- Supabase account

## Installation

1. Clone the repository:
\`\`\`bash
git clone your-repo-url
cd ovitech-salary-portal
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create `.env.local` file:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

4. Setup Supabase database:
   - Go to your Supabase project SQL Editor
   - Copy entire content from `scripts/001_create_tables.sql`
   - Run the SQL

5. Run development server:
\`\`\`bash
npm run dev
\`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Create Test Users

In Supabase Dashboard > Authentication > Users:
1. Create admin account: admin@ovitech.co
2. Create employee account: employee@ovitech.co

Then in Database > profiles table:
- Set admin user's role to "admin"
- Set employee user's role to "employee"

## Testing

- **Admin Login**: admin@ovitech.co / (your password)
- **Employee Login**: employee@ovitech.co / (your password)

Admin dashboard has full access to manage employees and salary slips.
Employee dashboard can only view their own salary slips.
