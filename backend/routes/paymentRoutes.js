const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');

// Create a new payment
router.post('/', async (req, res) => {
  try {
    console.log('Received payment data:', req.body); // Debug log
    const payment = new Payment(req.body);
    await payment.save();
    res.json({ success: true, payment });
  } catch (err) {
    console.error('Payment save error:', err); // Debug log
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router; 

// Get summary grouped by paymentType and method
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.paidAt = {};
      if (startDate) matchStage.paidAt.$gte = new Date(startDate);
      if (endDate) matchStage.paidAt.$lte = new Date(endDate);
    }

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });

    const [byType, byMethod, totals] = await Promise.all([
      Payment.aggregate([
        ...pipeline,
        { $group: { _id: '$paymentType', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        ...pipeline,
        { $group: { _id: '$paymentMethod', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        ...pipeline,
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalCount: { $sum: 1 } } },
      ]),
    ]);

    const formatArrayToObject = (arr) => arr.reduce((acc, cur) => {
      acc[cur._id || 'unknown'] = { totalAmount: cur.totalAmount || 0, count: cur.count || 0 };
      return acc;
    }, {});

    res.json({
      success: true,
      summaryByType: formatArrayToObject(byType),
      summaryByMethod: formatArrayToObject(byMethod),
      totals: totals[0] || { totalRevenue: 0, totalCount: 0 },
      period: { startDate: startDate || null, endDate: endDate || null }
    });
  } catch (err) {
    console.error('Payment summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Monthly revenue summary (grouped by month for a given year)
router.get('/summary/monthly', async (req, res) => {
  try {
    const { year, paymentType } = req.query;
    const selectedYear = parseInt(year, 10) || new Date().getFullYear();

    const startOfYear = new Date(Date.UTC(selectedYear, 0, 1));
    const startOfNextYear = new Date(Date.UTC(selectedYear + 1, 0, 1));

    const matchStage = {
      paidAt: { $gte: startOfYear, $lt: startOfNextYear },
    };
    if (paymentType && typeof paymentType === 'string' && paymentType !== 'all') {
      matchStage.paymentType = paymentType;
    }

    const byMonth = await Payment.aggregate([
      { $match: matchStage },
      { $group: { _id: { $month: '$paidAt' }, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]);

    // Normalize to all 12 months
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const found = byMonth.find(m => m._id === i + 1);
      return { month: i + 1, totalAmount: found ? found.totalAmount : 0, count: found ? found.count : 0 };
    });

    res.json({ success: true, year: selectedYear, paymentType: paymentType || 'all', monthly });
  } catch (err) {
    console.error('Payment monthly summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});