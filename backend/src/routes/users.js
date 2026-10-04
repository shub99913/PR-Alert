import { Router } from 'express';
import { User } from '../models/User.js';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { active, role, limit = 100, page = 1 } = req.query;
    const query = {};
    if (active !== undefined) query.active = active === 'true';
    if (role) query.roles = role;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ user, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.patch('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user location
router.patch('/:id/location', async (req, res) => {
  try {
    const { coordinates } = req.body; // [lon, lat]
    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 'location.coordinates': coordinates, lastActiveAt: new Date() },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add push token
router.post('/:id/push-tokens', async (req, res) => {
  try {
    const { token, platform } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { pushTokens: { token, platform, updatedAt: new Date() } },
        $set: { lastActiveAt: new Date() }
      },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update preferences
router.patch('/:id/preferences', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { preferences: req.body } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export { router as usersRouter };