const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require('../middleware/auth');

// Get security events (audit logs)
router.get('/events', authenticateUser, requireRole(['employer']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get audit logs
    const events = await req.db.collection('auditLogs')
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get statistics
    const stats = await req.db.collection('auditLogs').aggregate([
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          suspiciousEvents: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'SUSPICIOUS_REQUEST'] },
                1,
                0
              ]
            }
          },
          failedLogins: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'LOGIN_FAILED'] },
                1,
                0
              ]
            }
          },
          successfulLogins: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'LOGIN_SUCCESS'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const statsData = stats[0] || {
      totalEvents: 0,
      suspiciousEvents: 0,
      failedLogins: 0,
      successfulLogins: 0
    };

    res.json({
      success: true,
      events,
      stats: statsData
    });

  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security events'
    });
  }
});

// Get security statistics
router.get('/stats', authenticateUser, requireRole(['employer']), async (req, res) => {
  try {
    const stats = await req.db.collection('auditLogs').aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const statsByType = {};
    stats.forEach(stat => {
      statsByType[stat._id] = stat.count;
    });

    res.json({
      success: true,
      stats: statsByType
    });

  } catch (error) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security statistics'
    });
  }
});

// Get recent suspicious activities
router.get('/suspicious', authenticateUser, requireRole(['employer']), async (req, res) => {
  try {
    const suspiciousEvents = await req.db.collection('auditLogs')
      .find({
        eventType: { $in: ['SUSPICIOUS_REQUEST', 'LOGIN_FAILED'] }
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    res.json({
      success: true,
      events: suspiciousEvents
    });

  } catch (error) {
    console.error('Error fetching suspicious events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suspicious events'
    });
  }
});

module.exports = router; 