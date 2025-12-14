/**
 * DataV Frontend Configuration
 * Powered by VLTRN
 */

const CONFIG = {
    // API Configuration - Render (Permanent)
    API_URL: 'https://datav-app-api.onrender.com',

    // For local development
    // API_URL: 'http://localhost:8000',

    // Application Settings
    APP_NAME: 'DataV',
    APP_VERSION: '3.1.0',

    // Plan Limits
    PLANS: {
        'free-trial': {
            name: 'Free Trial',
            uploads: 1,
            features: ['1 Upload', 'Partial Output', '7 Days'],
            price: 0
        },
        'starter': {
            name: 'Starter',
            uploads: 10,
            features: ['10 Uploads/month', 'Full Output', 'Email Support'],
            price: 49
        },
        'professional': {
            name: 'Professional',
            uploads: 50,
            features: ['50 Uploads/month', 'Full Output', 'Priority Support', 'API Access'],
            price: 149
        },
        'enterprise': {
            name: 'Enterprise',
            uploads: -1,
            features: ['Unlimited Uploads', 'Full Output', 'Dedicated Support', 'Custom Integration'],
            price: 499
        }
    },

    // File Upload Settings
    ALLOWED_FILE_TYPES: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/pdf'
    ],
    MAX_FILE_SIZE_MB: 100
};

// Legacy support
const DATAV_CONFIG = {
    API_URL: CONFIG.API_URL,
    VERSION: CONFIG.APP_VERSION
};

/**
 * DataV API Class - Full-featured API wrapper
 */
class DataVAPI {
    constructor() {
        this.baseUrl = CONFIG.API_URL;
        this.token = localStorage.getItem('datav_token') || sessionStorage.getItem('datav_token');
    }

    setToken(token, remember = false) {
        this.token = token;
        if (remember) {
            localStorage.setItem('datav_token', token);
        } else {
            sessionStorage.setItem('datav_token', token);
        }
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('datav_token');
        localStorage.removeItem('datav_user');
        sessionStorage.removeItem('datav_token');
        sessionStorage.removeItem('datav_user');
        sessionStorage.removeItem('datav_authenticated');
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                this.clearToken();
                window.location.href = '/login.html';
                throw new Error('Session expired');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async register(email, password, company, plan = 'free-trial') {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, company, plan })
        });
        this.setToken(data.access_token);
        localStorage.setItem('datav_user', JSON.stringify(data.user));
        sessionStorage.setItem('datav_authenticated', 'true');
        return data;
    }

    async login(email, password, rememberMe = false) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.access_token, rememberMe);
        localStorage.setItem('datav_user', JSON.stringify(data.user));
        sessionStorage.setItem('datav_authenticated', 'true');

        if (rememberMe) {
            localStorage.setItem('datav_remembered_user', email);
        } else {
            localStorage.removeItem('datav_remembered_user');
        }

        return data;
    }

    async getMe() {
        return await this.request('/auth/me');
    }

    logout() {
        this.clearToken();
        window.location.href = '/login.html';
    }

    // Projects
    async createProject(name, description = '') {
        return await this.request('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    }

    async getProjects() {
        return await this.request('/projects');
    }

    async getProject(projectId) {
        return await this.request(`/projects/${projectId}`);
    }

    async deleteProject(projectId) {
        return await this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // Files
    async uploadFile(projectId, file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${this.baseUrl}/projects/${projectId}/upload`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        onProgress(percent);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.detail || 'Upload failed'));
                    } catch {
                        reject(new Error('Upload failed'));
                    }
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));
            xhr.open('POST', url);
            xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
            xhr.send(formData);
        });
    }

    async getFileStatus(fileId) {
        return await this.request(`/files/${fileId}/status`);
    }

    async getProjectFiles(projectId) {
        return await this.request(`/projects/${projectId}/files`);
    }

    // Dashboard
    async getDashboardStats() {
        return await this.request('/dashboard/stats');
    }

    // Health Check
    async healthCheck() {
        return await this.request('/health');
    }
}

// Global API instance
const api = new DataVAPI();

// Legacy DataVAuth for backward compatibility
const DataVAuth = {
    async signup(userData) {
        return await api.register(userData.email, userData.password, userData.company, userData.plan);
    },

    async login(email, password, rememberMe = false) {
        return await api.login(email, password, rememberMe);
    },

    async getCurrentUser() {
        try {
            return await api.getMe();
        } catch {
            return null;
        }
    },

    setSession(data) {
        api.setToken(data.access_token);
        sessionStorage.setItem('datav_user', JSON.stringify(data.user));
        sessionStorage.setItem('datav_authenticated', 'true');
    },

    getToken() {
        return api.token;
    },

    getUser() {
        const user = localStorage.getItem('datav_user') || sessionStorage.getItem('datav_user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!api.token;
    },

    clearSession() {
        api.clearToken();
    },

    logout() {
        api.logout();
    }
};

// Auth state helpers
function isAuthenticated() {
    return !!api.token;
}

function getCurrentUser() {
    const user = localStorage.getItem('datav_user') || sessionStorage.getItem('datav_user');
    return user ? JSON.parse(user) : null;
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, DATAV_CONFIG, DataVAPI, DataVAuth, api, isAuthenticated, getCurrentUser, requireAuth };
}
