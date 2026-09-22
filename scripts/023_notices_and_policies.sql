-- 023: Company Notices & Office Policies with E-Signature
-- Run this migration in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════
-- 1. Company Notices
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
  target_employee_ids UUID[] DEFAULT '{}',
  duration_days INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE company_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_notices" ON company_notices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "employees_read_notices" ON company_notices
  FOR SELECT USING (
    expires_at > NOW()
    AND (
      target_type = 'all'
      OR (SELECT id FROM employees WHERE user_id = auth.uid()) = ANY(target_employee_ids)
    )
  );

-- ═══════════════════════════════════════════════════════
-- 2. Company Policies
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  requires_signature BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_policies" ON company_policies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "employees_read_active_policies" ON company_policies
  FOR SELECT USING (is_active = true);

-- ═══════════════════════════════════════════════════════
-- 3. Policy Signatures (E-Signature tracking)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS policy_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES company_policies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  signature_text TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(policy_id, employee_id)
);

ALTER TABLE policy_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_signatures" ON policy_signatures
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "employees_read_own_signatures" ON policy_signatures
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "employees_insert_own_signature" ON policy_signatures
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════
-- 4. Storage bucket for policy PDFs
-- ═══════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('policies', 'policies', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_upload_policies" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'policies'
    AND (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "anyone_read_policies" ON storage.objects
  FOR SELECT USING (bucket_id = 'policies');
