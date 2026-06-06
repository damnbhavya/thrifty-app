-- ============================================
-- Thrifty App — Phase 3: Contacts Table
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ============================================

-- 1. Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, upi_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.contacts;
CREATE POLICY "Users can insert their own contacts"
  ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;
CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE USING (auth.uid() = user_id);
