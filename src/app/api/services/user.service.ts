import { ApiClient } from '../apiClient';

export interface Admin {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    phoneCountryCode: string;
    companyEmail?: string;
    status: "active" | "inactive";
    createdAt: string;
}

export interface CrewMember {
    id: string;
    name: string;
    email: string;
    crewType: string;
    phoneNumber: string;
    aadharNumber?: string;
    status: "active" | "inactive";
    createdAt: string;
}

export interface AdminStats {
    total: number;
    active: number;
    inactive: number;
}

export interface AdminsResponse {
    success: boolean;
    data: Admin[];
    stats?: AdminStats;
    total: number;
}

export interface CrewResponse {
    success: boolean;
    data: CrewMember[];
    total: number;
}

export const UserService = {
    getAdmins: async (params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<AdminsResponse> => {
        return ApiClient.get<AdminsResponse>('/users/admins', params);
    },

    addAdmin: async (adminData: any): Promise<{ success: boolean; adminId: number }> => {
        return ApiClient.post('/users/admins', adminData);
    },

    updateAdmin: async (adminId: string, data: { fieldName: string; newValue: any; totpCode: string }): Promise<{ success: boolean }> => {
        return ApiClient.patch(`/users/admins/${adminId}`, data);
    },

    deleteAdmins: async (adminIds: string[], totpCode: string): Promise<{ success: boolean; removed: number }> => {
        return ApiClient.delete('/users/admins', { adminIds, totpCode });
    },

    getCrew: async (params: { page?: number; limit?: number; search?: string; status?: string; crewType?: string } = {}): Promise<CrewResponse> => {
        return ApiClient.get<CrewResponse>('/users/crew', params);
    },

    addCrew: async (crewData: any): Promise<{ success: boolean; crewId: number }> => {
        return ApiClient.post('/users/crew', crewData);
    },

    updateCrew: async (crewId: string, data: { fieldName: string; newValue: any; totpCode: string }): Promise<{ success: boolean }> => {
        return ApiClient.patch(`/users/crew/${crewId}`, data);
    },

    deleteCrew: async (crewIds: string[], totpCode: string): Promise<{ success: boolean; removed: number }> => {
        return ApiClient.delete('/users/crew', { crewIds, totpCode });
    },

    updateUserStatus: async (userId: string, data: { status: string; reason?: string; totpCode: string }): Promise<{ success: boolean }> => {
        return ApiClient.patch(`/users/${userId}/status`, data);
    },
};
