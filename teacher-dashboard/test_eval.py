import os
import sys
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

from grader import LocalGrader

# Échantillon d'un devoir étudiant basique / incomplet
sample_basic = """{
  "topic": "Vanilla Gradient, SGD, AdamW",
  "student_email": "etudiant@univ.fr",
  "analysis": {
    "vanilla_gradient": "Vanilla gradient calcule le gradient sur tout le dataset.",
    "sgd": "SGD utilise des mini-batchs pour aller plus vite.",
    "adamw": "AdamW est une variante d'Adam."
  }
}"""

print("--- 1. ÉVALUATION DÉTERMINISTE LOCALE ---")
g1, r1, _ = LocalGrader.evaluate_optimizer_json(sample_basic)
print(f"Note : {g1} / 20")
print(r1)

print("\n--- 2. ÉVALUATION CLOUD GEMINI SÉVÈRE (OPTIMIZER) ---")
api_key = os.getenv("GEMINI_API_KEY", "")
g2, r2, _ = LocalGrader.evaluate_optimizer_with_cloud_llm(sample_basic, api_key=api_key, provider="gemini")
print(f"Note : {g2} / 20")
print(r2)

print("\n--- 3. ÉVALUATION DEVOIR LSTM VS RNN & TIKZ ---")
sample_lstm_path = os.path.join(os.path.dirname(__file__), "..", "lstm_submission_sample.json")
if os.path.exists(sample_lstm_path):
    with open(sample_lstm_path, "r", encoding="utf-8") as f:
        lstm_content = f.read()
    g3, r3, d3 = LocalGrader.evaluate_lstm_json(lstm_content)
    print(f"Note Déterministe LSTM : {g3} / 20")
    print(r3)
    if api_key:
        print("\n--- 4. ÉVALUATION CLOUD GEMINI SÉVÈRE (LSTM TIKZ) ---")
        g4, r4, _ = LocalGrader.evaluate_lstm_with_cloud_llm(lstm_content, api_key=api_key, provider="gemini")
        print(f"Note Cloud LSTM : {g4} / 20")
        print(r4)

print("\n--- 5. ÉVALUATION QCM MODÈLES AUTORÉGRESSIFS (AR LLMs) ---")
sample_qcm_path = os.path.join(os.path.dirname(__file__), "..", "qcm_ar_llm_submission_sample.json")
if os.path.exists(sample_qcm_path):
    with open(sample_qcm_path, "r", encoding="utf-8") as f:
        qcm_content = f.read()
    g5, r5, d5 = LocalGrader.evaluate_qcm_ar_llm(qcm_content)
    print(f"Note QCM : {g5} / 20 ({d5['correct_count']}/10)")
    print(r5)
