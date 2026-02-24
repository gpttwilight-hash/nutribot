import client from './client';
import type { SubscriptionStatus } from '../types';

export const subscriptionApi = {
    getStatus: async () => {
        const { data } = await client.get<SubscriptionStatus>('/subscription/status');
        return data;
    },

    createInvoice: async () => {
        const { data } = await client.post<{
            invoice_link: string;
            stars_amount: number;
            description: string;
        }>('/subscription/invoice');
        return data;
    },
};
