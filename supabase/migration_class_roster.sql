-- ==============================================================================
-- MIGRATION SUPABASE : GESTION DES CLASSES (3ATELIOT) ET ROSTER ÉTUDIANTS
-- À exécuter dans le SQL Editor de votre projet Supabase
-- ==============================================================================

-- 1. AJOUT DE LA COLONNE CLASSE/GROUPE DANS PROFILES
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS class_group TEXT DEFAULT '3ATELIOT';

-- Index pour recherche rapide par classe
CREATE INDEX IF NOT EXISTS idx_profiles_class_group ON public.profiles(class_group);

-- 2. TABLE DU ROSTER / ANNUAIRE DE LA CLASSE (Optionnel pour archivage et pré-inscriptions)
CREATE TABLE IF NOT EXISTS public.class_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    class_group TEXT NOT NULL DEFAULT '3ATELIOT',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.class_roster ENABLE ROW LEVEL SECURITY;

-- 3. MISE À JOUR DU TRIGGER D'INSCRIPTION POUR CAPTURER LA CLASSE DEPUIS LES MÉTADONNÉES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, class_group)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student',
        COALESCE(NEW.raw_user_meta_data->>'class_group', '3ATELIOT')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        class_group = COALESCE(EXCLUDED.class_group, public.profiles.class_group);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. POLITIQUES RLS SUPPLÉMENTAIRES
DROP POLICY IF EXISTS "Lecture de son propre profil avec classe" ON public.profiles;
CREATE POLICY "Lecture de son propre profil avec classe"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Activation de la publication Realtime pour synchronisation instantanée du roster
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;
