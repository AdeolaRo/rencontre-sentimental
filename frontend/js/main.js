document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'login.html';

    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    const logoutBtn = document.getElementById('logoutBtn');

    // ... (code existant, gardez la partie navigation et autres)

// Ajoutez après la déclaration des variables existantes
const matchesSection = document.getElementById('matches');
const matchesList = document.getElementById('matchesList');

// Dans la navigation, gérez l'affichage de la section matches
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        if (targetId === 'matching') loadMatchingProfiles();
        if (targetId === 'explore') loadExploreProfiles(1);
        if (targetId === 'profile') loadMyProfile();
        if (targetId === 'matches') loadMatches();
    });
});

// Fonction pour charger les matchs
async function loadMatches() {
    try {
        const matches = await API.getMyMatches();
        displayMatches(matches);
    } catch (e) {
        console.error(e);
        matchesList.innerHTML = '<p class="error">Erreur de chargement</p>';
    }
}

function displayMatches(matches) {
    matchesList.innerHTML = '';
    if (matches.length === 0) {
        matchesList.innerHTML = '<p class="text-center">Vous n\'avez pas encore de matchs.</p>';
        return;
    }
    
    matches.forEach(m => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
            <img src="${m.otherPhoto}" alt="${m.otherName}" class="profile-image">
            <div class="profile-info">
                <h3 class="profile-name">${m.otherName}</h3>
                <p class="profile-status">Statut: ${m.status}</p>
                ${m.status === 'pending' ? `
                    <div class="profile-actions">
                        <button class="btn btn-success accept-match" data-match-id="${m.matchId}">Accepter</button>
                        <button class="btn btn-danger reject-match" data-match-id="${m.matchId}">Refuser</button>
                    </div>
                ` : ''}
                ${m.status === 'accepted' && !m.alreadyValidated && m.canValidate ? `
                    <button class="btn btn-primary validate-match" data-match-id="${m.matchId}" data-other-id="${m.otherUserId}">Valider la rencontre</button>
                ` : ''}
                ${m.alreadyValidated ? '<p class="text-success">Rencontre validée ✓</p>' : ''}
            </div>
        `;
        matchesList.appendChild(card);
    });
    
    // Attacher les événements
    document.querySelectorAll('.accept-match').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const matchId = btn.dataset.matchId;
            try {
                await API.acceptMatch(matchId);
                alert('Match accepté !');
                loadMatches(); // Recharger
            } catch (err) {
                alert(err.message);
            }
        });
    });
    
    document.querySelectorAll('.reject-match').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const matchId = btn.dataset.matchId;
            if (confirm('Voulez-vous vraiment refuser ce match ?')) {
                try {
                    await API.rejectMatch(matchId);
                    alert('Match refusé');
                    loadMatches();
                } catch (err) {
                    alert(err.message);
                }
            }
        });
    });
    
    document.querySelectorAll('.validate-match').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const matchId = btn.dataset.matchId;
            const otherId = btn.dataset.otherId;
            openValidationModal(matchId, otherId);
        });
    });
}

// Modal de validation en 3 étapes
let currentMatchId, currentOtherId;

async function openValidationModal(matchId, otherId) {
    currentMatchId = matchId;
    currentOtherId = otherId;
    
    // Récupérer la question secrète
    try {
        const data = await API.getSecretQuestion(otherId);
        const question = data.secretQuestion;
        
        // Construire le HTML du modal
        const modal = document.getElementById('validationModal');
        const stepsDiv = document.getElementById('validationSteps');
        stepsDiv.innerHTML = `
            <div class="step active" id="step1">
                <h3>Étape 1 : Confirmer la rencontre</h3>
                <p>Avez-vous rencontré cette personne en vrai ?</p>
                <div class="step-options">
                    <button class="btn btn-success" id="confirmYes">Oui</button>
                    <button class="btn btn-danger" id="confirmNo">Non</button>
                </div>
            </div>
            <div class="step" id="step2">
                <h3>Étape 2 : Question secrète</h3>
                <p><strong>Question :</strong> ${question}</p>
                <input type="text" id="secretAnswer" placeholder="Votre réponse" class="form-control">
                <button class="btn btn-primary" id="submitSecret">Valider</button>
            </div>
            <div class="step" id="step3">
                <h3>Étape 3 : Badges comportementaux</h3>
                <p>Sélectionnez jusqu'à 3 badges :</p>
                <div class="badges-selection" id="badgesSelection"></div>
                <button class="btn btn-success" id="submitValidation">Terminer</button>
            </div>
        `;
        
        // Initialiser les badges
        const badgesContainer = document.getElementById('badgesSelection');
        const badgesList = [
            'Respectueux(se)',
            'Communication naturelle',
            'Ponctuel(le)',
            'Conflant/Apaisant',
            'Correspond au CV sentimental',
            'Relationnel fluide',
            'Bonne énergie'
        ];
        badgesContainer.innerHTML = badgesList.map(b => `
            <div class="badge-option" data-badge="${b}">${b}</div>
        `).join('');
        
        // Variables d'état
        let hasMet = false;
        let selectedBadges = [];
        
        // Gestion étape 1
        document.getElementById('confirmYes').addEventListener('click', () => {
            hasMet = true;
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
        });
        document.getElementById('confirmNo').addEventListener('click', () => {
            hasMet = false;
            // Si non, on peut directement soumettre sans badges
            submitValidation(false, []);
        });
        
        // Gestion étape 2
        document.getElementById('submitSecret').addEventListener('click', () => {
            const answer = document.getElementById('secretAnswer').value.trim();
            if (!answer) {
                alert('Veuillez entrer une réponse');
                return;
            }
            // On stocke la réponse pour l'étape 3
            window.tempSecretAnswer = answer;
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
        });
        
        // Sélection des badges
        badgesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('badge-option')) {
                const badge = e.target.dataset.badge;
                if (selectedBadges.includes(badge)) {
                    selectedBadges = selectedBadges.filter(b => b !== badge);
                    e.target.classList.remove('selected');
                } else if (selectedBadges.length < 3) {
                    selectedBadges.push(badge);
                    e.target.classList.add('selected');
                }
            }
        });
        
        // Soumission finale
        document.getElementById('submitValidation').addEventListener('click', async () => {
            await submitValidation(hasMet, selectedBadges, window.tempSecretAnswer);
        });
        
        modal.style.display = 'block';
    } catch (e) {
        alert('Erreur : ' + e.message);
    }
}

async function submitValidation(hasMet, badges, secretAnswer) {
    try {
        const data = {
            matchId: currentMatchId,
            hasMet: hasMet,
            secretAnswer: secretAnswer || '',
            badges: badges
        };
        const result = await API.validateEncounter(data);
        alert('Validation enregistrée !');
        document.getElementById('validationModal').style.display = 'none';
        loadMatches(); // Recharger la liste des matchs
    } catch (e) {
        alert('Erreur : ' + e.message);
    }
}

// Fermer le modal
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('validationModal').style.display = 'none';
    });
});
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            if (targetId === 'matching') loadMatchingProfiles();
            if (targetId === 'explore') loadExploreProfiles(1);
            if (targetId === 'profile') loadMyProfile();
        });
    });

    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    // Éléments DOM
    const matchingProfiles = document.getElementById('matchingProfiles');
    const exploreProfiles = document.getElementById('exploreProfiles');
    const profileContainer = document.getElementById('profileContainer');
    
    // Modals
    const profileModal = document.getElementById('profileModal');
    const validationModal = document.getElementById('validationModal');
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none'));

    // Filtres
    document.getElementById('applyFilters').addEventListener('click', () => loadExploreProfiles(1));
    document.getElementById('prevPage').addEventListener('click', () => { /* implémenter pagination */ });
    document.getElementById('nextPage').addEventListener('click', () => { /* implémenter pagination */ });

    async function loadMatchingProfiles() {
        try {
            const data = await API.getMatchingProfiles();
            displayProfiles(data, matchingProfiles, true);
        } catch(e) { console.error(e); }
    }

    async function loadExploreProfiles(page) {
        try {
            const dept = document.getElementById('exploreDepartment').value;
            const city = document.getElementById('exploreCity').value;
            const data = await API.getExploreProfiles(page, { department: dept, city });
            displayProfiles(data.profiles, exploreProfiles, false);
            document.getElementById('pageInfo').textContent = `Page ${data.page}/${data.totalPages}`;
        } catch(e) { console.error(e); }
    }

    function displayProfiles(profiles, container, showMatchBtn) {
        container.innerHTML = '';
        profiles.forEach(p => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `
                <img src="${p.main_photo || 'images/default-avatar.jpg'}" alt="${p.first_name}" class="profile-image">
                <div class="profile-score">${p.profile_score || 0} pts</div>
                <div class="profile-info">
                    <h3 class="profile-name">${p.first_name} ${p.last_name}</h3>
                    <p class="profile-location"><i class="fas fa-map-marker-alt"></i> ${p.city}, ${p.department}</p>
                    <p class="profile-title">${p.title}</p>
                    <div class="profile-actions">
                        ${showMatchBtn ? `<button class="btn btn-primary match-btn" data-id="${p.id}"><i class="fas fa-heart"></i> Matcher</button>` : ''}
                        <button class="btn btn-secondary view-profile-btn" data-id="${p.id}"><i class="fas fa-eye"></i> Voir</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Attacher événements
        container.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', () => openProfileModal(btn.dataset.id));
        });
        if (showMatchBtn) {
            container.querySelectorAll('.match-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await API.createMatch(btn.dataset.id);
                        alert('Match envoyé !');
                        btn.disabled = true;
                    } catch(e) { alert(e.message); }
                });
            });
        }
    }

    async function openProfileModal(userId) {
        try {
            const data = await API.getProfile(userId);
            const content = document.getElementById('modalProfileContent');
            content.innerHTML = `
                <div class="modal-profile-header">
                    <img src="${data.photos[0]?.photo_url || 'images/default-avatar.jpg'}" style="width:150px; height:150px; border-radius:50%; object-fit:cover;">
                    <h2>${data.user.first_name} ${data.user.last_name}</h2>
                    <p>${data.user.city}, ${data.user.department}</p>
                </div>
                <div class="modal-profile-body">
                    <h3>À propos</h3>
                    <p>${data.user.description || 'Aucune description'}</p>
                    <h3>Photos</h3>
                    <div class="gallery">
                        ${data.photos.map(ph => `<img src="${ph.photo_url}" alt="Photo">`).join('')}
                    </div>
                    <h3>Commentaires</h3>
                    ${data.comments.map(c => `
                        <div class="comment">
                            <strong>${c.first_name} ${c.last_name}:</strong>
                            <p>${c.comment}</p>
                            <small>${new Date(c.created_at).toLocaleDateString()}</small>
                        </div>
                    `).join('') || '<p>Aucun commentaire</p>'}
                    <button class="btn btn-primary" id="validateFromModal" data-id="${userId}">Valider une rencontre</button>
                </div>
            `;
            profileModal.style.display = 'block';
            document.getElementById('validateFromModal').addEventListener('click', () => {
                profileModal.style.display = 'none';
                openValidationModal(userId);
            });
        } catch(e) { console.error(e); }
    }

    async function loadMyProfile() {
        try {
            const data = await API.getMyProfile();
            profileContainer.innerHTML = `
                <div class="profile-header">
                    <div class="profile-avatar">
                        <img src="${data.photos.find(p => p.is_main)?.photo_url || 'images/default-avatar.jpg'}" alt="Photo">
                    </div>
                    <div class="profile-info">
                        <h1>${data.user.first_name} ${data.user.last_name}</h1>
                        <p><i class="fas fa-map-marker-alt"></i> ${data.user.city}, ${data.user.department}</p>
                        <h2>${data.user.title}</h2>
                        <p>${data.user.description || ''}</p>
                        <div class="profile-badges">
                            <span class="badge">Score: ${data.user.profile_score}</span>
                            ${data.user.is_verified ? '<span class="badge verified">Vérifié</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="profile-content">
                    <div class="photos-gallery">
                        <h3>Mes photos</h3>
                        <div class="gallery">
                            ${data.photos.map(ph => `<img src="${ph.photo_url}" alt="Photo">`).join('')}
                        </div>
                        <input type="file" id="photoUpload" accept="image/*">
                        <button class="btn btn-secondary" id="uploadPhotoBtn">Ajouter une photo</button>
                    </div>
                    <div class="questionnaire-section">
                        <h3>À propos de moi</h3>
                        <div class="questionnaire-grid">
                            <div class="question-item"><h4>Personnalité</h4><p>${data.user.personality || 'Non renseigné'}</p></div>
                            <div class="question-item"><h4>Passions</h4><p>${data.user.passions || 'Non renseigné'}</p></div>
                            <div class="question-item"><h4>Musique</h4><p>${data.user.music_tastes || 'Non renseigné'}</p></div>
                            <div class="question-item"><h4>Style</h4><p>${data.user.style || 'Non renseigné'}</p></div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('uploadPhotoBtn').addEventListener('click', uploadPhoto);
        } catch(e) { console.error(e); }
    }

    async function uploadPhoto() {
        const fileInput = document.getElementById('photoUpload');
        if (!fileInput.files[0]) return alert('Sélectionnez une photo');
        const formData = new FormData();
        formData.append('photo', fileInput.files[0]);
        formData.append('isMain', 'false');
        try {
            await API.uploadPhoto(formData);
            alert('Photo ajoutée');
            loadMyProfile();
        } catch(e) { alert(e.message); }
    }

    function openValidationModal(targetUserId) {
        // Implémentez la logique de validation en 3 étapes
        // Pour simplifier, on affiche juste un prompt pour l'instant
        alert('Fonctionnalité de validation à implémenter');
    }

    // Initial load
    loadMatchingProfiles();
});