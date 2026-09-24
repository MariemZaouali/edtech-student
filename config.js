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
                    shortDescription: "Sujet : Vanilla Gradient, SGD, AdamW.",
                    fullDescription: "<div class='text-xs space-y-1.5'>" +
                        "<div><strong>Énoncé officiel :</strong> <span class='px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold'>Vanilla Gradient, SGD, AdamW</span></div>" +
                        "<div>Déposez votre fichier <code>.json</code> analysant et comparant ces 3 optimiseurs. Votre note est calculée selon le barème officiel :</div>" +
                        "<div class='p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-brand-300'>" +
                        "Final score = 0.20·R + 0.25·P + 0.30·A + 0.15·C + 0.05·S + 0.05·X" +
                        "</div>" +
                        "<div class='text-[10px] text-slate-400'>R: Relevance (3 optimiseurs), P: Qualité pédagogique, A: Exactitude technique, C: Esprit critique & Comparaison, S: Supports/Formules, X: Sources</div>" +
                        "</div>",
                    criteria: [
                        { key: "R", name: "Relevance (Vanilla, SGD, AdamW)", weight: "20%" },
                        { key: "P", name: "Pedagogical Quality", weight: "25%" },
                        { key: "A", name: "Technical Accuracy", weight: "30%" },
                        { key: "C", name: "Comparison & Critical Thinking", weight: "15%" },
                        { key: "S", name: "Support Quality", weight: "5%" },
                        { key: "X", name: "Sources & Reproducibility", weight: "5%" }
                    ],
                    templateFilename: "optimizer_submission_template.json",
                    templateContent: JSON.stringify({
                        topic: "Vanilla Gradient, SGD, AdamW",
                        student: "etudiant@univ.fr",
                        vanilla_gradient: {
                            definition: "Descente de gradient classique (Batch Gradient Descent) calculée sur l'intégralité du dataset.",
                            mechanism: "Mise à jour déterministe θ = θ - η * ∇L(θ). Vitesse stable mais coûteuse en mémoire et sensible aux plateaux/minima locaux."
                        },
                        sgd: {
                            definition: "Stochastic Gradient Descent avec mini-batchs.",
                            mechanism: "Gradient bruité agissant comme régularisateur naturel. Utilisation du Momentum pour accélérer la convergence dans les ravines."
                        },
                        adamw: {
                            definition: "Optimiseur adaptatif avec découplage du Weight Decay.",
                            mechanism: "Combinaison des moyennes mobiles du gradient (moment 1) et du carré des gradients (moment 2). Découplage strict de la régularisation L2 et de la mise à jour adaptative (Loshchilov & Hutter 2017)."
                        },
                        comparison_and_critical_thinking: "AdamW converge beaucoup plus vite sur les Transformers et LLMs mais nécessite 2 tenseurs d'état supplémentaires (mémoire x3). SGD généralise parfois mieux sur les architectures CNN classiques de vision.",
                        formulas_and_support: "Vanilla: θ_{t+1} = θ_t - η ∇L(θ_t) | SGD+Momentum: v_{t+1} = γ v_t + η ∇L(θ_t) | AdamW: θ_{t+1} = θ_t(1 - η λ) - η m̂_t / (√v̂_t + ε)",
                        sources_and_reproducibility: [
                            "Loshchilov & Hutter (2017) Decoupled Weight Decay Regularization (AdamW)",
                            "Kingma & Ba (2014) Adam: A Method for Stochastic Optimization",
                            "Documentation PyTorch: torch.optim.AdamW et torch.optim.SGD"
                        ]
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
