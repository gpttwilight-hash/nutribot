import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/v1';

const client = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// JWT interceptor
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('nutribot_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('nutribot_token');
            // Could redirect to auth
        }
        return Promise.reject(error);
    }
);

export default client;
