import { Router } from 'express';
import { Alert } from '../models/Alert.js';
import { Event } from '../models/Event.js';

const router = Router();

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      disasterType, 
      severity, 
      limit = 100, 
      page = 1,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (disasterType) query.disasterType = disasterType;
    if (severity) query.severity = severity;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Alert.countDocuments(query);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get active alerts (issued/active status)
router.get('/active', async (req, res) => {
  try {
    const alerts = await Alert.find({ 
      status: { $in: ['issued', 'active'] } 
    })
      .sort({ issuedAt: -1 })
      .limit(50)
      .lean();

    res.json({ alerts, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active alerts' });
  }
});

// Get single alert
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id).lean();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// Get alert with related events
router.get('/:id/full', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id).lean();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    const events = await Event.find({ _id: { $in: alert.eventIds } }).lean();
    
    res.json({ alert, events, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert details' });
  }
});

// Create new alert (for testing/manual creation)
router.post('/', async (req, res) => {
  try {
    const alert = await Alert.create(req.body);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('alert:issued', alert);
    }
    
    res.status(201).json({ alert, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update alert status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const update = { status };
    if (cancelReason) update.cancelReason = cancelReason;
    if (status === 'cancelled') update.cancelledAt = new Date();
    
    const alert = await Alert.findByIdAndUpdate(
      req.params.id, 
      update, 
      { new: true }
    ).lean();
    
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    // Emit real-time event
    if (req.io) {
      if (status === 'cancelled') {
        req.io.emit('alert:cancelled', { alertId: alert._id });
      } else {
        req.io.emit('alert:issued', alert);
      }
    }
    
    res.json({ alert, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add dispatch record to alert
router.post('/:id/dispatch', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $push: { dispatches: req.body } },
      { new: true }
    ).lean();
    
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    res.json({ alert, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export { router as alertsRouter };