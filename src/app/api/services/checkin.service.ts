import { ApiClient } from '../apiClient';

export interface CheckInResponse {
    success: boolean;
    attendeeName?: string;
    attendeePrefix?: string;
    checkedIn: boolean;
    checkedInAt?: string;
    message: string;
}

export interface CheckInRecord {
    checkInId: string;
    attendeeName: string;
    attendeePrefix: string;
    scannedBy: string;
    checkedInAt: string;
}

export interface CheckInStats {
    totalRegistered: number;
    totalCheckedIn: number;
    checkInRate: number;
    byCategory: Array<{
        prefix: string;
        label: string;
        registered: number;
        checkedIn: number;
        percentage: number;
    }>;
    arrivalTimeline: Array<{ hour: string; count: number }>;
}

export const CheckInService = {
    scanQr: async (qrData: string): Promise<CheckInResponse> => {
        return ApiClient.post('/checkin/scan', { qrData });
    },

    getRecords: async (params: {
        prefix?: string;
        fromTime?: string;
        toTime?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ total: number; page: number; limit: number; data: CheckInRecord[] }> => {
        return ApiClient.get('/checkin/records', params);
    },

    getStats: async (): Promise<CheckInStats> => {
        return ApiClient.get('/checkin/stats');
    },

    getAttendeeStatus: async (id: string): Promise<{
        registrationId: string;
        name: string;
        checkedIn: boolean;
        checkedInAt: string | null;
        scannedBy: string | null;
    }> => {
        return ApiClient.get(`/checkin/attendee/${id}`);
    }
};
