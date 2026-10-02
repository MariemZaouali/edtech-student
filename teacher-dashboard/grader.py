"""
Moteur d'évaluation locale et d'analyse statique pour devoirs de code et rendus IA.
Effectue une analyse sans danger (statique) du code Python / Jupyter Notebooks et des images.
Intègre également un moteur de détection de plagiat par similarité textuelle (TF-IDF cosinus / Jaccard).
"""

import ast
import io
import json
import os
import re
import math
from collections import Counter
from typing import Dict, Any, Tuple, Optional, List
import pandas as pd
from PIL import Image

class LocalGrader:
    """
    Évaluateur local automatisé :
    - Analyse de syntaxe et AST Python
    - Détection de concepts clés (Deep Learning, PyTorch, Transformers, etc.)
    - Validation de Notebooks Jupyter (.ipynb)
    - Analyse d'images de synthèse (.png, .jpg)
    """

    # Mots-clés et concepts attendus selon les thématiques
    AI_KEYWORDS = {
        "attention": ["attention", "softmax", "matmul", "q", "k", "v", "query", "key", "value", "multihead", "dim"],
        "pytorch": ["torch", "nn.Module", "forward", "optim", "backward", "loss", "tensor"],
        "training": ["epoch", "batch", "train", "eval", "dataloader", "step", "zero_grad"],
        "nlp": ["tokenizer", "embedding", "peft", "lora", "transformers", "huggingface", "model"],
        "rag": ["vector", "index", "retriever", "langchain", "llama", "chunk", "query_engine"]
    }

    @staticmethod
    def evaluate_python_code(code_content: str, assignment_name: str = "") -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue statiquement un script Python sans exécution de code non fiable.
        Retourne : (note_suggérée_sur_20, rapport_markdown, details)
        """
        score = 0.0
        max_score = 20.0
        logs = []
        details = {
            "syntax_valid": False,
            "lines_of_code": 0,
            "functions_count": 0,
            "classes_count": 0,
            "docstrings_found": 0,
            "keywords_found": []
        }

        # 1. Nettoyage et comptage des lignes utiles
        lines = [l.strip() for l in code_content.splitlines() if l.strip() and not l.strip().startswith('#')]
        details["lines_of_code"] = len(lines)

        if len(lines) == 0:
            return 0.0, "❌ Fichier vide ou ne contenant que des commentaires.", details

        # 2. Vérification de la syntaxe via l'AST Python (0 à 6 pts)
        try:
            tree = ast.parse(code_content)
            details["syntax_valid"] = True
            score += 6.0
            logs.append("✅ Syntaxe Python valide (Arbre syntaxique AST compilé avec succès) : +6.0/6.0 pts")
        except SyntaxError as e:
            logs.append(f"❌ Erreur de syntaxe Python à la ligne {e.lineno} : {e.msg} (0/6.0 pts)")
            return 4.0, f"Erreur de syntaxe : {e.msg} à la ligne {e.lineno}", details

        # 3. Analyse structurelle : Fonctions et Classes (0 à 5 pts)
        functions = [node for node in ast.walk(tree) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
        classes = [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
        
        details["functions_count"] = len(functions)
        details["classes_count"] = len(classes)

        if len(classes) > 0 or len(functions) >= 2:
            score += 5.0
            logs.append(f"✅ Structure modulaire détectée ({len(classes)} classe(s), {len(functions)} fonction(s)) : +5.0/5.0 pts")
        elif len(functions) == 1:
            score += 3.0
            logs.append(f"⚠️ Structure minimale (1 seule fonction trouvée) : +3.0/5.0 pts")
        else:
            score += 1.0
            logs.append("⚠️ Aucune fonction/classe définie (script séquentiel pur) : +1.0/5.0 pts")

        # 4. Documentation & Docstrings (0 à 3 pts)
        docstrings = 0
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Module)):
                if ast.get_docstring(node):
                    docstrings += 1
        details["docstrings_found"] = docstrings

        if docstrings >= 2:
            score += 3.0
            logs.append(f"✅ Documentation présente ({docstrings} docstring(s) trouvées) : +3.0/3.0 pts")
        elif docstrings == 1:
            score += 1.5
            logs.append(f"⚠️ Documentation partielle : +1.5/3.0 pts")
        else:
            logs.append("ℹ️ Aucune docstring détectée : 0.0/3.0 pts")

        # 5. Mots-clés et terminologie attendue (0 à 6 pts)
        code_lower = code_content.lower()
        found_kw = []
        for category, kws in LocalGrader.AI_KEYWORDS.items():
            for kw in kws:
                if re.search(r'\b' + re.escape(kw.lower()) + r'\b', code_lower):
                    found_kw.append(kw)
        
        found_kw_unique = list(set(found_kw))
        details["keywords_found"] = found_kw_unique

        if len(found_kw_unique) >= 6:
            score += 6.0
            logs.append(f"✅ Excellente couverture technique ({len(found_kw_unique)} concepts IA trouvés : {', '.join(found_kw_unique[:8])}...) : +6.0/6.0 pts")
        elif len(found_kw_unique) >= 3:
            score += 4.0
            logs.append(f"✅ Concepts techniques présents ({len(found_kw_unique)} identifiés) : +4.0/6.0 pts")
        elif len(found_kw_unique) >= 1:
            score += 2.0
            logs.append(f"⚠️ Concepts techniques limités : +2.0/6.0 pts")
        else:
            logs.append("ℹ️ Aucun terme technique spécifique détecté : 0.0/6.0 pts")

        # Arrondi
        score = min(max_score, round(score, 1))
        report = "\n".join(logs)
        return score, report, details

    @staticmethod
    def evaluate_jupyter_notebook(notebook_str: str, assignment_name: str = "") -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue la structure et le contenu d'un Notebook Jupyter (.ipynb).
        """
        try:
            nb_data = json.loads(notebook_str)
        except Exception as e:
            return 2.0, f"❌ Format JSON de Notebook invalide : {str(e)}", {}

        cells = nb_data.get("cells", [])
        code_cells = [c for c in cells if c.get("cell_type") == "code"]
        md_cells = [c for c in cells if c.get("cell_type") == "markdown"]

        executed_cells = [c for c in code_cells if c.get("execution_count") is not None]
        has_outputs = any(len(c.get("outputs", [])) > 0 for c in code_cells)

        combined_code = "\n".join("".join(c.get("source", [])) for c in code_cells)
        base_score, py_report, details = LocalGrader.evaluate_python_code(combined_code, assignment_name)

        # Bonus / ajustement Notebook
        nb_logs = [
            f"📓 Structure Notebook : {len(cells)} cellules ({len(code_cells)} code, {len(md_cells)} markdown).",
            f"⚡ Exécution : {len(executed_cells)}/{len(code_cells)} cellules exécutées." + (" (Résultats & graphiques présents)" if has_outputs else " (Aucune sortie générée)")
        ]

        if len(md_cells) >= 2:
            base_score = min(20.0, base_score + 1.0)
            nb_logs.append("✅ Bonne structure explicative en Markdown.")

        final_report = "### Rapport d'analyse du Notebook Jupyter\n" + "\n".join(nb_logs) + "\n\n" + py_report
        return base_score, final_report, {**details, "total_cells": len(cells), "code_cells": len(code_cells), "md_cells": len(md_cells)}

    @staticmethod
    def evaluate_image_file(image_bytes: bytes, filename: str) -> Tuple[float, str, Dict[str, Any]]:
        """
        Valide l'intégrité et les caractéristiques d'une image générative ou de synthèse.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
            width, height = img.size
            format_name = img.format
            mode = img.mode

            # Vérification non vide
            is_valid_size = width >= 256 and height >= 256
            score = 14.0 # Score de base pour une image valide

            logs = [
                f"✅ Format d'image valide : {format_name} ({mode})",
                f"📐 Résolution : {width} x {height} px",
            ]

            if is_valid_size:
                score += 4.0
                logs.append("✅ Résolution conforme aux exigences de synthèse (≥ 256x256)")
            else:
                logs.append("⚠️ Résolution faible pour un rendu de modèle génératif")

            if width == height:
                score += 2.0
                logs.append("✅ Ratio 1:1 standard pour modèles de diffusion")

            score = min(20.0, score)
            report = "### Analyse du Rendu Graphique\n" + "\n".join(logs)
            return score, report, {"width": width, "height": height, "format": format_name, "mode": mode}

        except Exception as e:
            return 0.0, f"❌ Fichier image corrompu ou illisible : {str(e)}", {}

    @staticmethod
    def evaluate_optimizer_json(json_content: str) -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue le fichier JSON de l'exercice 'Optimizer' (Matière GenAI).
        ÉVALUATION SÉVÈRE DÉTERMINISTE (Base 0 pt) :
        Formule stricte :
        Final score = 0.20*R + 0.25*P + 0.30*A + 0.15*C + 0.05*S + 0.05*X
        """
        try:
            data = json.loads(json_content)
        except Exception as e:
            return 0.0, f"❌ Erreur de syntaxe JSON : Impossible de parser le fichier ({str(e)})", {}

        if isinstance(data, dict):
            for candidate in ["criteria", "scores", "evaluation", "grades", "ratings"]:
                if candidate in data and isinstance(data[candidate], dict):
                    data = {**data, **data[candidate]}

        def find_val(keys):
            for k in keys:
                for existing_k in data.keys():
                    if existing_k.strip().lower() == k.strip().lower():
                        val = data[existing_k]
                        try:
                            return float(val)
                        except (ValueError, TypeError):
                            pass
            return None

        r = find_val(["relevance", "r"])
        p = find_val(["pedagogical_quality", "pedagogical", "p"])
        a = find_val(["technical_accuracy", "technical", "accuracy", "a"])
        c = find_val(["comparison_critical_thinking", "critical_thinking", "comparison", "c"])
        s = find_val(["support_quality", "support", "s"])
        x = find_val(["sources_reproducibility", "sources", "reproducibility", "x"])

        # Si l'étudiant a soumis des textes d'analyse au lieu de notes numériques (Mode Déterministe Sévère)
        justif_r = ""
        justif_p = ""
        justif_a = ""
        justif_c = ""
        justif_s = ""
        justif_x = ""

        if any(v is None for v in [r, p, a, c, s, x]):
            full_text = json_content.lower()
            char_count = len(full_text)

            # 1. Relevance R (/20) : Présence réelle des 3 algorithmes
            has_vanilla = any(k in full_text for k in ["vanilla", "batch gradient", "gradient descent", "descente de gradient classique"])
            has_sgd = any(k in full_text for k in ["sgd", "stochastic", "stochastique"])
            has_adamw = any(k in full_text for k in ["adamw", "adam-w"])
            algos_found = []
            if has_vanilla: algos_found.append("Vanilla Gradient")
            if has_sgd: algos_found.append("SGD")
            if has_adamw: algos_found.append("AdamW")
            algo_count = len(algos_found)
            
            if algo_count == 3:
                r = 16.0 if char_count > 600 else 12.0
                justif_r = "✅ 3/3 algorithmes traités (Vanilla Gradient, SGD, AdamW). Couverture du sujet conforme."
            elif algo_count == 2:
                r = 8.0
                justif_r = f"⚠️ 2/3 algorithmes identifiés ({', '.join(algos_found)}). Il manque 1 algorithme exigé par l'énoncé."
            elif algo_count == 1:
                r = 4.0
                justif_r = f"❌ 1 seul algorithme traité ({algos_found[0]}). Couverture très incomplète du sujet."
            else:
                r = 0.0
                justif_r = "❌ Aucun des 3 algorithmes cibles clairement identifié dans le devoir."

            # 2. Pedagogical Quality P (/20) : Clarté, avantages/inconvénients, structure
            p = 0.0
            p_details = []
            if char_count >= 300: 
                p += 4.0
                p_details.append(f"Volume d'analyse substantiel ({char_count} car.)")
            else:
                p_details.append(f"Texte trop succinct ({char_count} car. < 300)")
            if char_count >= 800: p += 4.0
            
            has_pros_cons = any(k in full_text for k in ["avantage", "inconvénient", "limite", "force", "faiblesse", "pros", "cons"])
            if has_pros_cons: 
                p += 4.0
                p_details.append("Avantages & limites explicites")
            else:
                p_details.append("Absence de distinction nette avantages/inconvénients")

            if any(k in full_text for k in ["définition", "principe", "mécanisme", "fonctionnement"]): 
                p += 3.0
                p_details.append("Principe de fonctionnement structuré")
            p = min(16.0, p)
            justif_p = " | ".join(p_details)

            # 3. Technical Accuracy A (/20) : Exactitude technique et découplage AdamW
            a = 0.0
            tech_terms = ["momentum", "weight decay", "découplage", "decoupled", "mini-batch", "learning rate", "taux d'apprentissage", "moment", "beta1", "beta2", "gradient"]
            found_tech = [t for t in tech_terms if t in full_text]
            a += min(10.0, len(found_tech) * 1.5)
            
            # Bonus crucial : Découplage de Weight Decay dans AdamW
            has_decoupling = any(k in full_text for k in ["découpl", "decoupl", "l2 regularization", "régularisation l2"])
            if has_decoupling:
                a += 4.0
                justif_a = f"✅ Notion clé du découplage de Weight Decay expliquée pour AdamW. Concepts techniques détectés ({', '.join(found_tech[:4])})."
            else:
                justif_a = f"⚠️ Pénalité : Absence d'explication sur le découplage fondamental du Weight Decay dans AdamW (différence clé avec Adam/L2). Termes trouvés : {', '.join(found_tech[:3]) or 'aucun'}."
            a = min(16.0, a)

            # 4. Comparison & Critical Thinking C (/20) : Vitesse vs Généralisation, Mémoire
            c = 0.0
            comp_terms = ["convergence", "généralisation", "generalization", "mémoire", "memory", "vitesse", "compromis", "trade-off", "optima locaux", "minima locaux"]
            found_comp = [t for t in comp_terms if t in full_text]
            c += min(12.0, len(found_comp) * 2.0)
            c = min(15.0, c)
            if len(found_comp) >= 3:
                justif_c = f"✅ Comparaison critique présente sur les compromis clés : {', '.join(found_comp[:3])}."
            elif len(found_comp) >= 1:
                justif_c = f"⚠️ Comparaison partielle ({', '.join(found_comp)}). Manque d'analyse sur la vitesse de convergence vs la généralisation et l'empreinte mémoire."
            else:
                justif_c = "❌ Aucune comparaison critique ni analyse des compromis (vitesse, capacité de généralisation, coût mémoire)."

            # 5. Support Quality S (/20) : Formules mathématiques formelles
            s = 0.0
            math_symbols = ["θ", "η", "β", "λ", "γ", "ε", "\\theta", "\\eta", "sqrt", "nabla", "∇", "w_{t+1}", "g_t", "v_t", "m_t", "="]
            found_sym = [sym for sym in math_symbols if sym in json_content]
            if len(found_sym) >= 3:
                s = 14.0
                justif_s = f"✅ Formules mathématiques formelles présentes pour les équations de mise à jour des paramètres ({', '.join(found_sym[:4])})."
            elif len(found_sym) >= 1:
                s = 7.0
                justif_s = f"⚠️ Notations mathématiques très sommaires ({', '.join(found_sym)}). Manque les équations complètes d'actualisation."
            else:
                s = 0.0  # Zéro absolu si aucune formule mathématique
                justif_s = "❌ Aucune formule mathématique formelle d'actualisation des poids (θ_{t+1} = θ_t - η*∇L, calcul des moments m_t, v_t)."

            # 6. Sources & Reproducibility X (/20) : Citations académiques
            x = 0.0
            sources = ["loshchilov", "hutter", "kingma", "robbins", "arxiv", "doi", "pytorch", "torch.optim", "paper", "article"]
            found_src = [src for src in sources if src in full_text]
            if len(found_src) >= 2:
                x = 15.0
                justif_x = f"✅ Références académiques et publications citées ({', '.join(found_src)})."
            elif len(found_src) == 1:
                x = 8.0
                justif_x = f"⚠️ Une seule source mentionnée ({found_src[0]}). Bibliographie incomplète."
            else:
                x = 0.0  # Zéro absolu si aucune source citée
                justif_x = "❌ Aucune référence de recherche citée (Loshchilov & Hutter 2017 pour AdamW, Kingma & Ba 2014, Robbins & Monro 1951)."
        else:
            justif_r = "Note numérique R fournie directement dans la soumission."
            justif_p = "Note numérique P fournie directement dans la soumission."
            justif_a = "Note numérique A fournie directement dans la soumission."
            justif_c = "Note numérique C fournie directement dans la soumission."
            justif_s = "Note numérique S fournie directement dans la soumission."
            justif_x = "Note numérique X fournie directement dans la soumission."

        # Synthèse du travail et points d'amélioration pour le mode déterministe
        missing_points = []
        if algo_count < 3:
            missing_algos = [a for a in ["Vanilla Gradient", "SGD", "AdamW"] if a not in algos_found]
            missing_points.append(f"Traiter l'ensemble des 3 algorithmes exigés (il manque : {', '.join(missing_algos)}).")
        if not has_pros_cons:
            missing_points.append("Structurer l'analyse avec des sections explicites sur les avantages et inconvénients comparés.")
        if not has_decoupling:
            missing_points.append("Expliciter le découplage du Weight Decay dans AdamW et son impact par rapport à la régularisation L2 d'Adam.")
        if len(found_comp) < 2:
            missing_points.append("Approfondir la comparaison critique : compromis vitesse de convergence vs capacité de généralisation et empreinte mémoire.")
        if len(found_sym) < 2:
            missing_points.append("Intégrer les équations mathématiques formelles d'actualisation des poids (θ_{t+1}, calcul des moments m_t, v_t).")
        if len(found_src) < 1:
            missing_points.append("Citer les publications scientifiques de référence (Loshchilov & Hutter 2017 pour AdamW, Kingma & Ba 2014, Robbins & Monro 1951).")

        summary_work = f"L'étudiant a soumis une analyse de {char_count} caractères couvrant {algo_count}/3 algorithme(s) ({', '.join(algos_found) or 'aucun'}). " + \
                       (f"Le devoir aborde les avantages/inconvénients." if has_pros_cons else "L'analyse reste descriptive sans mise en balance claire des forces et faiblesses.")

        improvements_needed = " ".join([f"{i+1}) {pt}" for i, pt in enumerate(missing_points)]) if missing_points else "Excellente analyse ! Pour viser la perfection absolue, vous pouvez détailler les preuves de convergence empiriques."

        general_feedback_str = f"📌 Résumé de votre travail :\n{summary_work}\n\n💡 Ce que vous devez améliorer :\n{improvements_needed}"

        raw_final_score = 0.20 * r + 0.25 * p + 0.30 * a + 0.15 * c + 0.05 * s + 0.05 * x
        score_sur_20 = max(0.0, min(20.0, round(raw_final_score, 2)))

        report_lines = [
            "### 📊 Rapport d'Évaluation Multicritère Détaillé : Optimizer (GenAI)",
            f"**Formule officielle appliquée :** `Final score = 0.20*R + 0.25*P + 0.30*A + 0.15*C + 0.05*S + 0.05*X`",
            "",
            "| Critère | Clé | Coeff. | Note (/20) | Points | Exigence & Justification détaillée de la note |",
            "| :--- | :---: | :---: | :---: | :---: | :--- |",
            f"| **Relevance (Vanilla, SGD, AdamW)** | `R` | 0.20 | {r:.1f} | {(0.20 * r):.2f} | {justif_r} |",
            f"| **Pedagogical Quality** | `P` | 0.25 | {p:.1f} | {(0.25 * p):.2f} | {justif_p} |",
            f"| **Technical Accuracy** | `A` | 0.30 | {a:.1f} | {(0.30 * a):.2f} | {justif_a} |",
            f"| **Comparison & Critical Thinking** | `C` | 0.15 | {c:.1f} | {(0.15 * c):.2f} | {justif_c} |",
            f"| **Support Quality** | `S` | 0.05 | {s:.1f} | {(0.05 * s):.2f} | {justif_s} |",
            f"| **Sources & Reproducibility** | `X` | 0.05 | {x:.1f} | {(0.05 * x):.2f} | {justif_x} |",
            "",
            f"🎯 **Score Final Calculé : {score_sur_20:.2f} / 20**",
            "",
            "---",
            "### 📝 Synthèse Pédagogique & Conseil à l'Étudiant",
            f"📌 **Résumé du travail de l'étudiant :**",
            f"> {summary_work}",
            "",
            f"💡 **Ce que l'étudiant doit améliorer pour progresser :**",
            f"> {improvements_needed}"
        ]

        details = {
            "R": r, "P": p, "A": a, "C": c, "S": s, "X": x,
            "raw_score": raw_final_score,
            "final_grade": score_sur_20,
            "student_work_summary": summary_work,
            "areas_for_improvement": improvements_needed,
            "general_feedback": general_feedback_str,
            "comments": {
                "R": justif_r, "P": justif_p, "A": justif_a,
                "C": justif_c, "S": justif_s, "X": justif_x
            }
        }

        return score_sur_20, "\n".join(report_lines), details

    @staticmethod
    def evaluate_optimizer_with_cloud_llm(
        json_content: str,
        api_key: str = "",
        provider: str = "gemini",
        model_name: str = None
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue le rendu JSON d'un étudiant par rapport au sujet 'Vanilla Gradient, SGD, AdamW'
        en appliquant une grille d'évaluation académique STRICTE et SÉVÈRE (Gemini / Groq).
        Fournit une explication explicite pour chaque exigence, un résumé du travail et les axes d'amélioration.
        """
        if not api_key:
            return LocalGrader.evaluate_optimizer_json(json_content)

        prompt = f"""Tu es un professeur d'université et jury de concours d'ingénieurs en Intelligence Artificielle (Deep Learning) TRÈS EXIGEANT, SÉVÈRE et INTRANSIGEANT.
Ton objectif est d'analyser rigoureusement le travail de l'étudiant, d'attribuer une note juste et sévère selon le barème, et de fournir un retour pédagogique structuré.

ÉNONCÉ OFFICIEL DU DEVOIR :
"Définis et compare les algorithmes de descente de gradient : Vanilla Gradient, SGD, AdamW"

CONTENU SOUMIS PAR L'ÉTUDIANT :
```json
{json_content[:8000]}
```

ÉCHELLE DE NOTATION STRICTE (SUR 20 POUR CHAQUE CRITÈRE) :
- 0 à 6/20 : Incomplet, superficiel, hors-sujet ou notions erronées.
- 7 à 11/20 : Passable / Moyen. Répétition de généralités vagues sans rigueur mathématique ni analyse des limites.
- 12 à 15/20 : Bon travail. Définitions complètes, présence d'équations et comparaison structurée.
- 16 à 18/20 : Très solide. Démonstrations claires, analyse critique approfondie, citations académiques précises.
- 19 à 20/20 : EXCEPTIONNEL / Perfection absolue (formules LaTeX, code, références Loshchilov/Kingma). RAREMENT ATTRIBUÉ.

PÉNALITÉS ET EXIGENCES PAR CRITÈRE :
1. R (Relevance) [Coeff 0.20] :
   - Exigence : Couverture des 3 algorithmes Vanilla Gradient, SGD et AdamW.
   - Si 1 seul algorithme : Note max = 5/20. Si 2 algorithmes : Note max = 10/20.
2. P (Pedagogical Quality) [Coeff 0.25] :
   - Exigence : Structure claire, définitions des principes, forces et faiblesses explicites.
   - Si texte trop court (< 300 mots) ou sans avantages/inconvénients : Note max = 9/20.
3. A (Technical Accuracy) [Coeff 0.30] :
   - Exigence : Exactitude technique et explication obligatoire du DÉCOUPLAGE du Weight Decay dans AdamW (différence essentielle avec la régularisation L2 d'Adam).
   - Si le découplage AdamW n'est pas explicité : Note max sur A = 10/20.
4. C (Comparison & Critical Thinking) [Coeff 0.15] :
   - Exigence : Analyse comparative approfondie des compromis (vitesse de convergence vs capacité de généralisation vs coût mémoire des tenseurs d'état).
   - Si aucune comparaison critique réelle : Note max sur C = 6/20.
5. S (Support Quality) [Coeff 0.05] :
   - Exigence : Formules mathématiques formelles d'actualisation des poids (θ_{{t+1}} = ...). Si AUCUNE formule mathématique : Note = 0/20.
6. X (Sources & Reproducibility) [Coeff 0.05] :
   - Exigence : Citations d'articles de recherche (Loshchilov & Hutter 2017, Kingma & Ba 2014, Robbins & Monro 1951). Si AUCUNE référence : Note = 0/20.

Tu dois OBLIGATOIREMENT répondre UNIQUEMENT avec un JSON valide respectant cette structure exacte :
{{
  "R": <note_entre_0_et_20>,
  "P": <note_entre_0_et_20>,
  "A": <note_entre_0_et_20>,
  "C": <note_entre_0_et_20>,
  "S": <note_entre_0_et_20>,
  "X": <note_entre_0_et_20>,
  "comments": {{
    "R": "Exigence : 3 algorithmes requis. Constat : [Explique clairement ce qui est présent vs manquant et pourquoi cette note R]",
    "P": "Exigence : Structure & avantages/inconvénients. Constat : [Explique la clarté pédagogique et la note P]",
    "A": "Exigence : Exactitude & découplage Weight Decay AdamW. Constat : [Explique la précision technique et la note A]",
    "C": "Exigence : Compromis vitesse/généralisation/mémoire. Constat : [Explique l'analyse critique et la note C]",
    "S": "Exigence : Formules mathématiques formelles. Constat : [Explique la présence/absence d'équations et la note S]",
    "X": "Exigence : Citations académiques réelles. Constat : [Explique les sources citées/manquantes et la note X]"
  }},
  "student_work_summary": "<Synthèse claire et précise de ce que l'étudiant a effectivement rédigé et accompli dans son travail>",
  "areas_for_improvement": "<Liste numérotée et concrète des lacunes prioritaires à corriger pour atteindre la note maximale (ex: découplage Weight Decay AdamW, équations LaTeX θ_t+1, citations Loshchilov/Kingma, analyse mémoire)>",
  "general_feedback": "<Commentaire global à destination de l'étudiant intégrant le résumé et les conseils d'amélioration>"
}}
"""

        try:
            import requests
            parsed_result = None
            used_model = model_name or ""

            def clean_json_text(text: str) -> dict:
                text = text.strip()
                if "```" in text:
                    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
                    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
                return json.loads(text.strip())

            if "groq" in provider.lower():
                groq_candidates = [model_name] if model_name else []
                groq_candidates += [
                    "llama-3.3-70b-versatile",
                    "deepseek-r1-distill-llama-70b",
                    "qwen-2.5-32b",
                    "llama-3.1-8b-instant",
                    "mixtral-8x7b-32768",
                    "gemma2-9b-it"
                ]
                # Déduplication
                seen_g = set()
                groq_models = [m for m in groq_candidates if m and not (m in seen_g or seen_g.add(m))]

                for g_model in groq_models:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    body = {
                        "model": g_model,
                        "messages": [
                            {"role": "system", "content": "Tu es un évaluateur académique impitoyable et rigoureux qui note avec sévérité et répond uniquement en JSON strict."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"}
                    }
                    try:
                        res = requests.post(url, headers=headers, json=body, timeout=25)
                        if res.status_code == 200:
                            resp_data = res.json()
                            raw_text = resp_data["choices"][0]["message"]["content"]
                            parsed_result = clean_json_text(raw_text)
                            used_model = g_model
                            break
                    except Exception:
                        continue

            else:
                # Modèles Google Gemini officiels
                gemini_candidates = [model_name] if model_name else []
                gemini_candidates += [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro",
                    "gemini-1.5-flash-8b",
                    "gemini-1.5-flash-latest"
                ]
                seen_gm = set()
                gemini_models = [m for m in gemini_candidates if m and not (m in seen_gm or seen_gm.add(m))]

                for g_model in gemini_models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={api_key}"
                    headers = {
                        "Content-Type": "application/json",
                        "x-goog-api-key": api_key
                    }
                    body = {
                        "contents": [{
                            "parts": [{"text": prompt}]
                        }],
                        "generationConfig": {
                            "temperature": 0.1,
                            "response_mime_type": "application/json"
                        }
                    }
                    try:
                        res = requests.post(url, headers=headers, json=body, timeout=25)
                        if res.status_code == 200:
                            resp_data = res.json()
                            candidates = resp_data.get("candidates", [])
                            if candidates:
                                raw_text = candidates[0]["content"]["parts"][0]["text"]
                                parsed_result = clean_json_text(raw_text)
                                used_model = g_model
                                break
                    except Exception:
                        continue

            if not parsed_result:
                return LocalGrader.evaluate_optimizer_json(json_content)

            # Extraction et calcul strict
            r = float(parsed_result.get("R", 10.0))
            p = float(parsed_result.get("P", 10.0))
            a = float(parsed_result.get("A", 10.0))
            c = float(parsed_result.get("C", 8.0))
            s = float(parsed_result.get("S", 0.0))
            x = float(parsed_result.get("X", 0.0))

            comments = parsed_result.get("comments", {})
            summary_work = parsed_result.get("student_work_summary", "L'étudiant a soumis une analyse sur les optimiseurs de descente de gradient.")
            improvements = parsed_result.get("areas_for_improvement", "Approfondir les détails mathématiques, le découplage Weight Decay d'AdamW et les citations académiques.")
            general_fb = parsed_result.get("general_feedback", f"📌 Résumé :\n{summary_work}\n\n💡 Axes d'amélioration :\n{improvements}")

            # Formule officielle
            final_score = 0.20 * r + 0.25 * p + 0.30 * a + 0.15 * c + 0.05 * s + 0.05 * x
            final_score = max(0.0, min(20.0, round(final_score, 2)))

            report_lines = [
                f"### 🤖 Rapport d'Évaluation IA Cloud ({used_model}) • Sujet : Vanilla Gradient, SGD, AdamW",
                f"**Formule officielle appliquée :** `Final score = 0.20*R + 0.25*P + 0.30*A + 0.15*C + 0.05*S + 0.05*X`",
                "",
                "| Critère | Clé | Coeff. | Note (/20) | Points | Exigence & Justification détaillée de la note |",
                "| :--- | :---: | :---: | :---: | :---: | :--- |",
                f"| **Relevance (Vanilla, SGD, AdamW)** | `R` | 0.20 | {r:.1f} | {(0.20*r):.2f} | {comments.get('R', '3 algorithmes requis')} |",
                f"| **Pedagogical Quality** | `P` | 0.25 | {p:.1f} | {(0.25*p):.2f} | {comments.get('P', 'Structure & avantages/inconvénients')} |",
                f"| **Technical Accuracy** | `A` | 0.30 | {a:.1f} | {(0.30*a):.2f} | {comments.get('A', 'Exactitude & découplage AdamW')} |",
                f"| **Comparison & Critical Thinking** | `C` | 0.15 | {c:.1f} | {(0.15*c):.2f} | {comments.get('C', 'Compromis vitesse/généralisation/mémoire')} |",
                f"| **Support Quality** | `S` | 0.05 | {s:.1f} | {(0.05*s):.2f} | {comments.get('S', 'Formules mathématiques formelles')} |",
                f"| **Sources & Reproducibility** | `X` | 0.05 | {x:.1f} | {(0.05*x):.2f} | {comments.get('X', 'Citations académiques réelles')} |",
                "",
                f"🎯 **Score Final Suggéré : {final_score:.2f} / 20**",
                "",
                "---",
                "### 📝 Synthèse Pédagogique & Conseil à l'Étudiant",
                f"📌 **Résumé du travail de l'étudiant :**",
                f"> {summary_work}",
                "",
                f"💡 **Ce que l'étudiant doit améliorer pour progresser :**",
                f"> {improvements}"
            ]

            details = {
                "R": r, "P": p, "A": a, "C": c, "S": s, "X": x,
                "final_grade": final_score,
                "evaluator": f"cloud_{used_model}",
                "topic": "Vanilla Gradient, SGD, AdamW",
                "comments": comments,
                "student_work_summary": summary_work,
                "areas_for_improvement": improvements,
                "general_feedback": general_fb
            }

            return final_score, "\n".join(report_lines), details

        except Exception as e:
            print(f"Erreur évaluation Cloud LLM : {e}")
            return LocalGrader.evaluate_optimizer_json(json_content)

    # ==========================================================================
    # ÉVALUATION DEVOIR : LSTM VS RNN & FIGURE TIKZ (Matière GenAI)
    # Consigne : "Submit a description of LSTMs and a Figure in TikZ format to explain the improvement of LSTMs over RNNs"
    # ==========================================================================

    @staticmethod
    def evaluate_lstm_json(json_content: str) -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue le fichier JSON de l'exercice 'LSTM vs RNN (TikZ & Théorie)' (Matière GenAI).
        Consigne : 'Submit a description of LSTMs and a Figure in TikZ format to explain the improvement of LSTMs over RNNs'
        Formule stricte :
        Final score = 0.30*T + 0.25*A + 0.20*I + 0.15*P + 0.05*R + 0.05*X
        """
        try:
            data = json.loads(json_content)
        except Exception as e:
            return 0.0, f"❌ Erreur de syntaxe JSON : Impossible de parser le fichier ({str(e)})", {}

        # Extraction des sections
        description_data = data.get("description", {})
        if isinstance(description_data, dict):
            desc_text = " ".join([str(v) for v in description_data.values() if isinstance(v, str)])
            gates_data = description_data.get("gates_formulation", {})
            if isinstance(gates_data, dict):
                desc_text += " " + " ".join([str(v) for v in gates_data.values() if isinstance(v, str)])
        else:
            desc_text = str(description_data)

        tikz_code = str(data.get("tikz_figure", data.get("tikz", data.get("figure", ""))))
        full_text = (json_content + " " + desc_text).lower()

        # 1. T (TikZ Figure & Architecture Visual) [Coeff 0.30]
        has_begin_tikz = "\\begin{tikzpicture}" in tikz_code or "tikzpicture" in tikz_code
        has_end_tikz = "\\end{tikzpicture}" in tikz_code or "tikzpicture" in tikz_code
        tikz_lower = tikz_code.lower()
        
        has_nodes = "\\node" in tikz_code or "\\draw" in tikz_code
        has_sigma = "sigma" in tikz_lower or "\\sigma" in tikz_code
        has_tanh = "tanh" in tikz_lower or "\\tanh" in tikz_code
        has_cell_state_line = any(k in tikz_lower for k in ["c_t", "c_{t", "cell", "c_{t-1}", "c_next", "c_prev", "highway"])
        gates_in_tikz = [
            any(k in tikz_lower for k in ["f_t", "f_gate", "forget"]),
            any(k in tikz_lower for k in ["i_t", "i_gate", "input"]),
            any(k in tikz_lower for k in ["c_tilde", "tilde", "candidate"]),
            any(k in tikz_lower for k in ["o_t", "o_gate", "output"])
        ]
        has_gates_tikz = sum([1 for g in gates_in_tikz if g])
        has_ops_tikz = any(k in tikz_code for k in ["\\odot", "\\oplus", "\\otimes", "odot", "oplus", "otimes", "+", "*"])

        brace_diff = abs(tikz_code.count('{') - tikz_code.count('}'))
        is_syntax_plausible = has_begin_tikz and has_end_tikz and brace_diff <= 2 and len(tikz_code) > 100

        if not tikz_code.strip() or not has_nodes:
            t = 0.0
            justif_t = "Pénalité maximale : Aucun code TikZ détecté ou section 'tikz_figure' vide."
        elif not is_syntax_plausible:
            t = 6.0
            justif_t = f"Code TikZ incomplet ou syntaxe déséquilibrée ({len(tikz_code)} caractères, écart d'accolades: {brace_diff})."
        else:
            t_base = 12.0
            if has_sigma and has_tanh: t_base += 2.0
            if has_cell_state_line: t_base += 2.0
            if has_gates_tikz >= 3: t_base += 2.0
            if has_ops_tikz: t_base += 2.0
            t = min(20.0, t_base)
            justif_t = f"Schéma TikZ complet et structuré ({len(tikz_code)} car., {has_gates_tikz}/4 portes dessinées, opérateurs et autoroute Cell State présents)."

        # 2. A (Technical Accuracy & Équations des Portes) [Coeff 0.25]
        has_f_eq = any(k in full_text for k in ["w_f", "w_forget", "f_t", "w f", "\\sigma(w_f", "sigma(w_f"])
        has_i_eq = any(k in full_text for k in ["w_i", "i_t", "w i", "\\sigma(w_i", "sigma(w_i"])
        has_c_tilde_eq = any(k in full_text for k in ["c_tilde", "\\tilde{c}", "tilde{c}", "\\tanh(w_c", "tanh(w_c", "candidate"])
        has_c_update_eq = any(k in full_text for k in ["c_t =", "c_t=", "f_t \\odot", "f_t * c", "f_t \\times", "c_{t-1} + i_t", "cell_state_update"])
        has_o_eq = any(k in full_text for k in ["w_o", "o_t", "w o", "o_t \\odot", "h_t = o_t"])
        gates_covered = sum([has_f_eq, has_i_eq, has_c_tilde_eq, has_c_update_eq, has_o_eq])

        if gates_covered >= 5:
            a = 18.0 if ("\\odot" in json_content or "odot" in full_text or "hadamard" in full_text) else 16.0
            justif_a = "Couverture exhaustive des équations de portes (f_t, i_t, C_tilde, C_t, o_t, h_t)."
        elif gates_covered >= 3:
            a = 12.0
            justif_a = f"Formulation partielle des portes ({gates_covered}/5 équations ou mécanismes décrits)."
        elif gates_covered >= 1:
            a = 6.0
            justif_a = "Formulation mathématique très lacunaire des équations de portes."
        else:
            a = 2.0
            justif_a = "Absence d'équations mathématiques formelles pour les portes du LSTM."

        # 3. I (Amélioration vs RNN & Vanishing Gradient) [Coeff 0.20]
        has_vanishing = any(k in full_text for k in ["vanishing", "évanouissement", "disparition du gradient", "gradient vanishing", "exploding gradient", "explosion"])
        has_cec_highway = any(k in full_text for k in ["constant error carousel", "cec", "gradient highway", "autoroute", "transport additif", "additive", "addition", "carrousel"])
        has_derivative = any(k in full_text for k in ["\\frac{\\partial", "partial", "derivee", "dérivée", "jacobienne", "jacobian", "produit matriciel", "multiplication"])

        if has_vanishing and has_cec_highway:
            i_score = 18.0 if has_derivative else 15.0
            justif_i = "Explication rigoureuse de la supériorité sur RNN : Constant Error Carousel (CEC) et autoroute additive de gradient."
        elif has_vanishing:
            i_score = 10.0
            justif_i = "Le problème d'évanouissement du gradient est cité mais le mécanisme exact de l'autoroute additive (CEC) n'est pas approfondi."
        else:
            i_score = 4.0
            justif_i = "Pénalité : Aucune justification théorique rigoureuse sur la façon dont le LSTM surmonte les limites du RNN."

        # 4. P (Qualité Pédagogique & Intuition) [Coeff 0.15]
        has_intuition = any(k in full_text for k in ["pourquoi", "oubli", "mémoriser", "sélectionner", "filtrer", "intuition", "rôle"])
        word_count = len(desc_text.split())
        p_base = 6.0
        if word_count >= 150: p_base += 4.0
        if word_count >= 300: p_base += 3.0
        if has_intuition: p_base += 4.0
        p = min(18.0, p_base)
        justif_p = f"Explication pédagogique ({word_count} mots, intuition des mécanismes de portes {'bien développée' if has_intuition else 'à enrichir'})."

        # 5. R (Limites du RNN Vanilla) [Coeff 0.05]
        has_rnn_desc = any(k in full_text for k in ["rnn", "recurrent", "récurrent", "w_hh", "tanh(w"])
        r = 16.0 if (has_rnn_desc and has_vanishing) else (8.0 if has_rnn_desc else 2.0)
        justif_r = "Rappel pertinent des limitations structurelles du RNN classique." if r >= 10 else "Description superficielle ou absente du fonctionnement du RNN standard."

        # 6. X (Sources & Références Académiques) [Coeff 0.05]
        refs = data.get("references", [])
        refs_str = " ".join([str(ref) for ref in refs]) if isinstance(refs, list) else str(refs)
        refs_full = (refs_str + " " + full_text).lower()
        has_hochreiter = "hochreiter" in refs_full or "schmidhuber" in refs_full
        has_gers = "gers" in refs_full
        has_olah = "olah" in refs_full
        ref_count = (1 if has_hochreiter else 0) + (1 if has_gers else 0) + (1 if has_olah else 0) + (1 if len(refs) >= 2 else 0)

        if ref_count >= 2:
            x = 18.0
            justif_x = "Références académiques fondamentales citées (Hochreiter & Schmidhuber 1997, Gers, Olah...)."
        elif ref_count >= 1:
            x = 12.0
            justif_x = "Citation académique minimale présente."
        else:
            x = 2.0
            justif_x = "Aucune référence académique canonique identifiée."

        # Note Finale sur 20
        raw_final_score = 0.30 * t + 0.25 * a + 0.20 * i_score + 0.15 * p + 0.05 * r + 0.05 * x
        final_grade = min(20.0, max(0.0, round(raw_final_score, 2)))

        # Rapport markdown
        report_lines = [
            "### 📊 Rapport d'Évaluation Multicritère Détaillé : LSTM vs RNN (TikZ & Théorie)",
            f"**Note Globale Attribuée : {final_grade:.2f} / 20**",
            "",
            "#### 📐 Formule Officielle d'Évaluation :",
            "$$\\text{Final score} = 0.30 \\cdot T + 0.25 \\cdot A + 0.20 \\cdot I + 0.15 \\cdot P + 0.05 \\cdot R + 0.05 \\cdot X$$",
            "",
            "| Critère | Note (/20) | Poids | Exigence & Justification Pédagogique |",
            "| :--- | :---: | :---: | :--- |",
            f"| **T (Figure TikZ)** | `{t:.1f}` | 30% | {justif_t} |",
            f"| **A (Exactitude Portes)** | `{a:.1f}` | 25% | {justif_a} |",
            f"| **I (Amélioration vs RNN)** | `{i_score:.1f}` | 20% | {justif_i} |",
            f"| **P (Qualité Pédagogique)** | `{p:.1f}` | 15% | {justif_p} |",
            f"| **R (Limites du RNN)** | `{r:.1f}` | 5% | {justif_r} |",
            f"| **X (Références)** | `{x:.1f}` | 5% | {justif_x} |",
            "",
            "#### 💡 Analyse & Pistes d'Amélioration :",
            f"- **Figure TikZ :** {('Code présent et syntaxe valide.' if is_syntax_plausible else 'Attention à la validité et complétude du code TikZ.')}",
            f"- **Autoroute à gradients (CEC) :** {('Excellente explication de l’autoroute additive.' if has_cec_highway else 'Préciser la formulation mathématique du Constant Error Carousel.')}",
            f"- **Portes LSTM :** {('Toutes les 4 opérations sont formalisées.' if gates_covered >= 4 else 'Formaliser explicitement les équations de f_t, i_t, C_tilde et o_t.')}"
        ]

        details = {
            "T": t, "A": a, "I": i_score, "P": p, "R": r, "X": x,
            "raw_score": raw_final_score,
            "final_grade": final_grade,
            "has_tikz": is_syntax_plausible,
            "tikz_char_count": len(tikz_code),
            "comments": {
                "T": justif_t, "A": justif_a, "I": justif_i,
                "P": justif_p, "R": justif_r, "X": justif_x
            }
        }

        return final_grade, "\n".join(report_lines), details

    @staticmethod
    def evaluate_lstm_with_cloud_llm(
        json_content: str,
        api_key: str = "",
        provider: str = "gemini",
        model_name: str = None
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue le rendu JSON d'un étudiant pour le devoir LSTM vs RNN & TikZ
        en appliquant une grille d'évaluation académique STRICTE et SÉVÈRE (Gemini / Groq).
        Consigne : "Submit a description of LSTMs and a Figure in TikZ format to explain the improvement of LSTMs over RNNs"
        """
        if not api_key:
            return LocalGrader.evaluate_lstm_json(json_content)

        prompt = f"""Tu es un professeur d'université et jury de concours d'ingénieurs en Intelligence Artificielle (Deep Learning) TRÈS EXIGEANT, SÉVÈRE et INTRANSIGEANT.
Ton objectif est d'analyser rigoureusement le travail de l'étudiant, d'attribuer une note juste et sévère selon le barème, et de fournir un retour pédagogique structuré.

CONSIGNE OFFICIELLE DU DEVOIR :
"Submit a description of LSTMs and a Figure in TikZ format to explain the improvement of LSTMs over RNNs"

CONTENU SOUMIS PAR L'ÉTUDIANT :
```json
{json_content[:8000]}
```

ÉCHELLE DE NOTATION STRICTE (SUR 20 POUR CHAQUE CRITÈRE) :
- 0 à 6/20 : Incomplet, superficiel, code TikZ absent ou non fonctionnel, contresens sur le vanishing gradient.
- 7 à 11/20 : Passable / Moyen. Schéma partiel, explications vagues sans rigueur mathématique sur le CEC.
- 12 à 15/20 : Bon travail. TikZ complet et compilable, équations de portes présentes, amélioration vs RNN expliquée.
- 16 à 18/20 : Très solide. Schéma TikZ magnifique (gradient highway mis en valeur), formulation mathématique impeccable, démonstration formelle du gradient.
- 19 à 20/20 : EXCEPTIONNEL / Perfection absolue (TikZ professionnel, justification théorique au niveau des publications d'origine). RAREMENT ATTRIBUÉ.

PÉNALITÉS ET EXIGENCES PAR CRITÈRE :
1. T (TikZ Figure & Architecture Visual) [Coeff 0.30] :
   - Exigence : Code TikZ LaTeX complet et compilable (\\begin{{tikzpicture}}...\\end{{tikzpicture}}), représentant fidèlement la cellule LSTM : les 4 portes/composantes (forget, input, candidate cell, output), les opérations point par point (produit d'Hadamard ⊙, addition ⊕), et l'autoroute de gradient du Cell State (C_{{t-1}} -> C_t).
   - Si AUCUN code TikZ ou code non compilable/vide : Note = 0/20.
   - Si schéma incomplet (portes manquantes ou absence d'opérations pointwise) : Note max = 10/20.
2. A (Technical Accuracy & Équations des Portes) [Coeff 0.25] :
   - Exigence : Formulation mathématique exacte des 4 composantes :
     f_t = σ(W_f [h_{{t-1}}, x_t] + b_f), i_t = σ(W_i [h_{{t-1}}, x_t] + b_i), C~_t = tanh(W_c [h_{{t-1}}, x_t] + b_c),
     C_t = f_t ⊙ C_{{t-1}} + i_t ⊙ C~_t, o_t = σ(W_o [h_{{t-1}}, x_t] + b_o), h_t = o_t ⊙ tanh(C_t).
   - Si les équations sont absentes ou fausses : Note max = 6/20.
3. I (Improvement over RNN & Vanishing Gradient) [Coeff 0.20] :
   - Exigence : Explication théorique détaillée de la raison pour laquelle le LSTM résout le problème de disparition du gradient (Vanishing Gradient) par rapport au RNN standard : mécanisme du Constant Error Carousel (CEC), transport additif du gradient (∂C_t / ∂C_{{t-1}} = f_t) empêchant l'écrasement exponentiel dû aux multiplications matricielles répétées (W_hh)^T.
   - Si le lien entre l'addition dans le Cell State et l'évanouissement du gradient n'est pas explicité : Note max = 8/20.
4. P (Pedagogical Quality & Intuition) [Coeff 0.15] :
   - Exigence : Clarté rédactionnelle, intuition sur le rôle de chaque porte (oubli sélectif, mise à jour, filtrage de la sortie).
5. R (Limites du RNN Vanilla) [Coeff 0.05] :
   - Exigence : Explication concise de l'architecture du RNN standard et de ses limites en mémoire séquentielle à long terme.
6. X (Sources & Références Académiques) [Coeff 0.05] :
   - Exigence : Citations scientifiques (Hochreiter & Schmidhuber 1997, Gers et al. 2000, Olah 2015...). Si aucune citation : Note = 0/20.

Tu dois OBLIGATOIREMENT répondre UNIQUEMENT avec un JSON valide respectant cette structure exacte :
{{
  "T": <note_entre_0_et_20>,
  "A": <note_entre_0_et_20>,
  "I": <note_entre_0_et_20>,
  "P": <note_entre_0_et_20>,
  "R": <note_entre_0_et_20>,
  "X": <note_entre_0_et_20>,
  "comments": {{
    "T": "Exigence : Schéma TikZ complet et compilable. Constat : [Analyse du code TikZ, des portes et du flux visuel]",
    "A": "Exigence : Équations complètes des 4 composantes. Constat : [Analyse de l'exactitude mathématique]",
    "I": "Exigence : Explication CEC et autoroute additive. Constat : [Analyse de la justification du vanishing gradient]",
    "P": "Exigence : Clarté et intuition pédagogique. Constat : [Qualité de la pédagogie]",
    "R": "Exigence : Limitations du RNN vanilla. Constat : [Pertinence du rappel sur RNN]",
    "X": "Exigence : Références académiques. Constat : [Vérification des sources citées]"
  }},
  "student_work_summary": "<Synthèse claire et précise de ce que l'étudiant a rédigé et dessiné dans son travail>",
  "areas_for_improvement": "<Liste numérotée et concrète des lacunes prioritaires à corriger pour atteindre 20/20>",
  "general_feedback": "<Commentaire global à destination de l'étudiant>"
}}
"""

        try:
            import requests
            parsed_result = None
            used_model = model_name or ""

            def clean_json_text(text: str) -> dict:
                text = text.strip()
                if "```" in text:
                    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
                    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
                return json.loads(text.strip())

            if "groq" in provider.lower():
                groq_candidates = [model_name] if model_name else []
                groq_candidates += [
                    "llama-3.3-70b-versatile",
                    "deepseek-r1-distill-llama-70b",
                    "qwen-2.5-32b",
                    "llama-3.1-8b-instant"
                ]
                seen_g = set()
                groq_models = [m for m in groq_candidates if m and not (m in seen_g or seen_g.add(m))]

                for g_model in groq_models:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    body = {
                        "model": g_model,
                        "messages": [
                            {"role": "system", "content": "Tu es un évaluateur académique impitoyable et rigoureux qui note avec sévérité et répond uniquement en JSON strict."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"}
                    }
                    try:
                        res = requests.post(url, headers=headers, json=body, timeout=25)
                        if res.status_code == 200:
                            resp_data = res.json()
                            raw_text = resp_data["choices"][0]["message"]["content"]
                            parsed_result = clean_json_text(raw_text)
                            used_model = g_model
                            break
                    except Exception:
                        continue

            else:
                gemini_candidates = [model_name] if model_name else []
                gemini_candidates += [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro"
                ]
                seen_gm = set()
                gemini_models = [m for m in gemini_candidates if m and not (m in seen_gm or seen_gm.add(m))]

                for g_model in gemini_models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={api_key}"
                    headers = {
                        "Content-Type": "application/json",
                        "x-goog-api-key": api_key
                    }
                    body = {
                        "contents": [{
                            "parts": [{"text": prompt}]
                        }],
                        "generationConfig": {
                            "temperature": 0.1,
                            "response_mime_type": "application/json"
                        }
                    }
                    try:
                        res = requests.post(url, headers=headers, json=body, timeout=25)
                        if res.status_code == 200:
                            resp_data = res.json()
                            candidates = resp_data.get("candidates", [])
                            if candidates:
                                raw_text = candidates[0]["content"]["parts"][0]["text"]
                                parsed_result = clean_json_text(raw_text)
                                used_model = g_model
                                break
                    except Exception:
                        continue

            if not parsed_result:
                return LocalGrader.evaluate_lstm_json(json_content)

            def get_s(key, fallback=10.0):
                val = parsed_result.get(key)
                try:
                    return max(0.0, min(20.0, float(val)))
                except (ValueError, TypeError):
                    return fallback

            t = get_s("T", 10.0)
            a = get_s("A", 10.0)
            i_score = get_s("I", 10.0)
            p = get_s("P", 10.0)
            r = get_s("R", 10.0)
            x = get_s("X", 5.0)

            final_score = round(0.30 * t + 0.25 * a + 0.20 * i_score + 0.15 * p + 0.05 * r + 0.05 * x, 2)
            final_score = min(20.0, max(0.0, final_score))

            comments = parsed_result.get("comments", {})
            summary_work = parsed_result.get("student_work_summary", "Rendu étudiant analysé par l'IA.")
            improvements = parsed_result.get("areas_for_improvement", "Approfondir les formulations et la figure TikZ.")
            general_fb = parsed_result.get("general_feedback", "")

            report_lines = [
                f"### 🤖 Rapport d'Évaluation Cloud LLM ({used_model}) : LSTM vs RNN & Figure TikZ",
                f"**Note Globale Attribuée : {final_score:.2f} / 20**",
                "",
                "#### 📊 Grille d'Évaluation Multicritère :",
                "| Critère | Note (/20) | Poids | Exigence & Retour du Jury |",
                "| :--- | :---: | :---: | :--- |",
                f"| **T (Figure TikZ)** | `{t:.1f}` | 30% | {comments.get('T', 'Analyse du schéma TikZ')} |",
                f"| **A (Exactitude Portes)** | `{a:.1f}` | 25% | {comments.get('A', 'Équations des portes LSTM')} |",
                f"| **I (Amélioration vs RNN)** | `{i_score:.1f}` | 20% | {comments.get('I', 'Résolution Vanishing Gradient / CEC')} |",
                f"| **P (Qualité Pédagogique)** | `{p:.1f}` | 15% | {comments.get('P', 'Clarté et intuition')} |",
                f"| **R (Limites du RNN)** | `{r:.1f}` | 5% | {comments.get('R', 'Limitations du RNN standard')} |",
                f"| **X (Références)** | `{x:.1f}` | 5% | {comments.get('X', 'Citations scientifiques')} |",
                "",
                "#### 📝 Synthèse du Travail Étudiant :",
                f"> {summary_work}",
                "",
                "#### 🎯 Axes d'Amélioration Prioritaires :",
                f"{improvements}",
                "",
                "#### 💬 Commentaire Pédagogique Global :",
                f"{general_fb}"
            ]

            details = {
                "T": t, "A": a, "I": i_score, "P": p, "R": r, "X": x,
                "final_grade": final_score,
                "evaluator": f"cloud_{used_model}",
                "topic": "LSTM vs RNN (TikZ & Théorie)",
                "comments": comments,
                "student_work_summary": summary_work,
                "areas_for_improvement": improvements,
                "general_feedback": general_fb
            }

            return final_score, "\n".join(report_lines), details

        except Exception as e:
            print(f"Erreur évaluation Cloud LLM LSTM : {e}")
            return LocalGrader.evaluate_lstm_json(json_content)

    # ==========================================================================
    # ÉVALUATION DEVOIR : QCM - DÉMO 3.3 MODÈLES AUTORÉGRESSIFS (AR LLMs)
    # ==========================================================================

    @staticmethod
    def evaluate_qcm_ar_llm(json_content: str) -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue automatiquement le QCM 'Modèles de Langage Autorégressifs (AR LLMs)'.
        Barème officiel : 10 questions x 2.0 pts = Note sur 20.
        """
        try:
            data = json.loads(json_content) if isinstance(json_content, str) else json_content
        except Exception as e:
            return 0.0, f"❌ Erreur de syntaxe JSON : Impossible de lire les réponses ({str(e)})", {}

        # Extraction du dictionnaire des réponses
        answers = {}
        if isinstance(data, dict):
            if "answers" in data and isinstance(data["answers"], dict):
                answers = data["answers"]
            elif "reponses" in data and isinstance(data["reponses"], dict):
                answers = data["reponses"]
            else:
                answers = data

        # Corrigé officiel avec justifications pédagogiques
        KEY = {
            "Q1": {
                "correct": "B",
                "section": "Section 1 : Prétraitement",
                "title": "Limitation de deduplicate_lines",
                "explanation": "L'algorithme utilise un set sur le texte en minuscules. Il ne détecte que les doublons exacts et manque les doublons proches (near-duplicates, ex: variations de ponctuation, reformulations)."
            },
            "Q2": {
                "correct": "C",
                "section": "Section 1 : Prétraitement",
                "title": "Rôle du jeton 0 dans tokenize_dataset",
                "explanation": "Le jeton 0 sert de séparateur explicite de fin de phrase/séquence (EOS / End-Of-Sentence) avant la fusion en liste continue."
            },
            "Q3": {
                "correct": "C",
                "section": "Section 1 : Prétraitement",
                "title": "Rôle de chunkify sur segments courts",
                "explanation": "La fonction complète le segment avec des jetons 0 (padding) pour garantir une dimension fixe (max_seq_length) indispensable aux tenseurs PyTorch."
            },
            "Q4": {
                "correct": "B",
                "section": "Section 2 : Modélisation Autorégressive",
                "title": "Équation de probabilité conjointe AR",
                "explanation": "Par la règle de décomposition causale, P(x_1, ..., x_T) = ∏_{t=1}^T P(x_t | x_1, ..., x_{t-1}) : chaque jeton dépend uniquement du contexte passé."
            },
            "Q5": {
                "correct": "C",
                "section": "Section 2 : Modélisation Autorégressive",
                "title": "Utilisation de torch.randn dans ToyARModel",
                "explanation": "Il s'agit d'un modèle factice (toy model) générant des logits aléatoires pour illustrer l'algorithme de génération sans charger de vrais poids."
            },
            "Q6": {
                "correct": "D",
                "section": "Section 3 : Algorithmes de Décodage",
                "title": "Différence Greedy vs Beam Search",
                "explanation": "Le Greedy Decoding est glouton local (B=1), tandis que le Beam Search conserve les B meilleures séquences partielles pour maximiser la probabilité globale."
            },
            "Q7": {
                "correct": "B",
                "section": "Section 3 : Algorithmes de Décodage",
                "title": "Somme des log-probabilités dans beam_search",
                "explanation": "Additionner les logarithmes évite le sous-dimensionnement numérique (underflow) dû à la multiplication répétée de probabilités très faibles dans [0, 1]."
            },
            "Q8": {
                "correct": "C",
                "section": "Section 3 : Algorithmes de Décodage",
                "title": "Renormalisation dans top_k_sampling",
                "explanation": "La somme des k probabilités sélectionnées étant inférieure à 1.0, il est impératif de renormaliser pour obtenir une distribution multinomiale valide."
            },
            "Q9": {
                "correct": "B",
                "section": "Section 4 : Speculative Decoding",
                "title": "Principe fondamental du Speculative Decoding",
                "explanation": "Un petit modèle rapide (draft) propose N jetons candidats, puis le grand modèle (target) les valide ou rejette en parallèle en une seule passe forward."
            },
            "Q10": {
                "correct": "B",
                "section": "Section 4 : Speculative Decoding",
                "title": "Condition d'acceptation dans speculative_decode",
                "explanation": "Le candidat est accepté si un tirage aléatoire random.random() est inférieur au ratio de vraisemblance P_large(token) / P_small(token)."
            }
        }

        correct_count = 0
        total_q = len(KEY)
        rows_md = []
        details_per_q = {}

        for q_id, q_info in KEY.items():
            expected = q_info["correct"]
            raw_ans = answers.get(q_id, answers.get(q_id.lower(), ""))
            given = str(raw_ans).strip().upper() if raw_ans is not None else ""

            is_correct = (given == expected)
            if is_correct:
                correct_count += 1
                status_icon = "✅ Exact"
            elif not given:
                status_icon = "⚠️ Non répondu"
            else:
                status_icon = "❌ Incorrect"

            pts = 2.0 if is_correct else 0.0
            rows_md.append(
                f"| **{q_id}** | {q_info['section']} | `{given or 'Aucune'}` | `{expected}` | {status_icon} (`+{pts:.1f} pt`) | {q_info['explanation']} |"
            )

            details_per_q[q_id] = {
                "given": given,
                "expected": expected,
                "is_correct": is_correct,
                "points": pts,
                "explanation": q_info["explanation"]
            }

        score_sur_20 = round(correct_count * 2.0, 2)
        pct = round((correct_count / total_q) * 100, 1)

        time_spent = data.get("time_spent_seconds", 0) if isinstance(data, dict) else 0
        time_str = f"{time_spent // 60} min {time_spent % 60} s" if time_spent else "Non précisé"

        report_lines = [
            "### 🏆 Rapport de Correction Automatique : QCM Modèles Autorégressifs (AR LLMs)",
            f"**Note Finale : {score_sur_20:.2f} / 20** (`{correct_count} / {total_q}` réponses exactes, `{pct}%`)",
            f"**Temps d'exécution :** `{time_str}`" + (" *(⚠️ Clôture sur temps écoulé)*" if (isinstance(data, dict) and data.get("is_timeout")) else ""),
            "",
            "#### 📋 Grille Détaillée Question par Question :",
            "| Question | Section | Réponse Étudiant | Corrigé | Résultat | Justification Pédagogique Officielle |",
            "| :---: | :--- | :---: | :---: | :---: | :--- |",
            *rows_md,
            "",
            "*(Barème : 2.0 points par réponse exacte, 0 pt en cas d'erreur ou d'abstention)*"
        ]

        details = {
            "correct_count": correct_count,
            "total_questions": total_q,
            "accuracy_pct": pct,
            "score_sur_20": score_sur_20,
            "time_spent_seconds": time_spent,
            "questions": details_per_q
        }

        return score_sur_20, "\n".join(report_lines), details



    @staticmethod
    def evaluate_cnn_predictions_csv(csv_content: str, true_labels: Any) -> Tuple[float, str, Dict[str, Any]]:
        """
        Évalue un fichier CSV pour le challenge 'CNN Challenger' (Matière GenAI).
        Compare les prédictions soumises avec true_labels (Series pandas).
        Calcule : Accuracy = (preds == true_labels.values).mean()
        """
        try:
            df = pd.read_csv(io.StringIO(csv_content))
        except Exception as e:
            return 0.0, f"❌ Erreur lors de la lecture du fichier CSV : {str(e)}", {}

        # Standardiser les noms de colonnes
        df.columns = [str(c).strip().lower() for c in df.columns]

        if "predicted" not in df.columns:
            return 0.0, "❌ Colonne 'predicted' manquante dans le fichier CSV. Colonnes trouvées : " + ", ".join(df.columns), {}

        # Si colonne id présente, trier pour garantir l'ordre
        if "id" in df.columns:
            try:
                df["id"] = pd.to_numeric(df["id"])
                df = df.sort_values("id")
            except Exception:
                pass

        preds = df["predicted"].values

        # Si true_labels n'est pas fourni (mode sans labels)
        if true_labels is None:
            return 12.0, f"⚠️ Format CSV valide ({len(df)} prédictions trouvées), mais les labels secrets d'évaluation ('labels_hidden.pt') ne sont pas encore chargés par l'enseignant.", {"total_preds": len(df)}

        if isinstance(true_labels, pd.Series):
            true_vals = true_labels.values
        elif hasattr(true_labels, "numpy"):
            true_vals = true_labels.numpy()
        else:
            true_vals = list(true_labels)

        if len(preds) != len(true_vals):
            err_msg = f"❌ Nombre de prédictions incorrect : {len(preds)} prédictions fournies, mais le jeu de test attend {len(true_vals)} lignes."
            return 0.0, err_msg, {"rows_found": len(preds), "expected": len(true_vals)}

        # Calcul de l'Accuracy
        matches = (preds == true_vals)
        correct_count = int(matches.sum())
        total_count = len(true_vals)
        acc = float(correct_count / total_count)

        # Note sur 20 proportionnelle à l'accuracy
        grade_sur_20 = round(acc * 20.0, 2)
        acc_pct = round(acc * 100.0, 2)

        report_lines = [
            "### 🏆 Rapport d'Évaluation du Challenge CNN",
            f"**Nombre d'images évaluées :** `{total_count}`",
            f"**Prédictions exactes :** `{correct_count} / {total_count}`",
            f"**Accuracy obtenue :** `{acc_pct:.2f}%` (`{acc:.4f}`)",
            "",
            f"🎯 **Note équivalente (/20) : {grade_sur_20:.2f} / 20**",
            "",
            "*(Cette soumission est automatiquement prise en compte pour le Leaderboard de la classe. La meilleure performance parmi les 3 tentatives est conservée.)*"
        ]

        details = {
            "accuracy": acc,
            "accuracy_pct": acc_pct,
            "correct": correct_count,
            "total": total_count,
            "grade": grade_sur_20
        }

        return grade_sur_20, "\n".join(report_lines), details

    @staticmethod
    def load_true_labels(labels_path: str = "labels_hidden.pt") -> Optional[pd.Series]:
        """
        Charge les labels secrets locaux pour l'évaluation CNN (sans Google Drive).
        """
        if not os.path.exists(labels_path):
            return None
        try:
            import torch
            labels_tensor = torch.load(labels_path, map_location="cpu")
            if hasattr(labels_tensor, "numpy"):
                return pd.Series(labels_tensor.numpy(), name="True")
            return pd.Series(labels_tensor, name="True")
        except Exception as e:
            print(f"Erreur chargement labels torch : {e}")
            try:
                # Essai de lecture comme CSV ou texte simple
                df = pd.read_csv(labels_path)
                col = "true" if "true" in df.columns else df.columns[0]
                return df[col]
            except Exception:
                return None

    # ==========================================================================
    # MOTEUR DE DÉTECTION DE PLAGIAT PAR SIMILARITÉ TEXTUELLE
    # ==========================================================================

    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        Normalise un texte pour la comparaison : minuscules, suppression de
        ponctuation, espaces multiples et commentaires Python.
        """
        # Supprimer les commentaires Python (#...)
        text = re.sub(r'#.*', '', text)
        # Minuscules
        text = text.lower()
        # Supprimer chaînes de caractères (entre quotes) pour JSON/Python
        text = re.sub(r'""".*?"""', '', text, flags=re.DOTALL)
        text = re.sub(r"'''.*?'''", '', text, flags=re.DOTALL)
        text = re.sub(r'".*?"', '', text)
        text = re.sub(r"'.*?'", '', text)
        # Garder uniquement les caractères alphanumériques et espaces
        text = re.sub(r'[^a-z0-9àáâãäåèéêëìíîïòóôõöùúûüýÿçñ\s]', ' ', text)
        # Supprimer les espaces multiples
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Tokenise un texte normalisé en unigrammes filtrés."""
        stop_words = {
            'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en',
            'est', 'a', 'au', 'aux', 'ce', 'se', 'sa', 'son', 'ses', 'que',
            'qui', 'pour', 'par', 'sur', 'with', 'the', 'a', 'an', 'is', 'in',
            'of', 'to', 'and', 'or', 'for', 'on', 'at', 'be', 'are', 'was',
            'it', 'its', 'as', 'this', 'that', 'from', 'by', 'but', 'not',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
        }
        return [t for t in text.split() if len(t) > 2 and t not in stop_words]

    @staticmethod
    def compute_jaccard_similarity(text_a: str, text_b: str) -> float:
        """
        Calcule la similarité de Jaccard entre deux textes.
        Jaccard = |A ∩ B| / |A ∪ B|
        Retourne une valeur entre 0.0 (aucune similarité) et 1.0 (identiques).
        """
        if not text_a or not text_b:
            return 0.0
        set_a = set(LocalGrader._tokenize(LocalGrader._normalize_text(text_a)))
        set_b = set(LocalGrader._tokenize(LocalGrader._normalize_text(text_b)))
        if not set_a or not set_b:
            return 0.0
        intersection = set_a & set_b
        union = set_a | set_b
        return len(intersection) / len(union) if union else 0.0

    @staticmethod
    def compute_cosine_similarity_tfidf(text_a: str, text_b: str) -> float:
        """
        Calcule la similarité cosinus TF-IDF entre deux textes.
        Utilise sklearn si disponible, sinon replie sur Jaccard.
        Retourne une valeur entre 0.0 et 1.0.
        """
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            import numpy as np
            norm_a = LocalGrader._normalize_text(text_a)
            norm_b = LocalGrader._normalize_text(text_b)
            if not norm_a or not norm_b:
                return 0.0
            vectorizer = TfidfVectorizer(min_df=1, ngram_range=(1, 2), max_features=5000)
            tfidf_matrix = vectorizer.fit_transform([norm_a, norm_b])
            dot_product = (tfidf_matrix[0] * tfidf_matrix[1].T).toarray()[0, 0]
            norm_product = np.linalg.norm(tfidf_matrix[0].toarray()) * np.linalg.norm(tfidf_matrix[1].toarray())
            if norm_product == 0:
                return 0.0
            return float(round(dot_product / norm_product, 4))
        except ImportError:
            # Repli sur Jaccard si sklearn absent
            return LocalGrader.compute_jaccard_similarity(text_a, text_b)

    @staticmethod
    def detect_plagiarism_in_batch(
        submissions: List[Dict[str, Any]],
        threshold: float = 0.75
    ) -> List[Dict[str, Any]]:
        """
        Détecte les cas de plagiat potentiel dans un lot de soumissions.

        Paramètres
        ----------
        submissions : list de dicts contenant au minimum :
            - 'id'           : identifiant de la soumission
            - 'student_email': email de l'étudiant
            - 'content'      : contenu textuel du fichier soumis
            - 'created_at'   : horodatage ISO de la soumission
            - 'assignment_name' : nom de l'exercice

        threshold : float (défaut 0.75)
            Seuil de similarité cosinus au-dessus duquel on considère un plagiat potentiel.

        Retourne
        --------
        list de dicts avec :
            - 'suspect_email'  : email de l'étudiant suspect (soumission POSTÉRIEURE)
            - 'source_email'   : email de l'étudiant source  (soumission ANTÉRIEURE)
            - 'similarity'     : score de similarité (0.0–1.0)
            - 'similarity_pct' : score en pourcentage lisible
            - 'severity'       : 'Alerte Rouge 🚨' | 'Attention ⚠️' | 'À surveiller 🔍'
            - 'suspect_date'   : horodatage de la soumission suspecte
            - 'source_date'    : horodatage de la soumission source
            - 'assignment'     : nom de l'exercice
        """
        flags = []
        n = len(submissions)
        if n < 2:
            return flags

        # Trier par date croissante pour identifier qui a soumis en premier
        sorted_subs = sorted(
            [s for s in submissions if s.get('content')],
            key=lambda x: x.get('created_at', '')
        )

        for i in range(len(sorted_subs)):
            for j in range(i + 1, len(sorted_subs)):
                sub_early = sorted_subs[i]  # soumission antérieure (source potentielle)
                sub_late  = sorted_subs[j]  # soumission postérieure (suspect potentiel)

                # Ne pas comparer un étudiant avec lui-même (multi-tentatives)
                if sub_early['student_email'] == sub_late['student_email']:
                    continue

                content_a = sub_early.get('content', '')
                content_b = sub_late.get('content', '')

                # Ignorer les fichiers trop courts (< 100 caractères utiles)
                if len(content_a.strip()) < 100 or len(content_b.strip()) < 100:
                    continue

                sim = LocalGrader.compute_cosine_similarity_tfidf(content_a, content_b)

                if sim >= threshold:
                    if sim >= 0.92:
                        severity = 'Alerte Rouge 🚨'
                    elif sim >= 0.85:
                        severity = 'Attention ⚠️'
                    else:
                        severity = 'À surveiller 🔍'

                    flags.append({
                        'suspect_email':  sub_late['student_email'],
                        'source_email':   sub_early['student_email'],
                        'similarity':     sim,
                        'similarity_pct': f"{sim * 100:.1f}%",
                        'severity':       severity,
                        'suspect_date':   sub_late.get('created_at', ''),
                        'source_date':    sub_early.get('created_at', ''),
                        'assignment':     sub_late.get('assignment_name', ''),
                        'suspect_id':     sub_late.get('id', ''),
                        'source_id':      sub_early.get('id', ''),
                    })

        # Trier par similarité décroissante
        flags.sort(key=lambda x: x['similarity'], reverse=True)
        return flags
