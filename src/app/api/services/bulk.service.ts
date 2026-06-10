import { ApiClient } from '../apiClient';

export interface UploadError {
    row: number;
    reason: string;
}

export interface UploadResponse {
    success: boolean;
    jobId: string;
    imported: number;
    failed: number;
    errors: UploadError[];
}

export interface BulkJob {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    imported: number;
    failed: number;
    errors: UploadError[];
    completedAt: string | null;
}

export interface BadgePrintRecord {
    row: number;
    id: string;
    name: string;
    designation: string;
    companyName: string;
    stallNumber: string;
    photoUrl: string | null;
    badgeQrUrl: string | null;
}

export interface BadgePrintResponse {
    success: boolean;
    total: number;
    records: BadgePrintRecord[];
}

export const BulkService = {
    // 6.1 POST /bulk/upload — single-step pre-registration import
    upload: async (file: File, prefix: string): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prefix', prefix);
        return ApiClient.post<UploadResponse>('/bulk/upload', formData);
    },

    // 6.2 POST /bulk/badge-print — process Excel with embedded photos for badge printing
    badgePrint: async (file: File): Promise<BadgePrintResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        return ApiClient.post<BadgePrintResponse>('/bulk/badge-print', formData);
    },

    // 6.3 GET /bulk/jobs/:jobId — poll async job status
    getJobStatus: async (jobId: string): Promise<BulkJob> => {
        return ApiClient.get<BulkJob>(`/bulk/jobs/${jobId}`);
    },

    // 6.4 GET /bulk/exports — download registrations as PDF or CSV
    exportData: async (params: { prefix?: string; format: 'csv' | 'pdf'; search?: string }): Promise<string> => {
        const filtered = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined)
        ) as Record<string, string>;
        const query = new URLSearchParams(filtered).toString();
        return `${ApiClient.getBaseUrl()}/bulk/exports?${query}`;
    },
};
