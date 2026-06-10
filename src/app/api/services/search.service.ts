import { ApiClient } from '../apiClient';

export interface SearchResult {
    id: string | number;
    name: string;
    email: string;
    source: 'registration' | 'pre_registration' | 'crew' | 'admin';
    prefix?: string;
    designation?: string;
    company_name?: string;
    crew_type?: string;
    username?: string;
}

export interface SearchResponse {
    success: boolean;
    data: SearchResult[];
    total: number;
    page: number;
    limit: number;
}

export const SearchService = {
    globalSearch: async (params: { query: string; type?: string; page?: number; limit?: number }): Promise<SearchResponse> => {
        return ApiClient.get('/search', params);
    }
};
