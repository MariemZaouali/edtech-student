# Dashboard Enseignant & Évaluation Locale

Ce dossier contient l'outil de correction et de notation destiné à être exécuté **exclusivement sur la machine de l'enseignant** en local.

---

## 🔒 Sécurité et Clé Service Role

Le dashboard utilise la clé secrète **`SUPABASE_SERVICE_ROLE_KEY`**. Cette clé possède les pleins droits administrateur (bypass de Row Level Security), ce qui lui permet :
- De lire toutes les soumissions de tous les étudiants de la classe.
- De modifier le champ protégé `grade` (note finale) et `feedback`.
- De publier les notes instantanément vers les étudiants connectés en temps réel.

---

## 🚀 Option 1 : Lancer l'application Python Streamlit (Recommandé)

### 1. Installation des dépendances
```bash
cd teacher-dashboard
pip install -r requirements.txt
```

### 2. Configuration des clés
Créez un fichier `.env` à partir du modèle `.env.example` :
```bash
cp .env.example .env
```
Éditez `.env` et renseignez votre `SUPABASE_URL` et votre `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Lancement du Dashboard
```bash
streamlit run app.py
```
L'interface s'ouvrira automatiquement dans votre navigateur à l'adresse `http://localhost:8501`.

---

## 🌐 Option 2 : Utiliser le Dashboard Web Local Autonome (`dashboard.html`)

Si vous ne souhaitez pas installer Python ou Streamlit :
1. Double-cliquez simplement sur `dashboard.html` pour l'ouvrir dans votre navigateur (Chrome, Firefox, Edge, Safari).
2. Cliquez sur **"Clés API"** en haut à droite et collez votre `SUPABASE_URL` et votre `SUPABASE_SERVICE_ROLE_KEY`.
3. Évaluez, notez et exportez directement en Excel (.xlsx) et CSV grâce à SheetJS intégré.

---

## 📊 Fonctionnalités incluses

- **Gestion de la Classe (3ATELIOT) & Importation CSV** :
  - **Importation 1-clic par CSV** : Importez la liste d'une classe (`3ATELIOT`) avec colonnes (`email`, `nom`, `prenom`, `classe`), prévisualisation en direct et création automatique des comptes Supabase Auth.
  - **Envoi Groupé des Mots de Passe (Password Reset)** : Déclenchement de l'envoi d'emails de réinitialisation/activation à toute la promotion ou à une sélection d'étudiants, avec génération de liens magiques directs téléchargeables en CSV (utile en cas de filtrage anti-spam universitaire).
  - **Annuaire & Suivi de la Promotion** : Suivi des effectifs, filtrage par classe, actions individuelles et export du roster.
- **Évaluation par IA Cloud Gemini & Moteur Local (`grader.py`)** :
  - **Exercice Optimizer (Vanilla Gradient, SGD, AdamW)** : Évaluation sémantique multicritère selon la formule `0.20*R + 0.25*P + 0.30*A + 0.15*C + 0.05*S + 0.05*X`.
  - **Exercice LSTM vs RNN (Figure TikZ & Théorie)** : Analyse de la description théorique des LSTMs, validation de la syntaxe et des composantes du schéma LaTeX TikZ, justification du Vanishing Gradient (Constant Error Carousel / CEC) selon la formule `0.30*T + 0.25*A + 0.20*I + 0.15*P + 0.05*R + 0.05*X`.
  - **Exercice QCM : Démo 3.3 - Modèles Autorégressifs (AR LLMs)** : Évaluation instantanée et automatique des 10 questions du QCM (Prétraitement, modélisation causale, décodage glouton/beam/top-k/spéculatif) sur 20 points (2 pts / question) avec tableau comparatif et justifications pédagogiques officielles.
- **Analyse Statique Locale (`grader.py`)** : Détection de concepts PyTorch, Transformers, Deep Learning, vérification de syntaxe sans exécuter de code non fiable, calcul automatique de l'Accuracy CNN avec labels secrets `labels_hidden.pt`.
- **Gestion Complète des Tentatives & Quotas** :
  - **Suppression d'une tentative** : Supprime la soumission erronée et libère immédiatement le créneau de l'étudiant.
  - **Ajout de tentatives bonus** : Permet à l'enseignant d'accorder +1, +2 ou +N tentatives supplémentaires à un étudiant pour un exercice donné via l'onglet dédié ou directement lors de la correction.
  - **Réinitialisation à zéro** des tentatives en cas de besoin technique.
- **Validation & Synchronisation Directe** : Modification manuelle de la note et des feedbacks, publication instantanée sur Supabase Realtime.
- **Leaderboard CNN Challenger** : Classement en direct de la classe basé sur la meilleure performance parmi les tentatives autorisées.
- **Exportation 1-Clic** : Téléchargement instantané des notes au format **Excel (.xlsx)** et **CSV**.

---

## 🛠️ Utilisation en Ligne de Commande (`manage_students.py`)

Vous pouvez également gérer les étudiants et envoyer les resets directement depuis le terminal :

```bash
# 1. Lister les profils enregistrés
python manage_students.py --list

# 2. Importer une liste CSV pour la classe 3ATELIOT
python manage_students.py --import-csv liste_etudiants.csv --class-name 3ATELIOT

# 3. Envoyer les emails de reset de mot de passe à TOUS les étudiants
python manage_students.py --reset-all

# 4. Envoyer un reset à une adresse email spécifique
python manage_students.py --reset-email etudiant@enit.utm.tn
```
