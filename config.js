/**
 * CONFIGURATION SUPABASE - FRONTEND ÉTUDIANT
 * 
 * ⚠️ Remplacez les valeurs ci-dessous par vos identifiants de projet Supabase :
 * Vous les trouverez dans votre console Supabase :
 * Project Settings -> API -> Project URL & Project API Keys (anon / public)
 */

window.SUPABASE_CONFIG = {
    // URL de votre projet Supabase (ex: "https://xyzcompany.supabase.co")
    URL: "https://jkusqsyrijmrngizmyeu.supabase.co",

    // Clé publique anonyme (ANON_KEY) - Sûre pour une utilisation côté client web
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXNxc3lyaWptcm5naXpteWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMjgxODgsImV4cCI6MjEwNTgwNDE4OH0.ylnt4KRcZ4FBa6IWiyullae17xpuhD-j7QCYx8pZE4M",

    // Nom du bucket de stockage pour les rendus
    STORAGE_BUCKET: "deliverables",

    // Liste des séances de cours disponibles
    ASSIGNMENTS: [
        {
            id: "session-1",
            title: "Séance 1 : Mécanisme d'attention des Transformers",
            description: "Implémentation de la Self-Attention & Multi-Head Attention en PyTorch.",
            acceptedTypes: [".py", ".ipynb"],
            typeLabel: "Script Python ou Notebook (.py, .ipynb)"
        },
        {
            id: "session-2",
            title: "Séance 2 : Classifieur CNN & Data Augmentation",
            description: "Entraînement d'un ResNet custom et visualisation des courbes de loss.",
            acceptedTypes: [".py", ".ipynb", ".png", ".jpg"],
            typeLabel: "Code (.py, .ipynb) ou Matrice de confusion (.png, .jpg)"
        },
        {
            id: "session-3",
            title: "Séance 3 : Fine-Tuning LLM & Adaptateurs LoRA",
            description: "Script d'entraînement LoRA avec HuggingFace Transformers & PEFT.",
            acceptedTypes: [".py", ".ipynb"],
            typeLabel: "Script Python ou Notebook (.py, .ipynb)"
        },
        {
            id: "session-4",
            title: "Séance 4 : Pipeline RAG & Recherche Vectorielle",
            description: "Construction d'un index vectoriel et synthèse de réponses avec embeddings.",
            acceptedTypes: [".py", ".ipynb"],
            typeLabel: "Script Python ou Notebook (.py, .ipynb)"
        },
        {
            id: "session-5",
            title: "Séance 5 : Synthèse d'images génératives (Diffusion Models)",
            description: "Rendu visuel d'un modèle génératif ou script de sampling.",
            acceptedTypes: [".png", ".jpg", ".jpeg", ".py", ".ipynb"],
            typeLabel: "Image générée (.png, .jpg) ou Script (.py)"
        }
    ]
};
