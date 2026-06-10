import { ApiClient } from '../apiClient';

export interface LoginCredentials {
    username: string;
    password: string;
    accountType: string;
    crewType?: string;
}

export interface LoginResponse {
    success: boolean;
    token?: string;
    csrfToken?: string;
    otpRequired?: boolean;
    pendingToken?: string;
    accountType?: string;
    crewType?: string | null;
    fullName?: string;
    expiresIn?: number;
    message?: string;
}

export interface UserProfile {
    userId: string;
    username: string;
    fullName: string;
    accountType: string;
    crewType?: string | null;
    sessionExpiresAt?: string;
}

export const AuthService = {
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        const response = await ApiClient.post<LoginResponse>('/auth/login', credentials);
        if (response.token) {
            localStorage.setItem('nexus_token', response.token);
        }
        if (response.csrfToken) {
            localStorage.setItem('nexus_csrf_token', response.csrfToken);
        }
        return response;
    },

    verifyTotp: async (data: { pendingToken: string; totpCode: string }): Promise<LoginResponse> => {
        const response = await ApiClient.post<LoginResponse>('/auth/verify-totp', data);
        if (response.token) {
            localStorage.setItem('nexus_token', response.token);
        }
        if (response.csrfToken) {
            localStorage.setItem('nexus_csrf_token', response.csrfToken);
        }
        if (response.accountType) {
            localStorage.setItem('nexus_account_type', response.accountType);
        }
        return response;
    },

    getMe: async (): Promise<UserProfile> => {
        return ApiClient.get<UserProfile>('/auth/me');
    },

    logout: async () => {
        try {
            await ApiClient.post('/auth/logout');
        } catch {
            // Proceed with local cleanup even if the server call fails
        } finally {
            localStorage.removeItem('nexus_token');
            localStorage.removeItem('nexus_csrf_token');
            localStorage.removeItem('nexus_account_type');
            window.location.href = '/';
        }
    },

    forgotPassword: async (data: {
        accountType: string;
        crewType?: string | null;
        username: string;
        totpCode: string;
        newPassword: string;
    }): Promise<{ success: boolean; message: string }> => {
        return ApiClient.post('/auth/forgot-password', data);
    },
};
