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

    downloadReport: async (reportId) => {
        const response = await fetch(`/api/reports/download/${reportId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to download report');
        }

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `report_${reportId}.pdf`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="([^"]*)"/) || 
                                 contentDisposition.match(/filename=([^;]*)/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // Create a blob from the response and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
    },

    viewReport: async (reportId) => {
        const response = await fetch(`/api/reports/view/${reportId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to view report');
        }

        // Create a blob URL and open in new tab
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');

        return { success: true };
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
    },

    // Bulk delete reports
    async bulkDeleteReports(reportIds) {
        return await this.request('/reports/bulk-delete', {
            method: 'DELETE',
            body: { report_ids: reportIds },
        });
    },

    // SUK Chat methods
    async sendChatMessage(message, userId = null) {
        try {
            return await this.request('/suk-chat/send-message', {
                method: 'POST',
                body: { 
                    message: message,
                    timestamp: new Date().toISOString(),
                    user_id: userId
                },
            });
        } catch (error) {
            console.error('Chat message error:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    },

    async getChatHistory() {
        return await this.request('/suk-chat/chat-history');
    }
};

// Make apiService globally available
window.apiService = apiService;