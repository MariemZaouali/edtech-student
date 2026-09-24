/**
 * APPLICATION FRONTEND ÉTUDIANT - LOGIQUE JAVASCRIPT
 * Gestion Auth, Upload Storage, Insertion Base de données & Supabase Realtime
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    // 1. VÉRIFICATION DE LA CONFIGURATION
    const config = window.SUPABASE_CONFIG || {};
    const isConfigured = config.URL && config.ANON_KEY && 
                         !config.URL.includes('VOTRE_PROJECT_ID') && 
                         !config.ANON_KEY.includes('VOTRE_SUPABASE_ANON_KEY');

    const configWarning = document.getElementById('configWarning');
    if (!isConfigured && configWarning) {
        configWarning.classList.remove('hidden');
    }

    // Initialisation du client Supabase
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
    const authProfilePill = document.getElementById('authProfilePill');
    const userEmailText = document.getElementById('userEmailText');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const studentGreetingName = document.getElementById('studentGreetingName');
    
    // Devoirs & Upload
    const assignmentSelect = document.getElementById('assignmentSelect');
    const assignmentHelpText = document.getElementById('assignmentHelpText');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const dropzoneEmpty = document.getElementById('dropzoneEmpty');
    const dropzonePreview = document.getElementById('dropzonePreview');
    const previewFileName = document.getElementById('previewFileName');
    const previewFileSize = document.getElementById('previewFileSize');
    const fileTypeIcon = document.getElementById('fileTypeIcon');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const submitDeliverableBtn = document.getElementById('submitDeliverableBtn');
    const submissionForm = document.getElementById('submissionForm');
    const uploadAlert = document.getElementById('uploadAlert');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressPercent = document.getElementById('uploadProgressPercent');
    const uploadProgressLabel = document.getElementById('uploadProgressLabel');

    // Tableau des Soumissions
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const refreshSubmissionsBtn = document.getElementById('refreshSubmissionsBtn');
    const statSubmittedCount = document.getElementById('statSubmittedCount');
    const statAverageGrade = document.getElementById('statAverageGrade');
    const toastContainer = document.getElementById('toastContainer');

    // ÉTAT LOCAL DE L'APPLICATION
    let currentUser = null;
    let selectedFile = null;
    let isRegisterMode = false;
    let mySubmissions = [];
    let realtimeSubscription = null;

    // 3. INITIALISATION DU SÉLECTEUR DE SÉANCES
    function populateAssignments() {
        if (!assignmentSelect || !config.ASSIGNMENTS) return;
        assignmentSelect.innerHTML = '';
        config.ASSIGNMENTS.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = item.title;
            opt.textContent = item.title;
            if (index === 0) opt.selected = true;
            assignmentSelect.appendChild(opt);
        });
        updateAssignmentHelp();
    }

    function updateAssignmentHelp() {
        const selectedTitle = assignmentSelect.value;
        const assignment = config.ASSIGNMENTS?.find(a => a.title === selectedTitle);
        if (assignment && assignmentHelpText) {
            assignmentHelpText.innerHTML = `
                <span class="text-brand-300 font-medium">${assignment.description}</span><br/>
                <span class="text-slate-500">Formats acceptés : ${assignment.typeLabel}</span>
            `;
        }
    }

    if (assignmentSelect) {
        populateAssignments();
        assignmentSelect.addEventListener('change', updateAssignmentHelp);
    }

    // 4. GESTION DES ONGLETS D'AUTHENTIFICATION
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            isRegisterMode = false;
            tabLogin.className = "flex-1 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white transition-all shadow";
            tabRegister.className = "flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-all";
            authFormTitle.textContent = "Connexion Étudiant";
            authSubmitText.textContent = "Se connecter";
            nameFieldContainer.classList.add('hidden');
            hideAlert(authAlert);
        });

        tabRegister.addEventListener('click', () => {
            isRegisterMode = true;
            tabRegister.className = "flex-1 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white transition-all shadow";
            tabLogin.className = "flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-all";
            authFormTitle.textContent = "Créer un Compte Étudiant";
            authSubmitText.textContent = "S'inscrire";
            nameFieldContainer.classList.remove('hidden');
            hideAlert(authAlert);
        });
    }

    // 5. GESTION DE L'AUTHENTIFICATION SUPABASE
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert(authAlert);

            if (!supabase) {
                showAlert(authAlert, "Veuillez renseigner vos clés Supabase dans config.js !", "error");
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
                    // INSCRIPTION
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { full_name: fullName }
                        }
                    });
                    if (error) throw error;
                    
                    if (data.session) {
                        showAlert(authAlert, "Compte créé avec succès ! Connexion automatique...", "success");
                    } else {
                        showAlert(authAlert, "Compte créé ! Veuillez vérifier vos emails pour confirmer votre compte (si l'option est activée dans Supabase).", "info");
                    }
                } else {
                    // CONNEXION
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });
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

    // Déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabase) {
                await supabase.auth.signOut();
            }
            currentUser = null;
            renderAuthUI(null);
            showToast("Déconnexion réussie.", "info");
        });
    }

    // Écoute des changements de session Auth
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            renderAuthUI(currentUser);
            if (currentUser) {
                fetchSubmissions();
                setupRealtimeSubscription();
            } else {
                teardownRealtimeSubscription();
            }
        });

        // Vérification initiale de session
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
        } else {
            authSection.classList.remove('hidden');
            studentDashboard.classList.add('hidden');
            authProfilePill.classList.add('hidden');
            authProfilePill.classList.remove('flex');
        }
        if (window.lucide) lucide.createIcons();
    }

    // 6. GESTION DU DRAG & DROP ET SÉLECTION DE FICHIER
    if (dropzone && fileInput) {
        // Clic pour ouvrir le sélecteur de fichier
        dropzone.addEventListener('click', (e) => {
            if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target)) {
                fileInput.click();
            }
        });

        // Drag & Drop events
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
            const files = dt.files;
            if (files && files.length > 0) {
                handleFileSelection(files[0]);
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
        const validExtensions = ['.py', '.ipynb', '.png', '.jpg', '.jpeg'];
        const fileName = file.name.toLowerCase();
        const isValidExt = validExtensions.some(ext => fileName.endsWith(ext));

        if (!isValidExt) {
            showAlert(uploadAlert, "Format non supporté ! Veuillez déposer un script Python (.py, .ipynb) ou une image (.png, .jpg).", "error");
            resetFileSelection();
            return;
        }

        // Limite de taille : 50 Mo
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            showAlert(uploadAlert, "Le fichier est trop volumineux (max 50 Mo).", "error");
            resetFileSelection();
            return;
        }

        selectedFile = file;
        previewFileName.textContent = file.name;
        previewFileSize.textContent = formatBytes(file.size);

        // Détection de l'icône selon le type
        if (fileName.endsWith('.py') || fileName.endsWith('.ipynb')) {
            fileTypeIcon.innerHTML = `<i data-lucide="file-code" class="w-5 h-5 text-indigo-400"></i>`;
        } else {
            fileTypeIcon.innerHTML = `<i data-lucide="image" class="w-5 h-5 text-purple-400"></i>`;
        }

        dropzoneEmpty.classList.add('hidden');
        dropzonePreview.classList.remove('hidden');
        submitDeliverableBtn.disabled = false;

        if (window.lucide) lucide.createIcons();
    }

    function resetFileSelection() {
        selectedFile = null;
        fileInput.value = '';
        dropzoneEmpty.classList.remove('hidden');
        dropzonePreview.classList.add('hidden');
        submitDeliverableBtn.disabled = true;
        if (window.lucide) lucide.createIcons();
    }

    // 7. TÉLÉVERSEMENT (UPLOAD) ET ENREGISTREMENT DE LA SOUMISSION
    if (submissionForm) {
        submissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert(uploadAlert);

            if (!currentUser) {
                showAlert(uploadAlert, "Vous devez être connecté pour soumettre un devoir.", "error");
                return;
            }

            if (!selectedFile) {
                showAlert(uploadAlert, "Veuillez sélectionner un fichier valide.", "error");
                return;
            }

            const assignmentName = assignmentSelect.value;
            const file = selectedFile;
            
            // Déterminer le type de fichier
            let fileType = 'python';
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.ipynb')) {
                fileType = 'jupyter';
            } else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
                fileType = 'image';
            }

            // Interface d'envoi
            submitDeliverableBtn.disabled = true;
            uploadProgressContainer.classList.remove('hidden');
            uploadProgressBar.style.width = '30%';
            uploadProgressPercent.textContent = '30%';
            uploadProgressLabel.textContent = 'Téléversement dans Supabase Storage...';

            try {
                // Nettoyage du nom de fichier
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${currentUser.id}/${Date.now()}_${sanitizedName}`;
                const bucketName = config.STORAGE_BUCKET || 'deliverables';

                // 1. Upload vers Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                uploadProgressBar.style.width = '70%';
                uploadProgressPercent.textContent = '70%';
                uploadProgressLabel.textContent = 'Enregistrement de la soumission...';

                // 2. Récupération de l'URL publique
                const { data: { publicUrl } } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(filePath);

                // 3. Insertion dans la table submissions (RLS garantit note = null & status = 'En cours')
                const { data: insertData, error: insertError } = await supabase
                    .from('submissions')
                    .insert({
                        student_id: currentUser.id,
                        student_email: currentUser.email,
                        assignment_name: assignmentName,
                        file_name: file.name,
                        file_url: publicUrl,
                        file_path: filePath,
                        file_type: fileType,
                        grade: null,
                        feedback: null,
                        status: 'En cours'
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                uploadProgressBar.style.width = '100%';
                uploadProgressPercent.textContent = '100%';
                uploadProgressLabel.textContent = 'Terminé avec succès !';

                showAlert(uploadAlert, `✅ Devoir pour "${assignmentName}" soumis avec succès ! L'enseignant va l'évaluer sous peu.`, "success");
                showToast(`Rendu pour "${assignmentName}" envoyé avec succès !`, "success");

                resetFileSelection();
                fetchSubmissions();

            } catch (err) {
                console.error("Erreur de soumission :", err);
                showAlert(uploadAlert, `Erreur lors de la soumission : ${err.message}`, "error");
            } finally {
                setTimeout(() => {
                    uploadProgressContainer.classList.add('hidden');
                    uploadProgressBar.style.width = '0%';
                }, 2500);
            }
        });
    }

    // 8. RÉCUPÉRATION ET RENDU DES SOUMISSIONS
    async function fetchSubmissions() {
        if (!supabase || !currentUser) return;

        try {
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('student_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            mySubmissions = data || [];
            renderSubmissionsTable(mySubmissions);
            updateStats(mySubmissions);

        } catch (err) {
            console.error("Erreur chargement soumissions :", err);
        }
    }

    function renderSubmissionsTable(submissions) {
        if (!submissionsTableBody) return;

        if (submissions.length === 0) {
            submissionsTableBody.innerHTML = `
                <tr id="emptySubmissionsRow">
                    <td colspan="4" class="py-12 text-center text-slate-500">
                        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
                        Aucun devoir soumis pour le moment.
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        submissionsTableBody.innerHTML = submissions.map(sub => {
            const isGraded = sub.status === 'Évalué';
            const gradeDisplay = isGraded && sub.grade !== null ? `${parseFloat(sub.grade).toFixed(1)}/20` : '--/20';
            const dateStr = new Date(sub.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Type icon & color
            let typeBadge = `<span class="inline-flex items-center gap-1 text-[11px] text-indigo-400"><i data-lucide="file-code" class="w-3.5 h-3.5"></i> ${sub.file_name}</span>`;
            if (sub.file_type === 'image') {
                typeBadge = `<span class="inline-flex items-center gap-1 text-[11px] text-purple-400"><i data-lucide="image" class="w-3.5 h-3.5"></i> ${sub.file_name}</span>`;
            }

            // Status badge
            const statusBadge = isGraded
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                     <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Évalué
                   </span>`
                : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                     <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> En cours
                   </span>`;

            // Grade badge
            const gradeBadge = isGraded && sub.grade !== null
                ? `<span class="text-sm font-bold font-display px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">${gradeDisplay}</span>`
                : `<span class="text-xs font-medium text-slate-500 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">${gradeDisplay}</span>`;

            // Feedback block (if any)
            const feedbackHtml = sub.feedback
                ? `<div class="mt-1 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                     <span class="font-semibold text-brand-300">Professeur :</span> ${escapeHtml(sub.feedback)}
                   </div>`
                : '';

            return `
                <tr class="hover:bg-slate-900/50 transition-colors group" id="submission-row-${sub.id}">
                    <td class="py-3.5 px-2 align-top">
                        <div class="font-semibold text-slate-200 text-xs">${escapeHtml(sub.assignment_name)}</div>
                        <div class="text-[10px] text-slate-500 mt-0.5">${dateStr}</div>
                        ${feedbackHtml}
                    </td>
                    <td class="py-3.5 px-2 align-top">
                        <a href="${sub.file_url}" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center gap-1">
                            ${typeBadge}
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

    function updateStats(submissions) {
        if (!statSubmittedCount || !statAverageGrade) return;
        statSubmittedCount.textContent = submissions.length;

        const graded = submissions.filter(s => s.status === 'Évalué' && s.grade !== null);
        if (graded.length > 0) {
            const sum = graded.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
            const avg = (sum / graded.length).toFixed(1);
            statAverageGrade.textContent = `${avg}/20`;
        } else {
            statAverageGrade.textContent = '--/20';
        }
    }

    if (refreshSubmissionsBtn) {
        refreshSubmissionsBtn.addEventListener('click', () => {
            fetchSubmissions();
            showToast("Liste des soumissions rafraîchie.", "info");
        });
    }

    // 9. CONFIGURATION DE SUPABASE REALTIME (ÉCOUTE DES MISES À JOUR DE NOTES)
    function setupRealtimeSubscription() {
        if (!supabase || !currentUser) return;
        teardownRealtimeSubscription();

        try {
            realtimeSubscription = supabase
                .channel('student-submissions-feed')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'submissions'
                }, (payload) => {
                    handleRealtimeChange(payload);
                })
                .subscribe((status) => {
                    console.log("[Supabase Realtime] Statut souscription :", status);
                });
        } catch (e) {
            console.error("Erreur initialisation Realtime :", e);
        }
    }

    function teardownRealtimeSubscription() {
        if (realtimeSubscription && supabase) {
            supabase.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }
    }

    function handleRealtimeChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // Vérifier si la modification concerne l'étudiant connecté
        if (newRecord && newRecord.student_id !== currentUser?.id) {
            return;
        }

        console.log(`[Supabase Realtime] Événement reçu (${eventType}) :`, payload);

        if (eventType === 'UPDATE') {
            // Mise à jour locale du tableau
            const index = mySubmissions.findIndex(s => s.id === newRecord.id);
            if (index !== -1) {
                const oldSub = mySubmissions[index];
                mySubmissions[index] = newRecord;
                renderSubmissionsTable(mySubmissions);
                updateStats(mySubmissions);

                // Si la note a été publiée ou modifiée
                if (newRecord.status === 'Évalué' && newRecord.grade !== null) {
                    const gradeVal = parseFloat(newRecord.grade).toFixed(1);
                    const toastMsg = `🎉 Votre travail pour "${newRecord.assignment_name}" a été noté : ${gradeVal}/20 !`;
                    showToast(toastMsg, "success", 8000);

                    // Déclenchement de confettis si la note est positive (>= 10)
                    if (parseFloat(newRecord.grade) >= 10 && window.confetti) {
                        confetti({
                            particleCount: 80,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                    }
                }
            }
        } else if (eventType === 'INSERT') {
            if (!mySubmissions.some(s => s.id === newRecord.id)) {
                mySubmissions.unshift(newRecord);
                renderSubmissionsTable(mySubmissions);
                updateStats(mySubmissions);
            }
        }
    }

    // 10. UTILITAIRES D'INTERFACE (Alertes, Toasts, Formatage)
    function showAlert(elem, msg, type = 'error') {
        if (!elem) return;
        elem.classList.remove('hidden', 'bg-red-500/10', 'border-red-500/30', 'text-red-400', 'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400', 'bg-blue-500/10', 'border-blue-500/30', 'text-blue-400');
        
        let iconName = 'alert-circle';
        if (type === 'success') {
            elem.classList.add('bg-emerald-500/10', 'border', 'border-emerald-500/30', 'text-emerald-300');
            iconName = 'check-circle-2';
        } else if (type === 'info') {
            elem.classList.add('bg-blue-500/10', 'border', 'border-blue-500/30', 'text-blue-300');
            iconName = 'info';
        } else {
            elem.classList.add('bg-red-500/10', 'border', 'border-red-500/30', 'text-red-300');
            iconName = 'alert-triangle';
        }

        elem.innerHTML = `
            <i data-lucide="${iconName}" class="w-4 h-4 mt-0.5 flex-shrink-0"></i>
            <span>${escapeHtml(msg)}</span>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function hideAlert(elem) {
        if (elem) elem.classList.add('hidden');
    }

    function showToast(message, type = 'info', duration = 5000) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `p-4 rounded-xl shadow-2xl glass-panel border flex items-start space-x-3 pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 text-xs ${
            type === 'success' ? 'border-emerald-500/40 text-emerald-200' : 'border-brand-500/40 text-slate-200'
        }`;

        const icon = type === 'success' ? 'check-circle' : 'bell';
        toast.innerHTML = `
            <div class="p-1 rounded-lg ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-500/20 text-brand-400'}">
                <i data-lucide="${icon}" class="w-4 h-4"></i>
            </div>
            <div class="flex-1 font-medium">${escapeHtml(message)}</div>
            <button class="text-slate-500 hover:text-white" onclick="this.parentElement.remove()">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        `;

        toastContainer.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        // Animation d'entrée
        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        }, 50);

        // Disparition automatique
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 Octet';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
});
