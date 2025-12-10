// DataV Configuration
const DATAV_CONFIG = {
    API_URL: 'https://covering-hebrew-matters-comp.trycloudflare.com',
    VERSION: '1.0.0'
};

// Auth helper functions
const DataVAuth = {
    async signup(userData) {
        const response = await fetch(`${DATAV_CONFIG.API_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
        }

        const data = await response.json();
        this.setSession(data);
        return data;
    },

    async login(email, password, rememberMe = false) {
        const response = await fetch(`${DATAV_CONFIG.API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, remember_me: rememberMe })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        this.setSession(data);

        if (rememberMe) {
            localStorage.setItem('datav_remembered_user', email);
        } else {
            localStorage.removeItem('datav_remembered_user');
        }

        return data;
    },

    async getCurrentUser() {
        const token = this.getToken();
        if (!token) return null;

        const response = await fetch(`${DATAV_CONFIG.API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            this.clearSession();
            return null;
        }

        return await response.json();
    },

    setSession(data) {
        sessionStorage.setItem('datav_token', data.access_token);
        sessionStorage.setItem('datav_user', JSON.stringify(data.user));
        sessionStorage.setItem('datav_authenticated', 'true');
    },

    getToken() {
        return sessionStorage.getItem('datav_token');
    },

    getUser() {
        const user = sessionStorage.getItem('datav_user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return sessionStorage.getItem('datav_authenticated') === 'true' && this.getToken();
    },

    clearSession() {
        sessionStorage.removeItem('datav_token');
        sessionStorage.removeItem('datav_user');
        sessionStorage.removeItem('datav_authenticated');
    },

    logout() {
        this.clearSession();
        window.location.href = '/login';
    }
};
