// frontend/js/api.js
class API {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
        // Si le body est FormData, on supprime Content-Type pour laisser le navigateur définir boundary
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }
        const config = { ...options, headers };
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return null;
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erreur');
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // Authentification
    static async login(email, password) {
        return this.request('/auth/login.php', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async register(userData) {
        return this.request('/auth/register.php', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Profils
    static async getMatchingProfiles(filters = {}) {
        const params = new URLSearchParams({ type: 'matching', ...filters });
        return this.request(`/users/profiles.php?${params}`);
    }

    static async getExploreProfiles(page = 1, filters = {}) {
        const params = new URLSearchParams({ type: 'explore', page, ...filters });
        return this.request(`/users/profiles.php?${params}`);
    }

    static async getProfile(id) {
        return this.request(`/users/profiles.php?id=${id}`);
    }

    static async getMyProfile() {
        return this.request('/users/profiles.php');
    }

    static async updateProfile(data) {
        return this.request('/users/profiles.php', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Matchs
    static async likeUser(targetUserId) {
        return this.request('/matches/like.php', {
            method: 'POST',
            body: JSON.stringify({ targetUserId })
        });
    }

    static async dislikeUser(targetUserId) {
        return this.request('/matches/dislike.php', {
            method: 'POST',
            body: JSON.stringify({ targetUserId })
        });
    }

    static async createMatch(targetUserId) {
        return this.request('/matches/create.php', {
            method: 'POST',
            body: JSON.stringify({ targetUserId })
        });
    }

    static async acceptMatch(matchId) {
        return this.request('/matches/accept.php', {
            method: 'POST',
            body: JSON.stringify({ matchId })
        });
    }

    static async rejectMatch(matchId) {
        return this.request('/matches/reject.php', {
            method: 'POST',
            body: JSON.stringify({ matchId })
        });
    }

    static async getMyMatches() {
        return this.request('/matches/list.php');
    }

    // Rencontres
    static async validateEncounter(data) {
        return this.request('/encounters/validate.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getSecretQuestion(userId) {
        return this.request(`/encounters/get_secret_question.php?userId=${userId}`);
    }

    // Photos
    static async uploadPhoto(formData) {
        return this.request('/photos/upload.php', {
            method: 'POST',
            body: formData
        });
    }

    // Commentaires
    static async addComment(data) {
        return this.request('/comments/create.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Références
    static async getReferences(type, departmentCode = null) {
        let url = '/references.php';
        if (type === 'villes' && departmentCode) {
            url += `?type=villes&departement=${departmentCode}`;
        } else if (type) {
            url += `?type=${type}`;
        }
        return this.request(url);
    }
}