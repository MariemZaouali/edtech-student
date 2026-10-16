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
    const bestGradeContainer = document.getElementById('bestGradeContainer');
    const cnnRankContainer = document.getElementById('cnnRankContainer');
    const cnnCurrentRank = document.getElementById('cnnCurrentRank');
    const cnnLeaderboardPanel = document.getElementById('cnnLeaderboardPanel');
    const leaderboardTableBody = document.getElementById('leaderboardTableBody');
    const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
    const exerciseDescription = document.getElementById('exerciseDescription');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    const cnnLatexPanel = document.getElementById('cnnLatexPanel');
    const deadlineBanner = document.getElementById('deadlineBanner');
    const deadlineBannerText = document.getElementById('deadlineBannerText');

    // Éléments Challenge Your Mate
    const challengeMatePanel = document.getElementById('challengeMatePanel');
    const challengeSessionStateLabel = document.getElementById('challengeSessionStateLabel');
    const challengeSessionIndicator = document.getElementById('challengeSessionIndicator');
    const challengeDownloadTemplateBtn = document.getElementById('challengeDownloadTemplateBtn');
    const challengeQuestionsDropzone = document.getElementById('challengeQuestionsDropzone');
    const challengeQuestionsFileInput = document.getElementById('challengeQuestionsFileInput');
    const challengeQuestionsDropEmpty = document.getElementById('challengeQuestionsDropEmpty');
    const challengeQuestionsDropPreview = document.getElementById('challengeQuestionsDropPreview');
    const challengePreviewFileName = document.getElementById('challengePreviewFileName');
    const challengePreviewCount = document.getElementById('challengePreviewCount');
    const challengeRemoveFileBtn = document.getElementById('challengeRemoveFileBtn');
    const uploadChallengeQuestionsBtn = document.getElementById('uploadChallengeQuestionsBtn');
    const uploadChallengeQuestionsText = document.getElementById('uploadChallengeQuestionsText');
    const challengeUploadedQuestionsStatus = document.getElementById('challengeUploadedQuestionsStatus');
    const challengeUploadedTitle = document.getElementById('challengeUploadedTitle');
    const challengeUploadedDetails = document.getElementById('challengeUploadedDetails');
    const challengeQuestionsAlert = document.getElementById('challengeQuestionsAlert');
    const challengePeerQuestionsCountBadge = document.getElementById('challengePeerQuestionsCountBadge');
    const startChallengeQuizBtn = document.getElementById('startChallengeQuizBtn');
    const startChallengeBtnText = document.getElementById('startChallengeBtnText');
    const challengeResultCard = document.getElementById('challengeResultCard');
    const challengeResultCardTitle = document.getElementById('challengeResultCardTitle');
    const challengeFinalGradeDisplay = document.getElementById('challengeFinalGradeDisplay');
    const challengeFinalGradeDetails = document.getElementById('challengeFinalGradeDetails');
    const viewChallengeAnswersBtn = document.getElementById('viewChallengeAnswersBtn');

    // Modal QCM Challenge Your Mate
    const peerQuizModal = document.getElementById('peerQuizModal');
    const closePeerQuizModalBtn = document.getElementById('closePeerQuizModalBtn');
    const peerQuizSessionIndicator = document.getElementById('peerQuizSessionIndicator');
    const peerQuizBody = document.getElementById('peerQuizBody');
    const peerQuizQuestionsList = document.getElementById('peerQuizQuestionsList');
    const peerQuizFooter = document.getElementById('peerQuizFooter');
    const peerQuizAnsweredCount = document.getElementById('peerQuizAnsweredCount');
    const peerQuizTotalCount = document.getElementById('peerQuizTotalCount');
    const submitPeerQuizBtn = document.getElementById('submitPeerQuizBtn');
    const peerQuizReviewScreen = document.getElementById('peerQuizReviewScreen');
    const peerQuizTeacherAlert = document.getElementById('peerQuizTeacherAlert');

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
    let cnnLeaderboardData = [];

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
        const hidden = config.HIDDEN_ASSIGNMENT_NAMES || [];

        assignmentSelect.innerHTML = '';
        if (course && course.assignments) {
            let firstIndex = 0;
            course.assignments
                .filter(item => !item.hidden && !hidden.includes(item.title))
                .forEach((item, index) => {
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

        // Gérer l'affichage spécifique pour CNN Challenger
        if (assignment.title === "CNN Challenger") {
            if (bestGradeContainer) bestGradeContainer.classList.add('hidden');
            if (cnnRankContainer) cnnRankContainer.classList.remove('hidden');
            if (cnnLeaderboardPanel) cnnLeaderboardPanel.classList.remove('hidden');
            if (cnnLatexPanel) cnnLatexPanel.classList.remove('hidden');
            fetchCnnLeaderboard();
            fetchLatexReport();
        } else {
            if (bestGradeContainer) bestGradeContainer.classList.remove('hidden');
            if (cnnRankContainer) cnnRankContainer.classList.add('hidden');
            if (cnnLeaderboardPanel) cnnLeaderboardPanel.classList.add('hidden');
            if (cnnLatexPanel) cnnLatexPanel.classList.add('hidden');
        }

        // Gérer l'affichage spécifique pour Challenge Your Mate
        if (assignment.isPeerChallenge) {
            if (challengeMatePanel) challengeMatePanel.classList.remove('hidden');
            if (submissionForm) submissionForm.classList.add('hidden');
            if (interactiveQuizContainer) interactiveQuizContainer.classList.add('hidden');
            if (bestGradeContainer) bestGradeContainer.classList.add('hidden');
            initChallengeMate();
        } else {
            if (challengeMatePanel) challengeMatePanel.classList.add('hidden');
            
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
        }

        // Affichage de la deadline si définie
        renderDeadlineBanner(assignment);

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
                    redirectTo: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + 'reset-password.html'
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
            
            const ovr = myOverrides.find(o => o.assignment_name === assignment?.title);
            const bonusAttempts = ovr ? parseInt(ovr.bonus_attempts, 10) : 0;
            const maxAttempts = (assignment?.maxAttempts || 3) + bonusAttempts;

            if (relatedSubs.length >= maxAttempts) {
                showToast(`Limite de ${maxAttempts} tentatives atteinte pour cet exercice !`, "warning");
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
        
        const ovr = myOverrides.find(o => o.assignment_name === assignment?.title);
        const bonusAttempts = ovr ? parseInt(ovr.bonus_attempts, 10) : 0;
        const maxAttempts = (assignment?.maxAttempts || 3) + bonusAttempts;

        if (relatedSubs.length >= maxAttempts) {
            showAlert(uploadAlert, `Vous avez déjà soumis vos ${maxAttempts} tentatives pour cet exercice !`, "warning");
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
            
            const ovr = myOverrides.find(o => o.assignment_name === assignment.title);
            const bonusAttempts = ovr ? parseInt(ovr.bonus_attempts, 10) : 0;
            const maxAttempts = (assignment.maxAttempts || 3) + bonusAttempts;

            if (relatedSubs.length >= maxAttempts) {
                showAlert(uploadAlert, `Nombre maximal de ${maxAttempts} tentatives atteint !`, "error");
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
            uploadProgressLabel.textContent = `Téléversement tentative ${attemptNumber}/${maxAttempts} dans Supabase Storage...`;

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

            // 3. Charger les deadlines (Supabase en priorité, sinon localStorage)
            try {
                const { data: dlData } = await supabase
                    .from('assignment_deadlines')
                    .select('assignment_title, deadline');
                if (dlData && dlData.length > 0) {
                    dlData.forEach(row => {
                        const a = config.ASSIGNMENTS?.find(x => x.title === row.assignment_title);
                        if (a) a.deadline = row.deadline || null;
                    });
                } else {
                    // Fallback localStorage (deadlines sauvegardées par l'enseignant en local)
                    try {
                        const localDl = JSON.parse(localStorage.getItem('EDTECH_DEADLINES') || '{}');
                        config.ASSIGNMENTS?.forEach(a => {
                            if (localDl[a.title]) a.deadline = localDl[a.title];
                        });
                    } catch(e) {}
                }
            } catch(dlErr) {
                // Fallback localStorage si table n'existe pas encore
                try {
                    const localDl = JSON.parse(localStorage.getItem('EDTECH_DEADLINES') || '{}');
                    config.ASSIGNMENTS?.forEach(a => {
                        if (localDl[a.title]) a.deadline = localDl[a.title];
                    });
                } catch(e) {}
            }
            
            enrichAndRenderSubmissions(mySubmissions);
            updateAttemptsAndBestScore();
            updateOverallStats(mySubmissions);

        } catch (err) {
            console.error("Erreur chargement soumissions :", err);
        }
    }

    function enrichAndRenderSubmissions(subs) {
        // Filtrer les soumissions des exercices masques
        const hiddenNames = config.HIDDEN_ASSIGNMENT_NAMES || [];
        const visible = subs.filter(s => !hiddenNames.includes(s.assignment_name));

        // Regrouper par assignment_name pour identifier la meilleure note
        const groups = {};
        visible.forEach(s => {
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

        renderSubmissionsTable(visible);
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

            // Note badge (Masquée pour CNN Challenger)
            let gradeBadge = '';
            if (sub.assignment_name === 'CNN Challenger') {
                gradeBadge = `<span class="text-xs font-medium text-purple-400 px-2 py-1 rounded-lg bg-purple-900/30 border border-purple-800 flex items-center justify-center gap-1"><i data-lucide="trophy" class="w-3 h-3"></i> Leaderboard</span>`;
            } else {
                gradeBadge = isGraded
                    ? `<span class="text-sm font-bold font-display px-2.5 py-1 rounded-lg ${sub.isBest ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">${gradeDisplay}</span>`
                    : `<span class="text-xs font-medium text-slate-500 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">${gradeDisplay}</span>`;
            }

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

        // Moyenne des MEILLEURES notes par exercice (hors CNN Challenger)
        const groups = {};
        submissions.forEach(s => {
            if (s.assignment_name === "CNN Challenger") return; // Ignorer pour la moyenne
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

    // 10.5 LEADERBOARD CNN — lit le snapshot pré-calculé par l'enseignant
    async function fetchCnnLeaderboard() {
        if (!supabase) return;
        try {
            // 1. Vérifier si le leaderboard est publié (ligne système)
            const { data: publishData } = await supabase
                .from('submissions')
                .select('id')
                .eq('assignment_name', 'CNN Challenger')
                .eq('student_email', 'SYSTEM_LEADERBOARD_PUBLISHED')
                .limit(1);

            const isPublished = publishData && publishData.length > 0;

            if (!isPublished) {
                if (leaderboardTableBody) {
                    leaderboardTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="py-8 text-center text-slate-500">
                                <i data-lucide="lock" class="w-6 h-6 mx-auto mb-2 text-slate-600"></i>
                                Le classement n'est pas encore publié par l'enseignant.
                            </td>
                        </tr>
                    `;
                    if (window.lucide) lucide.createIcons();
                }
                if (cnnCurrentRank) cnnCurrentRank.innerHTML = "--";
                return;
            }

            // 2. Lire le snapshot pré-calculé (zéro recalcul)
            const { data, error } = await supabase
                .from('cnn_leaderboard_snapshot')
                .select('rank, student_email, display_name, accuracy_pct, grade, attempts, max_attempts')
                .order('rank', { ascending: true });

            if (error) throw error;

            cnnLeaderboardData = data || [];
            renderLeaderboard();
            updateCnnRankBadge();

        } catch (err) {
            console.error("Erreur chargement leaderboard CNN:", err);
        }
    }

    function renderLeaderboard() {
        if (!leaderboardTableBody) return;

        if (cnnLeaderboardData.length === 0) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-slate-500">
                        <i data-lucide="trophy" class="w-6 h-6 mx-auto mb-2 text-slate-600"></i>
                        Aucune soumission évaluée pour le moment.
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        leaderboardTableBody.innerHTML = cnnLeaderboardData.map((user) => {
            const rank = user.rank;
            const isCurrentUser = currentUser && user.student_email === currentUser.email;

            let rankBadge = `<span class="font-bold text-slate-400">${rank}</span>`;
            if (rank === 1) rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full leaderboard-rank-gold text-xs font-black shadow-lg">1</span>`;
            else if (rank === 2) rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full leaderboard-rank-silver text-xs font-black shadow-lg">2</span>`;
            else if (rank === 3) rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full leaderboard-rank-bronze text-xs font-black shadow-lg">3</span>`;

            // Nom affiché : display_name depuis le snapshot (peut être anonymisé par l'enseignant)
            let displayName = user.display_name || user.student_email.split('@')[0];
            if (isCurrentUser) displayName += ' <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 ml-1">Vous</span>';

            // Accuracy badge
            const accuracy = user.accuracy_pct != null
                ? `<span class="font-semibold ${user.accuracy_pct >= 50 ? 'text-emerald-400' : 'text-amber-400'}">${parseFloat(user.accuracy_pct).toFixed(2)}%</span>`
                : '<span class="text-slate-500">—</span>';

            // Grade badge
            const grade = user.grade != null
                ? `<span class="font-semibold ${user.grade >= 10 ? 'text-emerald-300' : 'text-rose-400'}">${parseFloat(user.grade).toFixed(2)}<span class="text-slate-500 text-[10px]">/20</span></span>`
                : '<span class="text-slate-500">—</span>';

            // Tentatives
            const attemptsStr = `<span class="text-slate-400">${user.attempts}<span class="text-slate-600">/${user.max_attempts}</span></span>`;

            return `
                <tr class="leaderboard-row ${isCurrentUser ? 'leaderboard-current-user' : ''} border-b border-slate-800/40 transition-colors hover:bg-slate-800/30">
                    <td class="py-3 px-2">${rankBadge}</td>
                    <td class="py-3 px-2 font-medium ${isCurrentUser ? 'text-purple-300' : 'text-slate-300'}">${displayName}</td>
                    <td class="py-3 px-2 text-center">${accuracy}</td>
                    <td class="py-3 px-2 text-center">${grade}</td>
                    <td class="py-3 px-2 text-right">${attemptsStr}</td>
                </tr>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    function updateCnnRankBadge() {
        if (!cnnCurrentRank || !currentUser) return;

        const myEntry = cnnLeaderboardData.find(u => u.student_email === currentUser.email);
        if (myEntry) {
            const rank = myEntry.rank;
            let rankText = `${rank}<sup>e</sup>`;
            if (rank === 1) rankText = `1<sup>er</sup> 🏆`;
            cnnCurrentRank.innerHTML = rankText;
        } else {
            cnnCurrentRank.innerHTML = "--";
        }
    }

    if (refreshLeaderboardBtn) {
        refreshLeaderboardBtn.addEventListener('click', () => {
            fetchCnnLeaderboard();
            showToast("Classement actualisé.", "info");
        });
    }


    // =========================================================================
    // 10b. DEADLINE BANNER
    // =========================================================================
    function renderDeadlineBanner(assignment) {
        if (!deadlineBanner || !deadlineBannerText) return;
        const deadlineIso = assignment?.deadline;
        if (!deadlineIso) {
            deadlineBanner.classList.add('hidden');
            return;
        }
        const now = new Date();
        const dl = new Date(deadlineIso);
        const diffMs = dl - now;
        deadlineBanner.classList.remove('hidden');
        if (diffMs <= 0) {
            deadlineBanner.classList.remove('ok', 'deadline-urgent');
            deadlineBannerText.className = 'text-xs font-semibold text-red-300';
            deadlineBannerText.textContent = `⛔ Deadline expirée le ${dl.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        } else {
            const days = Math.floor(diffMs / 86400000);
            const hours = Math.floor((diffMs % 86400000) / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            const isUrgent = diffMs < 86400000; // moins de 24h
            if (isUrgent) {
                deadlineBanner.classList.remove('ok');
                deadlineBanner.classList.add('deadline-urgent');
                deadlineBannerText.className = 'text-xs font-semibold text-red-300';
                deadlineBannerText.textContent = `⚠️ Deadline dans ${hours}h ${mins}min — ${dl.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
            } else {
                deadlineBanner.classList.add('ok');
                deadlineBanner.classList.remove('deadline-urgent');
                deadlineBannerText.className = 'text-xs font-semibold text-emerald-300';
                deadlineBannerText.textContent = `🗓️ Deadline : ${dl.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (dans ${days}j ${hours}h)`;
            }
        }
    }

    // =========================================================================
    // 10c. RAPPORT LATEX CNN CHALLENGER
    // =========================================================================
    let latexSelectedFile = null;
    let latexCurrentRecord = null;

    const latexDropzone        = document.getElementById('latexDropzone');
    const latexFileInput       = document.getElementById('latexFileInput');
    const latexDropzoneEmpty   = document.getElementById('latexDropzoneEmpty');
    const latexDropzonePreview = document.getElementById('latexDropzonePreview');
    const latexPreviewFileName = document.getElementById('latexPreviewFileName');
    const latexPreviewFileSize = document.getElementById('latexPreviewFileSize');
    const latexRemoveFileBtn   = document.getElementById('latexRemoveFileBtn');
    const latexSubmitBtn       = document.getElementById('latexSubmitBtn');
    const latexSubmitText      = document.getElementById('latexSubmitText');
    const latexProgressContainer = document.getElementById('latexProgressContainer');
    const latexProgressBar     = document.getElementById('latexProgressBar');
    const latexProgressPercent = document.getElementById('latexProgressPercent');
    const latexProgressLabel   = document.getElementById('latexProgressLabel');
    const latexAlert           = document.getElementById('latexAlert');
    const latexExistingReport  = document.getElementById('latexExistingReport');
    const latexExistingLink    = document.getElementById('latexExistingLink');
    const latexExistingName    = document.getElementById('latexExistingName');
    const latexDeleteExistingBtn = document.getElementById('latexDeleteExistingBtn');

    async function fetchLatexReport() {
        if (!supabase || !currentUser) return;
        try {
            const { data, error } = await supabase
                .from('cnn_latex_reports')
                .select('*')
                .eq('student_id', currentUser.id)
                .maybeSingle();
            if (error) { console.warn('cnn_latex_reports:', error.message); latexCurrentRecord = null; }
            else latexCurrentRecord = data || null;
        } catch (e) {
            console.warn('fetchLatexReport:', e);
            latexCurrentRecord = null;
        }
        renderLatexReportUI();
    }

    function renderLatexReportUI() {
        if (!latexExistingReport) return;
        if (latexCurrentRecord && latexCurrentRecord.file_url) {
            latexExistingReport.classList.remove('hidden');
            if (latexExistingName) latexExistingName.textContent = latexCurrentRecord.file_name || 'rapport';
            if (latexExistingLink) latexExistingLink.href = latexCurrentRecord.file_url;
            if (latexSubmitText) latexSubmitText.textContent = 'Remplacer le rapport';
        } else {
            latexExistingReport.classList.add('hidden');
            if (latexSubmitText) latexSubmitText.textContent = 'Déposer le rapport';
        }
        if (window.lucide) lucide.createIcons();
    }

    function resetLatexFileSelection() {
        latexSelectedFile = null;
        if (latexFileInput) latexFileInput.value = '';
        if (latexDropzoneEmpty) latexDropzoneEmpty.classList.remove('hidden');
        if (latexDropzonePreview) latexDropzonePreview.classList.add('hidden');
        if (latexSubmitBtn) latexSubmitBtn.disabled = true;
        if (window.lucide) lucide.createIcons();
    }

    function handleLatexFileSelection(file) {
        hideAlert(latexAlert);
        const allowed = ['.tex', '.zip'];
        const name = file.name.toLowerCase();
        if (!allowed.some(ext => name.endsWith(ext))) {
            showAlert(latexAlert, 'Format non valide. Utilisez un fichier .tex ou .zip.', 'error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showAlert(latexAlert, 'Fichier trop volumineux (max 50 Mo).', 'error');
            return;
        }
        latexSelectedFile = file;
        if (latexPreviewFileName) latexPreviewFileName.textContent = file.name;
        if (latexPreviewFileSize) latexPreviewFileSize.textContent = formatBytes(file.size);
        if (latexDropzoneEmpty) latexDropzoneEmpty.classList.add('hidden');
        if (latexDropzonePreview) latexDropzonePreview.classList.remove('hidden');
        if (latexSubmitBtn) latexSubmitBtn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }

    if (latexDropzone && latexFileInput) {
        latexDropzone.addEventListener('click', (e) => {
            if (e.target !== latexRemoveFileBtn && !latexRemoveFileBtn?.contains(e.target)) {
                latexFileInput.click();
            }
        });
        ['dragenter', 'dragover'].forEach(ev => latexDropzone.addEventListener(ev, (e) => {
            e.preventDefault(); e.stopPropagation();
            latexDropzone.classList.add('dropzone-active');
        }));
        ['dragleave', 'drop'].forEach(ev => latexDropzone.addEventListener(ev, (e) => {
            e.preventDefault(); e.stopPropagation();
            latexDropzone.classList.remove('dropzone-active');
        }));
        latexDropzone.addEventListener('drop', (e) => {
            const f = e.dataTransfer?.files?.[0];
            if (f) handleLatexFileSelection(f);
        });
        latexFileInput.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (f) handleLatexFileSelection(f);
        });
    }

    if (latexRemoveFileBtn) {
        latexRemoveFileBtn.addEventListener('click', (e) => { e.stopPropagation(); resetLatexFileSelection(); });
    }

    if (latexSubmitBtn) {
        latexSubmitBtn.addEventListener('click', async () => {
            if (!latexSelectedFile || !currentUser) return;
            hideAlert(latexAlert);
            latexSubmitBtn.disabled = true;
            if (latexProgressContainer) latexProgressContainer.classList.remove('hidden');
            if (latexProgressBar) latexProgressBar.style.width = '20%';
            if (latexProgressPercent) latexProgressPercent.textContent = '20%';
            if (latexProgressLabel) latexProgressLabel.textContent = 'Téléversement du rapport...';

            try {
                // Supprimer l'ancien si existant
                if (latexCurrentRecord?.file_path) {
                    await supabase.storage.from('cnn_reports').remove([latexCurrentRecord.file_path]).catch(() => {});
                    await supabase.from('cnn_latex_reports').delete().eq('student_id', currentUser.id).catch(() => {});
                }

                const sanitized = latexSelectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${currentUser.id}/${Date.now()}_${sanitized}`;

                if (latexProgressBar) latexProgressBar.style.width = '40%';
                if (latexProgressPercent) latexProgressPercent.textContent = '40%';

                const { error: upErr } = await supabase.storage
                    .from('cnn_reports')
                    .upload(filePath, latexSelectedFile, { cacheControl: '3600', upsert: true });
                if (upErr) throw upErr;

                if (latexProgressBar) latexProgressBar.style.width = '75%';
                if (latexProgressPercent) latexProgressPercent.textContent = '75%';
                if (latexProgressLabel) latexProgressLabel.textContent = 'Enregistrement...';

                const { data: { publicUrl } } = supabase.storage.from('cnn_reports').getPublicUrl(filePath);

                const { error: dbErr } = await supabase.from('cnn_latex_reports').upsert({
                    student_id: currentUser.id,
                    student_email: currentUser.email,
                    file_name: latexSelectedFile.name,
                    file_path: filePath,
                    file_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id' });
                if (dbErr) throw dbErr;

                if (latexProgressBar) latexProgressBar.style.width = '100%';
                if (latexProgressPercent) latexProgressPercent.textContent = '100%';
                if (latexProgressLabel) latexProgressLabel.textContent = 'Rapport déposé !';

                showAlert(latexAlert, '✅ Rapport LaTeX déposé avec succès !', 'success');
                showToast('Rapport CNN déposé !', 'success');
                resetLatexFileSelection();
                await fetchLatexReport();
            } catch (err) {
                console.error('Erreur rapport LaTeX:', err);
                showAlert(latexAlert, `Erreur : ${err.message}`, 'error');
            } finally {
                latexSubmitBtn.disabled = false;
                setTimeout(() => {
                    if (latexProgressContainer) latexProgressContainer.classList.add('hidden');
                    if (latexProgressBar) latexProgressBar.style.width = '0%';
                }, 2000);
            }
        });
    }

    if (latexDeleteExistingBtn) {
        latexDeleteExistingBtn.addEventListener('click', async () => {
            if (!latexCurrentRecord || !currentUser) return;
            if (!confirm('Voulez-vous supprimer votre rapport LaTeX ? Vous pourrez en déposer un nouveau.')) return;
            hideAlert(latexAlert);
            try {
                if (latexCurrentRecord.file_path) {
                    await supabase.storage.from('cnn_reports').remove([latexCurrentRecord.file_path]).catch(() => {});
                }
                const { error } = await supabase.from('cnn_latex_reports').delete().eq('student_id', currentUser.id);
                if (error) throw error;
                latexCurrentRecord = null;
                showAlert(latexAlert, 'Rapport supprimé. Vous pouvez en déposer un nouveau.', 'info');
                showToast('Rapport supprimé.', 'info');
                renderLatexReportUI();
            } catch (err) {
                showAlert(latexAlert, `Erreur suppression : ${err.message}`, 'error');
            }
        });
    }

    // =========================================================================
    // 10c. CHALLENGE YOUR MATE (PEER-TO-PEER QCM)
    // =========================================================================
    let challengeSession = null;
    let challengeSelectedFile = null;
    let challengeParsedQuestions = [];
    let challengeMyQuestionsRecord = null;
    let challengePeerQuestions = [];
    let challengeAllSubmissions = [];
    let challengeBestSubmission = null;
    let challengeLatestSubmission = null;
    let challengeMySubmission = null;
    let peerQuizUserAnswers = {};
    let isPeerQuizActive = false;
    let challengeRealtimeSub = null;

    async function initChallengeMate() {
        if (!supabase || !currentUser) return;
        setupChallengeRealtime();
        await fetchChallengeSession();
        await fetchMyChallengeQuestions();
        await fetchPeerQuestionsCount();
        await fetchMyChallengeSubmission();
        if (window.lucide) lucide.createIcons();
    }

    function setupChallengeRealtime() {
        if (challengeRealtimeSub || !supabase) return;
        challengeRealtimeSub = supabase
            .channel('challenge-session-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'challenge_sessions'
            }, async (payload) => {
                const newSession = payload.new;
                if (!newSession) return;
                const prevStatus = challengeSession ? challengeSession.status : null;
                const prevId = challengeSession ? challengeSession.id : null;
                challengeSession = newSession;

                // Recharger les soumissions pour être à jour avec la nouvelle session
                await fetchMyChallengeSubmission();
                updateChallengeSessionUI();

                if (newSession.status === 'active' && (prevStatus !== 'active' || newSession.id !== prevId)) {
                    showToast('🚀 L\'enseignant a lancé une nouvelle session de Challenge ! Vous pouvez participer dès maintenant.', 'success');
                } else if (newSession.status === 'stopped') {
                    showToast('🛑 L\'enseignant a arrêté le Challenge.', 'warning');
                    if (isPeerQuizActive) {
                        // AUTO-SUBMISSION AUTOMATIQUE QUAND L'ENSEIGNANT ARRÊTE
                        submitPeerQuiz(true);
                    }
                }
            })
            .subscribe();
    }

    async function fetchChallengeSession() {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('challenge_sessions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            challengeSession = data || { status: 'inactive' };
            updateChallengeSessionUI();
        } catch (e) {
            console.warn('Erreur récupération session challenge:', e.message);
            challengeSession = { status: 'inactive' };
            updateChallengeSessionUI();
        }
    }

    function updateChallengeSessionUI() {
        if (!challengeSession) return;
        const status = challengeSession.status || 'inactive';
        const totalAttempts = challengeAllSubmissions.length;
        const currentSessionId = challengeSession.id;
        const hasSubmittedInCurrentSession = challengeAllSubmissions.some(s => s.session_id === currentSessionId);

        if (challengeSessionIndicator) {
            if (status === 'active') {
                challengeSessionIndicator.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5';
                challengeSessionIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> En direct';
            } else if (status === 'stopped') {
                challengeSessionIndicator.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5';
                challengeSessionIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400"></span> Arrêté';
            } else {
                challengeSessionIndicator.className = 'px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5';
                challengeSessionIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-500"></span> Inactif';
            }
        }

        if (challengeSessionStateLabel) {
            if (status === 'active') {
                challengeSessionStateLabel.textContent = totalAttempts > 0 
                    ? 'Nouvelle session en direct ! Vous pouvez participer pour tenter d\'améliorer votre note retenue.'
                    : 'Session en direct ! L\'enseignant a lancé le challenge.';
                challengeSessionStateLabel.className = 'text-xs text-emerald-400 font-semibold';
            } else if (status === 'stopped') {
                challengeSessionStateLabel.textContent = 'Session clôturée par l\'enseignant.';
                challengeSessionStateLabel.className = 'text-xs text-rose-400 font-semibold';
            } else {
                challengeSessionStateLabel.textContent = 'En attente du lancement par l\'enseignant...';
                challengeSessionStateLabel.className = 'text-xs text-rose-300 font-medium';
            }
        }

        // Mettre à jour l'intitulé du bouton principal
        if (startChallengeBtnText) {
            if (status === 'active') {
                if (hasSubmittedInCurrentSession) {
                    startChallengeBtnText.textContent = '🔄 Retenter le Challenge (En direct • Meilleure note retenue)';
                } else if (totalAttempts > 0) {
                    startChallengeBtnText.textContent = '🚀 Participer à la nouvelle session (En direct)';
                } else {
                    startChallengeBtnText.textContent = '🚀 Lance le Challenge ! (En direct)';
                }
            } else if (status === 'stopped') {
                if (totalAttempts > 0) {
                    startChallengeBtnText.textContent = '🛑 Session terminée • Voir mes réponses';
                } else {
                    startChallengeBtnText.textContent = '🛑 Session clôturée par l\'enseignant';
                }
            } else {
                if (totalAttempts > 0) {
                    startChallengeBtnText.textContent = '📊 Voir mon résultat / mes réponses';
                } else {
                    startChallengeBtnText.textContent = '⏳ En attente de l\'enseignant...';
                }
            }
        }
    }

    async function fetchMyChallengeQuestions() {
        if (!supabase || !currentUser) return;
        try {
            const { data, error } = await supabase
                .from('challenge_questions')
                .select('*')
                .eq('student_id', currentUser.id)
                .maybeSingle();

            if (error) throw error;
            challengeMyQuestionsRecord = data;

            if (data && data.question_count > 0) {
                if (challengeUploadedQuestionsStatus) challengeUploadedQuestionsStatus.classList.remove('hidden');
                if (challengeUploadedTitle) challengeUploadedTitle.textContent = 'Vos questions sont enregistrées !';
                if (challengeUploadedDetails) {
                    challengeUploadedDetails.textContent = `${data.question_count} question(s) prêtes pour vos camarades (Fichier : ${data.file_name || 'questions.json'}). Vous pouvez téléverser à nouveau pour les mettre à jour.`;
                }
            } else {
                if (challengeUploadedQuestionsStatus) challengeUploadedQuestionsStatus.classList.add('hidden');
            }
        } catch (e) {
            console.warn('Erreur récupération questions étudiant:', e.message);
        }
    }

    async function fetchPeerQuestionsCount() {
        if (!supabase || !currentUser) return;
        try {
            const { data, error } = await supabase
                .from('challenge_questions')
                .select('questions, question_count')
                .neq('student_email', currentUser.email);

            if (error) throw error;
            let total = 0;
            if (data) {
                data.forEach(row => {
                    total += (row.question_count || (Array.isArray(row.questions) ? row.questions.length : 0));
                });
            }
            if (challengePeerQuestionsCountBadge) {
                challengePeerQuestionsCountBadge.textContent = `${total} question${total > 1 ? 's' : ''}`;
            }
        } catch (e) {
            console.warn('Erreur count questions pairs:', e.message);
        }
    }

    async function fetchMyChallengeSubmission() {
        if (!supabase || !currentUser) return;
        try {
            const { data, error } = await supabase
                .from('challenge_submissions')
                .select('*')
                .eq('student_id', currentUser.id)
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            challengeAllSubmissions = data || [];
            challengeLatestSubmission = challengeAllSubmissions[0] || null;

            if (challengeAllSubmissions.length > 0) {
                // Trouver la meilleure tentative (note retenue = MAX)
                challengeBestSubmission = challengeAllSubmissions.reduce((best, curr) => {
                    const bestScore = best && best.score !== null ? parseFloat(best.score) : -1;
                    const currScore = curr && curr.score !== null ? parseFloat(curr.score) : -1;
                    return currScore >= bestScore ? curr : best;
                }, challengeAllSubmissions[0]);
            } else {
                challengeBestSubmission = null;
            }

            challengeMySubmission = challengeBestSubmission || challengeLatestSubmission;

            if (challengeBestSubmission && challengeBestSubmission.score !== null && challengeBestSubmission.score !== undefined) {
                const bestScoreNum = parseFloat(challengeBestSubmission.score);
                const latestScoreNum = challengeLatestSubmission ? parseFloat(challengeLatestSubmission.score) : bestScoreNum;
                const totalAttempts = challengeAllSubmissions.length;

                if (challengeResultCard) challengeResultCard.classList.remove('hidden');
                if (challengeFinalGradeDisplay) {
                    challengeFinalGradeDisplay.textContent = `${bestScoreNum.toFixed(2)} / 20`;
                    challengeFinalGradeDisplay.className = `text-3xl font-black font-display ${bestScoreNum >= 10 ? 'text-emerald-400' : 'text-rose-400'}`;
                }
                if (challengeFinalGradeDetails) {
                    let detailsText = `🏆 Note Retenue : ${bestScoreNum.toFixed(2)} / 20 (Note Maximale)`;
                    if (totalAttempts > 1) {
                        detailsText += ` • ${totalAttempts} tentatives • Dernière tentative : ${latestScoreNum.toFixed(2)}/20`;
                    } else {
                        detailsText += ` • ${challengeBestSubmission.correct_count} / ${challengeBestSubmission.total_questions} réponses correctes`;
                    }
                    if (challengeLatestSubmission && challengeLatestSubmission.is_auto_submitted) {
                        detailsText += ' • Auto-soumis';
                    }
                    challengeFinalGradeDetails.textContent = detailsText;
                }
            } else {
                if (challengeResultCard) challengeResultCard.classList.add('hidden');
            }
            updateChallengeSessionUI();
        } catch (e) {
            console.warn('Erreur récupération soumission challenge:', e.message);
        }
    }

    // Gestion du fichier JSON téléversé par l'étudiant
    function normalizeQuestions(rawList) {
        if (!Array.isArray(rawList)) return [];
        return rawList.map((item, idx) => {
            const qText = item.question || `Question ${idx + 1}`;
            let options = [];

            if (Array.isArray(item.options)) {
                options = item.options.map((opt, oIdx) => {
                    if (typeof opt === 'string') {
                        const defaultKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
                        return { key: defaultKeys[oIdx] || String(oIdx + 1), text: opt };
                    } else if (typeof opt === 'object' && opt !== null) {
                        return { key: opt.key || String.fromCharCode(65 + oIdx), text: opt.text || '' };
                    }
                    return { key: String.fromCharCode(65 + oIdx), text: String(opt) };
                });
            } else if (typeof item.options === 'object' && item.options !== null) {
                options = Object.keys(item.options).map(k => ({
                    key: k.toUpperCase(),
                    text: item.options[k]
                }));
            }

            const correct = (item.correct || 'A').toString().trim().toUpperCase();
            return {
                question: qText,
                options: options,
                correct: correct
            };
        });
    }

    function handleChallengeFileSelection(file) {
        hideAlert(challengeQuestionsAlert);
        if (!file.name.toLowerCase().endsWith('.json')) {
            showAlert(challengeQuestionsAlert, 'Format non valide. Seul le format .json est accepté.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                let qList = [];
                if (Array.isArray(parsed)) {
                    qList = parsed;
                } else if (parsed && Array.isArray(parsed.questions)) {
                    qList = parsed.questions;
                } else {
                    throw new Error('Le JSON doit contenir une clé "questions" (tableau) ou être un tableau de questions.');
                }

                if (qList.length === 0) {
                    throw new Error('Aucune question trouvée dans le fichier.');
                }

                challengeParsedQuestions = normalizeQuestions(qList);
                challengeSelectedFile = file;

                if (challengePreviewFileName) challengePreviewFileName.textContent = file.name;
                if (challengePreviewCount) challengePreviewCount.textContent = `${challengeParsedQuestions.length} question(s) valide(s)`;
                if (challengeQuestionsDropEmpty) challengeQuestionsDropEmpty.classList.add('hidden');
                if (challengeQuestionsDropPreview) challengeQuestionsDropPreview.classList.remove('hidden');
                if (uploadChallengeQuestionsBtn) uploadChallengeQuestionsBtn.disabled = false;
                if (window.lucide) lucide.createIcons();
            } catch (err) {
                showAlert(challengeQuestionsAlert, `Erreur JSON : ${err.message}`, 'error');
                resetChallengeFileSelection();
            }
        };
        reader.onerror = () => {
            showAlert(challengeQuestionsAlert, 'Erreur lors de la lecture du fichier.', 'error');
            resetChallengeFileSelection();
        };
        reader.readAsText(file);
    }

    function resetChallengeFileSelection() {
        challengeSelectedFile = null;
        challengeParsedQuestions = [];
        if (challengeQuestionsFileInput) challengeQuestionsFileInput.value = '';
        if (challengeQuestionsDropEmpty) challengeQuestionsDropEmpty.classList.remove('hidden');
        if (challengeQuestionsDropPreview) challengeQuestionsDropPreview.classList.add('hidden');
        if (uploadChallengeQuestionsBtn) uploadChallengeQuestionsBtn.disabled = true;
        if (window.lucide) lucide.createIcons();
    }

    // Écouteurs drag & drop pour les questions JSON
    if (challengeQuestionsDropzone && challengeQuestionsFileInput) {
        challengeQuestionsDropzone.addEventListener('click', (e) => {
            if (e.target !== challengeRemoveFileBtn && !challengeRemoveFileBtn?.contains(e.target)) {
                challengeQuestionsFileInput.click();
            }
        });
        ['dragenter', 'dragover'].forEach(ev => challengeQuestionsDropzone.addEventListener(ev, (e) => {
            e.preventDefault(); e.stopPropagation();
            challengeQuestionsDropzone.classList.add('border-rose-500');
        }));
        ['dragleave', 'drop'].forEach(ev => challengeQuestionsDropzone.addEventListener(ev, (e) => {
            e.preventDefault(); e.stopPropagation();
            challengeQuestionsDropzone.classList.remove('border-rose-500');
        }));
        challengeQuestionsDropzone.addEventListener('drop', (e) => {
            const f = e.dataTransfer?.files?.[0];
            if (f) handleChallengeFileSelection(f);
        });
        challengeQuestionsFileInput.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (f) handleChallengeFileSelection(f);
        });
    }

    if (challengeRemoveFileBtn) {
        challengeRemoveFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetChallengeFileSelection();
        });
    }

    // Télécharger le modèle de questions
    if (challengeDownloadTemplateBtn) {
        challengeDownloadTemplateBtn.addEventListener('click', () => {
            const a = getCurrentAssignment();
            const content = a?.templateContent || JSON.stringify({
                questions: [
                    {
                        question: "Quelle est la complexité du tri rapide en moyenne ?",
                        options: [
                            { key: "A", text: "O(n)" },
                            { key: "B", text: "O(n log n)" },
                            { key: "C", text: "O(n²)" },
                            { key: "D", text: "O(log n)" }
                        ],
                        correct: "B"
                    }
                ]
            }, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'challenge_questions_template.json';
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    // Bouton enregistrer les questions JSON dans Supabase
    if (uploadChallengeQuestionsBtn) {
        uploadChallengeQuestionsBtn.addEventListener('click', async () => {
            if (!challengeParsedQuestions.length || !currentUser) return;
            hideAlert(challengeQuestionsAlert);
            uploadChallengeQuestionsBtn.disabled = true;
            if (uploadChallengeQuestionsText) uploadChallengeQuestionsText.textContent = 'Enregistrement...';

            try {
                const payload = {
                    student_id: currentUser.id,
                    student_email: currentUser.email,
                    questions: challengeParsedQuestions,
                    question_count: challengeParsedQuestions.length,
                    file_name: challengeSelectedFile?.name || 'questions.json',
                    updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('challenge_questions')
                    .upsert(payload, { onConflict: 'student_id' });

                if (error) throw error;

                showAlert(challengeQuestionsAlert, `✅ Vos ${challengeParsedQuestions.length} questions ont été enregistrées avec succès !`, 'success');
                showToast(`Vos ${challengeParsedQuestions.length} questions sont prêtes pour le challenge !`, 'success');
                resetChallengeFileSelection();
                await fetchMyChallengeQuestions();
                await fetchPeerQuestionsCount();
            } catch (err) {
                showAlert(challengeQuestionsAlert, `Erreur : ${err.message}`, 'error');
            } finally {
                uploadChallengeQuestionsBtn.disabled = false;
                if (uploadChallengeQuestionsText) uploadChallengeQuestionsText.textContent = 'Téléverser mes questions';
            }
        });
    }

    // Bouton Principal : Lance le Challenge
    if (startChallengeQuizBtn) {
        startChallengeQuizBtn.addEventListener('click', async () => {
            // Si la session est active, permettre TOUJOURS de participer (même s'il y a déjà des soumissions) !
            if (challengeSession && challengeSession.status === 'active') {
                const currentSessionId = challengeSession.id;
                const hasSubmittedInCurrentSession = challengeAllSubmissions.some(s => s.session_id === currentSessionId);
                if (hasSubmittedInCurrentSession) {
                    if (!confirm("Vous avez déjà soumis une tentative pour cette session. Souhaitez-vous retenter ? Votre meilleure note sera toujours celle conservée !")) {
                        openPeerQuizReview(challengeLatestSubmission || challengeBestSubmission);
                        return;
                    }
                }
                await launchLivePeerQuiz();
                return;
            }

            // Si la session n'est pas active, mais l'étudiant a déjà une soumission, afficher directement la revue
            if (challengeBestSubmission || challengeLatestSubmission) {
                openPeerQuizReview(challengeLatestSubmission || challengeBestSubmission);
                return;
            }

            // Session non active et aucune soumission
            if (challengeSession?.status === 'stopped') {
                showToast('🛑 Le challenge a été arrêté par l\'enseignant.', 'warning');
            } else {
                showToast('⏳ L\'enseignant n\'a pas encore lancé la session de challenge. Patientez !', 'warning');
            }
        });
    }

    if (viewChallengeAnswersBtn) {
        viewChallengeAnswersBtn.addEventListener('click', () => {
            if (challengeBestSubmission || challengeLatestSubmission) {
                openPeerQuizReview(challengeLatestSubmission || challengeBestSubmission);
            }
        });
    }

    async function launchLivePeerQuiz() {
        if (!supabase || !currentUser) return;

        // Récupérer les questions téléversées par TOUS les étudiants SAUF l'étudiant actuel
        try {
            const { data, error } = await supabase
                .from('challenge_questions')
                .select('*')
                .neq('student_id', currentUser.id);

            if (error) throw error;

            if (!data || data.length === 0) {
                showToast('Aucun camarade n\'a encore téléversé de questions. Prévenez vos pairs !', 'warning');
                return;
            }

            challengePeerQuestions = [];
            data.forEach(row => {
                if (Array.isArray(row.questions)) {
                    const authorName = (row.student_email || 'Camarade').split('@')[0];
                    row.questions.forEach((q, idx) => {
                        let opts = [];
                        if (Array.isArray(q.options)) {
                            opts = q.options.map((o, oIdx) => {
                                if (typeof o === 'string') return { key: String.fromCharCode(65 + oIdx), text: o };
                                return { key: o.key || String.fromCharCode(65 + oIdx), text: o.text || '' };
                            });
                        } else if (typeof q.options === 'object' && q.options !== null) {
                            opts = Object.keys(q.options).map(k => ({ key: k.toUpperCase(), text: q.options[k] }));
                        }

                        challengePeerQuestions.push({
                            id: `${row.student_id}_${idx}`,
                            author: authorName,
                            question: q.question,
                            options: opts,
                            correct: (q.correct || 'A').toString().trim().toUpperCase()
                        });
                    });
                }
            });

            if (challengePeerQuestions.length === 0) {
                showToast('Aucune question disponible provenant de vos camarades.', 'warning');
                return;
            }

            // Mélanger les questions pour un challenge dynamique
            challengePeerQuestions.sort(() => Math.random() - 0.5);

            // Initialiser les réponses de l'étudiant
            peerQuizUserAnswers = {};
            isPeerQuizActive = true;

            // Rendu de la modal
            renderPeerQuizQuestions();
            if (peerQuizReviewScreen) peerQuizReviewScreen.classList.add('hidden');
            if (peerQuizBody) peerQuizBody.classList.remove('hidden');
            if (peerQuizFooter) peerQuizFooter.classList.remove('hidden');
            if (peerQuizTeacherAlert) peerQuizTeacherAlert.classList.remove('hidden');

            if (peerQuizModal) {
                peerQuizModal.classList.remove('hidden');
                peerQuizModal.classList.add('flex');
            }
            if (window.lucide) lucide.createIcons();
        } catch (e) {
            showToast(`Erreur chargement challenge : ${e.message}`, 'error');
        }
    }

    function renderPeerQuizQuestions() {
        if (!peerQuizQuestionsList) return;
        const total = challengePeerQuestions.length;
        if (peerQuizTotalCount) peerQuizTotalCount.textContent = total;
        updatePeerQuizAnsweredProgress();

        peerQuizQuestionsList.innerHTML = challengePeerQuestions.map((q, idx) => {
            const currentAnswer = peerQuizUserAnswers[q.id];

            const optionsHtml = q.options.map(opt => {
                const isSelected = currentAnswer === opt.key;
                return `
                    <label class="peer-quiz-opt flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                            ? 'bg-rose-500/20 border-rose-500 text-white font-medium shadow-md shadow-rose-500/10' 
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }">
                        <input type="radio" name="opt_${q.id}" value="${opt.key}" ${isSelected ? 'checked' : ''} class="hidden" 
                            onchange="window.selectPeerQuizAnswer('${q.id}', '${opt.key}')">
                        <span class="w-6 h-6 rounded-lg ${isSelected ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'} text-xs font-bold flex items-center justify-center flex-shrink-0">
                            ${opt.key}
                        </span>
                        <span class="text-xs flex-1 leading-relaxed mt-0.5">${escapeHtml(opt.text)}</span>
                    </label>
                `;
            }).join('');

            return `
                <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-lg" id="card_${q.id}">
                    <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <span class="text-xs font-bold text-rose-400 uppercase tracking-wider">
                            Question ${idx + 1} / ${total}
                        </span>
                        <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                            <i data-lucide="user" class="w-3 h-3 text-rose-400"></i> Proposée par <strong class="text-slate-300">${escapeHtml(q.author)}</strong>
                        </span>
                    </div>
                    <div class="text-sm font-semibold text-white leading-relaxed">
                        ${escapeHtml(q.question)}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        ${optionsHtml}
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    window.selectPeerQuizAnswer = function(questionId, optionKey) {
        peerQuizUserAnswers[questionId] = optionKey;
        updatePeerQuizAnsweredProgress();
        renderPeerQuizQuestions();
    };

    function updatePeerQuizAnsweredProgress() {
        const answered = Object.keys(peerQuizUserAnswers).length;
        if (peerQuizAnsweredCount) peerQuizAnsweredCount.textContent = answered;
    }

    // Soumission du QCM (manuelle ou automatique quand l'enseignant arrête)
    async function submitPeerQuiz(isAuto = false) {
        if (!currentUser) return;
        isPeerQuizActive = false;

        let correctCount = 0;
        const total = challengePeerQuestions.length;

        challengePeerQuestions.forEach(q => {
            const userAns = (peerQuizUserAnswers[q.id] || '').toString().trim().toUpperCase();
            if (userAns && userAns === q.correct) {
                correctCount++;
            }
        });

        const score = total > 0 ? Number(((correctCount / total) * 20).toFixed(2)) : 0;
        const currentSessionId = challengeSession?.id || '00000000-0000-0000-0000-000000000001';

        const submissionData = {
            student_id: currentUser.id,
            student_email: currentUser.email,
            session_id: currentSessionId,
            answers: peerQuizUserAnswers,
            questions_served: challengePeerQuestions,
            score: score,
            total_questions: total,
            correct_count: correctCount,
            is_auto_submitted: isAuto,
            submitted_at: new Date().toISOString()
        };

        try {
            // Tenter insert (pour garder toutes les tentatives par session) ou fallback upsert
            const { error: insErr } = await supabase.from('challenge_submissions').insert(submissionData);
            if (insErr) {
                await supabase.from('challenge_submissions').upsert(submissionData, {
                    onConflict: 'student_id,session_id'
                });
            }
        } catch (e) {
            console.warn('Erreur insert challenge_submissions, tentative upsert:', e);
            try {
                await supabase.from('challenge_submissions').upsert(submissionData, {
                    onConflict: 'student_id,session_id'
                });
            } catch (err2) {
                console.error('Erreur sauvegarde soumission challenge:', err2);
            }
        }

        // Rafraîchir toutes les soumissions pour recalculer la meilleure note retenue
        await fetchMyChallengeSubmission();

        const allScores = (challengeAllSubmissions || []).map(s => Number(s.score || 0));
        const maxScore = allScores.length > 0 ? Math.max(...allScores, score) : score;
        const attemptsCount = Math.max((challengeAllSubmissions || []).length, 1);

        // Sauvegarder également dans la table submissions générale pour affichage dans l'historique global
        // avec la NOTE RETENUE MAXIMALE
        try {
            await supabase.from('submissions').insert({
                student_id: currentUser.id,
                student_email: currentUser.email,
                assignment_name: "Challenge Your Mate",
                file_name: "challenge_quiz_answers.json",
                file_path: `challenge/${currentUser.id}/${Date.now()}.json`,
                status: "Évalué",
                grade: maxScore,
                evaluation_feedback: `Challenge Your Mate • Note retenue : ${maxScore.toFixed(2)}/20 (Meilleure note sur ${attemptsCount} tentative(s)). Dernière tentative : ${score.toFixed(2)}/20 (${correctCount}/${total} bonnes réponses)${isAuto ? ' [Auto-soumis à l\'arrêt par l\'enseignant]' : ''}`,
                created_at: new Date().toISOString()
            });
        } catch (subErr) {
            console.warn('Erreur enregistrement submissions générale:', subErr);
        }

        // Afficher l'écran de revue détaillé dans la modal avec la note maximale retenue
        openPeerQuizReview(submissionData, maxScore, attemptsCount);
        fetchSubmissions();
    }

    if (submitPeerQuizBtn) {
        submitPeerQuizBtn.addEventListener('click', () => {
            const answered = Object.keys(peerQuizUserAnswers).length;
            const total = challengePeerQuestions.length;
            if (answered < total) {
                if (!confirm(`Vous avez répondu à ${answered} / ${total} questions. Voulez-vous vraiment valider et obtenir votre note dès maintenant ?`)) {
                    return;
                }
            }
            submitPeerQuiz(false);
        });
    }

    function openPeerQuizReview(sub, retainedMaxScore = null, totalAttempts = null) {
        if (!sub) return;
        const questions = sub.questions_served || [];
        const answers = sub.answers || {};
        const score = sub.score !== null ? parseFloat(sub.score).toFixed(2) : '--';

        const maxScore = retainedMaxScore !== null 
            ? parseFloat(retainedMaxScore).toFixed(2)
            : (challengeBestSubmission && challengeBestSubmission.score !== null ? parseFloat(challengeBestSubmission.score).toFixed(2) : score);

        const attempts = totalAttempts !== null ? totalAttempts : (challengeAllSubmissions?.length || 1);
        const isCurrentBest = parseFloat(score) >= parseFloat(maxScore);
        const isSessionActive = challengeSession && challengeSession.status === 'active';

        if (peerQuizBody) peerQuizBody.classList.add('hidden');
        if (peerQuizFooter) peerQuizFooter.classList.add('hidden');
        if (peerQuizTeacherAlert) peerQuizTeacherAlert.classList.add('hidden');

        if (peerQuizReviewScreen) {
            peerQuizReviewScreen.classList.remove('hidden');
            peerQuizReviewScreen.innerHTML = `
                <div class="space-y-6">
                    <!-- Bannière Score Retenu (Max) vs Tentative -->
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-rose-950/70 border border-rose-500/40 text-center space-y-3 shadow-xl">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${sub.is_auto_submitted ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
                            <i data-lucide="${sub.is_auto_submitted ? 'clock' : 'check-circle'}" class="w-4 h-4"></i>
                            ${sub.is_auto_submitted ? 'Challenge arrêté par l\'enseignant • Auto-soumis' : 'Tentative validée'}
                        </div>

                        <!-- NOTE RETENUE (MAX) MISE EN AVANT -->
                        <div class="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-1">
                            <div class="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center justify-center gap-1.5">
                                <i data-lucide="trophy" class="w-4 h-4 text-amber-400"></i>
                                <span>Note Retenue pour l'Évaluation (Maximale)</span>
                            </div>
                            <div class="text-4xl font-black font-display text-emerald-400">
                                ${maxScore} <span class="text-lg text-slate-500">/ 20</span>
                            </div>
                            <div class="text-[11px] text-slate-400">
                                ${isCurrentBest 
                                    ? '🎉 Cette tentative est votre meilleure note !' 
                                    : `ℹ️ Note de cette tentative : <strong>${score} / 20</strong> (votre meilleure note de ${maxScore}/20 est conservée)`}
                                • <strong>${attempts} tentative(s) au total</strong>
                            </div>
                        </div>

                        <p class="text-xs text-slate-300">
                            <strong>${sub.correct_count}</strong> bonne(s) réponse(s) sur <strong>${sub.total_questions}</strong> questions dans cette tentative.
                        </p>

                        ${isSessionActive ? `
                            <button type="button" id="retryChallengeFromReviewBtn" class="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all">
                                <i data-lucide="rotate-cw" class="w-4 h-4"></i>
                                <span>Session en cours : Retenter le Challenge</span>
                            </button>
                        ` : ''}
                    </div>

                    <!-- Liste détaillée des réponses -->
                    <div class="space-y-4">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <i data-lucide="list-checks" class="w-4 h-4 text-rose-400"></i>
                            Détail de vos réponses (Tentative affichée)
                        </h4>
                        ${questions.map((q, idx) => {
                            const userAns = answers[q.id];
                            const isCorrect = userAns === q.correct;

                            return `
                                <div class="p-4 rounded-xl border ${isCorrect ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-rose-950/20 border-rose-800/40'} space-y-2.5">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="text-xs font-bold text-white">Question ${idx + 1}</span>
                                        <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold ${isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                                            ${isCorrect ? '✅ Correct' : userAns ? '❌ Erreur' : '⚪ Non répondue'}
                                        </span>
                                    </div>
                                    <div class="text-xs text-slate-200 font-medium">
                                        ${escapeHtml(q.question)}
                                    </div>
                                    <div class="text-[11px] space-y-1 pt-1">
                                        <div class="text-slate-400">Votre réponse : <strong class="${isCorrect ? 'text-emerald-300' : 'text-rose-300'}">${userAns || 'Aucune'}</strong></div>
                                        ${!isCorrect ? `<div class="text-slate-400">Bonne réponse attendue : <strong class="text-emerald-400">${q.correct}</strong></div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Bouton Fermer -->
                    <button type="button" onclick="document.getElementById('closePeerQuizModalBtn').click()" class="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors">
                        Fermer le récapitulatif
                    </button>
                </div>
            `;
            if (window.lucide) lucide.createIcons();

            const retryBtn = document.getElementById('retryChallengeFromReviewBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', async () => {
                    if (peerQuizModal) {
                        peerQuizModal.classList.add('hidden');
                        peerQuizModal.classList.remove('flex');
                    }
                    await launchLivePeerQuiz();
                });
            }
        }

        if (peerQuizModal) {
            peerQuizModal.classList.remove('hidden');
            peerQuizModal.classList.add('flex');
        }
    }

    if (closePeerQuizModalBtn) {
        closePeerQuizModalBtn.addEventListener('click', () => {
            if (isPeerQuizActive) {
                if (!confirm('Attention : Si vous fermez maintenant, vos réponses en cours seront perdues jusqu\'à la prochaine ouverture. Confirmer ?')) {
                    return;
                }
            }
            isPeerQuizActive = false;
            if (peerQuizModal) {
                peerQuizModal.classList.add('hidden');
                peerQuizModal.classList.remove('flex');
            }
        });
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
