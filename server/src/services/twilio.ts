import axios from 'axios';
import { config } from '../config.js';

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
        console.log(`[Twilio] SMS not sent (no credentials). To: ${to}, Message: ${message.substring(0, 50)}...`);
        return { success: false, error: 'Twilio credentials not configured' };
    }

    try {
        const { data } = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            new URLSearchParams({
                To: to,
                From: config.twilio.phoneNumber,
                Body: message,
            }),
            {
                auth: { username: config.twilio.accountSid, password: config.twilio.authToken },
                timeout: 10000,
            }
        );

        return { success: true, sid: data.sid };
    } catch (err: any) {
        console.error('[Twilio] Error:', err.response?.data?.message || err.message);
        return { success: false, error: err.message };
    }
}
