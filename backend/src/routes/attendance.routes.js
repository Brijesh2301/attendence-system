const express = require('express');
const { body, query } = require('express-validator');
const {
  checkIn, checkOut, getTodayAttendance,
  getAttendance, getAttendanceStats, getAllAttendance,
} = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All routes require auth
router.use(authenticate);

router.get('/today', getTodayAttendance);
router.get('/stats', getAttendanceStats);
router.get('/all', authorize('manager', 'admin'), getAllAttendance);

router.get(
  '/',
  [
    query('from').optional().isDate().withMessage('from must be YYYY-MM-DD'),
    query('to').optional().isDate().withMessage('to must be YYYY-MM-DD'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  getAttendance
);

router.post(
  '/check-in',
  [body('notes').optional().isLength({ max: 500 }).withMessage('Notes max 500 chars')],
  validate,
  checkIn
);

router.patch('/check-out', checkOut);

module.exports = router;
