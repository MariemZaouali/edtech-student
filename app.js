/**
 * APPLICATION FRONTEND ÉTUDIANT - LOGIQUE JAVASCRIPT
 * Gestion Auth, Matières & Exercices (GenAI : Optimizer & CNN Challenger),
 * Limite de 3 tentatives par exercice, calcul de la meilleure note & Supabase Realtime
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    // 1. CONFIGURATION & CLIENT SUPABASE
    const config = window.SUPABASE_CONFIG || {};
    const isConfigured = config.URL && config.ANON_KEY && 
                         !config.URL.includes('VOTRE_PROJECT_ID') && 
                         !config.ANON_KEY.includes('VOTRE_SUPABASE_ANON_KEY');

    const configWarning = document.getElementById('configWarning');
    if (!isConfigured && configWarning) {
        configWarning.classList.remove('hidden');
    }

    let supabase = null;
    try {
        if (window.supabase && config.URL && config.ANON_KEY) {
            supabase = window.supabase.createClient(config.URL, config.ANON_KEY);
        }
    } catch (e) {
        console.error("Erreur d'initialisation de Supabase :", e);
    }

    // 2. ÉLÉMENTS DU DOM
    const authSection = document.getElementById('authSection');
    const studentDashboard = document.getElementById('studentDashboard');
    const authForm = document.getElementById('authForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const authFormTitle = document.getElementById('authFormTitle');
    const nameFieldContainer = document.getElementById('nameFieldContainer');
    const authSubmitText = document.getElementById('authSubmitText');
    const authAlert = document.getElementById('authAlert');
    const forgotPasswordContainer = document.getElementById('forgotPasswordContainer');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const authProfilePill = document.getElementById('authProfilePill');
    const userEmailText = document.getElementById('userEmailText');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const studentGreetingName = document.getElementById('studentGreetingName');
    
    // Sélecteurs Matière & Exercice
    const courseSelect = document.getElementById('courseSelect');
    const assignmentSelect = document.getElementById('assignmentSelect');
    const exerciseBadge = document.getElementById('exerciseBadge');
    const exerciseTypeBadge = document.getElementById('exerciseTypeBadge');
    const attemptsCounter = document.getElementById('attemptsCounter');
    const exerciseBestGrade = document.getElementById('exerciseBestGrade');
    const exerciseDescription = document.getElementById('exerciseDescription');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');

    // Drag & Drop & Upload
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const dropzoneEmpty = document.getElementById('dropzoneEmpty');
    const dropzonePreview = document.getElementById('dropzonePreview');
    const dropzoneAllowedText = document.getElementById('dropzoneAllowedText');
    const previewFileName = document.getElementById('previewFileName');
    const previewFileSize = document.getElementById('previewFileSize');
    const fileTypeIcon = document.getElementById('fileTypeIcon');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const submitDeliverableBtn = document.getElementById('submitDeliverableBtn');
    const submitDeliverableText = document.getElementById('submitDeliverableText');
    const submissionForm = document.getElementById('submissionForm');
    const uploadAlert = document.getElementById('uploadAlert');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressPercent = document.getElementById('uploadProgressPercent');
    const uploadProgressLabel = document.getElementById('uploadProgressLabel');

    // Historique & Stats
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const refreshSubmissionsBtn = document.getElementById('refreshSubmissionsBtn');
    const statSubmittedCount = document.getElementById('statSubmittedCount');
    const statAverageGrade = document.getElementById('statAverageGrade');
    const toastContainer = document.getElementById('toastContainer');
    const historyFilterTabs = document.getElementById('historyFilterTabs');

    // Éléments QCM Interactif
    const interactiveQuizContainer = document.getElementById('interactiveQuizContainer');
    const qcmSectionBadge = document.getElementById('qcmSectionBadge');
    const qcmTimerBox = document.getElementById('qcmTimerBox');
    const qcmTimerText = document.getElementById('qcmTimerText');
    const qcmCurrentIndexText = document.getElementById('qcmCurrentIndexText');
    const qcmAnsweredCountText = document.getElementById('qcmAnsweredCountText');
    const qcmProgressBar = document.getElementById('qcmProgressBar');
    const qcmNavDots = document.getElementById('qcmNavDots');
    const qcmQuestionText = document.getElementById('qcmQuestionText');
    const qcmOptionsContainer = document.getElementById('qcmOptionsContainer');
    const qcmPrevBtn = document.getElementById('qcmPrevBtn');
    const qcmNextBtn = document.getElementById('qcmNextBtn');
    const qcmFinishBtn = document.getElementById('qcmFinishBtn');
    const qcmAlert = document.getElementById('qcmAlert');
    const toggleQcmManualUpload = document.getElementById('toggleQcmManualUpload');

    // ÉTAT LOCAL
    let currentUser = null;
    let selectedFile = null;
    let isRegisterMode = false;
    let mySubmissions = [];
    let myOverrides = [];
    let realtimeSubscription = null;
    let currentHistoryFilter = 'all';

    // État du QCM Interactif
    let qcmAnswers = {};
    let qcmCurrentIndex = 0;
    let qcmTimeRemaining = 1200; // 20 minutes (2 min/question)
    let qcmTimerInterval = null;
    let isQcmActive = false;
    let isQcmSubmitting = false;
    let isManualUploadVisible = false;

    // 3. INITIALISATION DES SÉLECTEURS DE MATIÈRES & EXERCICES
    function populateCoursesAndAssignments() {
        if (!config.COURSES || config.COURSES.length === 0) return;

        // Remplir les matières
        if (courseSelect) {
            courseSelect.innerHTML = '';
            config.COURSES.forEach(course => {
                const opt = document.createElement('option');
                opt.value = course.id;
                opt.textContent = course.name;
                courseSelect.appendChild(opt);
            });
            courseSelect.addEventListener('change', updateAssignmentsList);
        }

        updateAssignmentsList();
    }

    function updateAssignmentsList() {
        if (!assignmentSelect) return;
        const selectedCourseId = courseSelect ? courseSelect.value : "genai";
        const course = config.COURSES.find(c => c.id === selectedCourseId) || config.COURSES[0];

        assignmentSelect.innerHTML = '';
        if (course && course.assignments) {
            course.assignments.forEach((item, index) => {
                const opt = document.createElement('option');
                opt.value = item.title;
                opt.textContent = `${item.title} (${item.typeLabel})`;
                if (index === 0) opt.selected = true;
                assignmentSelect.appendChild(opt);
            });
        }
        updateExerciseCard();
    }

    function getCurrentAssignment() {
        // Use the raw select value — option values are set to item.title directly.
        // Do NOT split on ' (' because some titles contain parentheses (LSTM, QCM).
        const title = assignmentSelect ? assignmentSelect.value : '';
        return config.ASSIGNMENTS?.find(a => a.title === title) || config.ASSIGNMENTS?.[0];
    }

    function updateExerciseCard() {
        const assignment = getCurrentAssignment();
        if (!assignment) return;

        // Mise à jour des badges
        if (exerciseBadge) exerciseBadge.textContent = assignment.title;
        if (exerciseTypeBadge) exerciseTypeBadge.textContent = assignment.typeLabel;

        // Description détaillée
        if (exerciseDescription) {
            exerciseDescription.innerHTML = assignment.fullDescription || assignment.shortDescription;
        }

        // Configuration accept sur fileInput
        if (fileInput && assignment.acceptedTypes) {
            fileInput.accept = assignment.acceptedTypes.join(',');
        }
        if (dropzoneAllowedText) {
            dropzoneAllowedText.textContent = `Formats acceptés : ${assignment.acceptedTypes ? assignment.acceptedTypes.join(', ') : '.json, .csv'} • Max 50 Mo`;
        }

        // Basculer affichage QCM Interactif vs Dépôt classique
        if (assignment.isQuiz) {
            if (interactiveQuizContainer) interactiveQuizContainer.classList.remove('hidden');
            if (submissionForm && !isManualUploadVisible) submissionForm.classList.add('hidden');
            initQcm(assignment);
        } else {
            if (interactiveQuizContainer) interactiveQuizContainer.classList.add('hidden');
            if (submissionForm) submissionForm.classList.remove('hidden');
            stopQcmTimer();
            isQcmActive = false;
        }

        // Calcul des tentatives pour cet exercice
        updateAttemptsAndBestScore();
    }

    function updateAttemptsAndBestScore() {
        const assignment = getCurrentAssignment();
        if (!assignment || !currentUser) return;

        // Filtrer les soumissions pour cet exercice
        const relatedSubs = mySubmissions.filter(s => s.assignment_name === assignment.title);
        const attemptCount = relatedSubs.length;

        // Vérifier si une dérogation / tentative bonus a été accordée par l'enseignant
        const ovr = myOverrides.find(o => o.assignment_name === assignment.title);
        const bonusAttempts = ovr ? parseInt(ovr.bonus_attempts, 10) : 0;
        const baseAttempts = assignment.maxAttempts || config.MAX_ATTEMPTS || 3;
        const maxAttempts = baseAttempts + bonusAttempts;

        // Compteur de tentatives avec mention bonus
        if (attemptsCounter) {
            const bonusTag = bonusAttempts > 0 ? ` (dont +${bonusAttempts} bonus)` : '';
            attemptsCounter.textContent = `${attemptCount} / ${maxAttempts}${bonusTag}`;
            if (attemptCount >= maxAttempts) {
                attemptsCounter.className = "text-xs font-bold text-red-300 px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800";
            } else {
                attemptsCounter.className = "text-xs font-bold text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800";
            }
        }

        // Calcul de la meilleure note
        const gradedSubs = relatedSubs.filter(s => s.grade !== null && s.grade !== undefined);
        if (exerciseBestGrade) {
            if (gradedSubs.length > 0) {
                const maxGrade = Math.max(...gradedSubs.map(s => parseFloat(s.grade)));
                exerciseBestGrade.innerHTML = `<span class="text-amber-400 font-bold">${maxGrade.toFixed(2)} / 20</span>`;
            } else if (relatedSubs.length > 0) {
                exerciseBestGrade.innerHTML = `<span class="text-amber-300 text-xs">En attente de notation</span>`;
            } else {
                exerciseBestGrade.innerHTML = `<span class="text-slate-500 text-xs">Aucune note</span>`;
            }
        }

        // Vérification de la limite de tentatives
        if (attemptCount >= maxAttempts) {
            submitDeliverableBtn.disabled = true;
            if (submitDeliverableText) {
                submitDeliverableText.textContent = `Limite atteinte (${maxAttempts}/${maxAttempts} tentatives)`;
            }
            showAlert(uploadAlert, `⚠️ Vous avez utilisé vos ${maxAttempts} tentatives pour cet exercice. Votre meilleure note est définitivement comptabilisée !`, "info");
        } else {
            hideAlert(uploadAlert);
            if (submitDeliverableText) {
                submitDeliverableText.textContent = `Soumettre la tentative (${attemptCount + 1} / ${maxAttempts})`;
            }
            if (selectedFile) {
                submitDeliverableBtn.disabled = false;
            }
        }

        if (window.lucide) lucide.createIcons();
    }

    // =========================================================================
    // MOTEUR QCM INTERACTIF (1 question à la fois, chrono 2 min/question, navigation libre)
    // =========================================================================
    function initQcm(assignment) {
        if (!assignment || !assignment.questions) return;
        
        // Initialiser ou réinitialiser les réponses
        if (!isQcmActive) {
            qcmAnswers = {};
            assignment.questions.forEach(q => {
                qcmAnswers[q.id] = null;
            });
            qcmCurrentIndex = 0;
            const totalSec = assignment.totalTimeSeconds || (assignment.questions.length * (assignment.timePerQuestionSeconds || 120));
            qcmTimeRemaining = totalSec;
            isQcmActive = true;
            isQcmSubmitting = false;
        }

        renderQcmQuestion(qcmCurrentIndex);
        updateQcmStats();

        // Démarrer le chronomètre uniquement si l'étudiant est connecté et qu'il lui reste des tentatives
        const relatedSubs = mySubmissions.filter(s => s.assignment_name === assignment.title);
        const ovr = myOverrides.find(o => o.assignment_name === assignment.title);
        const maxAttempts = (assignment.maxAttempts || 3) + (ovr ? parseInt(ovr.bonus_attempts, 10) : 0);
        
        if (currentUser && relatedSubs.length < maxAttempts) {
            startQcmTimer();
            if (qcmAlert) hideAlert(qcmAlert);
            if (qcmFinishBtn) qcmFinishBtn.disabled = false;
        } else if (relatedSubs.length >= maxAttempts) {
            stopQcmTimer();
            if (qcmAlert) showAlert(qcmAlert, `⚠️ Vous avez utilisé vos ${maxAttempts} tentatives pour ce QCM. Votre meilleure note est définitivement comptabilisée !`, "info");
            if (qcmFinishBtn) qcmFinishBtn.disabled = true;
        }
    }

    function renderQcmQuestion(index) {
        const assignment = getCurrentAssignment();
        if (!assignment || !assignment.questions || assignment.questions.length === 0) return;

        if (index < 0) index = 0;
        if (index >= assignment.questions.length) index = assignment.questions.length - 1;
        qcmCurrentIndex = index;

        const q = assignment.questions[index];
        const total = assignment.questions.length;

        // Mise à jour de la barre d'en-tête
        if (qcmCurrentIndexText) qcmCurrentIndexText.textContent = index + 1;
        if (qcmSectionBadge) qcmSectionBadge.textContent = q.section || `Section ${(index < 3 ? '1' : index < 5 ? '2' : index < 8 ? '3' : '4')}`;
        if (qcmProgressBar) qcmProgressBar.style.width = `${((index + 1) / total) * 100}%`;

        // Énoncé de la question
        if (qcmQuestionText) {
            let formattedQ = q.question
                .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">$1</code>');
            qcmQuestionText.innerHTML = `<span class="text-amber-400 font-bold mr-1.5">${q.id}.</span> ${formattedQ}`;
        }

        // Options A, B, C, D
        if (qcmOptionsContainer) {
            qcmOptionsContainer.innerHTML = '';
            q.options.forEach(opt => {
                const isSelected = qcmAnswers[q.id] === opt.key;
                const optCard = document.createElement('label');
                optCard.className = `flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                        ? 'bg-amber-500/10 border-amber-500/80 shadow-md shadow-amber-500/10 text-white' 
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40'
                }`;

                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = `qcm_${q.id}`;
                radioInput.value = opt.key;
                radioInput.checked = isSelected;
                radioInput.className = 'mt-1 text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700';

                radioInput.addEventListener('change', () => {
                    selectQcmOption(q.id, opt.key);
                });

                const contentDiv = document.createElement('div');
                contentDiv.className = 'flex-1 text-xs leading-relaxed select-none';
                contentDiv.innerHTML = `<strong class="inline-block w-5 text-amber-400 font-bold">${opt.key})</strong> <span>${opt.text}</span>`;

                optCard.appendChild(radioInput);
                optCard.appendChild(contentDiv);
                qcmOptionsContainer.appendChild(optCard);
            });
        }

        // Puces de navigation (1..10)
        renderQcmNavDots(total);

        // Boutons précédent / suivant
        if (qcmPrevBtn) {
            qcmPrevBtn.disabled = (index === 0);
        }
        if (qcmNextBtn) {
            if (index === total - 1) {
                qcmNextBtn.innerHTML = '<span>Revoir (1ère Q)</span> <i data-lucide="rotate-ccw" class="w-4 h-4"></i>';
            } else {
                qcmNextBtn.innerHTML = '<span>Suivant</span> <i data-lucide="chevron-right" class="w-4 h-4"></i>';
            }
        }

        updateQcmStats();
        if (window.lucide) lucide.createIcons();
    }

    function renderQcmNavDots(total) {
        if (!qcmNavDots) return;
        qcmNavDots.innerHTML = '';
        const assignment = getCurrentAssignment();

        for (let i = 0; i < total; i++) {
            const qId = assignment?.questions?.[i]?.id || `Q${i+1}`;
            const isAnswered = qcmAnswers[qId] !== null && qcmAnswers[qId] !== undefined;
            const isCurrent = i === qcmCurrentIndex;

            const dot = document.createElement('button');
            dot.type = 'button';
            dot.textContent = i + 1;
            dot.title = `Question ${i + 1} (${isAnswered ? 'Répondue : ' + qcmAnswers[qId] : 'En attente'})`;
            dot.className = `w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
                isCurrent 
                    ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950 font-black shadow-lg scale-110 z-10' 
                    : isAnswered 
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/50' 
                        : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`;

            dot.addEventListener('click', () => {
                renderQcmQuestion(i);
            });

            qcmNavDots.appendChild(dot);
        }
    }

    function selectQcmOption(qId, key) {
        qcmAnswers[qId] = key;
        renderQcmQuestion(qcmCurrentIndex);
    }

    function updateQcmStats() {
        const assignment = getCurrentAssignment();
        if (!assignment || !assignment.questions) return;
        const total = assignment.questions.length;
        const answeredCount = Object.values(qcmAnswers).filter(v => v !== null && v !== undefined).length;
        if (qcmAnsweredCountText) {
            qcmAnsweredCountText.textContent = `${answeredCount} / ${total} répondue(s)`;
            if (answeredCount === total) {
                qcmAnsweredCountText.className = "text-[11px] text-emerald-400 font-semibold";
            } else {
                qcmAnsweredCountText.className = "text-[11px] text-slate-400";
            }
        }
    }

    function startQcmTimer() {
        stopQcmTimer();
        qcmTimerInterval = setInterval(() => {
            qcmTimeRemaining--;
            if (qcmTimeRemaining < 0) qcmTimeRemaining = 0;

            const mins = Math.floor(qcmTimeRemaining / 60);
            const secs = qcmTimeRemaining % 60;
            const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (qcmTimerText) qcmTimerText.textContent = formatted;

            // Alerte si moins de 2 minutes restantes
            if (qcmTimeRemaining <= 120 && qcmTimerBox) {
                qcmTimerBox.className = "flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950 border border-red-700 text-red-300 font-mono text-xs font-bold animate-pulse shadow-inner";
            } else if (qcmTimerBox) {
                qcmTimerBox.className = "flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 font-mono text-xs font-bold shadow-inner";
            }

            // Clôture automatique si temps écoulé
            if (qcmTimeRemaining <= 0) {
                stopQcmTimer();
                showToast("⏱️ Temps total écoulé ! Vos réponses sont transmises automatiquement.", "warning");
                submitQcmAnswers(true);
            }
        }, 1000);
    }

    function stopQcmTimer() {
        if (qcmTimerInterval) {
            clearInterval(qcmTimerInterval);
            qcmTimerInterval = null;
        }
    }

    async function submitQcmAnswers(isTimeout = false) {
        if (isQcmSubmitting) return;
        if (!currentUser) {
            showToast("Veuillez vous connecter pour soumettre votre QCM.", "error");
            return;
        }

        const assignment = getCurrentAssignment();
        if (!assignment) return;

        const relatedSubs = mySubmissions.filter(s => s.assignment_name === assignment.title);
        const ovr = myOverrides.find(o => o.assignment_name === assignment.title);
        const maxAttempts = (assignment.maxAttempts || 3) + (ovr ? parseInt(ovr.bonus_attempts, 10) : 0);

        if (relatedSubs.length >= maxAttempts) {
            showAlert(qcmAlert, "Nombre maximal de tentatives atteint !", "error");
            return;
        }

        isQcmSubmitting = true;
        stopQcmTimer();

        if (qcmFinishBtn) {
            qcmFinishBtn.disabled = true;
            qcmFinishBtn.innerHTML = "<span class='inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></span> <span>Enregistrement...</span>";
        }

        try {
            const attemptNumber = relatedSubs.length + 1;
            const timeSpent = (assignment.totalTimeSeconds || 1200) - Math.max(0, qcmTimeRemaining);
            const totalQuestions = assignment.questions?.length || 10;
            const answeredCount = Object.values(qcmAnswers).filter(v => v !== null && v !== undefined).length;

            const submissionData = {
                topic: assignment.title,
                student_email: currentUser.email,
                student_id: currentUser.id,
                submitted_at: new Date().toISOString(),
                time_spent_seconds: timeSpent,
                is_timeout: isTimeout,
                total_questions: totalQuestions,
                answered_count: answeredCount,
                answers: qcmAnswers
            };

            const jsonStr = JSON.stringify(submissionData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const filename = `qcm_ar_llms_tentative${attemptNumber}.json`;
            const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${currentUser.id}/${Date.now()}_tentative${attemptNumber}_${sanitizedName}`;
            const bucketName = config.STORAGE_BUCKET || 'deliverables';

            // 1. Upload vers Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, blob, { contentType: 'application/json', upsert: false });

            if (uploadError) throw uploadError;

            // 2. Récupération URL Publique
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // 3. Enregistrement dans la table submissions
            const { error: insertError } = await supabase
                .from('submissions')
                .insert({
                    student_id: currentUser.id,
                    student_email: currentUser.email,
                    course: assignment.course || 'GenAI',
                    assignment_name: assignment.title,
                    file_name: filename,
                    file_url: publicUrl,
                    file_path: filePath,
                    file_type: 'json',
                    attempt_number: attemptNumber,
                    metadata: {
                        answers: qcmAnswers,
                        is_quiz: true,
                        is_timeout: isTimeout,
                        time_spent_seconds: timeSpent,
                        answered_count: answeredCount,
                        total_questions: totalQuestions
                    },
                    grade: null,
                    status: 'En cours'
                });

            if (insertError) throw insertError;

            // Succès
            showToast(`Tentative ${attemptNumber}/${maxAttempts} enregistrée avec succès !`, "success");
            const timeoutNotice = isTimeout ? "<div class='text-amber-300 font-bold mt-1'>⏱️ Temps écoulé : la tentative a été enregistrée à la fin du compte à rebours.</div>" : "";
            showAlert(qcmAlert, `✅ <strong>QCM Enregistré avec succès !</strong><br/>Tentative <strong>${attemptNumber}/${maxAttempts}</strong> (${answeredCount}/${totalQuestions} questions répondues en ${Math.floor(timeSpent/60)}m ${timeSpent%60}s). Votre copie a été transmise à l'enseignant pour correction.${timeoutNotice}`, "success");

            isQcmActive = false;
            await fetchSubmissions();
            updateExerciseCard();

        } catch (err) {
            console.error("Erreur soumission QCM :", err);
            showAlert(qcmAlert, `Erreur lors de l'enregistrement : ${err.message || err}`, "error");
        } finally {
            isQcmSubmitting = false;
            if (qcmFinishBtn) {
                qcmFinishBtn.disabled = false;
                qcmFinishBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> <span>Terminer & Soumettre</span>';
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    // Gestionnaires d'événements du QCM
    if (qcmPrevBtn) {
        qcmPrevBtn.addEventListener('click', () => {
            renderQcmQuestion(qcmCurrentIndex - 1);
        });
    }

    if (qcmNextBtn) {
        qcmNextBtn.addEventListener('click', () => {
            const assignment = getCurrentAssignment();
            const total = assignment?.questions?.length || 10;
            if (qcmCurrentIndex < total - 1) {
                renderQcmQuestion(qcmCurrentIndex + 1);
            } else {
                renderQcmQuestion(0);
            }
        });
    }

    if (qcmFinishBtn) {
        qcmFinishBtn.addEventListener('click', () => {
            const answeredCount = Object.values(qcmAnswers).filter(v => v !== null && v !== undefined).length;
            const total = getCurrentAssignment()?.questions?.length || 10;
            if (answeredCount < total) {
                if (!confirm(`Attention : Vous n'avez répondu qu'à ${answeredCount}/${total} questions.\nSouhaitez-vous quand même terminer et soumettre votre tentative ?`)) {
                    return;
                }
            }
            submitQcmAnswers(false);
        });
    }

    if (toggleQcmManualUpload) {
        toggleQcmManualUpload.addEventListener('click', () => {
            isManualUploadVisible = !isManualUploadVisible;
            if (submissionForm) {
                if (isManualUploadVisible) {
                    submissionForm.classList.remove('hidden');
                    toggleQcmManualUpload.innerHTML = '<i data-lucide="eye-off" class="w-3.5 h-3.5"></i> <span>Masquer le téléversement de fichier</span>';
                } else {
                    submissionForm.classList.add('hidden');
                    toggleQcmManualUpload.innerHTML = '<i data-lucide="file-json" class="w-3.5 h-3.5"></i> <span>Ou téléverser un fichier .json préparé</span>';
                }
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    if (assignmentSelect) {
        assignmentSelect.addEventListener('change', () => {
            resetFileSelection();
            updateExerciseCard();
        });
    }

    // 4. TÉLÉCHARGEMENT DU GABARIT D'EXEMPLE
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            const assignment = getCurrentAssignment();
            if (!assignment || !assignment.templateContent) return;

            const isJson = assignment.acceptedTypes?.includes('.json') || assignment.templateFilename?.endsWith('.json');
            const blob = new Blob([assignment.templateContent], { 
                type: isJson ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = assignment.templateFilename || 'template.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Gabarit pour "${assignment.title}" téléchargé !`, "info");
        });
    }

    // 5. GESTION DES ONGLETS D'AUTHENTIFICATION
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            isRegisterMode = false;
            tabLogin.className = "flex-1 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white transition-all shadow";
            tabRegister.className = "flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-all";
            authFormTitle.textContent = "Connexion Étudiant";
            authSubmitText.textContent = "Se connecter";
            nameFieldContainer.classList.add('hidden');
            if (forgotPasswordContainer) forgotPasswordContainer.classList.remove('hidden');
            hideAlert(authAlert);
        });

        tabRegister.addEventListener('click', () => {
            isRegisterMode = true;
            tabRegister.className = "flex-1 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white transition-all shadow";
            tabLogin.className = "flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-all";
            authFormTitle.textContent = "Créer un Compte Étudiant";
            authSubmitText.textContent = "S'inscrire";
            nameFieldContainer.classList.remove('hidden');
            if (forgotPasswordContainer) forgotPasswordContainer.classList.add('hidden');
            hideAlert(authAlert);
        });
    }

    // 6. GESTION AUTHENTIFICATION SUPABASE
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert(authAlert);

            if (!supabase) {
                showAlert(authAlert, "Veuillez renseigner vos identifiants Supabase dans config.js !", "error");
                return;
            }

            const email = document.getElementById('authEmailInput').value.trim();
            const password = document.getElementById('authPasswordInput').value;
            const fullName = document.getElementById('authNameInput')?.value.trim() || email.split('@')[0];

            const submitBtn = document.getElementById('authSubmitBtn');
            submitBtn.disabled = true;
            authSubmitText.textContent = "Traitement en cours...";

            try {
                if (isRegisterMode) {
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: { data: { full_name: fullName } }
                    });
                    if (error) throw error;
                    
                    if (data.session) {
                        showAlert(authAlert, "Compte créé avec succès ! Connexion automatique...", "success");
                    } else {
                        showAlert(authAlert, "Compte créé ! Vérifiez vos emails si la confirmation est activée dans Supabase.", "info");
                    }
                } else {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    showAlert(authAlert, "Connexion réussie !", "success");
                }
            } catch (err) {
                console.error("Erreur Auth :", err);
                showAlert(authAlert, err.message || "Une erreur est survenue lors de l'authentification.", "error");
            } finally {
                submitBtn.disabled = false;
                authSubmitText.textContent = isRegisterMode ? "S'inscrire" : "Se connecter";
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabase) await supabase.auth.signOut();
            currentUser = null;
            renderAuthUI(null);
            showToast("Déconnexion réussie.", "info");
        });
    }

    // Forgot password listener
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async () => {
            const email = document.getElementById('authEmailInput')?.value.trim();
            if (!email) {
                showAlert(authAlert, "⚠️ Veuillez saisir votre email d'abord dans le champ ci-dessus.", "error");
                return;
            }
            if (!supabase) return;
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + window.location.pathname
                });
                if (error) throw error;
                showAlert(authAlert, "📧 Lien de réinitialisation envoyé ! Vérifiez votre boîte mail (et spams).", "success");
            } catch (err) {
                showAlert(authAlert, "❌ Erreur : " + err.message, "error");
            }
        });
    }

    if (supabase) {
        supabase.auth.onAuthStateChange(async (event, session) => {
            currentUser = session?.user || null;
            renderAuthUI(currentUser);
            if (event === 'PASSWORD_RECOVERY') {
                const newPassword = prompt("Saisissez votre nouveau mot de passe (min 6 caractères) :");
                if (newPassword && newPassword.length >= 6) {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) {
                        alert("Erreur lors de la mise à jour du mot de passe : " + error.message);
                    } else {
                        alert("Mot de passe mis à jour avec succès ! Vous pouvez vous reconnecter.");
                    }
                } else if (newPassword) {
                    alert("Le mot de passe doit contenir au moins 6 caractères. Veuillez recommencer la procédure.");
                }
            }
        });
            if (currentUser) {
                fetchSubmissions();
                setupRealtimeSubscription();
            } else {
                teardownRealtimeSubscription();
            }
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            currentUser = session?.user || null;
            renderAuthUI(currentUser);
            if (currentUser) {
                fetchSubmissions();
                setupRealtimeSubscription();
            }
        });
    }

    function renderAuthUI(user) {
        if (user) {
            authSection.classList.add('hidden');
            studentDashboard.classList.remove('hidden');
            authProfilePill.classList.remove('hidden');
            authProfilePill.classList.add('flex');
            
            const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
            userEmailText.textContent = user.email;
            userAvatar.textContent = displayName.charAt(0).toUpperCase();
            studentGreetingName.textContent = displayName;
            populateCoursesAndAssignments();
        } else {
            authSection.classList.remove('hidden');
            studentDashboard.classList.add('hidden');
            authProfilePill.classList.add('hidden');
            authProfilePill.classList.remove('flex');
        }
        if (window.lucide) lucide.createIcons();
    }

    // 7. DRAG & DROP ET VALIDATION DE FICHIER
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
            const assignment = getCurrentAssignment();
            const relatedSubs = mySubmissions.filter(s => s.assignment_name === assignment?.title);
            if (relatedSubs.length >= (assignment?.maxAttempts || 3)) {
                showToast("Limite de 3 tentatives atteinte pour cet exercice !", "warning");
                return;
            }
            if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target)) {
                fileInput.click();
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dropzone-active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dropzone-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt.files && dt.files.length > 0) {
                handleFileSelection(dt.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });

        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetFileSelection();
            });
        }
    }

    function handleFileSelection(file) {
        hideAlert(uploadAlert);
        const assignment = getCurrentAssignment();
        const relatedSubs = mySubmissions.filter(s => s.assignment_name === assignment?.title);
        if (relatedSubs.length >= (assignment?.maxAttempts || 3)) {
            showAlert(uploadAlert, "Vous avez déjà soumis vos 3 tentatives pour cet exercice !", "warning");
            resetFileSelection();
            return;
        }

        const fileName = file.name.toLowerCase();
        const acceptedTypes = assignment?.acceptedTypes || ['.json', '.csv', '.py', '.ipynb', '.png', '.jpg'];
        const isValidExt = acceptedTypes.some(ext => fileName.endsWith(ext));

        if (!isValidExt) {
            showAlert(uploadAlert, `Format non valide pour "${assignment.title}" ! Formats attendus : ${acceptedTypes.join(', ')}`, "error");
            resetFileSelection();
            return;
        }

        // Limite 50 Mo
        if (file.size > 50 * 1024 * 1024) {
            showAlert(uploadAlert, "Le fichier est trop volumineux (max 50 Mo).", "error");
            resetFileSelection();
            return;
        }

        selectedFile = file;
        previewFileName.textContent = file.name;
        previewFileSize.textContent = formatBytes(file.size);

        // Icône selon extension
        if (fileName.endsWith('.json')) {
            fileTypeIcon.innerHTML = `<i data-lucide="file-json" class="w-5 h-5 text-amber-400"></i>`;
        } else if (fileName.endsWith('.csv')) {
            fileTypeIcon.innerHTML = `<i data-lucide="file-spreadsheet" class="w-5 h-5 text-emerald-400"></i>`;
        } else if (fileName.endsWith('.py') || fileName.endsWith('.ipynb')) {
            fileTypeIcon.innerHTML = `<i data-lucide="file-code" class="w-5 h-5 text-indigo-400"></i>`;
        } else {
            fileTypeIcon.innerHTML = `<i data-lucide="file" class="w-5 h-5 text-brand-400"></i>`;
        }

        dropzoneEmpty.classList.add('hidden');
        dropzonePreview.classList.remove('hidden');
        submitDeliverableBtn.disabled = false;

        if (window.lucide) lucide.createIcons();
    }

    function resetFileSelection() {
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        dropzoneEmpty.classList.remove('hidden');
        dropzonePreview.classList.add('hidden');
        submitDeliverableBtn.disabled = true;
        updateAttemptsAndBestScore();
        if (window.lucide) lucide.createIcons();
    }

    // 8. SOUMISSION & UPLOAD VERS SUPABASE
    if (submissionForm) {
        submissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert(uploadAlert);

            if (!currentUser) {
                showAlert(uploadAlert, "Veuillez vous connecter pour soumettre.", "error");
                return;
            }

            if (!selectedFile) {
                showAlert(uploadAlert, "Veuillez sélectionner un fichier.", "error");
                return;
            }

            const assignment = getCurrentAssignment();
            const relatedSubs = mySubmissions.filter(s => s.assignment_name === assignment.title);
            if (relatedSubs.length >= (assignment.maxAttempts || 3)) {
                showAlert(uploadAlert, "Nombre maximal de 3 tentatives atteint !", "error");
                return;
            }

            const attemptNumber = relatedSubs.length + 1;
            const file = selectedFile;
            const lowerName = file.name.toLowerCase();

            // Détection du type de fichier
            let fileType = 'other';
            if (lowerName.endsWith('.json')) fileType = 'json';
            else if (lowerName.endsWith('.csv')) fileType = 'csv';
            else if (lowerName.endsWith('.ipynb')) fileType = 'jupyter';
            else if (lowerName.endsWith('.py')) fileType = 'python';
            else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) fileType = 'image';

            // Interface d'envoi
            submitDeliverableBtn.disabled = true;
            uploadProgressContainer.classList.remove('hidden');
            uploadProgressBar.style.width = '30%';
            uploadProgressPercent.textContent = '30%';
            uploadProgressLabel.textContent = `Téléversement tentative ${attemptNumber}/3 dans Supabase Storage...`;

            try {
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${currentUser.id}/${Date.now()}_tentative${attemptNumber}_${sanitizedName}`;
                const bucketName = config.STORAGE_BUCKET || 'deliverables';

                // 1. Upload Storage
                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });

                if (uploadError) throw uploadError;

                uploadProgressBar.style.width = '70%';
                uploadProgressPercent.textContent = '70%';
                uploadProgressLabel.textContent = 'Enregistrement de la soumission...';

                // 2. URL publique
                const { data: { publicUrl } } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                // 3. Insertion DB
                const { error: insertError } = await supabase
                    .from('submissions')
                    .insert({
                        student_id: currentUser.id,
                        student_email: currentUser.email,
                        course: assignment.course || 'GenAI',
                        assignment_name: assignment.title,
                        file_name: file.name,
                        file_url: publicUrl,
                        file_path: filePath,
                        file_type: fileType,
                        attempt_number: attemptNumber,
                        grade: null,
                        feedback: null,
                        status: 'En cours'
                    });

                if (insertError) throw insertError;

                uploadProgressBar.style.width = '100%';
                uploadProgressPercent.textContent = '100%';
                uploadProgressLabel.textContent = 'Soumission validée !';

                showAlert(uploadAlert, `✅ Tentative ${attemptNumber}/3 pour "${assignment.title}" déposée avec succès !`, "success");
                showToast(`Tentative ${attemptNumber}/3 envoyée pour ${assignment.title} !`, "success");

                resetFileSelection();
                fetchSubmissions();

            } catch (err) {
                console.error("Erreur de soumission :", err);
                showAlert(uploadAlert, `Erreur : ${err.message}`, "error");
            } finally {
                setTimeout(() => {
                    uploadProgressContainer.classList.add('hidden');
                    uploadProgressBar.style.width = '0%';
                }, 2000);
            }
        });
    }

    // 9. RÉCUPÉRATION ET RENDU DES SOUMISSIONS
    async function fetchSubmissions() {
        if (!supabase || !currentUser) return;

        try {
            // 1. Récupérer les soumissions de l'étudiant
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('student_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            mySubmissions = data || [];

            // 2. Récupérer les éventuelles dérogations / bonus de tentatives accordés par l'enseignant
            try {
                const { data: ovrData } = await supabase
                    .from('student_attempts_override')
                    .select('*')
                    .or(`student_id.eq.${currentUser.id},student_email.eq.${currentUser.email}`);
                myOverrides = ovrData || [];
            } catch (ovrErr) {
                myOverrides = [];
            }
            
            enrichAndRenderSubmissions(mySubmissions);
            updateAttemptsAndBestScore();
            updateOverallStats(mySubmissions);

        } catch (err) {
            console.error("Erreur chargement soumissions :", err);
        }
    }

    function enrichAndRenderSubmissions(subs) {
        // Regrouper par assignment_name pour identifier la meilleure note
        const groups = {};
        subs.forEach(s => {
            if (!groups[s.assignment_name]) groups[s.assignment_name] = [];
            groups[s.assignment_name].push(s);
        });

        // Déterminer le max grade par exercice
        const bestGradeMap = {};
        Object.keys(groups).forEach(name => {
            const graded = groups[name].filter(s => s.grade !== null && s.grade !== undefined);
            if (graded.length > 0) {
                bestGradeMap[name] = Math.max(...graded.map(s => parseFloat(s.grade)));
            }
        });

        // Assigner le flag isBest
        subs.forEach(s => {
            const maxG = bestGradeMap[s.assignment_name];
            s.isBest = (maxG !== undefined && s.grade !== null && parseFloat(s.grade) === maxG);
        });

        renderSubmissionsTable(subs);
    }

    function renderSubmissionsTable(submissions) {
        if (!submissionsTableBody) return;

        let filtered = submissions;
        if (currentHistoryFilter !== 'all') {
            filtered = submissions.filter(s => s.assignment_name === currentHistoryFilter);
        }

        if (filtered.length === 0) {
            submissionsTableBody.innerHTML = `
                <tr id="emptySubmissionsRow">
                    <td colspan="4" class="py-12 text-center text-slate-500">
                        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
                        Aucune soumission pour ce filtre.
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        submissionsTableBody.innerHTML = filtered.map(sub => {
            const isGraded = sub.status === 'Évalué' && sub.grade !== null;
            const gradeDisplay = isGraded ? `${parseFloat(sub.grade).toFixed(2)}/20` : '--/20';
            const dateStr = new Date(sub.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Badge de tentative
            const attemptNum = sub.attempt_number || 1;
            const attemptBadge = `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">Tentative ${attemptNum}/3</span>`;

            // Badge Meilleure Note
            const bestBadge = sub.isBest ? `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold badge-best ml-1.5 shadow-sm">
                    <i data-lucide="trophy" class="w-3 h-3 text-amber-400"></i>
                    Meilleure note retenue
                </span>` : '';

            // Icone Fichier
            let fileIcon = "file-code";
            let fileColor = "text-indigo-400";
            if (sub.file_type === 'json' || sub.file_name.endsWith('.json')) {
                fileIcon = "file-json";
                fileColor = "text-amber-400";
            } else if (sub.file_type === 'csv' || sub.file_name.endsWith('.csv')) {
                fileIcon = "file-spreadsheet";
                fileColor = "text-emerald-400";
            }

            // Statut
            const statusBadge = isGraded
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                     <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Évalué
                   </span>`
                : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                     <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> En cours
                   </span>`;

            // Note badge
            const gradeBadge = isGraded
                ? `<span class="text-sm font-bold font-display px-2.5 py-1 rounded-lg ${sub.isBest ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">${gradeDisplay}</span>`
                : `<span class="text-xs font-medium text-slate-500 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">${gradeDisplay}</span>`;

            // Rapport / Feedback professeur
            const feedbackHtml = sub.feedback
                ? `<div class="mt-2 text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                     <div class="font-semibold text-brand-300 flex items-center gap-1">
                        <i data-lucide="message-square" class="w-3 h-3"></i> Rapport d'Évaluation :
                     </div>
                     <div class="prose prose-invert max-w-none text-slate-300 text-[11px] whitespace-pre-wrap">${escapeHtml(sub.feedback)}</div>
                   </div>`
                : '';

            return `
                <tr class="hover:bg-slate-900/50 transition-colors group">
                    <td class="py-3.5 px-2 align-top">
                        <div class="flex items-center flex-wrap gap-1">
                            <span class="font-bold text-slate-100 text-xs">${escapeHtml(sub.assignment_name)}</span>
                            ${attemptBadge}
                            ${bestBadge}
                        </div>
                        <div class="text-[10px] text-slate-500 mt-1">${dateStr} • Matière : ${sub.course || 'GenAI'}</div>
                        ${feedbackHtml}
                    </td>
                    <td class="py-3.5 px-2 align-top">
                        <a href="${sub.file_url}" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center gap-1">
                            <i data-lucide="${fileIcon}" class="w-3.5 h-3.5 ${fileColor}"></i>
                            <span class="text-[11px] text-slate-300 truncate max-w-[150px]">${escapeHtml(sub.file_name)}</span>
                            <i data-lucide="external-link" class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </a>
                    </td>
                    <td class="py-3.5 px-2 align-top">${statusBadge}</td>
                    <td class="py-3.5 px-2 text-right align-top">${gradeBadge}</td>
                </tr>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    // Gestion des filtres d'historique
    if (historyFilterTabs) {
        historyFilterTabs.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                historyFilterTabs.querySelectorAll('button').forEach(b => {
                    b.className = "px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-400 hover:text-white border border-slate-800";
                });
                btn.className = "px-3 py-1 rounded-lg text-xs font-semibold bg-brand-600 text-white shadow";
                currentHistoryFilter = btn.dataset.filter;
                renderSubmissionsTable(mySubmissions);
            });
        });
    }

    function updateOverallStats(submissions) {
        if (!statSubmittedCount || !statAverageGrade) return;
        statSubmittedCount.textContent = submissions.length;

        // Moyenne des MEILLEURES notes par exercice
        const groups = {};
        submissions.forEach(s => {
            if (!groups[s.assignment_name]) groups[s.assignment_name] = [];
            if (s.grade !== null && s.grade !== undefined) {
                groups[s.assignment_name].push(parseFloat(s.grade));
            }
        });

        const bestGrades = [];
        Object.keys(groups).forEach(name => {
            if (groups[name].length > 0) {
                bestGrades.push(Math.max(...groups[name]));
            }
        });

        if (bestGrades.length > 0) {
            const avg = (bestGrades.reduce((a, b) => a + b, 0) / bestGrades.length).toFixed(2);
            statAverageGrade.textContent = `${avg}/20`;
        } else {
            statAverageGrade.textContent = '--/20';
        }
    }

    if (refreshSubmissionsBtn) {
        refreshSubmissionsBtn.addEventListener('click', () => {
            fetchSubmissions();
            showToast("Soumissions rafraîchies.", "info");
        });
    }

    // 10. REALTIME
    function setupRealtimeSubscription() {
        if (!supabase || !currentUser) return;
        teardownRealtimeSubscription();

        try {
            realtimeSubscription = supabase
                .channel('student-feed')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'submissions'
                }, (payload) => {
                    if (payload.new?.student_id === currentUser.id || payload.old?.id) {
                        fetchSubmissions();
                        if (payload.eventType === 'UPDATE' && payload.new && payload.new.grade !== null) {
                            showToast(`🎉 Note mise à jour pour ${payload.new.assignment_name} : ${parseFloat(payload.new.grade).toFixed(2)}/20`, "success");
                            if (window.confetti && parseFloat(payload.new.grade) >= 14) {
                                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                            }
                        }
                    }
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'student_attempts_override'
                }, (payload) => {
                    fetchSubmissions();
                    showToast("🎁 Vos quotas de tentatives ont été mis à jour par l'enseignant !", "info");
                })
                .subscribe();
        } catch (e) {
            console.error("Realtime error :", e);
        }
    }

    function teardownRealtimeSubscription() {
        if (realtimeSubscription && supabase) {
            supabase.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }
    }

    // 11. UTILITAIRES
    function showAlert(el, msg, type) {
        if (!el) return;
        el.className = `p-3 rounded-xl text-xs flex items-center space-x-2 ${
            type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/30' :
            type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
            type === 'warning' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
            'bg-slate-800 text-slate-300 border border-slate-700'
        }`;
        el.innerHTML = `<span>${msg}</span>`;
        el.classList.remove('hidden');
    }

    function hideAlert(el) {
        if (el) el.classList.add('hidden');
    }

    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `p-3.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-2 pointer-events-auto transition-all transform duration-300 translate-y-2 opacity-0 ${
            type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10' :
            type === 'warning' ? 'bg-amber-950/90 text-amber-300 border border-amber-500/40 shadow-amber-500/10' :
            'bg-slate-900/90 text-slate-200 border border-slate-700 shadow-brand-500/10'
        }`;
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        }, 10);

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Octet';
        const k = 1024;
        const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
});
