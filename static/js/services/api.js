// API Service for ICorNet application
const apiService = {
    baseURL: '/api',

    // Helper method for making HTTP requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session management
            ...options,
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Authentication methods
    async login(credentials) {
        return await this.request('/login', {
            method: 'POST',
            body: credentials,
        });
    },

    async register(userData) {
        return await this.request('/register', {
            method: 'POST',
            body: userData,
        });
    },

    async logout() {
        return await this.request('/logout', {
            method: 'POST',
        });
    },

    async getCurrentUser() {
        return await this.request('/user');
    },

    // Dashboard methods
    async getDashboardStats() {
        return await this.request('/dashboard/stats');
    },

    async getCompanies() {
        return await this.request('/dashboard/companies');
    },

    async getSectors() {
        return await this.request('/dashboard/sectors');
    },

    async getRecentReports() {
        return await this.request('/dashboard/recent-reports');
    },

    // Reports methods
    async generateReport(companyName) {
        return await this.request('/reports/generate', {
            method: 'POST',
            body: { company_name: companyName },
        });
    },

    async getReportStatus(reportId) {
        return await this.request(`/reports/status/${reportId}`);
    },

    async downloadReport(reportId) {
        return await this.request(`/reports/download/${reportId}`);
    },

    async getReportHistory() {
        return await this.request('/reports/history');
    },

    async getCompaniesForReports() {
        return await this.request('/reports/companies');
    },

    async getCompanyRelationships(companyName) {
        return await this.request(`/reports/relationships/${encodeURIComponent(companyName)}`);
    },

    // Health check
    async healthCheck() {
        return await this.request('/health', { 
            baseURL: '' // Use root API path
        });
    },

    // Get companies for a specific sector
    getSectorCompanies: async (sector) => {
        try {
            const response = await fetch(`/api/dashboard/sector-companies?sector=${encodeURIComponent(sector)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch sector companies');
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};

// Make apiService globally available
window.apiService = apiService;