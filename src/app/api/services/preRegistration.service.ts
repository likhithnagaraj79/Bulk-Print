import { ApiClient } from '../apiClient';

export interface PreRegistrationData {
    prefix: string;
    name: string;
    email: string;
    phoneCountryCode: string;
    phoneNumber: string;
    designation: string;
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    country: string;
    city: string;
}

export interface PreRegistrationResponse {
    success: boolean;
    preRegistrationId?: string;
    message: string;
    qrSentTo?: string;
    total?: number;
    data?: any[];
}

export const PreRegistrationService = {
    create: async (prefix: string, data: PreRegistrationData): Promise<PreRegistrationResponse> => {
        return ApiClient.post<PreRegistrationResponse>(`/pre-registrations/${prefix}`, data);
    },

    list: async (params: { page?: number; limit?: number; prefix: string; search?: string; printed?: boolean }): Promise<PreRegistrationResponse> => {
        return ApiClient.get<PreRegistrationResponse>('/pre-registrations', params);
    },

    getById: async (id: string): Promise<any> => {
        return ApiClient.get(`/pre-registrations/${id}`);
    },

    scan: async (qrData: string): Promise<any> => {
        return ApiClient.post('/pre-registrations/scan', { qrData });
    }
};
