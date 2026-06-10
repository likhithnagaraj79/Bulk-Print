import { ApiClient } from '../apiClient';

export interface Registration {
    registrationId: string;
    prefix: string;
    name: string;
    email: string;
    phoneNumber: string;
    companyName: string;
    designation: string;
    phoneCountryCode?: string;
    city: string;
    registeredBy: string;
    printCount: number;
    createdAt: string;
    emailStatus?: string;
    whatsappStatus?: string;
    checkedIn?: boolean;
    photoUrl?: string;
}

export interface FailedSync {
    localId: string;
    name: string;
    email: string;
    reason: string;
    failedAt: string;
}

export interface RegistrationsResponse {
    success: boolean;
    data: Registration[];
    total: number;
}

export const RegistrationService = {
    getRegistrations: async (params: {
        page?: number;
        limit?: number;
        search?: string;
        prefix?: string;
        fromDate?: string;
        toDate?: string;
        crewId?: string;
    } = {}): Promise<RegistrationsResponse> => {
        return ApiClient.get<RegistrationsResponse>('/registrations', params);
    },

    getFailedSyncs: async (): Promise<{ failedRecords: FailedSync[] }> => {
        return ApiClient.get('/registrations/failed');
    },

    syncOfflineRecords: async (offlineRecords: any[]): Promise<{ success: boolean; synced: number; failed: number; errors: any[] }> => {
        return ApiClient.post('/registrations/sync', { offlineRecords });
    },

    createRegistration: async (data: any): Promise<{ success: boolean; registrationId: string; badgeId: string; qrCodeUrl: string; badgeQrUrl: string }> => {
        return ApiClient.post('/registrations', data);
    },

    checkDuplicate: async (data: { email?: string | null; phoneNumber?: string | null }): Promise<{ emailExists: boolean; phoneExists: boolean }> => {
        return ApiClient.post('/registrations/check-duplicate', data);
    },

    deleteRegistrations: async (ids: string[]): Promise<{ success: boolean; deleted: number }> => {
        return ApiClient.delete('/registrations/bulk', { ids });
    },
};
