import { ApiClient } from '../apiClient';

export interface EventData {
    id: string;
    eventName: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'archived';
    createdAt?: string;
}

export const SettingsService = {
    getEvents: async (): Promise<{ success: boolean; events: EventData[] }> => {
        return ApiClient.get('/events');
    },

    updateEvent: async (id: string, data: Partial<EventData>): Promise<{ success: boolean; message: string }> => {
        return ApiClient.patch(`/events/${id}`, data);
    }
};
