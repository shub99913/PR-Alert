import axios from 'axios';
import { config } from '../config.js';

export async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
    if (!config.sendgrid.apiKey) {
        console.log(`[SendGrid] Email not sent (no API key). To: ${to}, Subject: ${subject}`);
        return { success: false, error: 'SendGrid API key not configured' };
    }

    try {
        await axios.post(
            'https://api.sendgrid.com/v3/mail/send',
            {
                personalizations: [{ to: [{ email: to }] }],
                from: { email: config.sendgrid.fromEmail || 'alerts@disaster-dashboard.local' },
                subject,
                content: [{ type: 'text/html', value: body }],
            },
            {
                headers: {
                    Authorization: `Bearer ${config.sendgrid.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            }
        );

        return { success: true };
    } catch (err: any) {
        console.error('[SendGrid] Error:', err.response?.data || err.message);
        return { success: false, error: err.message };
    }
}
