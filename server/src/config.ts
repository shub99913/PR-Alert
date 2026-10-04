import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '5000'),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    nasaFirmsApiKey: process.env.NASA_FIRMS_API_KEY || '',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
    },
    googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || '',
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
};
