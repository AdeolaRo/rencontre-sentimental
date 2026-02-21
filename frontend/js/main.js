// frontend/js/main.js
document.addEventListener('DOMContentLoaded', async function() {
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Fonction de notification discrète
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            animation-fill-mode: forwards;
        `;
        
        // Ajouter les animations CSS si elles n'existent pas déjà
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Fonction de confirmation modale
    function showConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                border-radius: var(--radius);
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                box-shadow: var(--shadow-lg);
                animation: fadeIn 0.3s;
            `;
            
            content.innerHTML = `
                <h3 style="margin-bottom: 1rem; color: var(--text);">Confirmation</h3>
                <p style="margin-bottom: 1.5rem; color: var(--text-light);">${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button class="btn btn-secondary" id="confirmCancel">Annuler</button>
                    <button class="btn btn-danger" id="confirmOk">Confirmer</button>
                </div>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            // Gérer les clics
            document.getElementById('confirmCancel').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            document.getElementById('confirmOk').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
            
            // Fermer en cliquant en dehors
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            });
        });
    }

    // Éléments DOM

    // Éléments DOM
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    const logoutBtn = document.getElementById('logoutBtn');
    const matchingProfiles = document.getElementById('matchingProfiles');
    const exploreProfiles = document.getElementById('exploreProfiles');
    const matchesList = document.getElementById('matchesList');
    const profileContainer = document.getElementById('profileContainer');
    
    // Filtres
    const matchingDept = document.getElementById('matchingDepartment');
    const matchingCity = document.getElementById('matchingCity');
    const exploreDept = document.getElementById('exploreDepartment');
    const exploreCity = document.getElementById('exploreCity');
    const searchInput = document.getElementById('searchInput');
    const applyFilters = document.getElementById('applyFilters');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    let currentExplorePage = 1;
    let totalExplorePages = 1;

    // Charger les départements au démarrage
    await loadDepartments();

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
            if (targetId === 'matches') loadMatches();
        });
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
    });

    // Gestion des filtres département -> ville
    matchingDept.addEventListener('change', () => loadCities(matchingDept.value, matchingCity));
    exploreDept.addEventListener('change', () => loadCities(exploreDept.value, exploreCity));

    // Filtres explore
    applyFilters.addEventListener('click', () => {
        currentExplorePage = 1;
        loadExploreProfiles(1);
    });

    // Pagination
    prevPage.addEventListener('click', () => {
        if (currentExplorePage > 1) {
            currentExplorePage--;
            loadExploreProfiles(currentExplorePage);
        }
    });
    nextPage.addEventListener('click', () => {
        if (currentExplorePage < totalExplorePages) {
            currentExplorePage++;
            loadExploreProfiles(currentExplorePage);
        }
    });

    // Initial load
    loadMatchingProfiles();

    // Fonctions
    async function loadDepartments() {
        try {
            const refs = await API.getReferences();
            const depts = refs.departements;
            const options = depts.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
            matchingDept.innerHTML = '<option value="">Tous les départements</option>' + options;
            exploreDept.innerHTML = '<option value="">Département</option>' + options;
        } catch (e) {
            console.error('Erreur chargement départements', e);
        }
    }

    async function loadCities(deptCode, selectElement) {
        if (!deptCode) {
            selectElement.innerHTML = '<option value="">Toutes les villes</option>';
            selectElement.disabled = true;
            return;
        }
        try {
            const villes = await API.getReferences('villes', deptCode);
            const options = villes.map(v => `<option value="${v}">${v}</option>`).join('');
            selectElement.innerHTML = '<option value="">Toutes les villes</option>' + options;
            selectElement.disabled = false;
        } catch (e) {
            console.error('Erreur chargement villes', e);
        }
    }

    async function loadMatchingProfiles() {
        try {
            const dept = matchingDept.value;
            const city = matchingCity.value;
            const filters = {};
            if (dept) filters.department = dept;
            if (city) filters.city = city;
            const profiles = await API.getMatchingProfiles(filters);
            displayProfiles(profiles, matchingProfiles, true);
        } catch (e) {
            console.error(e);
            matchingProfiles.innerHTML = '<p class="error">Erreur de chargement</p>';
        }
    }

    async function loadExploreProfiles(page) {
        try {
            const dept = exploreDept.value;
            const city = exploreCity.value;
            const search = searchInput.value;
            const filters = {};
            if (dept) filters.department = dept;
            if (city) filters.city = city;
            if (search) filters.search = search;
            const data = await API.getExploreProfiles(page, filters);
            displayProfiles(data.profiles, exploreProfiles, false);
            totalExplorePages = data.totalPages;
            pageInfo.textContent = `Page ${data.page}/${data.totalPages}`;
        } catch (e) {
            console.error(e);
            exploreProfiles.innerHTML = '<p class="error">Erreur de chargement</p>';
        }
    }

    // Fonction utilitaire pour recharger la section active
    function reloadCurrentSection() {
        const activeId = document.querySelector('.section.active').id;
        if (activeId === 'matching') loadMatchingProfiles();
        else if (activeId === 'explore') loadExploreProfiles(currentExplorePage);
    }

    function displayProfiles(profiles, container, showMatchBtn) {
        container.innerHTML = '';
        if (profiles.length === 0) {
            container.innerHTML = '<p class="text-center">Aucun profil trouvé</p>';
            return;
        }
        profiles.forEach(p => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.style.cursor = 'pointer'; // Rendre le curseur en forme de main
            card.dataset.id = p.id; // Stocker l'ID dans la carte
            card.innerHTML = `
                <img src="${API.getPhotoUrl(p.main_photo)}" alt="${p.first_name}" class="profile-image">
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
            
            // Rendre toute la carte cliquable
            card.addEventListener('click', (e) => {
                // Ne pas déclencher si on clique sur un bouton
                if (!e.target.closest('.profile-actions')) {
                    openProfileModal(p.id);
                }
            });
        });

        // Attacher événements
        container.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openProfileModal(btn.dataset.id);
            });
        });
        if (showMatchBtn) {
            container.querySelectorAll('.match-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            try {
                                await API.createMatch(btn.dataset.id);
                                showNotification('Match envoyé !');
                                btn.disabled = true;
                            } catch (err) {
                                showNotification(err.message, 'error');
                            }
                        });
            });
        }
    }

    async function openProfileModal(userId) {
        try {
            const data = await API.getProfile(userId);
            const content = document.getElementById('modalProfileContent');
            // Vérifier si on a déjà liké/disliké cette personne (à faire avec une API dédiée)
            // Pour simplifier, on ne gère pas ici
            content.innerHTML = `
                <div class="modal-profile-header" style="display: flex; gap: 2rem; align-items: center; margin-bottom: 2rem;">
                    <img src="${API.getPhotoUrl(data.photos[0]?.photo_url)}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h2>${data.user.first_name} ${data.user.last_name}</h2>
                        <p><i class="fas fa-map-marker-alt"></i> ${data.user.city}, ${data.user.department}</p>
                        <p>${data.user.title}</p>
                    </div>
                </div>
                <div class="modal-profile-body">
                    <h3>À propos</h3>
                    <p>${data.user.description || 'Aucune description'}</p>
                    
                    <h3>Photos</h3>
                    <div class="gallery">
                        ${data.photos.map(ph => `<img src="${API.getPhotoUrl(ph.photo_url)}" alt="Photo">`).join('')}
                    </div>
                    
                    <h3>Détails</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Emploi:</strong> ${data.user.emploi || 'Non renseigné'}</li>
                        <li><strong>Recherche:</strong> ${data.user.looking_for || 'Non renseigné'}</li>
                        <li><strong>Taille:</strong> ${data.user.taille || 'Non renseigné'}</li>
                        <li><strong>Enfant:</strong> ${data.user.enfant || 'Non renseigné'}</li>
                        <li><strong>Alcool:</strong> ${data.user.alcool || 'Non renseigné'}</li>
                        <li><strong>Cigarette:</strong> ${data.user.cigarette || 'Non renseigné'}</li>
                        <li><strong>Sexualité:</strong> ${data.user.sexualite || 'Non renseigné'}</li>
                        <li><strong>Animaux:</strong> ${data.user.animaux || 'Non renseigné'}</li>
                        <li><strong>Centres d'intérêt:</strong> ${data.user.centre_interet || 'Non renseigné'}</li>
                    </ul>
                    
                    <h3>Questionnaire</h3>
                    <ul>
                        <li><strong>Personnalité:</strong> ${data.user.personality || 'Non renseigné'}</li>
                        <li><strong>Passions:</strong> ${data.user.passions || 'Non renseigné'}</li>
                        <li><strong>Musique:</strong> ${data.user.music_tastes || 'Non renseigné'}</li>
                        <li><strong>Style:</strong> ${data.user.style || 'Non renseigné'}</li>
                    </ul>
                    
                    <h3>Commentaires</h3>
                    ${data.comments.map(c => `
                        <div class="comment" style="border-bottom: 1px solid var(--border); padding: 1rem 0;">
                            <strong>${c.first_name} ${c.last_name}:</strong>
                            <p>${c.comment}</p>
                            <small>${new Date(c.created_at).toLocaleDateString()}</small>
                        </div>
                    `).join('') || '<p>Aucun commentaire</p>'}
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button class="btn btn-success" id="likeFromModal" data-id="${userId}"><i class="fas fa-heart"></i> Like</button>
                        <button class="btn btn-danger" id="dislikeFromModal" data-id="${userId}"><i class="fas fa-times"></i> Dislike</button>
                        <button class="btn btn-primary" id="validateFromModal" data-id="${userId}">Valider rencontre</button>
                    </div>
                </div>
            `;
            document.getElementById('profileModal').style.display = 'block';

            document.getElementById('likeFromModal').addEventListener('click', async () => {
                try {
                    await API.likeUser(userId);
                    showNotification('Like enregistré');
                    document.getElementById('profileModal').style.display = 'none';
                    reloadCurrentSection();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            });
            document.getElementById('dislikeFromModal').addEventListener('click', async () => {
                try {
                    await API.dislikeUser(userId);
                    showNotification('Dislike enregistré');
                    document.getElementById('profileModal').style.display = 'none';
                    reloadCurrentSection();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            });
            document.getElementById('validateFromModal').addEventListener('click', () => {
                document.getElementById('profileModal').style.display = 'none';
                // Ouvrir le modal de validation avec l'ID de l'autre utilisateur (mais il faut un matchId)
                showNotification('Fonctionnalité à implémenter : besoin du matchId', 'info');
            });
        } catch (e) {
            console.error(e);
        }
    }

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
            card.dataset.userId = m.otherUserId; // pour ouvrir le profil
            card.innerHTML = `
                <img src="${API.getPhotoUrl(m.otherPhoto)}" alt="${m.otherName}" class="profile-image">
                <div class="profile-info">
                    <h3 class="profile-name">${m.otherName}</h3>
                    <p class="profile-status">Statut: ${m.status}</p>
                    <div class="profile-actions">
                        ${m.status === 'pending' ? `
                            <button class="btn btn-success accept-match" data-match-id="${m.matchId}">Accepter</button>
                            <button class="btn btn-danger reject-match" data-match-id="${m.matchId}">Refuser</button>
                        ` : ''}
                        ${m.status === 'accepted' && !m.alreadyValidated && m.canValidate ? `
                            <button class="btn btn-primary validate-match" data-match-id="${m.matchId}" data-other-id="${m.otherUserId}">Valider la rencontre</button>
                        ` : ''}
                        ${m.alreadyValidated ? '<span class="badge">Rencontre validée ✓</span>' : ''}
                    </div>
                </div>
            `;
            
            // Ouvrir le profil au clic sur la carte (sauf si on clique sur un bouton)
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn')) {
                    openProfileModal(m.otherUserId);
                }
            });
            
            matchesList.appendChild(card);
        });

        // Attacher les événements aux boutons (comme avant)
        document.querySelectorAll('.accept-match').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const matchId = btn.dataset.matchId;
                try {
                    await API.acceptMatch(matchId);
                    showNotification('Match accepté !');
                    loadMatches();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            });
        });
        
        document.querySelectorAll('.reject-match').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const matchId = btn.dataset.matchId;
                const confirmed = await showConfirm('Voulez-vous vraiment refuser ce match ?');
                if (confirmed) {
                    try {
                        await API.rejectMatch(matchId);
                        showNotification('Match refusé');
                        loadMatches();
                    } catch (err) {
                        showNotification(err.message, 'error');
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

    async function loadMyProfile() {
        try {
            const data = await API.getMyProfile();
            displayMyProfile(data);
        } catch (e) {
            console.error(e);
            profileContainer.innerHTML = '<p class="error">Erreur de chargement</p>';
        }
    }

    function displayMyProfile(data) {
        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <img src="${API.getPhotoUrl(data.photos.find(p => p.is_main)?.photo_url)}" alt="Photo">
                </div>
                <div class="profile-info">
                    <h1>${data.user.first_name} ${data.user.last_name}</h1>
                    <p><i class="fas fa-map-marker-alt"></i> ${data.user.city}, ${data.user.department}</p>
                    <h2>${data.user.title}</h2>
                    <p>${data.user.description || ''}</p>
                    <div class="profile-badges">
                        <span class="badge-profile">Score: ${data.user.profile_score}</span>
                        ${data.user.is_verified ? '<span class="badge-profile verified">Vérifié</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="profile-content">
                <div class="photos-gallery profile-edit-section">
                    <h3>Mes photos (max 8)</h3>
                    <div class="gallery" id="myPhotoGallery">
                        ${data.photos.map(ph => `<img src="${API.getPhotoUrl(ph.photo_url)}" alt="Photo">`).join('')}
                    </div>
                    <input type="file" id="photoUpload" accept="image/*">
                    <button class="btn btn-secondary" id="uploadPhotoBtn">Ajouter une photo</button>
                </div>
                
                <div class="questionnaire-section profile-edit-section">
                    <h3>À propos de moi</h3>
                    <div class="profile-details">
                        <p><strong>Emploi:</strong> ${data.user.emploi || 'Non renseigné'}</p>
                        <p><strong>Recherche:</strong> ${data.user.looking_for || 'Non renseigné'}</p>
                        <p><strong>Taille:</strong> ${data.user.taille || 'Non renseigné'}</p>
                        <p><strong>Enfant:</strong> ${data.user.enfant || 'Non renseigné'}</p>
                        <p><strong>Alcool:</strong> ${data.user.alcool || 'Non renseigné'}</p>
                        <p><strong>Cigarette:</strong> ${data.user.cigarette || 'Non renseigné'}</p>
                        <p><strong>Sexualité:</strong> ${data.user.sexualite || 'Non renseigné'}</p>
                        <p><strong>Animaux:</strong> ${data.user.animaux || 'Non renseigné'}</p>
                        <p><strong>Centres d'intérêt:</strong> ${data.user.centre_interet || 'Non renseigné'}</p>
                        <p><strong>Personnalité:</strong> ${data.user.personality || 'Non renseigné'}</p>
                        <p><strong>Passions:</strong> ${data.user.passions || 'Non renseigné'}</p>
                        <p><strong>Musique:</strong> ${data.user.music_tastes || 'Non renseigné'}</p>
                        <p><strong>Style:</strong> ${data.user.style || 'Non renseigné'}</p>
                    </div>
                    <div style="text-align: center; margin-top: 1rem;">
                        <button class="btn btn-primary btn-sm" id="editProfileBtn">Modifier mon profil</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('uploadPhotoBtn').addEventListener('click', uploadPhoto);
        document.getElementById('editProfileBtn').addEventListener('click', () => showEditProfileModal(data));
    }

    async function uploadPhoto() {
        const fileInput = document.getElementById('photoUpload');
        if (!fileInput.files[0]) {
            showNotification('Sélectionnez une photo', 'info');
            return;
        }
        const formData = new FormData();
        formData.append('photo', fileInput.files[0]);
        formData.append('isMain', 'false');
        try {
            await API.uploadPhoto(formData);
            showNotification('Photo ajoutée');
            loadMyProfile();
        } catch (e) {
            showNotification(e.message, 'error');
        }
    }

    async function showEditProfileModal(data) {
        const refs = await API.getReferences();
        const modal = document.getElementById('editProfileModal');
        const form = document.getElementById('editProfileForm');
        form.innerHTML = `
            <div class="profile-edit-section">
                <h3>Informations de base</h3>
                <div class="form-group"><label>Prénom</label><input type="text" name="firstName" value="${data.user.first_name}"></div>
                <div class="form-group"><label>Nom</label><input type="text" name="lastName" value="${data.user.last_name}"></div>
                <div class="form-group"><label>Ville</label><input type="text" name="city" value="${data.user.city}"></div>
                <div class="form-group"><label>Département</label>
                    <select name="department">${refs.departements.map(d => `<option value="${d.code}" ${d.code == data.user.department ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Titre</label><input type="text" name="title" value="${data.user.title}"></div>
                <div class="form-group"><label>Description</label><textarea name="description">${data.user.description || ''}</textarea></div>
            </div>
            <div class="profile-edit-section">
                <h3>À propos de moi</h3>
                <div class="form-group"><label>Emploi</label><input type="text" name="emploi" value="${data.user.emploi || ''}"></div>
                <div class="form-group"><label>Je cherche</label>
                    <select name="looking_for">${refs.looking_for.map(l => `<option value="${l}" ${data.user.looking_for == l ? 'selected' : ''}>${l}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Taille</label><input type="text" name="taille" value="${data.user.taille || ''}"></div>
                <div class="form-group"><label>Enfant</label>
                    <select name="enfant">${refs.enfant.map(e => `<option value="${e}" ${data.user.enfant == e ? 'selected' : ''}>${e}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Alcool</label>
                    <select name="alcool">${refs.alcool.map(a => `<option value="${a}" ${data.user.alcool == a ? 'selected' : ''}>${a}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Cigarette</label>
                    <select name="cigarette">${refs.cigarette.map(c => `<option value="${c}" ${data.user.cigarette == c ? 'selected' : ''}>${c}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Sexualité</label>
                    <select name="sexualite">${refs.sexualites.map(s => `<option value="${s}" ${data.user.sexualite == s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Animaux</label>
                    <select name="animaux" id="animauxSelect">${refs.animaux.map(a => `<option value="${a}" ${data.user.animaux == a ? 'selected' : ''}>${a}</option>`).join('')}</select>
                    <input type="text" name="animaux_autre" placeholder="Précisez" style="display:none; margin-top:0.5rem;" value="${data.user.animaux && !refs.animaux.includes(data.user.animaux) ? data.user.animaux : ''}">
                </div>
                <div class="form-group"><label>Centres d'intérêt</label><input type="text" name="centre_interet" value="${data.user.centre_interet || ''}"></div>
            </div>
            <div class="profile-edit-section">
                <h3>Questionnaire</h3>
                <div class="form-group"><label>Personnalité</label>
                    <select name="personality">${refs.personnalites.map(p => `<option value="${p}" ${data.user.personality == p ? 'selected' : ''}>${p}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Passions</label><input type="text" name="passions" value="${data.user.passions || ''}"></div>
                <div class="form-group">
                    <label>Musique</label>
                    <input type="text" name="music_tastes" value="${data.user.music_tastes || ''}" placeholder="Vos genres musicaux préférés">
                </div>
                <div class="form-group"><label>Style</label>
                    <select name="style">${refs.styles.map(s => `<option value="${s}" ${data.user.style == s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        `;

        // Gestion du champ "autre" pour animaux
        const animauxSelect = form.querySelector('#animauxSelect');
        const animauxAutre = form.querySelector('input[name="animaux_autre"]');
        animauxSelect.addEventListener('change', () => {
            if (animauxSelect.value === 'autre') {
                animauxAutre.style.display = 'block';
            } else {
                animauxAutre.style.display = 'none';
            }
        });
        if (animauxSelect.value === 'autre') animauxAutre.style.display = 'block';

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            // Gérer le cas "autre" pour animaux
            if (data.animaux === 'autre' && data.animaux_autre) {
                data.animaux = data.animaux_autre;
            }
            delete data.animaux_autre;
            try {
                await API.updateProfile(data);
                showNotification('Profil mis à jour');
                modal.style.display = 'none';
                loadMyProfile();
            } catch (err) {
                showNotification(err.message, 'error');
            }
        };

        modal.style.display = 'block';
    }

    // Fermeture des modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});