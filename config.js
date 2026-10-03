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
            description: "Modèles génératifs, Optimiseurs avancés, Vision par ordinateur, LSTMs & QCM AR LLMs",
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
                        student_email: "votre.email@etudiant.univ.fr",
                        analysis: {
                            vanilla_gradient: "Décrivez ici le fonctionnement, les caractéristiques et les limites de Vanilla Gradient...",
                            sgd: "Décrivez ici le fonctionnement de SGD et ses variantes (bruit stochastique, momentum...)...",
                            adamw: "Décrivez ici le fonctionnement d'AdamW et la spécificité du découplage du Weight Decay..."
                        }
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
                },
                {
                    id: "genai-qcm-ar-llm",
                    title: "QCM : Modèles Autorégressifs (AR LLMs)",
                    course: "GenAI",
                    hidden: true,  // Masqué temporairement du dépôt distant
                    isQuiz: true,
                    timePerQuestionSeconds: 120, // 2 min par question
                    totalTimeSeconds: 1200,      // 20 min au total pour 10 questions
                    maxAttempts: 3,
                    acceptedTypes: [".json"],
                    typeLabel: "QCM Interactif / JSON (.json)",
                    badgeColor: "amber",
                    icon: "help-circle",
                    shortDescription: "Démo 3.3 : Prétraitement, modélisation autorégressive & décodage (10 questions chronométrées).",
                    fullDescription: "<div class='text-xs space-y-1.5'>" +
                        "<div><strong>Évaluation :</strong> <span class='px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold'>QCM : Démo 3.3 - Modèles de Langage Autorégressifs (AR LLMs)</span></div>" +
                        "<div>10 questions à choix multiple réparties en 4 sections techniques.</div>" +
                        "<div class='p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-amber-300 space-y-0.5'>" +
                        "<div>⏱️ <strong>Chronomètre global :</strong> 20 minutes (2 min / question en moyenne).</div>" +
                        "<div>🔄 <strong>Navigation :</strong> Vous pouvez passer une question et y revenir à tout moment.</div>" +
                        "<div>⚠️ <strong>Temps écoulé :</strong> Le QCM se clôture automatiquement et soumet vos réponses.</div>" +
                        "<div>🎯 <strong>Notation :</strong> 2 points par réponse exacte (Note finale sur 20).</div>" +
                        "</div>" +
                        "</div>",
                    questions: [
                        {
                            id: "Q1",
                            section: "Section 1 : Prétraitement et Préparation des Données",
                            question: "Dans la fonction deduplicate_lines, quelle est la limitation principale du nettoyage proposé ?",
                            options: [
                                { key: "A", text: "Elle supprime les lignes ayant des ponctuations différentes." },
                                { key: "B", text: "Elle ne détecte que les doublons exacts (ou insensibles à la casse) et manque les doublons proches (near-duplicates)." },
                                { key: "C", text: "Elle modifie définitivement la casse du texte original dans la liste de sortie." },
                                { key: "D", text: "Elle s'exécute avec une complexité algorithmique en O(n²)." }
                            ]
                        },
                        {
                            id: "Q2",
                            section: "Section 1 : Prétraitement et Préparation des Données",
                            question: "Quel est le rôle de l'ajout du jeton 0 à la fin de chaque ligne dans tokenize_dataset ?",
                            options: [
                                { key: "A", text: "Servir de masque pour l'attention causale du Transformer." },
                                { key: "B", text: "Indiquer la fin d'un mot et séparer les caractères." },
                                { key: "C", text: "Servir de séparateur de fin de séquence/ligne (EOS / End-Of-Sentence) lors de la concaténation." },
                                { key: "D", text: "Représenter les mots absents du vocabulaire (Out-Of-Vocabulary)." }
                            ]
                        },
                        {
                            id: "Q3",
                            section: "Section 1 : Prétraitement et Préparation des Données",
                            question: "Que réalise la fonction chunkify lorsque la longueur d'un segment est inférieure à max_seq_length ?",
                            options: [
                                { key: "A", text: "Elle supprime le segment incomplet du dataset." },
                                { key: "B", text: "Elle répète le segment jusqu'à atteindre la longueur max_seq_length." },
                                { key: "C", text: "Elle complète le segment avec des jetons 0 (padding)." },
                                { key: "D", text: "Elle lève une erreur de dimension PyTorch." }
                            ]
                        },
                        {
                            id: "Q4",
                            section: "Section 2 : Modélisation Autorégressive",
                            question: "Quelle équation régit la probabilité conjointe P(x₁, x₂, ..., x_T) d'une séquence dans un modèle autorégressif ?",
                            options: [
                                { key: "A", text: "P(x₁, x₂, ..., x_T) = ∑_{t=1}^T P(x_t)" },
                                { key: "B", text: "P(x₁, x₂, ..., x_T) = ∏_{t=1}^T P(x_t | x₁, ..., x_{t-1})" },
                                { key: "C", text: "P(x₁, x₂, ..., x_T) = ∏_{t=1}^T P(x_t | x_{t+1}, ..., x_T)" },
                                { key: "D", text: "P(x₁, x₂, ..., x_T) = (1/T) ∑_{t=1}^T P(x_t | x₁)" }
                            ]
                        },
                        {
                            id: "Q5",
                            section: "Section 2 : Modélisation Autorégressive",
                            question: "Pourquoi la classe ToyARModel utilise-t-elle torch.randn dans sa méthode forward ?",
                            options: [
                                { key: "A", text: "Pour simuler l'effet du Dropout pendant l'entraînement." },
                                { key: "B", text: "Pour injecter du bruit gaussien dans l'espace d'embedding." },
                                { key: "C", text: "Pour générer des logits aléatoires sans nécessiter un véritable réseau entraîné." },
                                { key: "D", text: "Pour initialiser les poids d'un mécanisme d'attention." }
                            ]
                        },
                        {
                            id: "Q6",
                            section: "Section 3 : Algorithmes de Décodage",
                            question: "Quelle est la différence majeure entre le Greedy Decoding et le Beam Search ?",
                            options: [
                                { key: "A", text: "Le Greedy Decoding conserve B hypothèses en parallèle à chaque étape." },
                                { key: "B", text: "Le Beam Search choisit uniquement le jeton ayant la plus haute probabilité à l'instant t." },
                                { key: "C", text: "Le Greedy Decoding explore plusieurs chemins futurs, tandis que le Beam Search n'en explore qu'un seul." },
                                { key: "D", text: "Le Beam Search maintient les B meilleures séquences partielles pour maximiser la probabilité globale." }
                            ]
                        },
                        {
                            id: "Q7",
                            section: "Section 3 : Algorithmes de Décodage",
                            question: "Dans beam_search_decode, pourquoi additionne-t-on les log-probabilités (math.log(...)) au lieu de multiplier les probabilités ?",
                            options: [
                                { key: "A", text: "Pour accélérer le calcul en évitant les opérations matricielles." },
                                { key: "B", text: "Pour prévenir le sous-dimensionnement numérique (underflow) causé par la multiplication de petites probabilités P ∈ [0, 1]." },
                                { key: "C", text: "Parce que la fonction Softmax requiert des entrées logarithmiques." },
                                { key: "D", text: "Pour transformer la recherche en un problème de maximisation quadratique." }
                            ]
                        },
                        {
                            id: "Q8",
                            section: "Section 3 : Algorithmes de Décodage",
                            question: "Dans top_k_sampling, quelle est la raison de l'instruction topk_probs = topk_probs / topk_probs.sum() ?",
                            options: [
                                { key: "A", text: "Appliquer un facteur de température au décodage." },
                                { key: "B", text: "Convertir les logits bruts en valeurs logit négatives." },
                                { key: "C", text: "Renormaliser la somme des k meilleures probabilités à 1 pour former une distribution valide." },
                                { key: "D", text: "Réduire la variance de l'échantillonnage multinomial." }
                            ]
                        },
                        {
                            id: "Q9",
                            section: "Section 4 : Speculative Decoding",
                            question: "Quel est le principe fondamental du Speculative Decoding ?",
                            options: [
                                { key: "A", text: "Remplacer le Transformer par un modèle de régression linéaire." },
                                { key: "B", text: "Utiliser un petit modèle rapide pour proposer N jetons, puis les valider/rejeter en parallèle avec un grand modèle." },
                                { key: "C", text: "Entraîner deux grands modèles en parallèle pour moyenner leurs prédictions." },
                                { key: "D", text: "Prédire l'ensemble du texte en une seule passe sans étape autorégressive." }
                            ]
                        },
                        {
                            id: "Q10",
                            section: "Section 4 : Speculative Decoding",
                            question: "Dans le code de speculative_decode, sous quelle condition la proposition du petit modèle (top_cand) est-elle acceptée ?",
                            options: [
                                { key: "A", text: "Si la probabilité attribuée par le grand modèle est exactement égale à 1." },
                                { key: "B", text: "Si le tirage aléatoire random.random() est inférieur au ratio P_large(token) / P_small(token)." },
                                { key: "C", text: "Si le petit modèle et le grand modèle prédisent exactement le même jeton." },
                                { key: "D", text: "Si l'indice du jeton est strictement inférieur à la taille du vocabulaire V." }
                            ]
                        }
                    ],
                    templateFilename: "qcm_ar_llms_submission_template.json",
                    templateContent: JSON.stringify({
                        topic: "QCM : Démo 3.3 - Modèles de Langage Autorégressifs (AR LLMs)",
                        student_email: "votre.email@etudiant.univ.fr",
                        answers: {
                            Q1: "B",
                            Q2: "C",
                            Q3: "C",
                            Q4: "B",
                            Q5: "C",
                            Q6: "D",
                            Q7: "B",
                            Q8: "C",
                            Q9: "B",
                            Q10: "B"
                        }
                    }, null, 2)
                }
            ]
        }
    ],

    // Rétrocompatibilité : Liste aplatie de tous les devoirs
    get ASSIGNMENTS() {
        return this.COURSES.flatMap(course => course.assignments);
    },

    // Noms d'exercices à masquer de l'interface (dropdown ET historique)
    // Mettre à [] pour tout réafficher
    HIDDEN_ASSIGNMENT_NAMES: [
        "QCM : Modèles Autorégressifs (AR LLMs)",
        "LSTM vs RNN (TikZ & Théorie)"
    ]
};
