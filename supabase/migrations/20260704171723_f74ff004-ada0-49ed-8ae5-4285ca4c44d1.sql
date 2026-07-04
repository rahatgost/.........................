-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Shared updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- VAULT META (one row per user, holds KDF salt + recovery)
-- =========================================================
CREATE TABLE public.vault_meta (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kdf_salt BYTEA NOT NULL,
  kdf_algorithm TEXT NOT NULL DEFAULT 'argon2id',
  recovery_wrapped_key BYTEA,
  recovery_wrapped_key_iv BYTEA,
  passphrase_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_meta TO authenticated;
GRANT ALL ON public.vault_meta TO service_role;

ALTER TABLE public.vault_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault meta"
  ON public.vault_meta FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault meta"
  ON public.vault_meta FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault meta"
  ON public.vault_meta FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault meta"
  ON public.vault_meta FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vault_meta_updated_at
BEFORE UPDATE ON public.vault_meta
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- VAULT ACCOUNTS (encrypted TOTP entries)
-- =========================================================
CREATE TABLE public.vault_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  icon_slug TEXT,
  secret_ciphertext BYTEA NOT NULL,
  secret_iv BYTEA NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'SHA1',
  digits INTEGER NOT NULL DEFAULT 6,
  period INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vault_accounts_digits_check CHECK (digits BETWEEN 4 AND 10),
  CONSTRAINT vault_accounts_period_check CHECK (period BETWEEN 10 AND 120),
  CONSTRAINT vault_accounts_algorithm_check CHECK (algorithm IN ('SHA1', 'SHA256', 'SHA512'))
);

CREATE INDEX vault_accounts_user_id_idx ON public.vault_accounts(user_id);
CREATE INDEX vault_accounts_user_sort_idx ON public.vault_accounts(user_id, sort_order, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_accounts TO authenticated;
GRANT ALL ON public.vault_accounts TO service_role;

ALTER TABLE public.vault_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault accounts"
  ON public.vault_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault accounts"
  ON public.vault_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault accounts"
  ON public.vault_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault accounts"
  ON public.vault_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vault_accounts_updated_at
BEFORE UPDATE ON public.vault_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();