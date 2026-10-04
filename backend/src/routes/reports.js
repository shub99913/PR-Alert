import { Router } from 'express';
import { CrowdReport } from '../models/CrowdReport.js';

const router = Router();

// Get crowd reports
router.get('/', async (req, res) => {
  try {
    const { 
      disasterType, 
      severity, 
      status, 
      lat, 
      lon, 
      radius = 5000, 
      limit = 100, 
      page = 1,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (disasterType) query.disasterType = disasterType;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    let reports;
    let total;

    if (lat && lon) {
      // Geospatial query
      const coords = [parseFloat(lon), parseFloat(lat)];
      const radiusMeters = parseInt(radius);
      
      reports = await CrowdReport.find({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: coords },
            $maxDistance: radiusMeters,
          }
        }
      })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      total = await CrowdReport.countDocuments({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: coords },
            $maxDistance: radiusMeters,
          }
        }
      });
    } else {
      reports = await CrowdReport.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      total = await CrowdReport.countDocuments(query);
    }

    res.json({
      reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crowd reports' });
  }
});

// Get verified reports
router.get('/verified', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const reports = await CrowdReport.find({ 'verification.verified': true })
      .sort({ 'verification.verifiedAt': -1 })
      .limit(parseInt(limit))
      .lean();
    res.json({ reports, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verified reports' });
  }
});

// Get single report
router.get('/:id', async (req, res) => {
  try {
    const report = await CrowdReport.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Submit new crowd report
router.post('/', async (req, res) => {
  try {
    const report = await CrowdReport.create(req.body);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('crowd_report:new', report);
    }
    
    res.status(201).json({ report, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Vote on report
router.post('/:id/vote', async (req, res) => {
  try {
    const { userId, vote } = req.body; // vote: 'agree' | 'disagree'
    if (!['agree', 'disagree'].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote' });
    }

    const report = await CrowdReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Check if user already voted
    const existingVote = report.verification.votes?.find(v => v.userId === userId);
    if (existingVote) {
      return res.status(400).json({ error: 'Already voted' });
    }

    report.verification.votes = report.verification.votes || [];
    report.verification.votes.push({ userId, vote, timestamp: new Date() });

    if (vote === 'agree') {
      report.verification.agreeVotes++;
    } else {
      report.verification.disagreeVotes++;
    }
    report.verification.voteCount++;

    // Check for verification threshold
    const totalVotes = report.verification.agreeVotes + report.verification.disagreeVotes;
    if (totalVotes >= 5) {
      const agreeRatio = report.verification.agreeVotes / totalVotes;
      if (agreeRatio >= 0.6) {
        report.verification.verified = true;
        report.verification.verifiedBy = 'crowd';
        report.verification.verifiedAt = new Date();
        report.status = 'verified';
      } else if (agreeRatio <= 0.3) {
        report.status = 'rejected';
      }
    }

    await report.save();

    // Emit real-time event
    if (req.io) {
      req.io.emit('crowd_report:verified', report);
    }

    res.json({ 
      success: true, 
      votes: { agree: report.verification.agreeVotes, disagree: report.verification.disagreeVotes },
      status: report.status,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify report (official)
router.post('/:id/verify', async (req, res) => {
  try {
    const { verifiedBy, notes } = req.body;
    const report = await CrowdReport.findByIdAndUpdate(
      req.params.id,
      {
        'verification.verified': true,
        'verification.verifiedBy': verifiedBy,
        'verification.verifiedAt': new Date(),
        'verification.notes': notes,
        status: 'verified',
      },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (req.io) {
      req.io.emit('crowd_report:verified', report);
    }

    res.json({ report, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Escalate report
router.post('/:id/escalate', async (req, res) => {
  try {
    const { escalatedBy } = req.body;
    const report = await CrowdReport.findByIdAndUpdate(
      req.params.id,
      { status: 'escalated', escalatedBy, escalatedAt: new Date() },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ error: 'Report not found' });

    res.json({ report, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export { router as reportsRouter };