const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    date: {
      type: String,                
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'absent', 'half_day', 'leave'],
        message: 'Status must be present, absent, half_day, or leave',
      },
      default: 'present',
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────
// CRITICAL: Compound unique index — enforces NO DUPLICATE attendance per user per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ user: 1, date: -1 });   // Fast user history queries
attendanceSchema.index({ date: 1 });              // Fast date-based admin queries

// ── Virtual: hoursWorked ──────────────────────────────────────────
attendanceSchema.virtual('hoursWorked').get(function () {
  if (!this.checkIn || !this.checkOut) return null;
  const diff = this.checkOut - this.checkIn;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
