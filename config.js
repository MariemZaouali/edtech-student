/**
 * CONFIGURATION SUPABASE & COURS - FRONTEND ÉTUDIANT
 * EdTech CodeLab Platform
 */

window.SUPABASE_CONFIG = {
    // URL et Clé Publique Supabase (anon_key sécurisée par RLS)
    URL: "https://jkusqsyrijmrngizmyeu.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdXNxc3lyaWptcm5naXpteWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMjgxODgsImV4cCI6MjEwNTgwNDE4OH0.ylnt4KRcZ4FBa6IWiyullae17xpuhD-j7QCYx8pZE4M",

    // Nom du bucket Supabase Storage pour les rendus
    STORAGE_BUCKET: "deliverables",

    // Nombre maximal de tentatives autorisées par exercice
    MAX_ATTEMPTS: 3,

    // =========================================================================
    // CATALOGUE DES MATIÈRES ET EXERCICES / ÉVALUATIONS
    // Vous pouvez facilement ajouter de nouvelles matières ou exercices ici !
    // =========================================================================
    COURSES: [
        {
            id: "genai",
            name: "GenAI",
            badge: "Intelligence Artificielle Générative",
            icon: "sparkles",
            description: "Modèles génératifs, Optimiseurs avancés & Vision par ordinateur",
            assignments: [
                {
                    id: "genai-optimizer",
                    title: "Optimizer",
                    course: "GenAI",
                    maxAttempts: 3,
                    acceptedTypes: [".json"],
                    typeLabel: "Fichier JSON (.json)",
                    badgeColor: "indigo",
                    icon: "sliders",
                    shortDescription: "Évaluation multicritère des algorithmes d'optimisation.",
                    fullDescription: "Déposez votre fichier au format <code>.json</code> contenant vos scores sur les 6 critères clés. Votre score final sera calculé automatiquement :<br/>" +
                        "<div class='mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-xs text-brand-300'>" +
                        "Final score = 0.20·R + 0.25·P + 0.30·A + 0.15·C + 0.05·S + 0.05·X" +
                        "</div>",
                    criteria: [
                        { key: "R", name: "Relevance", weight: "20%" },
                        { key: "P", name: "Pedagogical Quality", weight: "25%" },
                        { key: "A", name: "Technical Accuracy", weight: "30%" },
                        { key: "C", name: "Comparison & Critical Thinking", weight: "15%" },
                        { key: "S", name: "Support Quality", weight: "5%" },
                        { key: "X", name: "Sources & Reproducibility", weight: "5%" }
                    ],
                    templateFilename: "optimizer_submission_template.json",
                    templateContent: JSON.stringify({
                        relevance: 18.0,
                        pedagogical_quality: 17.5,
                        technical_accuracy: 19.0,
                        comparison_critical_thinking: 16.5,
                        support_quality: 15.0,
                        sources_reproducibility: 18.0,
                        comments: "Analyse comparative SGD vs AdamW sur paysage de perte non-convexe."
                    }, null, 2)
                },
                {
                    id: "genai-cnn-challenger",
                    title: "CNN Challenger",
                    course: "GenAI",
                    maxAttempts: 3,
                    acceptedTypes: [".csv"],
                    typeLabel: "Fichier de Prédictions CSV (.csv)",
                    badgeColor: "purple",
                    icon: "trophy",
                    shortDescription: "Défi de classification d'images & Leaderboard.",
                    fullDescription: "Déposez votre fichier <code>.csv</code> de prédictions sur le jeu de test secret. Il doit contenir au minimum les colonnes <code>id</code> et <code>predicted</code>.<br/>" +
                        "<div class='mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-xs text-purple-300'>" +
                        "id,predicted<br/>0,3<br/>1,8<br/>2,1<br/>...</div>",
                    templateFilename: "cnn_predictions_template.csv",
                    templateContent: "id,predicted\n0,3\n1,8\n2,1\n3,0\n4,7\n5,2"
                }
            ]
        }
    ],

    // Rétrocompatibilité : Liste aplatie de tous les devoirs
    get ASSIGNMENTS() {
        return this.COURSES.flatMap(course => course.assignments);
    }
};
