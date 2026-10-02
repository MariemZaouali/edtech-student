-- ==============================================================================
-- MIGRATION SUPABASE : GESTION DYNAMIQUE DES TENTATIVES PAR L'ENSEIGNANT
-- Permet à l'enseignant de :
-- 1. Supprimer des tentatives individuelles (libérant automatiquement le quota)
-- 2. Accorder des tentatives supplémentaires (+1, +2, etc.) par étudiant et par devoir
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================================================

-- 1. TABLE DES DÉROGATIONS / TENTATIVES SUPPLÉMENTAIRES
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

-- Index pour des requêtes rapides
CREATE INDEX IF NOT EXISTS idx_override_student_email ON public.student_attempts_override(student_email);
CREATE INDEX IF NOT EXISTS idx_override_assignment ON public.student_attempts_override(assignment_name);

-- 2. ACTIVATION RLS POUR LA TABLE D'OVERRIDE
ALTER TABLE public.student_attempts_override ENABLE ROW LEVEL SECURITY;

-- Les étudiants peuvent consulter leurs propres bonus de tentatives
DROP POLICY IF EXISTS "Lecture de ses propres quotas bonus" ON public.student_attempts_override;
CREATE POLICY "Lecture de ses propres quotas bonus"
    ON public.student_attempts_override FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR auth.jwt()->>'email' = student_email
    );

-- Seul le service_role (Enseignant local) peut insérer/modifier/supprimer les quotas bonus

-- 3. MISE À JOUR DU TRIGGER check_max_submissions() POUR SUPPORTER LES BONUS
CREATE OR REPLACE FUNCTION public.check_max_submissions()
RETURNS TRIGGER AS $$
DECLARE
    submission_count INTEGER;
    bonus_count INTEGER := 0;
    max_allowed INTEGER := 3;
BEGIN
    -- Récupérer les éventuelles tentatives bonus accordées par l'enseignant
    SELECT COALESCE(bonus_attempts, 0) INTO bonus_count
    FROM public.student_attempts_override
    WHERE (student_email = NEW.student_email OR (NEW.student_id IS NOT NULL AND student_id = NEW.student_id))
      AND assignment_name = NEW.assignment_name
    LIMIT 1;

    IF bonus_count IS NULL THEN
        bonus_count := 0;
    END IF;

    max_allowed := 3 + bonus_count;

    -- Compter le nombre de soumissions déjà effectuées par l'étudiant pour cet exercice
    SELECT COUNT(*) INTO submission_count
    FROM public.submissions
    WHERE (student_email = NEW.student_email OR student_id = NEW.student_id)
      AND assignment_name = NEW.assignment_name;
      
    -- Vérification de la limite dynamique
    IF submission_count >= max_allowed THEN
        RAISE EXCEPTION 'Limite de % tentatives atteinte pour cet exercice (3 de base + % bonus).', max_allowed, bonus_count;
    END IF;
    
    -- Attribution automatique du numéro de tentative (1, 2, 3...)
    NEW.attempt_number := submission_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_max_submissions ON public.submissions;
CREATE TRIGGER trg_check_max_submissions
    BEFORE INSERT ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.check_max_submissions();

-- 4. PUBLICATION TEMPS RÉEL SUR LA TABLE student_attempts_override
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'student_attempts_override'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attempts_override;
    END IF;
END $$;
