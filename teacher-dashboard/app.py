"""
DASHBOARD ENSEIGNANT & ÉVALUATION LOCALE (STREAMLIT)
Exécutable localement avec la SUPABASE_SERVICE_ROLE_KEY pour contourner RLS.
Supporte l'organisation par Matière (GenAI), les exercices Optimizer (.json) & CNN Challenger (.csv),
la gestion des 3 tentatives par étudiant (meilleure note retenue) et le Leaderboard CIFAR-10.
"""

import os
import io
import requests
import pandas as pd
import streamlit as st
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from grader import LocalGrader
from manage_students import StudentManager

# Chargement des variables d'environnement si .env présent
load_dotenv()

# Configuration de la page Streamlit
st.set_page_config(
    page_title="EdTech CodeLab • Dashboard Enseignant",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Style CSS personnalisé
st.markdown("""
    <style>
    .main-header {
        font-size: 26px;
        font-weight: 800;
        color: #6366f1;
        margin-bottom: 0px;
    }
    .sub-header {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 20px;
    }
    .leaderboard-rank-1 {
        background-color: rgba(234, 179, 8, 0.15);
        color: #facc15;
        font-weight: bold;
    }
    .badge-course {
        background-color: rgba(99, 102, 241, 0.15);
        color: #818cf8;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
    }
    </style>
""", unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# 1. INITIALISATION DU CLIENT SUPABASE (SERVICE ROLE)
# ------------------------------------------------------------------------------
st.sidebar.title("🎓 Dashboard Enseignant")
st.sidebar.markdown("**Environnement Local Sécurisé • Supabase**")

# Récupération des clés depuis .env ou saisie manuelle
default_url = os.getenv("SUPABASE_URL", "https://jkusqsyrijmrngizmyeu.supabase.co")
default_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

with st.sidebar.expander("🔑 Identifiants Supabase (Admin)", expanded=not (default_url and default_key)):
    supabase_url = st.text_input("Supabase Project URL", value=default_url, placeholder="https://xyz.supabase.co")
    supabase_service_key = st.text_input("Supabase Service Role Key", value=default_key, type="password", help="⚠️ Clé secrète super-admin avec tous les droits RLS")

# Catalogue des modèles IA Cloud supportés (Gemini & Groq)
AVAILABLE_LLM_MODELS = {
    "⚡ Google Gemini 2.5 Flash (Recommandé - Ultra rapide & précis)": {"provider": "gemini", "model": "gemini-2.5-flash"},
    "🤖 Google Gemini 2.0 Flash (Nouvelle génération)": {"provider": "gemini", "model": "gemini-2.0-flash"},
    "🧠 Google Gemini 1.5 Pro (Raisonnement approfondi)": {"provider": "gemini", "model": "gemini-1.5-pro"},
    "🔹 Google Gemini 1.5 Flash (Standard stable)": {"provider": "gemini", "model": "gemini-1.5-flash"},
    "🪶 Google Gemini 1.5 Flash-8B (Ultra léger)": {"provider": "gemini", "model": "gemini-1.5-flash-8b"},
    "🚀 Groq : Llama 3.3 70B Versatile (Meta - Puissant)": {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    "🔬 Groq : DeepSeek R1 Distill Llama 70B (Raisonnement)": {"provider": "groq", "model": "deepseek-r1-distill-llama-70b"},
    "🌐 Groq : Qwen 2.5 32B (Alibaba)": {"provider": "groq", "model": "qwen-2.5-32b"},
    "⚡ Groq : Llama 3.1 8B Instant (Ultra rapide)": {"provider": "groq", "model": "llama-3.1-8b-instant"},
    "🌪️ Groq : Mixtral 8x7B (Mistral AI)": {"provider": "groq", "model": "mixtral-8x7b-32768"},
    "💎 Groq : Gemma 2 9B (Google)": {"provider": "groq", "model": "gemma2-9b-it"}
}

with st.sidebar.expander("🤖 Évaluation IA Cloud (0 charge locale)", expanded=True):
    selected_model_label = st.selectbox("Modèle IA Cloud (Gratuit)", list(AVAILABLE_LLM_MODELS.keys()), index=0)
    selected_model_cfg = AVAILABLE_LLM_MODELS[selected_model_label]
    llm_provider = selected_model_cfg["provider"]
    llm_model_name = selected_model_cfg["model"]
    llm_api_key = st.text_input("Clé API Cloud (Gemini ou Groq)", value=os.getenv("GEMINI_API_KEY", ""), type="password", help="Clé gratuite sur aistudio.google.com ou console.groq.com. Évaluation sémantique 0% CPU/GPU !")
    if llm_api_key:
        st.success(f"✅ Modèle prêt : `{llm_model_name}` ({llm_provider.upper()})")
    else:
        st.info("ℹ️ Sans clé API, l'évaluation utilisera le parseur local déterministe.")

if not supabase_url or not supabase_service_key:
    st.warning("⚠️ Veuillez renseigner votre **SUPABASE_URL** et **SUPABASE_SERVICE_ROLE_KEY** dans le menu latéral ou dans un fichier `.env`.")
    st.info("💡 La clé `service_role` permet d'évaluer les étudiants et de modifier la colonne `grade` protégée par RLS.")
    st.stop()

@st.cache_resource
def get_supabase_client(url: str, key: str) -> Client:
    return create_client(url, key)

try:
    supabase: Client = get_supabase_client(supabase_url, supabase_service_key)
except Exception as e:
    st.error(f"Erreur de connexion à Supabase : {e}")
    st.stop()

# ------------------------------------------------------------------------------
# 2. CHARGEMENT DES DONNÉES DEPUIS SUPABASE
# ------------------------------------------------------------------------------
def fetch_all_submissions():
    try:
        response = supabase.table("submissions").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        st.error(f"Erreur lors de la récupération des devoirs : {e}")
        return []

def update_submission_grade(submission_id: str, grade: float, feedback: str, metadata: dict = None):
    try:
        payload = {
            "grade": grade,
            "feedback": feedback,
            "status": "Évalué"
        }
        if metadata:
            payload["metadata"] = metadata
        response = supabase.table("submissions").update(payload).eq("id", submission_id).execute()
        return True, response.data
    except Exception as e:
        return False, str(e)

def fetch_attempt_overrides():
    try:
        response = supabase.table("student_attempts_override").select("*").execute()
        return response.data or []
    except Exception:
        return []

def set_student_bonus_attempts(student_email: str, assignment_name: str, bonus_count: int, student_id: str = None, reason: str = "Accordé par l'enseignant"):
    try:
        payload = {
            "student_email": student_email,
            "assignment_name": assignment_name,
            "bonus_attempts": max(0, int(bonus_count)),
            "reason": reason
        }
        if student_id:
            payload["student_id"] = student_id
        response = supabase.table("student_attempts_override").upsert(payload, on_conflict="student_email,assignment_name").execute()
        return True, "Tentatives bonus enregistrées avec succès !"
    except Exception as e:
        return False, str(e)

def delete_submission(submission_id: str, file_path: str = None):
    try:
        if file_path:
            try:
                supabase.storage.from_("deliverables").remove([file_path])
            except Exception:
                pass
        supabase.table("submissions").delete().eq("id", submission_id).execute()
        return True, "Tentative supprimée avec succès."
    except Exception as e:
        return False, str(e)

def reset_student_assignment_submissions(student_email: str, assignment_name: str):
    try:
        subs = supabase.table("submissions").select("id, file_path").eq("student_email", student_email).eq("assignment_name", assignment_name).execute()
        for s in (subs.data or []):
            if s.get("file_path"):
                try:
                    supabase.storage.from_("deliverables").remove([s["file_path"]])
                except Exception:
                    pass
            supabase.table("submissions").delete().eq("id", s["id"]).execute()
        return True, "Toutes les tentatives ont été supprimées. L'étudiant peut recommencer."
    except Exception as e:
        return False, str(e)

# ------------------------------------------------------------------------------
# 3. GESTION DES LABELS SECRETS CNN (LOCALEMENT SANS GOOGLE DRIVE)
# ------------------------------------------------------------------------------
st.sidebar.markdown("---")
st.sidebar.subheader("🎯 Challenge CNN : Labels Secrets")
labels_path_input = st.sidebar.text_input("Fichier de labels (.pt ou .csv)", value="labels_hidden.pt")

uploaded_labels = st.sidebar.file_uploader("Ou téléverser labels_hidden.pt", type=["pt", "csv"])
if uploaded_labels:
    with open("labels_hidden.pt", "wb") as f:
        f.write(uploaded_labels.getbuffer())
    st.sidebar.success("Fichier de labels enregistré localement !")

true_labels = LocalGrader.load_true_labels(labels_path_input)
if true_labels is not None:
    st.sidebar.success(f"✅ {len(true_labels)} labels secrets chargés")
else:
    st.sidebar.info("ℹ️ `labels_hidden.pt` non détecté. Placez-le dans le dossier ou téléversez-le ci-dessus.")

# Bouton de rafraîchissement
if st.sidebar.button("🔄 Rafraîchir les données"):
    st.rerun()

submissions = fetch_all_submissions()
overrides = fetch_attempt_overrides()

# Enrichissement local avec numéro de tentative, quotas bonus et meilleure note
def enrich_submissions(subs, ovr_list):
    override_map = {}
    for o in ovr_list:
        key = (o.get("student_email"), o.get("assignment_name"))
        override_map[key] = int(o.get("bonus_attempts", 0))

    # Regrouper par (student_email, assignment_name) trié par created_at croissant
    sorted_subs = sorted(subs, key=lambda x: x.get("created_at", ""))
    history = {}
    for s in sorted_subs:
        key = (s.get("student_email"), s.get("assignment_name"))
        if key not in history:
            history[key] = []
        history[key].append(s)
        s["computed_attempt"] = len(history[key])

    # Calcul de la meilleure note par étudiant pour chaque exercice
    best_grades = {}
    for key, group in history.items():
        graded = [s.get("grade") for s in group if s.get("grade") is not None]
        best_grades[key] = max(graded) if graded else None

    for s in subs:
        key = (s.get("student_email"), s.get("assignment_name"))
        bonus = override_map.get(key, 0)
        s["bonus_attempts"] = bonus
        s["max_allowed_attempts"] = 3 + bonus
        s["best_grade_student"] = best_grades.get(key)
        s["is_best_attempt"] = (s.get("grade") is not None and s.get("grade") == best_grades.get(key))

enrich_submissions(submissions, overrides)

# ------------------------------------------------------------------------------
# 4. STATISTIQUES & EN-TÊTE
# ------------------------------------------------------------------------------
st.markdown('<div class="main-header">EdTech CodeLab • Dashboard Enseignant</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Matières & Exercices • Évaluation Locale Automatique • Gestion 3 Tentatives • Leaderboard CNN</div>', unsafe_allow_html=True)

total_subs = len(submissions)
pending_subs = len([s for s in submissions if s.get("status") == "En cours"])
graded_subs = len([s for s in submissions if s.get("status") == "Évalué"])

graded_values = [float(s["grade"]) for s in submissions if s.get("grade") is not None]
avg_grade = (sum(graded_values) / len(graded_values)) if graded_values else 0.0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Soumissions", total_subs)
col2.metric("En attente d'évaluation", pending_subs, delta=f"{pending_subs} à corriger", delta_color="inverse")
col3.metric("Devoirs Évalués", graded_subs)
col4.metric("Moyenne Générale", f"{avg_grade:.2f}/20" if graded_values else "--/20")

st.markdown("---")

# ------------------------------------------------------------------------------
# 5. FILTRES ET RECHERCHE
# ------------------------------------------------------------------------------
st.sidebar.subheader("Filtres d'affichage")

all_courses = sorted(list(set([s.get("course") or "GenAI" for s in submissions])))
selected_course = st.sidebar.selectbox("Filtrer par Matière", ["Toutes les matières"] + all_courses)

all_assignments = sorted(list(set([s.get("assignment_name", "") for s in submissions])))
selected_assignment_filter = st.sidebar.selectbox("Filtrer par Exercice", ["Tous les exercices"] + all_assignments)

status_filter = st.sidebar.selectbox("Filtrer par Statut", ["Tous", "En cours", "Évalué"])
search_email = st.sidebar.text_input("Recherche étudiant (email)", "")

filtered_submissions = submissions
if selected_course != "Toutes les matières":
    filtered_submissions = [s for s in filtered_submissions if (s.get("course") or "GenAI") == selected_course]

if selected_assignment_filter != "Tous les exercices":
    filtered_submissions = [s for s in filtered_submissions if s.get("assignment_name") == selected_assignment_filter]

if status_filter != "Tous":
    filtered_submissions = [s for s in filtered_submissions if s.get("status") == status_filter]

if search_email:
    filtered_submissions = [s for s in filtered_submissions if search_email.lower() in s.get("student_email", "").lower()]

# ------------------------------------------------------------------------------
# 6. ONGLETS PRINCIPAUX
# ------------------------------------------------------------------------------
tab_grade, tab_leaderboard, tab_quotas, tab_students, tab_table, tab_export, tab_plagiat = st.tabs([
    "📝 Évaluation & Correction",
    "🏆 Leaderboard (CNN Challenger)",
    "🎛️ Quotas & Tentatives",
    "👥 Gestion Étudiants & CSV (3ATELIOT)",
    "📋 Tableau de la Classe",
    "📥 Export des Notes (Excel / CSV)",
    "🕵️ Détection Plagiat"
])

# ------------------------------------------------------------------------------
# ONGLET 1 : ÉVALUATION INDIVIDUELLE & ANALYSE LOCALE
# ------------------------------------------------------------------------------
with tab_grade:
    if not filtered_submissions:
        st.info("Aucun devoir ne correspond aux filtres sélectionnés.")
    else:
        sub_options = {
            f"{s.get('student_email')} | {s.get('assignment_name')} (Tentative {s.get('computed_attempt', 1)}/{s.get('max_allowed_attempts', 3)}) - {s.get('status')}": s 
            for s in filtered_submissions
        }
        selected_key = st.selectbox("🎯 Sélectionner une soumission à évaluer :", list(sub_options.keys()))
        selected_sub = sub_options[selected_key]

        max_att = selected_sub.get('max_allowed_attempts', 3)
        bonus_att = selected_sub.get('bonus_attempts', 0)
        bonus_badge_str = f" 🎁 (+{bonus_att} bonus)" if bonus_att > 0 else ""

        col_head1, col_head2 = st.columns([8, 4])
        with col_head1:
            st.markdown(f"### Soumission de : `{selected_sub.get('student_email')}`")
            st.markdown(f"**Matière :** `{selected_sub.get('course') or 'GenAI'}` • **Exercice :** `{selected_sub.get('assignment_name')}` • **Tentative :** `{selected_sub.get('computed_attempt', 1)} / {max_att}`{bonus_badge_str}")
        with col_head2:
            date_formatted = datetime.fromisoformat(selected_sub.get('created_at').replace("Z", "+00:00")).strftime("%d/%m/%Y à %H:%M")
            st.write(f"📅 **Date de dépôt :** {date_formatted}")
            if selected_sub.get('best_grade_student') is not None:
                st.success(f"🏆 Meilleure note actuelle de cet étudiant : **{selected_sub.get('best_grade_student'):.2f}/20**")

        file_url = selected_sub.get("file_url")
        file_type = selected_sub.get("file_type")
        file_name = selected_sub.get("file_name", "")
        assignment_name = selected_sub.get("assignment_name", "").lower()

        file_bytes = None
        file_text = ""
        fetch_success = False

        with st.spinner("Téléchargement du fichier depuis Supabase Storage..."):
            try:
                res = requests.get(file_url, timeout=10)
                if res.status_code == 200:
                    file_bytes = res.content
                    try:
                        file_text = res.text
                    except Exception:
                        file_text = ""
                    fetch_success = True
                else:
                    st.error(f"Impossible de récupérer le fichier (Code HTTP {res.status_code}).")
            except Exception as e:
                st.error(f"Erreur réseau lors de la récupération : {e}")

        if fetch_success:
            col_view, col_eval = st.columns([6, 6])

            # COLONNE GAUCHE : VISUALISATION DU RENDU
            with col_view:
                st.subheader(f"👁️ Aperçu : {file_name}")
                if file_name.endswith(".json") or file_type == "json" or "optimizer" in assignment_name or "lstm" in assignment_name or "qcm" in (assignment_name or "").lower():
                    try:
                        parsed_json = json.loads(file_text) if isinstance(file_text, str) else file_text
                        
                        # Si QCM, affichage visuel des réponses
                        if isinstance(parsed_json, dict) and ("answers" in parsed_json or "qcm" in (assignment_name or "").lower()):
                            ans = parsed_json.get("answers", {})
                            st.markdown(f"**📝 Réponses QCM transmises ({len(ans)}/10) :**")
                            q_cols = st.columns(5)
                            for i, (k, v) in enumerate(sorted(ans.items())):
                                with q_cols[i % 5]:
                                    st.metric(k, str(v or "—"))
                            with st.expander("Voir le payload JSON complet", expanded=False):
                                st.json(parsed_json)
                        # Aperçu spécial pour la figure TikZ si présente
                        elif isinstance(parsed_json, dict) and "tikz_figure" in parsed_json:
                            st.json(parsed_json)
                            tikz_code = parsed_json.get("tikz_figure", "")
                            if tikz_code:
                                st.markdown("##### 📐 Code Source de la Figure TikZ (LaTeX) :")
                                st.code(tikz_code, language="latex")
                        else:
                            st.json(parsed_json)
                    except Exception:
                        st.code(file_text, language="json")
                elif file_name.endswith(".csv") or file_type == "csv" or "cnn" in assignment_name:
                    try:
                        df_preview = pd.read_csv(io.StringIO(file_text))
                        st.dataframe(df_preview.head(20), use_container_width=True)
                        st.caption(f"Nombre total de lignes : {len(df_preview)}")
                    except Exception as e:
                        st.code(file_text[:2000], language="csv")
                elif file_type == "image":
                    st.image(file_bytes, caption=f"Rendu image : {file_name}", use_column_width=True)
                elif file_type == "jupyter":
                    st.code(file_text[:3000], language="json")
                else:
                    st.code(file_text, language="python", line_numbers=True)

            # COLONNE DROITE : MOTEUR D'ÉVALUATION LOCALE
            with col_eval:
                st.subheader("🤖 Évaluation Automatique & Validation")

                suggested_grade = 15.0
                eval_report = ""
                eval_details = {}

                # Détection du type d'exercice pour l'analyse automatique
                assign_lower = (assignment_name or "").lower()
                is_qcm = "qcm" in assign_lower or "autorégressif" in assign_lower or "ar_llm" in assign_lower
                is_lstm = ("lstm" in assign_lower or "tikz" in assign_lower) and not is_qcm
                is_optimizer = ("optimizer" in assign_lower or (file_name.endswith(".json") and not is_lstm and not is_qcm))
                is_cnn = "cnn" in assign_lower or file_name.endswith(".csv")

                btn_label = "⚡ Calculer la Note Automatique"
                if is_qcm:
                    btn_label = "⚡ Corriger le QCM (Corrigé Officiel 10 Questions)"
                elif is_lstm:
                    if llm_api_key:
                        btn_label = f"🤖 Évaluer LSTM & TikZ avec {selected_model_label.split('(')[0].strip()}"
                    else:
                        btn_label = "⚡ Calculer Score LSTM (Formule 0.30T+0.25A+0.20I+0.15P+0.05R+0.05X)"
                elif is_optimizer:
                    if llm_api_key:
                        btn_label = f"🤖 Évaluer Optimizer avec {selected_model_label.split('(')[0].strip()}"
                    else:
                        btn_label = "⚡ Calculer Score Optimizer (Formule 0.20R+0.25P+0.30A+0.15C+0.05S+0.05X)"
                elif is_cnn:
                    btn_label = "⚡ Calculer Accuracy CNN avec labels secrets"

                if st.button(btn_label, type="primary", use_container_width=True):
                    with st.spinner(f"Analyse avec {llm_model_name if (is_optimizer or is_lstm) and llm_api_key else 'moteur local'} en cours..."):
                        if is_qcm:
                            suggested_grade, eval_report, eval_details = LocalGrader.evaluate_qcm_ar_llm(file_text)
                        elif is_lstm:
                            if llm_api_key:
                                suggested_grade, eval_report, eval_details = LocalGrader.evaluate_lstm_with_cloud_llm(
                                    file_text,
                                    api_key=llm_api_key,
                                    provider=llm_provider,
                                    model_name=llm_model_name
                                )
                            else:
                                suggested_grade, eval_report, eval_details = LocalGrader.evaluate_lstm_json(file_text)
                        elif is_optimizer:
                            if llm_api_key:
                                suggested_grade, eval_report, eval_details = LocalGrader.evaluate_optimizer_with_cloud_llm(
                                    file_text,
                                    api_key=llm_api_key,
                                    provider=llm_provider,
                                    model_name=llm_model_name
                                )
                            else:
                                suggested_grade, eval_report, eval_details = LocalGrader.evaluate_optimizer_json(file_text)
                        elif is_cnn:
                            suggested_grade, eval_report, eval_details = LocalGrader.evaluate_cnn_predictions_csv(file_text, true_labels)
                        elif file_type == "image":
                            suggested_grade, eval_report, eval_details = LocalGrader.evaluate_image_file(file_bytes, file_name)
                        elif file_type == "jupyter":
                            suggested_grade, eval_report, eval_details = LocalGrader.evaluate_jupyter_notebook(file_text, selected_sub.get('assignment_name'))
                        else:
                            suggested_grade, eval_report, eval_details = LocalGrader.evaluate_python_code(file_text, selected_sub.get('assignment_name'))

                        st.session_state[f"eval_grade_{selected_sub['id']}"] = suggested_grade
                        st.session_state[f"eval_report_{selected_sub['id']}"] = eval_report
                        st.session_state[f"eval_details_{selected_sub['id']}"] = eval_details

                cached_grade = st.session_state.get(f"eval_grade_{selected_sub['id']}", selected_sub.get("grade"))
                cached_report = st.session_state.get(f"eval_report_{selected_sub['id']}", "")
                cached_details = st.session_state.get(f"eval_details_{selected_sub['id']}", {})

                if cached_report:
                    st.success(f"**Note suggérée : {cached_grade:.2f} / 20**")
                    with st.expander("📋 Détails du rapport de notation & Synthèse pédagogique", expanded=True):
                        st.markdown(cached_report)

                # Formulaire de validation
                st.markdown("---")
                st.markdown("#### ✍️ Validation de la Note & Synthèse Pédagogique")
                init_val = float(cached_grade) if cached_grade is not None else 16.0
                final_grade = st.number_input("Note attribuée (/20) :", min_value=0.0, max_value=20.0, value=float(init_val), step=0.25)

                # Construction automatique du feedback élève
                auto_fb = ""
                if cached_details and cached_details.get("general_feedback"):
                    auto_fb = cached_details.get("general_feedback")
                elif cached_details and cached_details.get("student_work_summary"):
                    auto_fb = f"📌 Résumé de votre travail :\n{cached_details.get('student_work_summary')}\n\n💡 Ce que vous devez améliorer :\n{cached_details.get('areas_for_improvement')}"

                default_fb = selected_sub.get("feedback") or auto_fb or cached_report or "Très bon travail."
                feedback_text = st.text_area("Commentaire / Synthèse envoyé(e) à l'étudiant :", value=default_fb, height=150, help="Contient le résumé du travail et les axes d'amélioration prioritaires.")

                if st.button("✅ Valider et Publier la Note sur Supabase", type="primary", use_container_width=True):
                    with st.spinner("Enregistrement sur Supabase..."):
                        success, err = update_submission_grade(
                            selected_sub["id"],
                            final_grade,
                            feedback_text,
                            metadata=cached_details
                        )
                        if success:
                            st.balloons()
                            st.success(f"🎉 Note de **{final_grade:.2f}/20** enregistrée pour la tentative {selected_sub.get('computed_attempt', 1)}/{max_att} !")
                            st.rerun()
                        else:
                            st.error(f"Erreur : {err}")


        # Section Gestion rapide de la tentative pour cet étudiant
        st.markdown("---")

        # -----------------------------------------------------------------------
        # ANALYSE DE PLAGIAT RAPIDE POUR CETTE SOUMISSION
        # -----------------------------------------------------------------------
        with st.expander("🕵️ Analyse de Similarité & Détection de Plagiat pour cette soumission", expanded=False):
            st.caption("Compare le contenu de cette soumission avec toutes celles du même exercice soumises **avant** elle. Un score ≥ 75% indique un plagiat potentiel.")
            if st.button("🔍 Lancer l'analyse de similarité contre les soumissions antérieures", key="btn_plg_quick", use_container_width=True):
                # Collecter toutes les soumissions du même exercice
                same_assignment_subs = [
                    s for s in submissions
                    if s.get("assignment_name") == selected_sub.get("assignment_name")
                    and s.get("id") != selected_sub["id"]
                    and s.get("created_at", "") < selected_sub.get("created_at", "")
                ]
                if not same_assignment_subs:
                    st.info("ℹ️ Aucune soumission antérieure trouvée pour cet exercice.")
                else:
                    plg_results = []
                    plg_progress = st.progress(0)
                    for idx, other_sub in enumerate(same_assignment_subs):
                        try:
                            other_res = requests.get(other_sub["file_url"], timeout=8)
                            if other_res.status_code == 200:
                                other_content = other_res.text
                                sim = LocalGrader.compute_cosine_similarity_tfidf(file_text, other_content)
                                if sim >= 0.40:  # Afficher même les similarités modérées
                                    plg_results.append({
                                        "Étudiant Source": other_sub.get("student_email"),
                                        "Date Source": datetime.fromisoformat(other_sub.get("created_at", "").replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M") if other_sub.get("created_at") else "-",
                                        "Similarité": f"{sim * 100:.1f}%",
                                        "Score": sim,
                                        "Gravité": '🚨 Alerte Rouge' if sim >= 0.92 else '⚠️ Attention' if sim >= 0.75 else '🔍 À surveiller'
                                    })
                        except Exception:
                            pass
                        plg_progress.progress((idx + 1) / len(same_assignment_subs))

                    if plg_results:
                        plg_results.sort(key=lambda x: x["Score"], reverse=True)
                        max_sim = plg_results[0]["Score"]
                        if max_sim >= 0.92:
                            st.error(f"🚨 **PLAGIAT PROBABLE DÉTECTÉ !** Similarité maximale : **{max_sim*100:.1f}%** avec `{plg_results[0]['Étudiant Source']}`")
                        elif max_sim >= 0.75:
                            st.warning(f"⚠️ **Similarité suspecte** : **{max_sim*100:.1f}%** avec `{plg_results[0]['Étudiant Source']}`")
                        else:
                            st.success(f"✅ Aucun plagiat détecté (similarité max = {max_sim*100:.1f}%)")

                        df_plg = pd.DataFrame([{k: v for k, v in r.items() if k != "Score"} for r in plg_results])
                        st.dataframe(df_plg, use_container_width=True)
                    else:
                        st.success("✅ Aucune similarité significative détectée avec les soumissions antérieures.")

        with st.expander("⚙️ Actions Enseignant sur cette soumission & Tentatives", expanded=False):
            st.markdown("##### 🎁 Ajouter des tentatives à cet étudiant")
            col_b1, col_b2 = st.columns([6, 6])
            with col_b1:
                cur_bonus = selected_sub.get('bonus_attempts', 0)
                st.write(f"Tentatives actuelles : **{selected_sub.get('computed_attempt', 1)} / {max_att}** (Bonus : +{cur_bonus})")
                if st.button("➕ Accorder +1 tentative supplémentaire", use_container_width=True):
                    ok, msg = set_student_bonus_attempts(
                        selected_sub.get('student_email'),
                        selected_sub.get('assignment_name'),
                        cur_bonus + 1,
                        student_id=selected_sub.get('student_id')
                    )
                    if ok:
                        st.success(f"✅ Tentative bonus accordée ! Nouveau quota : {3 + cur_bonus + 1} tentatives.")
                        st.rerun()
                    else:
                        st.error(msg)

            with col_b2:
                st.markdown("##### 🗑️ Supprimer cette tentative individuelle")
                confirm_del = st.checkbox("Confirmer la suppression définitive de ce fichier et de cette tentative", key=f"del_chk_{selected_sub['id']}")
                if st.button("🗑️ Supprimer cette soumission", disabled=not confirm_del, type="secondary", use_container_width=True):
                    ok, msg = delete_submission(selected_sub['id'], selected_sub.get('file_path'))
                    if ok:
                        st.success("✅ Soumission supprimée ! Le quota de l'étudiant a été automatiquement libéré.")
                        st.rerun()
                    else:
                        st.error(msg)

# ------------------------------------------------------------------------------
# ONGLET 2 : LEADERBOARD CNN CHALLENGER
# ------------------------------------------------------------------------------
with tab_leaderboard:
    st.subheader("🏆 Leaderboard de la Classe • CNN Challenger (GenAI)")
    st.markdown("Classement des étudiants basé sur leur **meilleure accuracy** parmi leurs tentatives autorisées.")

    cnn_subs = [s for s in submissions if "cnn" in s.get("assignment_name", "").lower() or s.get("file_name", "").endswith(".csv")]

    if not cnn_subs:
        st.info("Aucune soumission reçue pour le challenge CNN pour le moment.")
    else:
        # Évaluation en masse automatique pour les prédictions CNN non encore notées
        if true_labels is not None:
            pending_cnn = [s for s in cnn_subs if s.get("grade") is None]
            if pending_cnn:
                if st.button(f"⚡ Évaluer automatiquement {len(pending_cnn)} soumission(s) CNN en attente"):
                    progress = st.progress(0)
                    for i, s in enumerate(pending_cnn):
                        try:
                            res = requests.get(s["file_url"], timeout=10)
                            if res.status_code == 200:
                                g, rep, det = LocalGrader.evaluate_cnn_predictions_csv(res.text, true_labels)
                                update_submission_grade(s["id"], g, rep, det)
                        except Exception as e:
                            print(f"Erreur eval sub {s['id']}: {e}")
                        progress.progress((i + 1) / len(pending_cnn))
                    st.success("Toutes les soumissions CNN ont été évaluées !")
                    st.rerun()

        # Construction du Leaderboard (Meilleure performance par étudiant)
        students_cnn = {}
        for s in cnn_subs:
            email = s.get("student_email")
            grade = s.get("grade")
            accuracy = None
            if s.get("metadata") and "accuracy" in s["metadata"]:
                accuracy = float(s["metadata"]["accuracy"])
            elif grade is not None:
                accuracy = float(grade) / 20.0

            if email not in students_cnn:
                students_cnn[email] = {
                    "Student": email,
                    "Best_Accuracy": accuracy if accuracy is not None else 0.0,
                    "Best_Grade": grade if grade is not None else 0.0,
                    "Attempts": 0,
                    "Max_Attempts": s.get("max_allowed_attempts", 3),
                    "Last_Submission": s.get("created_at")
                }
            students_cnn[email]["Attempts"] += 1
            if accuracy is not None and accuracy > students_cnn[email]["Best_Accuracy"]:
                students_cnn[email]["Best_Accuracy"] = accuracy
                students_cnn[email]["Best_Grade"] = grade
                students_cnn[email]["Last_Submission"] = s.get("created_at")

        leaderboard_list = list(students_cnn.values())
        leaderboard_df = pd.DataFrame(leaderboard_list)
        if not leaderboard_df.empty:
            leaderboard_df = leaderboard_df.sort_values("Best_Accuracy", ascending=False).reset_index(drop=True)
            leaderboard_df["Rang"] = [f"#{i+1} 🥇" if i == 0 else f"#{i+1} 🥈" if i == 1 else f"#{i+1} 🥉" if i == 2 else f"#{i+1}" for i in range(len(leaderboard_df))]
            leaderboard_df["Accuracy (%)"] = leaderboard_df["Best_Accuracy"].apply(lambda x: f"{x*100:.2f}%")
            leaderboard_df["Note (/20)"] = leaderboard_df["Best_Grade"].apply(lambda x: f"{x:.2f}/20" if x > 0 else "En attente")
            leaderboard_df["Tentatives"] = leaderboard_df.apply(lambda r: f"{r['Attempts']} / {r['Max_Attempts']}", axis=1)
            leaderboard_df["Dernier Dépôt"] = leaderboard_df["Last_Submission"].apply(lambda x: datetime.fromisoformat(x.replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M") if x else "-")

            cols_show = ["Rang", "Student", "Accuracy (%)", "Note (/20)", "Tentatives", "Dernier Dépôt"]
            st.dataframe(leaderboard_df[cols_show], use_container_width=True)

            # Export Leaderboard CSV (conforme au script de l'enseignant)
            csv_export = leaderboard_df[["Rang", "Student", "Best_Accuracy", "Best_Grade", "Attempts"]].to_csv(index=False, sep=";").encode("utf-8-sig")
            st.download_button(
                "📥 Télécharger CIFAR10_Leaderboard.csv",
                data=csv_export,
                file_name="CIFAR10_Leaderboard.csv",
                mime="text/csv",
                use_container_width=True
            )

# ------------------------------------------------------------------------------
# ONGLET 3 : GESTION DES QUOTAS & TENTATIVES DES ÉTUDIANTS
# ------------------------------------------------------------------------------
with tab_quotas:
    st.subheader("🎛️ Gestion des Quotas & Tentatives")
    st.markdown("Consultez les tentatives des étudiants, accordez des **tentatives supplémentaires** ou supprimez des tentatives erronées.")

    all_students_emails = sorted(list(set([s.get("student_email") for s in submissions if s.get("student_email")])))
    all_exercise_names = sorted(list(set([s.get("assignment_name") for s in submissions if s.get("assignment_name")] or ["Optimizer", "CNN Challenger", "LSTM vs RNN (TikZ & Théorie)", "QCM : Modèles Autorégressifs (AR LLMs)"])))

    if not all_students_emails:
        st.info("Aucun étudiant n'a encore effectué de soumission.")
    else:
        col_q1, col_q2 = st.columns([6, 6])
        with col_q1:
            st.markdown("#### ➕ Accorder des Tentatives Bonus")
            q_student = st.selectbox("Sélectionner l'étudiant :", all_students_emails, key="quota_student_select")
            q_assignment = st.selectbox("Sélectionner l'exercice :", all_exercise_names, key="quota_assignment_select")

            # Trouver le bonus actuel et le nombre de soumissions
            current_subs_count = len([s for s in submissions if s.get("student_email") == q_student and s.get("assignment_name") == q_assignment])
            current_bonus = 0
            for o in overrides:
                if o.get("student_email") == q_student and o.get("assignment_name") == q_assignment:
                    current_bonus = int(o.get("bonus_attempts", 0))
                    break

            st.info(f"📊 État actuel pour **{q_student}** sur **{q_assignment}** : **{current_subs_count} soumission(s)** effectuée(s) sur un total autorisé de **{3 + current_bonus} tentatives** (+{current_bonus} bonus).")

            new_bonus_val = st.number_input("Nombre de tentatives bonus supplémentaires (+N) :", min_value=0, max_value=20, value=int(current_bonus), step=1)
            reason_input = st.text_input("Motif de la dérogation :", value="Accordé par l'enseignant")

            if st.button("💾 Enregistrer le quota de cet étudiant", type="primary", use_container_width=True):
                ok, msg = set_student_bonus_attempts(q_student, q_assignment, new_bonus_val, reason=reason_input)
                if ok:
                    st.success(f"✅ Quota mis à jour pour {q_student} : {3 + new_bonus_val} tentatives au total !")
                    st.rerun()
                else:
                    st.error(msg)

        with col_q2:
            st.markdown("#### 🔄 Réinitialisation Complète d'un Exercice")
            st.markdown("Si un étudiant a eu un problème technique et que vous souhaitez lui redonner toutes ses chances à zéro :")
            st.warning(f"⚠️ Cela supprimera les **{current_subs_count} soumission(s)** de `{q_student}` pour `{q_assignment}`.")
            confirm_reset = st.checkbox("Je confirme vouloir réinitialiser à zéro les tentatives de cet étudiant", key="chk_reset_student")
            if st.button("🚨 Réinitialiser à zéro les tentatives", disabled=not confirm_reset or current_subs_count == 0, use_container_width=True):
                ok, msg = reset_student_assignment_submissions(q_student, q_assignment)
                if ok:
                    st.success(msg)
                    st.rerun()
                else:
                    st.error(msg)

        st.markdown("---")
        st.markdown("#### 📋 Récapitulatif des Dérogations et Quotas Actifs")
        if overrides:
            df_ovr = pd.DataFrame([{
                "Étudiant": o.get("student_email"),
                "Exercice": o.get("assignment_name"),
                "Tentatives Bonus": f"+{o.get('bonus_attempts', 0)}",
                "Total Autorisé": 3 + int(o.get('bonus_attempts', 0)),
                "Motif": o.get("reason") or "Accordé par l'enseignant",
                "Date": datetime.fromisoformat(o.get("updated_at", o.get("created_at", "")).replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M") if o.get("updated_at") or o.get("created_at") else "-"
            } for o in overrides])
            st.dataframe(df_ovr, use_container_width=True)
        else:
            st.caption("Aucune dérogation personnalisée n'a été enregistrée (tous les étudiants sont au quota standard de 3 tentatives).")

# ------------------------------------------------------------------------------
# ONGLET 4 : GESTION DES ÉTUDIANTS, IMPORT CSV & MOTS DE PASSE (3ATELIOT)
# ------------------------------------------------------------------------------
with tab_students:
    st.subheader("👥 Gestion de la Classe, Import CSV & Réinitialisation des Mots de Passe")
    st.markdown("Importez la liste des étudiants de la classe (**3ATELIOT**), créez automatiquement leurs comptes et envoyez-leur les demandes de réinitialisation/définition de mot de passe.")

    # Initialisation du gestionnaire d'étudiants
    try:
        student_mgr = StudentManager(supabase_url, supabase_service_key)
    except Exception as e:
        st.error(f"Erreur d'initialisation du gestionnaire : {e}")
        student_mgr = None

    if student_mgr:
        # Récupérer profils actuels
        db_profiles = student_mgr.get_all_profiles()
        auth_users_list = student_mgr.get_all_auth_users()
        
        # Consolidation des comptes et comptage par classe
        classes_found = set(["3ATELIOT"])
        for p in db_profiles:
            if p.get("class_group"):
                classes_found.add(p.get("class_group"))

        classes_list = sorted(list(classes_found))

        # Métriques rapides
        m_col1, m_col2, m_col3 = st.columns(3)
        m_col1.metric("Total Profils Enregistrés", len(db_profiles))
        m_col2.metric("Comptes Auth Supabase", len(auth_users_list))
        count_3ateliot = len([p for p in db_profiles if (p.get("class_group") or "3ATELIOT") == "3ATELIOT"])
        m_col3.metric("Étudiants Classe 3ATELIOT", count_3ateliot)

        st.markdown("---")

        sub_tab_import, sub_tab_reset, sub_tab_roster = st.tabs([
            "📥 Importer une Classe via CSV",
            "✉️ Envoi Groupé des Mots de Passe",
            "📋 Annuaire & Liste des Étudiants"
        ])

        # ----------------------------------------------------------------------
        # SOUS-ONGLET 1 : IMPORTATION CSV
        # ----------------------------------------------------------------------
        with sub_tab_import:
            st.markdown("#### 📥 Importation d'une Liste d'Étudiants par CSV")
            st.write("Téléversez un fichier CSV ou collez la liste des étudiants. Les comptes seront automatiquement initialisés.")

            col_imp1, col_imp2 = st.columns([7, 5])
            with col_imp1:
                target_class_input = st.text_input("🏷️ Nom de la Classe / Promotion :", value="3ATELIOT", help="Exemple : 3ATELIOT, 3ATELCOM, 2A-INFO, etc.")
                
                uploaded_csv = st.file_uploader("Sélectionner un fichier CSV d'étudiants (.csv)", type=["csv", "txt"])
                csv_raw_paste = st.text_area("Ou copier/coller directement le contenu CSV / tableau Excel ici :", placeholder="email,nom,prenom,classe\netudiant1@enit.utm.tn,Ben Salah,Ahmed,3ATELIOT\netudiant2@enit.utm.tn,Trabelsi,Sarra,3ATELIOT", height=120)

            with col_imp2:
                st.markdown("##### 💡 Modèle & Format Attendu")
                st.info("Le CSV peut contenir les colonnes : `email` (obligatoire), `nom`, `prenom`, `classe`. Séparateurs acceptés : virgule `,`, point-virgule `;` ou tabulation.")
                
                template_csv_data = "email,nom,prenom,classe\netudiant.exemple1@enit.utm.tn,Ben Salah,Ahmed,3ATELIOT\netudiant.exemple2@enit.utm.tn,Trabelsi,Sarra,3ATELIOT\netudiant.exemple3@enit.utm.tn,Gharbi,Mohamed,3ATELIOT"
                st.download_button(
                    "📄 Télécharger le Modèle CSV (3ATELIOT)",
                    data=template_csv_data,
                    file_name="modele_etudiants_3ATELIOT.csv",
                    mime="text/csv",
                    use_container_width=True
                )

            # Analyse du contenu
            csv_text_to_parse = ""
            if uploaded_csv:
                try:
                    csv_text_to_parse = uploaded_csv.getvalue().decode("utf-8-sig")
                except Exception:
                    csv_text_to_parse = uploaded_csv.getvalue().decode("latin-1", errors="ignore")
            elif csv_raw_paste.strip():
                csv_text_to_parse = csv_raw_paste.strip()

            if csv_text_to_parse:
                parsed_students = student_mgr.parse_csv_students(csv_text_to_parse, default_class=target_class_input)
                if not parsed_students:
                    st.warning("⚠️ Aucun email valide détecté dans le contenu fourni.")
                else:
                    st.success(f"✅ **{len(parsed_students)} étudiant(s)** détecté(s) pour la classe **{target_class_input}** !")
                    
                    df_preview_students = pd.DataFrame(parsed_students)
                    st.dataframe(df_preview_students, use_container_width=True)

                    col_act1, col_act2 = st.columns([6, 6])
                    with col_act1:
                        opt_send_reset_on_import = st.checkbox("✉️ Envoyer immédiatement un email de réinitialisation/création de mot de passe", value=True)
                    with col_act2:
                        opt_auto_confirm = st.checkbox("🔓 Confirmer automatiquement les emails (évite le blocage confirmation)", value=True)

                    if st.button("🚀 Valider et Importer les Étudiants dans Supabase", type="primary", use_container_width=True):
                        prog_bar = st.progress(0)
                        status_msg = st.empty()
                        
                        success_count = 0
                        resets_sent_count = 0
                        import_logs = []

                        for i, s in enumerate(parsed_students):
                            status_msg.text(f"Traitement de {s['email']} ({i+1}/{len(parsed_students)})...")
                            ok, msg, uid = student_mgr.create_or_update_student(
                                s["email"],
                                s.get("full_name"),
                                s.get("class_group") or target_class_input,
                                auto_confirm=opt_auto_confirm
                            )
                            
                            reset_status = ""
                            if ok and opt_send_reset_on_import:
                                r_ok, r_msg, r_link = student_mgr.send_password_reset(s["email"])
                                if r_ok:
                                    resets_sent_count += 1
                                    reset_status = "Email Reset Envoyé ✅"
                                else:
                                    reset_status = f"Erreur Reset: {r_msg}"

                            if ok:
                                success_count += 1

                            import_logs.append({
                                "Email": s["email"],
                                "Nom": s.get("full_name"),
                                "Classe": s.get("class_group"),
                                "Statut Compte": msg,
                                "Reset Mot de Passe": reset_status or "-"
                            })
                            prog_bar.progress((i + 1) / len(parsed_students))

                        status_msg.empty()
                        st.balloons()
                        st.success(f"🎉 Importation terminée avec succès ! **{success_count}/{len(parsed_students)}** comptes synchronisés, **{resets_sent_count}** invitations/resets envoyés.")
                        st.dataframe(pd.DataFrame(import_logs), use_container_width=True)

        # ----------------------------------------------------------------------
        # SOUS-ONGLET 2 : ENVOI GROUPÉ DES DEMANDES DE RESET
        # ----------------------------------------------------------------------
        with sub_tab_reset:
            st.markdown("#### ✉️ Envoi Groupé des Demandes de Réinitialisation de Mot de Passe")
            st.write("Déclenchez l'envoi d'un email officiel Supabase Auth permettant à chaque étudiant de définir ou modifier son mot de passe pour accéder à son espace de rendu.")

            # Filtrage de la cible
            col_target1, col_target2 = st.columns([6, 6])
            with col_target1:
                reset_target_filter = st.radio("Cible des envois :", [
                    f"🎓 Uniquement la classe '{target_class_input if 'target_class_input' in locals() else '3ATELIOT'}'",
                    "🌐 TOUS les étudiants inscrits (Toutes classes)",
                    "🎯 Sélection manuelle d'étudiants"
                ])

            # Détermination des emails cibles
            all_known_emails = set([p.get("email") for p in db_profiles if p.get("email")])
            for u in auth_users_list:
                if u.get("email"):
                    all_known_emails.add(u.get("email"))

            selected_target_emails = []
            if "Uniquement la classe" in reset_target_filter:
                c_name = target_class_input if 'target_class_input' in locals() else '3ATELIOT'
                selected_target_emails = [p.get("email") for p in db_profiles if (p.get("class_group") or "3ATELIOT") == c_name and p.get("email")]
                if not selected_target_emails:
                    selected_target_emails = list(all_known_emails)
            elif "TOUS les étudiants" in reset_target_filter:
                selected_target_emails = sorted(list(all_known_emails))
            else:
                with col_target2:
                    selected_target_emails = st.multiselect("Sélectionner les étudiants :", sorted(list(all_known_emails)), default=sorted(list(all_known_emails))[:5] if all_known_emails else [])

            st.info(f"📊 **{len(selected_target_emails)} étudiant(s)** ciblé(s) pour la réinitialisation de mot de passe.")

            col_btn1, col_btn2 = st.columns([6, 6])
            with col_btn1:
                confirm_reset_all = st.checkbox("Confirmer l'envoi immédiat des emails de reset de mot de passe", key="chk_confirm_reset_all")
                if st.button("📨 Envoyer les Demandes de Reset de Mot de Passe", type="primary", disabled=not confirm_reset_all or not selected_target_emails, use_container_width=True):
                    reset_progress = st.progress(0)
                    reset_status_text = st.empty()
                    
                    reset_results = []
                    success_reset_count = 0

                    for i, email in enumerate(selected_target_emails):
                        reset_status_text.text(f"Envoi du reset à : {email} ({i+1}/{len(selected_target_emails)})...")
                        ok, msg, action_link = student_mgr.send_password_reset(email)
                        if ok:
                            success_reset_count += 1
                        
                        reset_results.append({
                            "Email": email,
                            "Statut Envoi": "✅ Envoyé" if ok else f"⚠️ {msg}",
                            "Lien Direct (Magic Link)": action_link or "N/A"
                        })
                        reset_progress.progress((i + 1) / len(selected_target_emails))

                    reset_status_text.empty()
                    st.success(f"🎉 Opération terminée : **{success_reset_count}/{len(selected_target_emails)}** emails de réinitialisation traités !")
                    
                    df_resets = pd.DataFrame(reset_results)
                    st.dataframe(df_resets, use_container_width=True)

                    # Export des liens magiques au format CSV
                    csv_magic_links = df_resets.to_csv(index=False, sep=";").encode("utf-8-sig")
                    st.download_button(
                        "📥 Télécharger la Liste et Liens de Récupération (CSV)",
                        data=csv_magic_links,
                        file_name=f"liens_reset_mots_de_passe_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                        mime="text/csv",
                        use_container_width=True,
                        help="Très utile si les boîtes universitaires bloquent temporairement les emails ou placent en spam."
                    )

            with col_btn2:
                st.markdown("##### ℹ️ Remarque importante")
                st.caption("Supabase Auth envoie un email sécurisé avec un jeton à usage unique. L'étudiant clique sur le lien pour saisir son nouveau mot de passe. Si le serveur SMTP de votre projet Supabase a un quota ou un délai, vous pouvez également lui transmettre directement le **Lien Direct (Magic Link)** généré ci-contre.")

        # ----------------------------------------------------------------------
        # SOUS-ONGLET 3 : ANNUAIRE & SUIVI DES ÉTUDIANTS
        # ----------------------------------------------------------------------
        with sub_tab_roster:
            st.markdown("#### 📋 Annuaire et Suivi de la Promotion (3ATELIOT)")

            f_col1, f_col2 = st.columns([6, 6])
            with f_col1:
                filter_roster_class = st.selectbox("Filtrer par classe :", ["Toutes"] + classes_list, index=classes_list.index("3ATELIOT") + 1 if "3ATELIOT" in classes_list else 0)
            with f_col2:
                filter_roster_search = st.text_input("Rechercher un étudiant (Nom ou Email) :", "")

            # Compter les soumissions par étudiant
            subs_count_map = {}
            for s in submissions:
                em = s.get("student_email")
                if em:
                    subs_count_map[em] = subs_count_map.get(em, 0) + 1

            roster_rows = []
            for p in db_profiles:
                em = p.get("email", "")
                cgrp = p.get("class_group") or "3ATELIOT"
                
                # Filtres
                if filter_roster_class != "Toutes" and cgrp != filter_roster_class:
                    continue
                if filter_roster_search and (filter_roster_search.lower() not in em.lower() and filter_roster_search.lower() not in (p.get("full_name") or "").lower()):
                    continue

                created_str = p.get("created_at", "")
                if created_str:
                    try:
                        created_str = datetime.fromisoformat(created_str.replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M")
                    except Exception:
                        pass

                roster_rows.append({
                    "Email": em,
                    "Nom Complet": p.get("full_name") or "-",
                    "Classe": cgrp,
                    "Rôle": p.get("role") or "student",
                    "Soumissions Déposées": subs_count_map.get(em, 0),
                    "Inscrit le": created_str
                })

            if roster_rows:
                df_roster = pd.DataFrame(roster_rows)
                st.dataframe(df_roster, use_container_width=True)

                # Actions individuelles rapides
                with st.expander("⚡ Action rapide sur un étudiant spécifique", expanded=False):
                    sel_ind_email = st.selectbox("Sélectionner l'étudiant :", [r["Email"] for r in roster_rows])
                    col_ind1, col_ind2 = st.columns(2)
                    with col_ind1:
                        if st.button(f"✉️ Renvoyer Email Reset à {sel_ind_email}", use_container_width=True):
                            ok, msg, link = student_mgr.send_password_reset(sel_ind_email)
                            if ok:
                                st.success(f"Email envoyé ! {msg}")
                                if link:
                                    st.code(link, language="text")
                            else:
                                st.error(msg)
                    with col_ind2:
                        new_cls_val = st.text_input("Changer la classe de cet étudiant :", value="3ATELIOT", key=f"cls_chg_{sel_ind_email}")
                        if st.button("💾 Mettre à jour la classe", use_container_width=True):
                            student_mgr.create_or_update_student(sel_ind_email, class_group=new_cls_val)
                            st.success(f"Classe mise à jour pour {sel_ind_email} -> {new_cls_val}")
                            st.rerun()
            else:
                st.info("Aucun étudiant ne correspond aux critères de recherche.")

# ------------------------------------------------------------------------------
# ONGLET 5 : TABLEAU RÉCAPITULATIF DE LA CLASSE
# ------------------------------------------------------------------------------
with tab_table:
    st.subheader("📋 Liste des Soumissions de la Classe")
    if not filtered_submissions:
        st.info("Aucune soumission trouvée.")
    else:
        df_display = pd.DataFrame([{
            "ID": s.get("id"),
            "Étudiant": s.get("student_email"),
            "Matière": s.get("course") or "GenAI",
            "Exercice": s.get("assignment_name"),
            "Tentative": f"{s.get('computed_attempt', 1)} / {s.get('max_allowed_attempts', 3)}",
            "Fichier": s.get("file_name"),
            "Note": f"{s.get('grade'):.2f}/20" if s.get('grade') is not None else "En attente",
            "Meilleure Note": "🏆 OUI" if s.get("is_best_attempt") else "",
            "Statut": s.get("status"),
            "Date": datetime.fromisoformat(s.get("created_at").replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M")
        } for s in filtered_submissions])

        st.dataframe(df_display.drop(columns=["ID"]), use_container_width=True)

        with st.expander("🗑️ Action rapide : Supprimer une soumission du tableau", expanded=False):
            sub_to_del_options = {
                f"{s.get('student_email')} | {s.get('assignment_name')} (Tentative {s.get('computed_attempt', 1)}) - {s.get('file_name')}": s
                for s in filtered_submissions
            }
            selected_del_label = st.selectbox("Sélectionner la soumission à supprimer :", list(sub_to_del_options.keys()), key="sel_del_table")
            sub_to_del = sub_to_del_options[selected_del_label]
            confirm_del_table = st.checkbox("Confirmer la suppression irréversible de cette tentative", key=f"chk_del_tab_{sub_to_del['id']}")
            if st.button("🗑️ Supprimer définitivement cette tentative", disabled=not confirm_del_table, type="secondary"):
                ok, msg = delete_submission(sub_to_del['id'], sub_to_del.get('file_path'))
                if ok:
                    st.success("Tentative supprimée !")
                    st.rerun()
                else:
                    st.error(msg)

# ------------------------------------------------------------------------------
# ONGLET 5 : EXPORTATION DES NOTES (EXCEL / CSV)
# ------------------------------------------------------------------------------
with tab_export:
    st.subheader("📥 Exporter les Notes de la Classe")
    st.write("Téléchargez un rapport officiel des résultats. Vous pouvez exporter toutes les tentatives ou uniquement la **meilleure note retenue**.")

    export_mode = st.radio("Mode d'exportation :", ["Meilleure note retenue par étudiant (Note Officielle)", "Toutes les tentatives détaillées"])

    if not submissions:
        st.warning("Aucune donnée disponible pour l'export.")
    else:
        if "Meilleure note" in export_mode:
            export_source = [s for s in submissions if s.get("is_best_attempt")]
        else:
            export_source = submissions

        export_data = []
        for s in export_source:
            created_dt = datetime.fromisoformat(s.get("created_at").replace("Z", "+00:00"))
            export_data.append({
                "Email Étudiant": s.get("student_email"),
                "Matière": s.get("course") or "GenAI",
                "Exercice": s.get("assignment_name"),
                "Tentative": s.get("computed_attempt", 1),
                "Est Meilleure Note": "Oui" if s.get("is_best_attempt") else "Non",
                "Nom du Fichier": s.get("file_name"),
                "Note (/20)": s.get("grade") if s.get("grade") is not None else "",
                "Statut": s.get("status"),
                "Commentaires": s.get("feedback") or "",
                "Date de Soumission": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "URL du Fichier": s.get("file_url")
            })

        df_export = pd.DataFrame(export_data)

        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df_export.to_excel(writer, index=False, sheet_name="Notes_Officielles")
        excel_bytes = excel_buffer.getvalue()

        csv_bytes = df_export.to_csv(index=False, sep=";", encoding="utf-8-sig").encode("utf-8-sig")

        col_ex1, col_ex2 = st.columns(2)
        with col_ex1:
            st.download_button(
                label="📊 Télécharger au format Excel (.xlsx)",
                data=excel_bytes,
                file_name=f"notes_edtech_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True
            )
        with col_ex2:
            st.download_button(
                label="📄 Télécharger au format CSV (.csv)",
                data=csv_bytes,
                file_name=f"notes_edtech_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                mime="text/csv",
                use_container_width=True
            )

        st.markdown("#### Prévisualisation des données exportées :")
        st.dataframe(df_export.head(15), use_container_width=True)

# ------------------------------------------------------------------------------
# ONGLET 7 : DÉTECTION DE PLAGIAT PAR SIMILARITÉ TEXTUELLE
# ------------------------------------------------------------------------------
with tab_plagiat:
    st.subheader("🕵️ Détection de Plagiat par Similarité Textuelle")
    st.markdown(
        "Compare les soumissions d'un même exercice entre elles (cosinus TF-IDF sur bigrammes). "
        "La colonne **Étudiant Suspect** est celui qui a soumis **après** la source, ce qui indique "
        "qu'il a potentiellement copié."
    )

    st.info(
        "ℹ️ **Méthode** : Similarité cosinus TF-IDF (unigrammes + bigrammes) après normalisation "
        "du texte. Seuil configurable. Fichiers trop courts (<100 car.) ignorés. "
        "sklearn requis pour TF-IDF, repli automatique sur Jaccard sinon."
    )

    col_plg_cfg1, col_plg_cfg2 = st.columns([5, 5])
    with col_plg_cfg1:
        plg_exercise = st.selectbox(
            "📚 Exercice à analyser :",
            ["Tous les exercices"] + sorted(list(set([s.get("assignment_name", "") for s in submissions]))),
            key="plg_exercise_select"
        )
    with col_plg_cfg2:
        plg_threshold = st.slider(
            "Seuil de similarité (%) :",
            min_value=40, max_value=100, value=75, step=5,
            help="Au-dessus de ce seuil, une paire est marquée comme suspecte.",
            key="plg_threshold_slider"
        )

    st.markdown("---")

    # Filtrage des soumissions cibles
    target_subs = submissions
    if plg_exercise != "Tous les exercices":
        target_subs = [s for s in submissions if s.get("assignment_name") == plg_exercise]

    if not target_subs:
        st.warning("Aucune soumission trouvée pour cet exercice.")
    else:
        n_subs = len(target_subs)
        n_pairs = (n_subs * (n_subs - 1)) // 2
        st.caption(
            f"📊 **{n_subs}** soumission(s) sélectionnée(s) — **{n_pairs}** paire(s) à comparer. "
            f"Cela nécessite de télécharger les fichiers depuis Supabase Storage."
        )

        if st.button(
            f"🔍 Lancer l'analyse de plagiat sur {n_subs} soumission(s)",
            type="primary",
            use_container_width=True,
            key="btn_run_plagiat"
        ):
            plg_dl_progress = st.progress(0)
            plg_dl_status = st.empty()

            enriched_subs = []
            for idx, sub in enumerate(target_subs):
                plg_dl_status.text(
                    f"Téléchargement : {sub.get('student_email')} — "
                    f"{sub.get('assignment_name')} (Tentative {sub.get('computed_attempt', 1)}) "
                    f"[{idx+1}/{n_subs}]..."
                )
                try:
                    res = requests.get(sub["file_url"], timeout=10)
                    if res.status_code == 200:
                        enriched_subs.append({**sub, "content": res.text})
                except Exception:
                    pass
                plg_dl_progress.progress((idx + 1) / n_subs)

            plg_dl_status.empty()
            st.session_state["plg_enriched_subs"] = enriched_subs
            st.session_state["plg_threshold_used"] = plg_threshold / 100.0

        enriched_for_analysis = st.session_state.get("plg_enriched_subs", [])
        plg_threshold_used = st.session_state.get("plg_threshold_used", plg_threshold / 100.0)

        if enriched_for_analysis:
            if plg_exercise != "Tous les exercices":
                enriched_for_analysis = [
                    s for s in enriched_for_analysis
                    if s.get("assignment_name") == plg_exercise
                ]

            with st.spinner("Calcul des similarités en cours..."):
                flags = LocalGrader.detect_plagiarism_in_batch(
                    enriched_for_analysis,
                    threshold=plg_threshold_used
                )

            if not flags:
                st.success(
                    f"✅ Aucun cas suspect détecté avec un seuil de {plg_threshold_used*100:.0f}%. "
                    f"({len(enriched_for_analysis)} soumissions analysées)"
                )
            else:
                rouge_count = sum(1 for f in flags if "Rouge" in f["severity"])
                attention_count = sum(1 for f in flags if "Attention" in f["severity"])
                surveiller_count = sum(1 for f in flags if "surveiller" in f["severity"])

                col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)
                col_stat1.metric("Paires Suspectes", len(flags))
                col_stat2.metric("🚨 Alertes Rouges (≥92%)", rouge_count)
                col_stat3.metric("⚠️ Attention (75-92%)", attention_count)
                col_stat4.metric("🔍 À surveiller (<75%)", surveiller_count)

                if rouge_count > 0:
                    st.error(f"🚨 **{rouge_count} cas de plagiat probable** (similarité ≥ 92%) détecté(s) !")
                elif attention_count > 0:
                    st.warning(f"⚠️ **{attention_count} similarité(s) suspecte(s)** à investiguer.")

                st.markdown("#### 📊 Tableau des Similarités Suspectes")
                st.caption(
                    "**🎯 Étudiant Suspect** = soumission POSTÉRIEURE (a potentiellement copié) | "
                    "**📌 Étudiant Source** = soumission ANTÉRIEURE (a potentiellement fourni l'original)"
                )

                df_flags = pd.DataFrame([{
                    "Gravité": f["severity"],
                    "Exercice": f["assignment"],
                    "🎯 Étudiant Suspect": f["suspect_email"],
                    "Date Soumission Suspecte": datetime.fromisoformat(
                        f["suspect_date"].replace("Z", "+00:00")
                    ).strftime("%d/%m/%Y %H:%M") if f.get("suspect_date") else "-",
                    "📌 Étudiant Source (a soumis avant)": f["source_email"],
                    "Date Source": datetime.fromisoformat(
                        f["source_date"].replace("Z", "+00:00")
                    ).strftime("%d/%m/%Y %H:%M") if f.get("source_date") else "-",
                    "Similarité": f["similarity_pct"],
                    "Score Brut": f["similarity"],
                } for f in flags])

                st.dataframe(df_flags.drop(columns=["Score Brut"]), use_container_width=True)

                csv_plagiat = df_flags.drop(columns=["Score Brut"]).to_csv(
                    index=False, sep=";", encoding="utf-8-sig"
                ).encode("utf-8-sig")

                st.download_button(
                    label="📥 Télécharger le Rapport de Plagiat (CSV)",
                    data=csv_plagiat,
                    file_name=f"rapport_plagiat_{plg_exercise.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                    mime="text/csv",
                    use_container_width=True
                )

                st.markdown("---")
                st.markdown("#### 🔎 Détail par étudiant suspect")
                suspects_unique = sorted(set([f["suspect_email"] for f in flags]))
                for suspect in suspects_unique:
                    suspect_flags = [f for f in flags if f["suspect_email"] == suspect]
                    max_sim = max(f["similarity"] for f in suspect_flags)
                    with st.expander(
                        f"{'🚨' if max_sim >= 0.92 else '⚠️' if max_sim >= 0.75 else '🔍'} "
                        f"{suspect} — similarité max : {max_sim*100:.1f}%",
                        expanded=(max_sim >= 0.85)
                    ):
                        for fl in sorted(suspect_flags, key=lambda x: x["similarity"], reverse=True):
                            sim_color = "red" if fl["similarity"] >= 0.92 else "orange" if fl["similarity"] >= 0.75 else "blue"
                            st.markdown(
                                f"**{fl['severity']}** | Exercice : `{fl['assignment']}` | "
                                f"Source : `{fl['source_email']}` | "
                                f"Similarité : <span style='color:{sim_color};font-weight:bold'>{fl['similarity_pct']}</span>",
                                unsafe_allow_html=True
                            )
                            col_dt1, col_dt2 = st.columns(2)
                            with col_dt1:
                                source_dt = datetime.fromisoformat(
                                    fl["source_date"].replace("Z", "+00:00")
                                ).strftime("%d/%m/%Y à %H:%M") if fl.get("source_date") else "-"
                                st.caption(f"📌 Source soumis le : {source_dt}")
                            with col_dt2:
                                suspect_dt = datetime.fromisoformat(
                                    fl["suspect_date"].replace("Z", "+00:00")
                                ).strftime("%d/%m/%Y à %H:%M") if fl.get("suspect_date") else "-"
                                st.caption(f"🎯 Suspect soumis le : {suspect_dt}")
                            st.markdown("---")
