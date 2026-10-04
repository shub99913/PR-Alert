import axios from 'axios';
import { config } from '../config.js';

export async function translateText(text: string, targetLang: string): Promise<string> {
    if (!config.googleTranslateApiKey) {
        console.log(`[Translate] No API key, returning original text`);
        return text;
    }

    try {
        const { data } = await axios.post(
            `https://translation.googleapis.com/language/translate/v2?key=${config.googleTranslateApiKey}`,
            { q: text, target: targetLang, format: 'text' },
            { timeout: 10000 }
        );

        return data.data.translations[0].translatedText;
    } catch (err: any) {
        console.error('[Translate] Error:', err.message);
        return text;
    }
}
