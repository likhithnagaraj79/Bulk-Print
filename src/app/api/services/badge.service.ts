import { ApiClient } from '../apiClient';

// Internal editor field format (pixel-based, used in BadgeControlPage drag-and-drop editor)
export interface BadgeField {
    type: string;
    x: number;
    y: number;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    align?: string;
    width?: number;
    height?: number;
    borderRadius?: number;
    size?: number;
}

// API template field format — percentage-based strings, center-positioned
export interface TemplateField {
    x: string;       // e.g. "50%"
    y: string;       // e.g. "20%"
    w: string;       // e.g. "20%"
    h: string;       // e.g. "20%"
    rotation: number;
}

// API-level badge template — named keys, percentage positions (matches backend spec)
export interface BadgeTemplate {
    photo: TemplateField;
    name: TemplateField;
    designation: TemplateField;
    companyName: TemplateField;
    qrCode: TemplateField;
}

export interface BadgeData {
    registrationId: string;
    name: string;
    designation: string;
    companyName: string;
    photoUrl: string | null;
    badgeQrUrl: string;
    printCount: number;
    template: BadgeTemplate | null;
}

export const BadgeService = {
    getPrintLockStatus: async (): Promise<{ printLock: boolean }> => {
        return ApiClient.get('/badges/print-control');
    },

    togglePrintLock: async (enabled: boolean): Promise<{ success: boolean; printLock: boolean }> => {
        return ApiClient.patch('/badges/print-control', { enabled });
    },

    getBadgeData: async (id: string): Promise<BadgeData> => {
        return ApiClient.get(`/badges/${id}`);
    },

    logPrint: async (registrationId: string): Promise<{ success: boolean; printCount: number }> => {
        return ApiClient.post(`/badges/${registrationId}/print`, {});
    },

    batchPrint: async (registrationIds: string[]): Promise<{
        results: Array<{ registrationId: string; success: boolean; printCount?: number; reason?: string }>;
    }> => {
        return ApiClient.post('/badges/batch-print', { registrationIds });
    },

    getTemplate: async (crewType: string): Promise<{ crewType: string; template: BadgeTemplate | null }> => {
        return ApiClient.get(`/badges/template/${crewType}`);
    },

    saveTemplate: async (crewType: string, template: BadgeTemplate): Promise<{ success: boolean; templateId: string; message: string }> => {
        return ApiClient.post('/badges/template', { crewType, template });
    },
};
