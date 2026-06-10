import { ApiClient } from '../apiClient';

export interface SecuritySummary {
    stats: {
        requests_24h: number;
        blocked_ips: number;
        failed_policy_attempts: number;
    };
    top_ips: {
        ip_address: string;
        count: number;
    }[];
    recent_events: any[];
}

// 10.1 GET /audit/super-admin
export interface SuperAdminLog {
    logId: string;
    action: 'add_admin' | 'remove_admin' | 'modify_admin' | 'failed_totp';
    affectedAccount: string;
    fieldChanged: string | null;
    performedBy: string;
    performedAt: string;
}

export const SecurityService = {
    getSummary: async (): Promise<{ success: boolean; data: SecuritySummary }> => {
        return ApiClient.get('/security/dashboard/summary');
    },

    getBlockedIps: async (): Promise<{ success: boolean; data: any[] }> => {
        return ApiClient.get('/security/dashboard/blocked-ips');
    },

    blockIp: async (ip: string, reason: string): Promise<{ success: boolean; message: string }> => {
        return ApiClient.post('/security/dashboard/block-ip', { ip, reason });
    },

    unblockIp: async (ip: string): Promise<{ success: boolean; message: string }> => {
        return ApiClient.delete(`/security/dashboard/block-ip/${encodeURIComponent(ip)}`);
    },

    getSuperAdminLogs: async (params: {
        action?: string;
        fromDate?: string;
        toDate?: string;
        page?: number;
        limit?: number
    }): Promise<{ total: number; logs: SuperAdminLog[] }> => {
        return ApiClient.get('/audit/super-admin', params as any);
    }
};
