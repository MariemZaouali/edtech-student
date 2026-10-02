"""
GESTIONNAIRE DES ÉTUDIANTS & RÉINITIALISATION DE MOT DE PASSE (CLI & MODULE)
EdTech CodeLab • Promotion / Classe (par défaut: 3ATELIOT)
Permet :
1. D'importer une liste d'étudiants via fichier CSV ou liste d'adresses email.
2. De créer automatiquement les comptes Supabase Auth si inexistants.
3. D'envoyer des emails de réinitialisation de mot de passe (ou de générer des liens directs de reset).
4. De lister et synchroniser les profils et classes (3ATELIOT).
"""

import os
import sys
import csv
import io
import argparse
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Chargement de la configuration
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DEFAULT_SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jkusqsyrijmrngizmyeu.supabase.co")
DEFAULT_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

class StudentManager:
    def __init__(self, supabase_url: str = None, service_key: str = None):
        self.url = (supabase_url or DEFAULT_SUPABASE_URL).rstrip("/")
        self.key = service_key or DEFAULT_SERVICE_KEY
        if not self.key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY manquante. Renseignez-la dans .env ou en paramètre.")
        
        self.client: Client = create_client(self.url, self.key)
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }

    def get_all_profiles(self):
        """Récupère tous les profils étudiants depuis la table public.profiles"""
        try:
            res = self.client.table("profiles").select("*").order("email").execute()
            return res.data or []
        except Exception as e:
            print(f"[!] Erreur récupération profils: {e}")
            return []

    def get_all_auth_users(self):
        """Récupère la liste de tous les utilisateurs auth via l'API Admin Supabase"""
        try:
            url = f"{self.url}/auth/v1/admin/users?per_page=1000"
            r = requests.get(url, headers=self.headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                return data.get("users", [])
        except Exception as e:
            print(f"[!] Erreur get_all_auth_users: {e}")
        return []

    def ensure_class_column(self):
        """Vérifie / met à jour les profils pour supporter class_group"""
        pass

    def create_or_update_student(self, email: str, full_name: str = None, class_group: str = "3ATELIOT", auto_confirm: bool = True):
        """
        Crée ou met à jour un compte étudiant dans Supabase Auth et public.profiles
        """
        email = email.strip().lower()
        if not email or "@" not in email:
            return False, f"Email invalide : '{email}'", None

        full_name = full_name.strip() if full_name else email.split("@")[0].replace(".", " ").title()
        class_group = (class_group or "3ATELIOT").strip()

        # 1. Vérifier si l'utilisateur existe dans Auth
        user_id = None
        auth_created = False
        try:
            # Création dans auth.users via Admin API REST
            create_url = f"{self.url}/auth/v1/admin/users"
            payload = {
                "email": email,
                "email_confirm": auto_confirm,
                "user_metadata": {
                    "full_name": full_name,
                    "class_group": class_group,
                    "role": "student"
                }
            }
            r = requests.post(create_url, headers=self.headers, json=payload, timeout=10)
            if r.status_code in (200, 201):
                res_data = r.json()
                user_id = res_data.get("id")
                auth_created = True
            elif r.status_code == 422 or "already registered" in r.text.lower() or "duplicate" in r.text.lower():
                # L'utilisateur existe déjà
                pass
            else:
                pass
        except Exception as e:
            pass

        # 2. Synchroniser dans public.profiles
        profile_data = {
            "email": email,
            "full_name": full_name,
            "role": "student"
        }
        # Tenter d'ajouter class_group
        try:
            p_payload = dict(profile_data)
            p_payload["class_group"] = class_group
            if user_id:
                p_payload["id"] = user_id
            self.client.table("profiles").upsert(p_payload, on_conflict="email").execute()
        except Exception:
            # Fallback si colonne class_group n'existe pas encore
            try:
                if user_id:
                    profile_data["id"] = user_id
                self.client.table("profiles").upsert(profile_data, on_conflict="email").execute()
            except Exception as e2:
                print(f"[!] Info profile sync {email}: {e2}")

        return True, ("Compte créé" if auth_created else "Compte existant mis à jour"), user_id

    def send_password_reset(self, email: str, redirect_to: str = None):
        """
        Envoie un email de réinitialisation de mot de passe à l'étudiant via Supabase Auth
        et génère également le lien de récupération direct (magic link).
        """
        email = email.strip().lower()
        if not email or "@" not in email:
            return False, "Email invalide", None

        # 1. Envoi du mail de réinitialisation standard Supabase
        mail_sent = False
        mail_msg = ""
        try:
            recover_url = f"{self.url}/auth/v1/recover"
            payload = {"email": email}
            if redirect_to:
                payload["redirect_to"] = redirect_to
            r = requests.post(recover_url, headers=self.headers, json=payload, timeout=10)
            if r.status_code in (200, 204):
                mail_sent = True
                mail_msg = "Email de réinitialisation envoyé avec succès."
            else:
                mail_msg = f"Erreur envoi email (Code {r.status_code}): {r.text}"
        except Exception as e:
            mail_msg = f"Exception envoi email: {e}"

        # 2. Génération du lien direct de récupération (Admin API)
        action_link = None
        try:
            gen_url = f"{self.url}/auth/v1/admin/generate_link"
            gen_payload = {
                "type": "recovery",
                "email": email
            }
            if redirect_to:
                gen_payload["redirect_to"] = redirect_to
            r_gen = requests.post(gen_url, headers=self.headers, json=gen_payload, timeout=10)
            if r_gen.status_code == 200:
                data = r_gen.json()
                action_link = data.get("properties", {}).get("action_link") or data.get("action_link")
        except Exception as e:
            pass

        return mail_sent or bool(action_link), mail_msg, action_link

    def parse_csv_students(self, csv_content: str, default_class: str = "3ATELIOT"):
        """
        Parse un flux CSV (texte) et extrait les colonnes email, full_name/nom, prenom, class_group.
        Supporte les séparateurs virgule (,), point-virgule (;) et tabulation (\t).
        """
        students = []
        if not csv_content or not csv_content.strip():
            return students

        # Détection du délimiteur
        first_line = csv_content.strip().split("\n")[0]
        delimiter = ","
        if ";" in first_line:
            delimiter = ";"
        elif "\t" in first_line:
            delimiter = "\t"

        reader = csv.DictReader(io.StringIO(csv_content.strip()), delimiter=delimiter)
        
        # Si aucun header reconnu, essayer lecture brute ligne par ligne
        fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
        email_col = None
        name_col = None
        firstname_col = None
        lastname_col = None
        class_col = None

        for f in (reader.fieldnames or []):
            fn = f.strip().lower()
            if fn in ("email", "courriel", "mail", "e-mail", "adresse email", "student_email"):
                email_col = f
            elif fn in ("full_name", "nom_complet", "nom complet", "name", "nom et prenom", "etudiant"):
                name_col = f
            elif fn in ("prenom", "prénom", "first_name", "firstname"):
                firstname_col = f
            elif fn in ("nom", "last_name", "lastname"):
                lastname_col = f
            elif fn in ("classe", "class", "groupe", "class_group", "promotion", "section"):
                class_col = f

        if email_col:
            for row in reader:
                em = row.get(email_col, "").strip()
                if not em or "@" not in em:
                    continue
                
                # Nom complet
                if name_col and row.get(name_col):
                    fname = row.get(name_col).strip()
                elif firstname_col and lastname_col:
                    fname = f"{row.get(firstname_col, '').strip()} {row.get(lastname_col, '').strip()}".strip()
                elif lastname_col:
                    fname = row.get(lastname_col).strip()
                else:
                    fname = em.split("@")[0].replace(".", " ").title()

                cgroup = row.get(class_col, "").strip() if class_col else default_class
                if not cgroup:
                    cgroup = default_class

                students.append({
                    "email": em.lower(),
                    "full_name": fname,
                    "class_group": cgroup
                })
        else:
            # Traitement direct ligne par ligne (ex: juste une liste d'emails)
            for line in csv_content.strip().split("\n"):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = [p.strip() for p in line.replace(";", ",").split(",")]
                em = parts[0]
                if "@" in em:
                    fname = parts[1] if len(parts) > 1 and parts[1] else em.split("@")[0].replace(".", " ").title()
                    cgroup = parts[2] if len(parts) > 2 and parts[2] else default_class
                    students.append({
                        "email": em.lower(),
                        "full_name": fname,
                        "class_group": cgroup
                    })

        # Déduplication par email
        unique_students = {}
        for s in students:
            unique_students[s["email"]] = s
        return list(unique_students.values())


def main():
    parser = argparse.ArgumentParser(description="Gestionnaire des étudiants et reset de mot de passe (3ATELIOT)")
    parser.add_argument("--list", action="store_true", help="Lister tous les profils étudiants actuels")
    parser.add_argument("--import-csv", type=str, help="Chemin vers un fichier CSV d'étudiants à importer")
    parser.add_argument("--class-name", type=str, default="3ATELIOT", help="Nom de la classe (défaut: 3ATELIOT)")
    parser.add_argument("--reset-all", action="store_true", help="Envoyer un email de reset de mot de passe à TOUS les étudiants")
    parser.add_argument("--reset-class", type=str, help="Envoyer un reset de mot de passe uniquement aux étudiants d'une classe spécifique")
    parser.add_argument("--reset-email", type=str, help="Envoyer un reset de mot de passe à une adresse email spécifique")

    args = parser.parse_args()

    try:
        manager = StudentManager()
    except Exception as e:
        print(f"❌ Erreur d'initialisation : {e}")
        sys.exit(1)

    print("=" * 60)
    print(f"🎓 EdTech CodeLab • Gestionnaire Étudiants & Auth (Classe: {args.class_name})")
    print(f"🔗 Supabase: {manager.url}")
    print("=" * 60)

    if args.import_csv:
        if not os.path.exists(args.import_csv):
            print(f"❌ Fichier introuvable : {args.import_csv}")
            sys.exit(1)
        with open(args.import_csv, "r", encoding="utf-8-sig") as f:
            content = f.read()
        students = manager.parse_csv_students(content, default_class=args.class_name)
        print(f"📥 {len(students)} étudiant(s) détecté(s) dans le CSV pour la classe '{args.class_name}'.")
        for s in students:
            ok, msg, uid = manager.create_or_update_student(s["email"], s["full_name"], s["class_group"])
            status_icon = "✅" if ok else "❌"
            print(f"  {status_icon} {s['email']} ({s['full_name']}) -> {msg}")

    if args.reset_email:
        print(f"✉️ Envoi de la réinitialisation pour : {args.reset_email}")
        ok, msg, link = manager.send_password_reset(args.reset_email)
        print(f"  Résultat: {msg}")
        if link:
            print(f"  🔗 Lien direct de récupération: {link}")

    if args.reset_all or args.reset_class:
        target_class = args.reset_class
        profiles = manager.get_all_profiles()
        auth_users = manager.get_all_auth_users()
        
        # Consolider les emails
        all_emails = set([p.get("email") for p in profiles if p.get("email")])
        for u in auth_users:
            if u.get("email"):
                all_emails.add(u.get("email"))

        print(f"📨 Envoi groupé des demandes de reset de mot de passe ({len(all_emails)} étudiant(s))...")
        count_success = 0
        links_list = []
        for em in sorted(list(all_emails)):
            ok, msg, link = manager.send_password_reset(em)
            if ok:
                count_success += 1
                status = "✅ Envoyé"
            else:
                status = f"⚠️ {msg}"
            print(f"  {status} -> {em}")
            if link:
                links_list.append({"email": em, "link": link})

        print(f"\n🎉 Terminé ! {count_success}/{len(all_emails)} email(s) de réinitialisation traités.")
        if links_list:
            print(f"ℹ️ {len(links_list)} lien(s) direct(s) générés avec succès.")

    if args.list or (not args.import_csv and not args.reset_all and not args.reset_email and not args.reset_class):
        profiles = manager.get_all_profiles()
        print(f"\n📋 Liste des profils ({len(profiles)} enregistrés) :")
        for p in profiles:
            cgroup = p.get("class_group") or "3ATELIOT"
            print(f"  - {p.get('email')} | {p.get('full_name') or 'N/A'} | Classe: {cgroup} | Rôle: {p.get('role')}")

if __name__ == "__main__":
    main()
