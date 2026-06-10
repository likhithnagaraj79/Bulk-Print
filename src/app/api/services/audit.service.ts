import { ApiClient } from '../apiClient';

export interface CrewMember {
    crewId: string;
    username: string;
    crewType: string;
    loggedInAt: string;
    submissionCount: number;
    failedCount: number;
    lastActivityAt: string;
}

// 10.4 GET /audit/crew/live
export interface LiveAuditResponse {
    activeCrew: CrewMember[];
    totalSubmissionsToday: number;
    totalFailedToday: number;
}

// 10.2 GET /audit/admin
export interface AdminLog {
    logId: string;
    action: string;
    details: string;
    affectedRecord: string | null;
    fieldChanged?: string | null;
    performedBy: string;
    performedAt: string;
}

// 10.3 GET /audit/crew
export interface CrewLog {
    logId: string;
    crewUsername: string;
    crewType: string;
    action: 'registration' | 'badge_print' | 'failed_sync' | 'retry_sync';
    attendeeName: string;
    attendeeEmail: string;
    prefix: string;
    printCount: number;
    failureReason?: string | null;
    performedAt: string;
}

export const AuditService = {
    // 10.4 GET /audit/crew/live
    getCrewLive: async (): Promise<LiveAuditResponse> => {
        return ApiClient.get<LiveAuditResponse>('/audit/crew/live');
    },

    // 10.3 GET /audit/crew (with crewId for drill-down)
    getCrewActivity: async (crewId: string, params: { fromDate?: string; limit?: number } = {}): Promise<{ total: number; logs: CrewLog[] }> => {
        return ApiClient.get('/audit/crew', { crewId, ...params });
    },

    // 10.2 GET /audit/admin
    adminLogs: async (params: {
        action?: string;
        fromDate?: string;
        toDate?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ total: number; logs: AdminLog[] }> => {
        return ApiClient.get('/audit/admin', params);
    },

    // 10.3 GET /audit/crew
    crewLogs: async (params: {
        crewId?: string;
        crewType?: string;
        prefix?: string;
        fromDate?: string;
        toDate?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ total: number; logs: CrewLog[] }> => {
        return ApiClient.get('/audit/crew', params);
    },
};
