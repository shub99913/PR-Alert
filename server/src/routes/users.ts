import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pralert_secret_jwt_key_fallback';

router.post('/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const exists = await User.findOne({ phone });
        if (exists) return res.status(400).json({ error: 'Phone number already registered' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await User.create({ name, phone, email, passwordHash });
        res.status(201).json({ id: newUser.id, name: newUser.name });
    } catch (err) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.passwordHash as string);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { name: user.name, phone: user.phone, id: user.id } });
    } catch (err) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

export default router;
