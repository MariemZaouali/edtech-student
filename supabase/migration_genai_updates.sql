-- ==============================================================================
-- MIGRATION SUPABASE : SUPPORT DES MATIÈRES, EXERCICES (OPTIMIZER & CNN)
-- ET GESTION DES 3 TENTATIVES MAXIMALES PAR ÉTUDIANT
-- À exécuter dans le SQL Editor de votre console Supabase
-- ==============================================================================

-- 1. MISE À JOUR DE LA TABLE SUBMISSIONS
-- Suppression de l'ancienne contrainte CHECK sur file_type pour autoriser 'json' et 'csv'
ALTER TABLE public.submissions 
    DROP CONSTRAINT IF EXISTS submissions_file_type_check;

-- Ajout de la nouvelle contrainte élargie
ALTER TABLE public.submissions 
    ADD CONSTRAINT submissions_file_type_check 
    CHECK (file_type IN ('python', 'jupyter', 'image', 'json', 'csv', 'other'));

-- Ajout des colonnes pour la matière, le numéro de tentative et les métadonnées (si non existantes)
ALTER TABLE public.submissions 
    ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'GenAI',
    ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Elargissement du check de note (permettant jusqu'à 100 si besoin ou 20)
ALTER TABLE public.submissions 
    DROP CONSTRAINT IF EXISTS submissions_grade_check;
ALTER TABLE public.submissions 
    ADD CONSTRAINT submissions_grade_check 
    CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100));

-- 2. TRIGGER : VÉRIFICATION STRICTE DE LA LIMITE DE 3 TENTATIVES PAR EXERCICE
CREATE OR REPLACE FUNCTION public.check_max_submissions()
RETURNS TRIGGER AS $$
DECLARE
    submission_count INTEGER;
BEGIN
    -- Compter le nombre de soumissions déjà effectuées par l'étudiant pour cet exercice
    SELECT COUNT(*) INTO submission_count
    FROM public.submissions
    WHERE student_id = NEW.student_id 
      AND assignment_name = NEW.assignment_name;
      
    -- Vérification de la limite de 3 tentatives
    IF submission_count >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 tentatives atteinte pour cet exercice.';
    END IF;
    
    -- Attribution automatique du numéro de tentative (1, 2 ou 3)
    NEW.attempt_number := submission_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_max_submissions ON public.submissions;
CREATE TRIGGER trg_check_max_submissions
    BEFORE INSERT ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.check_max_submissions();

-- 3. MISE À JOUR DU BUCKET STORAGE 'deliverables' POUR AUTORISER LES CSV ET JSON
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
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
WHERE id = 'deliverables';

-- 4. VUE : MEILLEURE NOTE RETENUE PAR ÉTUDIANT ET PAR EXERCICE
CREATE OR REPLACE VIEW public.student_best_submissions AS
SELECT DISTINCT ON (student_id, assignment_name)
    student_id,
    student_email,
    course,
    assignment_name,
    grade AS best_grade,
    feedback,
    attempt_number,
    created_at,
    file_url
FROM public.submissions
WHERE grade IS NOT NULL
ORDER BY student_id, assignment_name, grade DESC, created_at DESC;

-- Accès en lecture à la vue pour les utilisateurs authentifiés
GRANT SELECT ON public.student_best_submissions TO authenticated;

-- 5. CONFIRMATION DE L'ACTIVATION TEMPS RÉEL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'submissions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
    END IF;
END $$;
