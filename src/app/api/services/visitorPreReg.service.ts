import { ApiClient } from '../apiClient';

export interface VisitorEndpoint {
    id: string;
    expoName?: string;
    expo_name?: string;
    slug: string;
    badgeImage?: string;
    badge_image?: string;
    status: string;
    created_at?: string;
    registration_count?: number;
}

export interface VisitorRegistrationData {
    endpointId: string;
    name: string;
    email?: string;
    phoneCountryCode: string;
    phoneNumber: string;
    companyName?: string;
    designation?: string;
    city?: string;
    howDidYouKnow: string;
    howDidYouKnowOther?: string;
    visitorType: string;
    purposeOfVisit: string[];
    consent: boolean;
}

export interface VisitorRegistrationResponse {
    success: boolean;
    visitorId?: string;
    badgePdf?: string;
    message: string;
}

export interface VisitorListResponse {
    success: boolean;
    total: number;
    data: any[];
}

export const VisitorPreRegService = {
    getEndpoint: (slug: string) =>
        ApiClient.get<{ success: boolean; data: VisitorEndpoint }>(`/visitor-prereg/endpoint/${slug}`),

    register: (data: VisitorRegistrationData) =>
        ApiClient.post<VisitorRegistrationResponse>('/visitor-prereg/register', data),

    fetchBadge: (data: { phoneCountryCode: string; phoneNumber: string }) =>
        ApiClient.post<{ success: boolean; visitorId?: string; name?: string; badgePdf?: string; message?: string }>(
            '/visitor-prereg/fetch-badge', data
        ),

    list: (params: { endpoint_id: string; page?: number; limit?: number; search?: string }) =>
        ApiClient.get<VisitorListResponse>('/visitor-prereg/list', params as Record<string, string | number | boolean>),

    exportCsv: (endpointId: string) => {
        // Fetch with auth header, get blob, trigger download
        const token = localStorage.getItem('nexus_token');
        const baseUrl = ApiClient.getBaseUrl();
        return fetch(`${baseUrl}/visitor-prereg/export?endpoint_id=${endpointId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(async (res) => {
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'visitors.csv';
            a.click();
            URL.revokeObjectURL(url);
        });
    },

    listEndpoints: () =>
        ApiClient.get<{ success: boolean; data: VisitorEndpoint[] }>('/visitor-prereg/endpoints'),

    createEndpoint: (data: { expoName: string; slug: string; badgeImage: string; status: string }) =>
        ApiClient.post<{ success: boolean; data: VisitorEndpoint }>('/visitor-prereg/endpoints', data),

    updateEndpoint: (id: string, data: Partial<{ expoName: string; badgeImage: string; status: string }>) =>
        ApiClient.patch<{ success: boolean; data: VisitorEndpoint }>(`/visitor-prereg/endpoints/${id}`, data),
};

/**
 * Decode base64 PDF and trigger browser download.
 */
export function downloadBadgePdf(base64: string, filename = 'visitor-badge.pdf'): void {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
