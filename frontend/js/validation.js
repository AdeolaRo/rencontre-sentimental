// frontend/js/validation.js
let currentMatchId, currentOtherId;

async function openValidationModal(matchId, otherId) {
    currentMatchId = matchId;
    currentOtherId = otherId;
    
    try {
        const data = await API.getSecretQuestion(otherId);
        const question = data.secretQuestion;
        
        const modal = document.getElementById('validationModal');
        const stepsDiv = document.getElementById('validationSteps');
        stepsDiv.innerHTML = `
            <div class="step active" id="step1">
                <h3>Étape 1 : Confirmer la rencontre</h3>
                <p>Avez-vous rencontré cette personne en vrai ?</p>
                <div class="step-options" style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn btn-success" id="confirmYes">Oui</button>
                    <button class="btn btn-danger" id="confirmNo">Non</button>
                </div>
            </div>
            <div class="step" id="step2" style="display: none;">
                <h3>Étape 2 : Question secrète</h3>
                <p><strong>Question :</strong> ${question}</p>
                <input type="text" id="secretAnswer" placeholder="Votre réponse" class="form-control" style="margin: 1rem 0;">
                <button class="btn btn-primary" id="submitSecret">Valider</button>
            </div>
            <div class="step" id="step3" style="display: none;">
                <h3>Étape 3 : Badges comportementaux</h3>
                <p>Sélectionnez jusqu'à 3 badges :</p>
                <div class="badges-selection" id="badgesSelection"></div>
                <button class="btn btn-success" id="submitValidation" style="margin-top: 1rem;">Terminer</button>
            </div>
        `;
        
        // Initialiser les badges
        const badgesContainer = document.getElementById('badgesSelection');
        const badgesList = [
            'Respectueux(se)',
            'Communication naturelle',
            'Ponctuel(le)',
            'Conflant/Apaisant',
            'Correspond au profil',
            'Relationnel fluide',
            'Bonne énergie'
        ];
        badgesContainer.innerHTML = badgesList.map(b => `
            <span class="badge-option" data-badge="${b}">${b}</span>
        `).join('');
        
        let hasMet = false;
        let selectedBadges = [];
        let secretAnswer = '';
        
        // Gestion étape 1
        document.getElementById('confirmYes').addEventListener('click', () => {
            hasMet = true;
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
        });
        document.getElementById('confirmNo').addEventListener('click', () => {
            hasMet = false;
            // Si non, on peut directement soumettre sans badges
            submitValidation(hasMet, [], '');
        });
        
        // Gestion étape 2
        document.getElementById('submitSecret').addEventListener('click', () => {
            secretAnswer = document.getElementById('secretAnswer').value.trim();
            if (!secretAnswer) {
                alert('Veuillez entrer une réponse');
                return;
            }
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step3').style.display = 'block';
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
            await submitValidation(hasMet, selectedBadges, secretAnswer);
        });
        
        modal.style.display = 'flex';
    } catch (e) {
        alert('Erreur : ' + e.message);
    }
}

async function submitValidation(hasMet, badges, secretAnswer) {
    try {
        const data = {
            matchId: currentMatchId,
            hasMet: hasMet,
            secretAnswer: secretAnswer,
            badges: badges
        };
        const result = await API.validateEncounter(data);
        alert('Validation enregistrée !');
        document.getElementById('validationModal').style.display = 'none';
        // Recharger les matchs
        if (typeof loadMatches === 'function') loadMatches();
    } catch (e) {
        alert('Erreur : ' + e.message);
    }
}