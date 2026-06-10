import { ApiClient } from '../apiClient';

// 7.3 — per-channel delivery status shape
export interface EmailStatus {
    sent: boolean;
    sentAt: string | null;
    status: 'delivered' | 'bounced' | 'failed' | 'not_sent';
    messageId: string | null;
}

export interface WhatsAppStatus {
    sent: boolean;
    sentAt: string | null;
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'not_sent';
    wamid: string | null;
}

// 7.3 GET /notifications/status/:registrationId response
export interface NotificationStatus {
    registrationId: string;
    email: EmailStatus;
    whatsapp: WhatsAppStatus;
}

// Used by AdminNotificationHistoryPage
export interface NotificationLog {
    id: string;
    registrationId: string;
    registrationType: 'onsite' | 'pre_registration';
    channel: 'email' | 'whatsapp';
    recipient: string;
    messageId?: string;
    status: 'queued' | 'sent' | 'delivered' | 'read' | 'bounced' | 'failed' | 'not_sent';
    errorMessage?: string;
    sentAt?: string;
    createdAt: string;
    attendeeName: string;
}

export interface NotificationStats {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
}

export const NotificationService = {
    // 7.1 POST /notifications/send-badge-email
    // Backend resolves recipient details from registrationId
    sendBadgeEmail: async (registrationId: string): Promise<{
        success: boolean;
        messageId: string;
        sentTo: string;
        deliveryStatus: string;
    }> => {
        return ApiClient.post('/notifications/send-badge-email', { registrationId });
    },

    // 7.2 POST /notifications/send-badge-whatsapp
    // Backend resolves phone number and QR URL from registrationId
    sendBadgeWhatsapp: async (registrationId: string): Promise<{
        success: boolean;
        wamid: string;
        sentTo: string;
        status: string;
    }> => {
        return ApiClient.post('/notifications/send-badge-whatsapp', { registrationId });
    },

    // 7.3 GET /notifications/status/:registrationId
    getStatus: async (registrationId: string): Promise<NotificationStatus> => {
        return ApiClient.get(`/notifications/status/${registrationId}`);
    },

    // 7.4 POST /notifications/resend
    resend: async (registrationId: string, channels: ('email' | 'whatsapp')[]): Promise<{
        success: boolean;
        resent: string[];
        message: string;
    }> => {
        return ApiClient.post('/notifications/resend', { registrationId, channels });
    },

    // Used by AdminNotificationHistoryPage — GET /notifications/logs
    listLogs: async (params: {
        channel?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ success: boolean; total: number; logs: NotificationLog[] }> => {
        return ApiClient.get('/notifications/logs', params);
    },

    // Used by AdminNotificationHistoryPage — GET /notifications/stats
    getStats: async (): Promise<{ success: boolean } & NotificationStats> => {
        return ApiClient.get('/notifications/stats');
    },
};
