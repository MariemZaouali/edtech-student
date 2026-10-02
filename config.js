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
                    id: "genai-lstm-tikz",
                    title: "LSTM vs RNN (TikZ & Théorie)",
                    course: "GenAI",
                    maxAttempts: 3,
                    acceptedTypes: [".json"],
                    typeLabel: "Fichier JSON (.json)",
                    badgeColor: "emerald",
                    icon: "layers",
                    shortDescription: "Description des LSTMs et schéma TikZ comparatif (vs RNNs).",
                    fullDescription: "<div class='text-xs space-y-1.5'>" +
                        "<div><strong>Consigne officielle :</strong> <span class='px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold'>Submit a description of LSTMs and a Figure in TikZ format to explain the improvement of LSTMs over RNNs</span></div>" +
                        "<div>Déposez votre fichier <code>.json</code> contenant la description théorique des LSTMs, la justification de la résolution du vanishing gradient par rapport aux RNNs classiques, et votre code de figure au format <strong>TikZ</strong> (LaTeX).</div>" +
                        "<div class='p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-300'>" +
                        "Final score = 0.30·T + 0.25·A + 0.20·I + 0.15·P + 0.05·R + 0.05·X" +
                        "</div>" +
                        "<div class='text-[10px] text-slate-400'>T: Figure TikZ (Architecture & flux), A: Exactitude technique & Portes, I: Résolution du Vanishing Gradient (Amélioration vs RNN), P: Qualité pédagogique, R: Limites du RNN Vanilla, X: Références académiques</div>" +
                        "</div>",
                    criteria: [
                        { key: "T", name: "Figure TikZ (Schéma & Architecture)", weight: "30%" },
                        { key: "A", name: "Exactitude Technique & Équations des Portes", weight: "25%" },
                        { key: "I", name: "Amélioration vs RNN & Vanishing Gradient (CEC)", weight: "20%" },
                        { key: "P", name: "Qualité Pédagogique & Intuition", weight: "15%" },
                        { key: "R", name: "Rappel des Limites du RNN Classique", weight: "5%" },
                        { key: "X", name: "Sources & Références Académiques", weight: "5%" }
                    ],
                    templateFilename: "lstm_tikz_submission_template.json",
                    templateContent: JSON.stringify({
                        topic: "Submit a description of LSTMs and a Figure in TikZ format to explain the improvement of LSTMs over RNNs",
                        student_email: "votre.email@etudiant.univ.fr",
                        description: {
                            rnn_limitations: "Expliquez les limitations des RNNs classiques : problème d'évanouissement et d'explosion du gradient (vanishing/exploding gradient), multiplication répétée de matrices jacobiennes (W_hh)^T, et perte de mémoire à long terme.",
                            lstm_architecture: "Décrivez l'architecture générale de la cellule LSTM, la séparation entre Cell State (C_t) et Hidden State (h_t), et le rôle régulateur des différentes portes.",
                            gates_formulation: {
                                forget_gate: "f_t = \\sigma(W_f [h_{t-1}, x_t] + b_f) : régule l'oubli sélectif des informations passées du Cell State.",
                                input_gate: "i_t = \\sigma(W_i [h_{t-1}, x_t] + b_i) et \\tilde{C}_t = \\tanh(W_c [h_{t-1}, x_t] + b_c) : sélectionne les informations entrantes et prépare les candidats.",
                                cell_state_update: "C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t : autoroute à gradient additive empêchant la disparition exponentielle du gradient.",
                                output_gate: "o_t = \\sigma(W_o [h_{t-1}, x_t] + b_o) et h_t = o_t \\odot \\tanh(C_t) : filtre l'état de cellule pour produire la sortie masquée."
                            },
                            improvement_over_rnn: "Démontrez pourquoi le LSTM surmonte les limites du RNN : Constant Error Carousel (CEC), transport additif du gradient (dC_t / dC_{t-1} = f_t + ... au lieu de produits matriciels successifs), évitant la dégénérescence du gradient sur de longues séquences temporelles."
                        },
                        tikz_figure: "\\begin{tikzpicture}[\n  scale=0.85, every node/.style={transform shape},\n  cell/.style={rectangle, draw=black!70, fill=blue!5, very thick, rounded corners=8pt, minimum width=9cm, minimum height=6cm},\n  op/.style={circle, draw=black!80, fill=yellow!20, thick, minimum size=0.6cm, inner sep=0pt},\n  gate/.style={rectangle, draw=black!80, fill=orange!25, thick, rounded corners=3pt, minimum width=0.8cm, minimum height=0.6cm, font=\\small},\n  conn/.style={-stealth, thick, draw=black!75},\n  highway/.style={-stealth, very thick, draw=red!70!black}\n]\n  % Cell container\n  \\node[cell] (lstm) at (4,2.5) {};\n  \\node[above right, font=\\bfseries\\small, text=blue!80!black] at (lstm.north west) {Cellule LSTM};\n\n  % Inputs & States\n  \\node (x) at (1, -1.2) {$x_t$};\n  \\node (h_prev) at (-1.5, 0.5) {$h_{t-1}$};\n  \\node (c_prev) at (-1.5, 4.5) {$C_{t-1}$};\n\n  % Gates\n  \\node[gate] (f_gate) at (1.5, 1.8) {$\\sigma$};\n  \\node[below, font=\\scriptsize] at (f_gate.south) {Forget $f_t$};\n  \\node[gate] (i_gate) at (3.0, 1.8) {$\\sigma$};\n  \\node[below, font=\\scriptsize] at (i_gate.south) {Input $i_t$};\n  \\node[gate] (c_tilde) at (4.5, 1.8) {$\\tanh$};\n  \\node[below, font=\\scriptsize] at (c_tilde.south) {$\\tilde{C}_t$};\n  \\node[gate] (o_gate) at (6.0, 1.8) {$\\sigma$};\n  \\node[below, font=\\scriptsize] at (o_gate.south) {Output $o_t$};\n\n  % Cell State Highway Operations\n  \\node[op] (mult_c) at (1.5, 4.5) {$\\odot$};\n  \\node[op] (add_c) at (3.75, 4.5) {$\\oplus$};\n  \\node (c_next) at (9.5, 4.5) {$C_t$};\n\n  % Hidden State Operations\n  \\node[op] (mult_i_c) at (3.75, 3.2) {$\\odot$};\n  \\node[gate] (tanh_c) at (6.8, 3.5) {$\\tanh$};\n  \\node[op] (mult_h) at (6.8, 0.5) {$\\odot$};\n  \\node (h_next) at (9.5, 0.5) {$h_t$};\n\n  % Gradient Highway\n  \\draw[highway] (c_prev) -- (mult_c);\n  \\draw[highway] (mult_c) -- node[above, font=\\scriptsize, text=red!60!black] {CEC : Autoroute additive du gradient} (add_c);\n  \\draw[highway] (add_c) -- (c_next);\n\n  % Feedforward & Gating\n  \\draw[conn] (x) |- (f_gate);\n  \\draw[conn] (x) |- (i_gate);\n  \\draw[conn] (x) |- (c_tilde);\n  \\draw[conn] (x) |- (o_gate);\n  \\draw[conn] (h_prev) -- (0.5, 0.5) |- (f_gate);\n  \\draw[conn] (0.5, 0.5) |- (i_gate);\n  \\draw[conn] (0.5, 0.5) |- (c_tilde);\n  \\draw[conn] (0.5, 0.5) |- (o_gate);\n\n  \\draw[conn] (f_gate) -- (mult_c);\n  \\draw[conn] (i_gate) |- (mult_i_c);\n  \\draw[conn] (c_tilde) |- (mult_i_c);\n  \\draw[conn] (mult_i_c) -- (add_c);\n\n  \\draw[conn] (add_c.east) -| (tanh_c.north);\n  \\draw[conn] (tanh_c) -- (mult_h);\n  \\draw[conn] (o_gate) |- (mult_h);\n  \\draw[conn] (mult_h) -- (h_next);\n\\end{tikzpicture}",
                        references: [
                            "Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory. Neural computation, 9(8), 1735-1780.",
                            "Gers, F. A., Schmidhuber, J., & Cummins, F. (2000). Learning to forget: Continual prediction with LSTM.",
                            "Olah, C. (2015). Understanding LSTM Networks."
                        ]
                    }, null, 2)
                },
                {
                    id: "genai-qcm-ar-llm",
                    title: "QCM : Modèles Autorégressifs (AR LLMs)",
                    course: "GenAI",
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
    }
};
