const API_BASE_URL = 'http://localhost:8000/api'; // À adapter

class API {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
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

    static async createMatch(targetUserId) {
        return this.request('/matches/create.php', {
            method: 'POST',
            body: JSON.stringify({ targetUserId })
        });
    }

    static async validateEncounter(data) {
        return this.request('/encounters/validate.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async uploadPhoto(formData) {
        return this.request('/photos/upload.php', {
            method: 'POST',
            body: formData,
            headers: {} // Supprimer Content-Type pour FormData
        });
    }

    static async addComment(data) {
        return this.request('/comments/create.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getMyMatches() {
        return this.request('/matches/list.php');
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
    
    static async getSecretQuestion(userId) {
        return this.request(`/encounters/get_secret_question.php?userId=${userId}`);
    }
    
    // La méthode validateEncounter existe déjà, mais on peut s'assurer qu'elle est bien définie

}