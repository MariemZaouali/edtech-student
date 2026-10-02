-- ==============================================================================
-- PLATEFORME D'ÉVALUATION EDTECH - SCRIPT D'INITIALISATION SUPABASE
-- À exécuter dans le SQL Editor de votre projet Supabase
-- ==============================================================================

-- 1. EXTENSIONS NÉCESSAIRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLES PRINCIPALES
-- ==============================================================================

-- Table des Profils Utilisateurs (Liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des Soumissions de Devoirs (Submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    course TEXT DEFAULT 'GenAI',
    assignment_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('python', 'jupyter', 'image', 'json', 'csv', 'other')),
    attempt_number INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    grade NUMERIC(5,2) DEFAULT NULL CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
    feedback TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'En cours' CHECK (status IN ('En cours', 'Évalué')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour accélérer les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_name);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- ==============================================================================
-- 3. TRIGGER : CRÉATION AUTOMATIQUE DU PROFIL LORS DE L'INSCRIPTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger pour mettre à jour la date updated_at sur submissions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_submission_updated ON public.submissions;
CREATE TRIGGER on_submission_updated
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. CONFIGURATION DU STOCKAGE (BUCKET 'deliverables')
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'deliverables',
    'deliverables',
    true, -- Permet la lecture via URL publique (ou restreint via RLS)
    52428800, -- 50 Mo max par fichier
    ARRAY[
        'text/x-python',
        'text/plain',
        'application/x-ipynb+json',
        'application/json',
        'text/csv',
        'application/vnd.ms-excel',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/octet-stream'
    ]
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

-- ==============================================================================
-- 5. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- A. Activer RLS sur les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- B. Politiques pour 'profiles'
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Les étudiants peuvent voir leur propre profil" ON public.profiles;
CREATE POLICY "Les étudiants peuvent voir leur propre profil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les étudiants peuvent modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les étudiants peuvent modifier leur propre profil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- C. Politiques STRICTES pour 'submissions'
-- ------------------------------------------------------------------------------

-- 1. LECTURE : Les étudiants peuvent uniquement lire LEURS PROPRES soumissions
DROP POLICY IF EXISTS "Lecture de ses propres soumissions" ON public.submissions;
CREATE POLICY "Lecture de ses propres soumissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- 2. INSERTION : Les étudiants peuvent insérer leurs devoirs MAIS :
--    - student_id doit être leur UID
--    - grade doit obligatoirement être NULL à la création
--    - status doit obligatoirement être 'En cours'
DROP POLICY IF EXISTS "Insertion de ses propres soumissions avec note nulle" ON public.submissions;
CREATE POLICY "Insertion de ses propres soumissions avec note nulle"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id
        AND grade IS NULL
        AND status = 'En cours'
    );

-- 3. MODIFICATION / MISE À JOUR : INTERDITE AUX ÉTUDIANTS
--    Aucune politique UPDATE pour 'authenticated'.
--    Seul le rôle 'service_role' (utilisé par le dashboard enseignant local)
--    contourne RLS et peut insérer/modifier 'grade', 'feedback', 'status'.

-- ------------------------------------------------------------------------------
-- D. Politiques RLS pour Storage ('deliverables')
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Upload réservé à l'étudiant dans son dossier" ON storage.objects;
CREATE POLICY "Upload réservé à l'étudiant dans son dossier"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'deliverables' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Lecture des fichiers du bucket deliverables" ON storage.objects;
CREATE POLICY "Lecture des fichiers du bucket deliverables"
    ON storage.objects FOR SELECT
    TO authenticated, anon
    USING (bucket_id = 'deliverables');

-- ==============================================================================
-- 6. GESTION DES QUOTAS ET TENTATIVES DYNAMIQUES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_attempts_override (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    assignment_name TEXT NOT NULL,
    bonus_attempts INTEGER NOT NULL DEFAULT 1 CHECK (bonus_attempts >= 0),
    reason TEXT DEFAULT 'Accordé par l''enseignant',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_student_assignment UNIQUE (student_email, assignment_name)
);

ALTER TABLE public.student_attempts_override ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture de ses propres quotas bonus" ON public.student_attempts_override;
CREATE POLICY "Lecture de ses propres quotas bonus"
    ON public.student_attempts_override FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR auth.jwt()->>'email' = student_email
    );

-- Trigger pour vérifier les limites de tentatives (3 de base + bonus éventuels)
CREATE OR REPLACE FUNCTION public.check_max_submissions()
RETURNS TRIGGER AS $$
DECLARE
    submission_count INTEGER;
    bonus_count INTEGER := 0;
    max_allowed INTEGER := 3;
BEGIN
    SELECT COALESCE(bonus_attempts, 0) INTO bonus_count
    FROM public.student_attempts_override
    WHERE (student_email = NEW.student_email OR (NEW.student_id IS NOT NULL AND student_id = NEW.student_id))
      AND assignment_name = NEW.assignment_name
    LIMIT 1;

    IF bonus_count IS NULL THEN
        bonus_count := 0;
    END IF;

    max_allowed := 3 + bonus_count;

    SELECT COUNT(*) INTO submission_count
    FROM public.submissions
    WHERE (student_email = NEW.student_email OR student_id = NEW.student_id)
      AND assignment_name = NEW.assignment_name;
      
    IF submission_count >= max_allowed THEN
        RAISE EXCEPTION 'Limite de % tentatives atteinte pour cet exercice (3 de base + % bonus).', max_allowed, bonus_count;
    END IF;
    
    NEW.attempt_number := submission_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_max_submissions ON public.submissions;
CREATE TRIGGER trg_check_max_submissions
    BEFORE INSERT ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.check_max_submissions();

-- ==============================================================================
-- 7. ACTIVATION DU TEMPS RÉEL (SUPABASE REALTIME)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'submissions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'student_attempts_override'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attempts_override;
    END IF;
END $$;

