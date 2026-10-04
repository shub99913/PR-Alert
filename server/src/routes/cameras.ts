import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const camerasPath = path.join(__dirname, '../data/cameras.json');

let camerasCache: any = null;

router.get('/', (req, res) => {
    try {
        if (!camerasCache) {
            const data = fs.readFileSync(camerasPath, 'utf8');
            camerasCache = JSON.parse(data);
        }
        res.json(camerasCache);
    } catch (err) {
        console.error('Failed to read cameras dataset', err);
        res.status(500).json({ error: 'Failed to load cameras' });
    }
});

export default router;
