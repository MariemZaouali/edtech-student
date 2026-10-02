# Guide de Déploiement : Frontend Étudiant (GitHub Pages)

Ce sous-dossier contient l'application web statique destinée aux étudiants, prête à être hébergée gratuitement sur **GitHub Pages**.

---

## 🚀 Déploiement en 3 étapes simples sur GitHub Pages

### 1. Configuration des Clés Supabase
Ouvrez le fichier `config.js` et renseignez vos identifiants Supabase (disponibles dans votre console Supabase > *Project Settings* > *API*) :

```javascript
window.SUPABASE_CONFIG = {
    URL: "https://votre-projet.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Clé anon/public uniquement !
    STORAGE_BUCKET: "deliverables"
};
```

> **Note de sécurité :** La clé `ANON_KEY` est publique par conception. La sécurité des données et des notes est garantie à 100% par les règles **Row Level Security (RLS)** configurées dans PostgreSQL.

---

### 2. Publication sur GitHub

1. Créez un dépôt GitHub public ou privé (ex: `mon-cours-edtech`).
2. Poussez le contenu du dossier `student-frontend` à la racine de votre dépôt (ou dans une branche dédiée `gh-pages` / dossier `docs`) :

```bash
git init
git add .
git commit -m "feat: Initialisation frontend étudiant"
git branch -M main
git remote add origin https://github.com/<VOTRE_PSEUDO>/<VOTRE_REPO>.git
git push -u origin main
```

---

### 3. Activation de GitHub Pages

1. Sur votre dépôt GitHub, allez dans l'onglet **Settings** > **Pages**.
2. Dans la section **Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` / `root` (ou `/docs`)
3. Cliquez sur **Save**.
4. En quelques secondes, votre application est accessible en direct à l'adresse :  
   `https://<VOTRE_PSEUDO>.github.io/<VOTRE_REPO>/`

---

## 🧪 Test Local Rapide

Pour tester le frontend étudiant en local avant de le déployer, vous pouvez utiliser n'importe quel serveur web local :

```bash
# Avec Python 3 :
python -m http.server 8000

# Ou avec Node.js (npx) :
npx serve .
```
Puis ouvrez `http://localhost:8000` dans votre navigateur.
