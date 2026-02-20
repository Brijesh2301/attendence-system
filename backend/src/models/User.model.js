const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,                   // Unique index on email
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,                  // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['employee', 'manager', 'admin'],
        message: 'Role must be employee, manager, or admin',
      },
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,                 // createdAt, updatedAt auto-managed
    toJSON: {
      transform(doc, ret) {
        delete ret.password;          // Never expose password in JSON
        delete ret.refreshTokens;     // Never expose tokens in JSON
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────
// userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ── Pre-save hook: hash password ──────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash if password field was modified
  if (!this.isModified('password')) return next();

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// ── Instance method: compare password ────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: clean expired refresh tokens ─────────────────
userSchema.methods.cleanExpiredTokens = function () {
  this.refreshTokens = this.refreshTokens.filter(
    (t) => t.expiresAt > new Date()
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
