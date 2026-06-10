import { ApiClient } from '../apiClient';

export interface CategoryStat {
    prefix: string;
    label: string;
    onsite: number;
    preRegistered: number;
    total: number;
    checkedIn: number;
    color?: string;
}

export interface HourlyArrival {
    hour: string;
    count: number;
}

export interface RegistrationSummary {
    success: boolean;
    totalRegistrations: number;
    totalPreRegistered: number;
    categories: CategoryStat[];
    hourlyData: HourlyArrival[];
    // Aliases for compatibility
    byCategory: CategoryStat[];
    data: HourlyArrival[];
}

export const ReportService = {
    getRegistrationSummary: async (params: {
        prefix?: string;
        type?: 'all' | 'onsite' | 'pre_registered';
        fromDate?: string;
        toDate?: string;
    } = {}): Promise<RegistrationSummary> => {
        const response = await ApiClient.get<RegistrationSummary>('/reports/registrations', params);
        // Ensure aliases are populated
        if (response) {
            response.byCategory = response.categories || response.byCategory || [];
            response.data = response.hourlyData || response.data || [];
        }
        return response;
    },

    getRegistrationStats: async (params: any = {}): Promise<RegistrationSummary> => {
        return ReportService.getRegistrationSummary(params);
    },

    getHourlyArrivals: async (params: any = {}): Promise<{ success: boolean; data: HourlyArrival[] }> => {
        const summary = await ReportService.getRegistrationSummary(params);
        return { success: summary.success, data: summary.hourlyData };
    },

    exportData: async (params: {
        format: 'csv' | 'pdf';
        prefix?: string;
        fromDate?: string;
        toDate?: string;
    }) => {
        const query = new URLSearchParams(params as any).toString();
        // Since this is a download, we might want to return the URL or handle it directly
        // For now, let's just return the constructed URL
        return `${ApiClient.getBaseUrl()}/reports/export?${query}`;
    }
};
