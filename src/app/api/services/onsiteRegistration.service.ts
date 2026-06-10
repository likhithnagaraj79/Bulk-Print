import { ApiClient } from '../apiClient';

export interface OnsiteRegistrationData {
    name: string;
    email: string;
    phoneCountryCode: string;
    phoneNumber: string;
    designation: string;
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    country: string;
    city: string;
    eventType?: string;
    recaptchaToken: string;
}

export interface OnsiteRegistrationResponse {
    success: boolean;
    preRegistrationId?: string;
    message: string;
}

export const OnsiteService = {
    create: async (
        prefix: string,
        data: OnsiteRegistrationData
    ): Promise<OnsiteRegistrationResponse> => {
        return ApiClient.post<OnsiteRegistrationResponse>(
            `/pre-registrations/onsite/${prefix}`,
            data
        );
    },
};
