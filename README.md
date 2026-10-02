# 🎓 EdTech CodeLab • Plateforme d'Évaluation de Cours de Code & IA

Une architecture MVP moderne, sécurisée et scindée en deux environnements distincts, exploitant la formule gratuite de **Supabase** (Auth, PostgreSQL, Storage, Realtime) :
1. **Frontend Étudiant (Web / GitHub Pages)** : Interface moderne et réactive pour soumettre des devoirs et suivre ses notes en direct.
2. **Dashboard Enseignant (Local uniquement)** : Outil de supervision super-admin avec analyse statique de code Python / Notebooks / Images, validation de notes et export Excel / CSV.

---

## 🏗️ Schéma d'Architecture & Flux de Données

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │               ENVIRONNEMENT ÉTUDIANT (Hébergé sur GitHub Pages)         │
 │                                                                         │
 │  [ Navigateur Web Étudiant ]                                            │
 │   • Auth (Email / Mot de passe)                                         │
 │   • Drag & Drop (.py, .ipynb, .png, .jpg)                               │
 │   • Clé publique : ANON_KEY                                             │
 │   • Realtime WebSocket : Notification instantanée des notes             │
 └─────────────────┬───────────────────────────────────▲───────────────────┘
                   │ 1. Upload Fichier                 │ 5. Notification Temps Réel
                   │ 2. Insert Submission              │    (postgres_changes)
                   ▼                                   │
 ┌─────────────────────────────────────────────────────┴───────────────────┐
 │                     INFRASTRUCTURE SUPABASE (Cloud Gratuit)             │
 │                                                                         │
 │  • PostgreSQL Database :                                                │
 │      - Table `profiles` (RLS strict)                                    │
 │      - Table `submissions` (RLS : grade/status non modifiables)         │
 │  • Storage Bucket `deliverables` (RLS par dossier étudiant)              │
 │  • Supabase Realtime Publication                                        │
 └─────────────────▲───────────────────────────────────────────────────────┘
                   │ 3. Fetch all deliverables & files
                   │ 4. Update grade & feedback (Bypass RLS)
 ┌─────────────────┴───────────────────────────────────────────────────────┐
 │               ENVIRONNEMENT ENSEIGNANT (Machine Locale Uniquement)      │
 │                                                                         │
 │  [ Dashboard Enseignant - Streamlit ou HTML Local ]                     │
 │   • Clé super-admin : SERVICE_ROLE_KEY                                  │
 │   • Moteur d'analyse locale (`grader.py` : AST Python, syntaxes, images)│
 │   • Validation et attribution des notes                                 │
 │   • Export instantané Excel (.xlsx) & CSV                               │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des Fichiers

```text
edtech-eval-platform/
│
├── student-frontend/                 # Frontend Web Étudiant (Statique / GitHub Pages)
│   ├── index.html                    # Interface HTML5 / Tailwind CSS moderne
│   ├── app.js                        # Auth, Drag & Drop, Supabase Storage & Realtime
│   ├── config.js                     # URL et ANON_KEY Supabase
│   └── README.md                     # Guide de déploiement GitHub Pages
│
├── teacher-dashboard/                # Dashboard Enseignant (Local uniquement)
│   ├── app.py                        # Application Streamlit riche & interactive
│   ├── grader.py                     # Moteur d'évaluation locale et d'analyse statique
│   ├── dashboard.html                # Version Web locale autonome avec SheetJS
│   ├── requirements.txt              # Dépendances Python (Streamlit, Supabase, etc.)
│   ├── .env.example                  # Modèle pour SUPABASE_SERVICE_ROLE_KEY
│   └── README.md                     # Guide d'exécution locale
│
├── supabase/                         # Configuration Base de données & Sécurité
│   ├── schema.sql                    # Script SQL complet (Tables, RLS, Storage, Realtime)
│   └── seed.sql                      # Données de test / gabarit
│
└── README.md                         # Documentation générale du projet
```

---

## ⚡ Guide d'Installation Étape par Étape

### ÉTAPE 1 : Configuration du projet Supabase (2 minutes)
1. Rendez-vous sur [Supabase.com](https://supabase.com) et créez un projet gratuit (ex: `edtech-codelab`).
2. Dans le menu de gauche, ouvrez l'onglet **SQL Editor**.
3. Copiez l'intégralité du contenu du fichier [`supabase/schema.sql`](file:///C:/Users/BMN/.gemini/antigravity-ide/scratch/edtech-eval-platform/supabase/schema.sql) et cliquez sur **Run**.
   - *Ce script configure les tables `profiles` et `submissions`, le bucket de stockage `deliverables`, les règles de sécurité RLS et le canal temps réel.*
4. Allez dans **Project Settings** > **API** et récupérez :
   - **Project URL**
   - **anon / public key**
   - **service_role key** (gardez-la secrète pour le dashboard enseignant)

---

### ÉTAPE 2 : Déploiement du Frontend Étudiant sur GitHub Pages
1. Ouvrez [`student-frontend/config.js`](file:///C:/Users/BMN/.gemini/antigravity-ide/scratch/edtech-eval-platform/student-frontend/config.js).
2. Remplacez `URL` et `ANON_KEY` par les identifiants de votre projet Supabase.
3. Poussez le dossier `student-frontend` sur votre dépôt GitHub.
4. Dans votre dépôt GitHub : **Settings** > **Pages** > sélectionnez la branche `main` / dossier racine > **Save**.
5. Votre portail étudiant est immédiatement accessible aux élèves !

---

### ÉTAPE 3 : Lancement du Dashboard Enseignant en Local
1. Ouvrez un terminal sur votre machine dans le dossier `teacher-dashboard` :
```bash
cd teacher-dashboard
pip install -r requirements.txt
```
2. Créez un fichier `.env` avec vos identifiants :
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_cle_secrete_service_role
```
3. Lancez l'application Streamlit :
```bash
streamlit run app.py
```
4. Vous pouvez désormais visualiser tous les rendus, lancer l'analyseur automatique, saisir vos notes et exporter le fichier Excel de la classe en 1 clic !

> **Alternative sans installation Python :** Vous pouvez aussi ouvrir directement le fichier [`teacher-dashboard/dashboard.html`](file:///C:/Users/BMN/.gemini/antigravity-ide/scratch/edtech-eval-platform/teacher-dashboard/dashboard.html) dans votre navigateur web favori et renseigner vos clés dans le modal dédié.

---

## 🛡️ Modèle de Sécurité & RLS (Row Level Security)

| Rôle | Table / Ressource | Droits autorisés | Restrictions strictes |
| :--- | :--- | :--- | :--- |
| **Étudiant** (`authenticated` avec `ANON_KEY`) | `submissions` | `SELECT` (ses propres devoirs), `INSERT` | **Interdiction totale de modifier** `grade` ou `status`. La tentative de mise à jour échoue silencieusement ou est rejetée par RLS. |
| **Étudiant** (`authenticated` avec `ANON_KEY`) | Storage `deliverables` | `INSERT` (dans son sous-dossier `userId/*`), `SELECT` | Ne peut pas écraser les fichiers d'autres étudiants. |
| **Enseignant** (`service_role_key` en local) | Toutes les tables & Storage | **Tous les droits (Super-Admin)** | Contourne RLS pour attribuer les notes, corriger et exporter les données de toute la classe. |
