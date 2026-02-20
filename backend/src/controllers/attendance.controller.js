const Attendance = require('../models/Attendance.model');
const {
  sendSuccess, sendCreated, sendError, sendNotFound, sendServerError,
} = require('../utils/response.utils');

// Helper: get today as 'YYYY-MM-DD' string (UTC)
const todayString = () => new Date().toISOString().split('T')[0];

/**
 * POST /api/attendance/check-in
 * No duplicate per user per day (enforced by unique compound index)
 */
const checkIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = todayString();
    const { notes } = req.body;

    // Check for existing record first (gives a friendly message before hitting the DB constraint)
    const existing = await Attendance.findOne({ user: userId, date: today });
    if (existing) {
      const checkInTime = existing.checkIn
        ? existing.checkIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'unknown';
      return sendError(
        res,
        `Attendance already marked for today (${today}). Checked in at ${checkInTime}.`,
        409
      );
    }

    const record = await Attendance.create({
      user: userId,
      date: today,
      checkIn: new Date(),
      status: 'present',
      notes: notes || null,
    });

    await record.populate('user', 'name email role');

    return sendCreated(res, { attendance: record }, 'Checked in successfully');
  } catch (error) {
    // Fallback: catch duplicate key from unique index
    if (error.code === 11000) {
      return sendError(res, 'Attendance already marked for today', 409);
    }
    console.error('Check-in error:', error);
    return sendServerError(res);
  }
};

/**
 * PATCH /api/attendance/check-out
 */
const checkOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = todayString();

    const record = await Attendance.findOne({ user: userId, date: today });

    if (!record) {
      return sendError(res, 'No check-in found for today. Please check in first.', 400);
    }
    if (record.checkOut) {
      return sendError(res, 'Already checked out for today', 409);
    }

    const now = new Date();
    const hoursWorked = (now - record.checkIn) / (1000 * 60 * 60);
    const status = hoursWorked >= 7 ? 'present' : 'half_day';

    record.checkOut = now;
    record.status = status;
    await record.save();
    await record.populate('user', 'name email role');

    return sendSuccess(res, { attendance: record }, 'Checked out successfully');
  } catch (error) {
    console.error('Check-out error:', error);
    return sendServerError(res);
  }
};

/**
 * GET /api/attendance/today
 */
const getTodayAttendance = async (req, res) => {
  try {
    const today = todayString();
    const record = await Attendance.findOne({ user: req.user._id, date: today });

    return sendSuccess(res, {
      today,
      attendance: record || null,
      isCheckedIn: !!record,
      isCheckedOut: !!(record && record.checkOut),
    });
  } catch {
    return sendServerError(res);
  }
};

/**
 * GET /api/attendance
 * Current user's history with optional date range filter + pagination
 */
const getAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { from, to, page = 1, limit = 30 } = req.query;

    const query = { user: userId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to)   query.date.$lte = to;
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'name email');

    return sendSuccess(res, {
      attendance: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return sendServerError(res);
  }
};

/**
 * GET /api/attendance/stats
 * Monthly stats using MongoDB aggregation pipeline
 */
const getAttendanceStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    // Build date range strings for the month
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const stats = await Attendance.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          total_days:   { $sum: 1 },
          present_days: { $sum: { $cond: [{ $eq: ['$status', 'present'] },  1, 0] } },
          absent_days:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] },   1, 0] } },
          half_days:    { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
          leave_days:   { $sum: { $cond: [{ $eq: ['$status', 'leave'] },    1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]);

    return sendSuccess(res, {
      stats: stats[0] || { total_days: 0, present_days: 0, absent_days: 0, half_days: 0, leave_days: 0 },
      period: { month, year },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return sendServerError(res);
  }
};

/**
 * GET /api/attendance/all  — manager/admin
 */
const getAllAttendance = async (req, res) => {
  try {
    const { date, page = 1, limit = 50 } = req.query;
    const query = {};
    if (date) query.date = date;

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'name email role');

    return sendSuccess(res, {
      attendance: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    return sendServerError(res);
  }
};

module.exports = {
  checkIn, checkOut, getTodayAttendance,
  getAttendance, getAttendanceStats, getAllAttendance,
};
