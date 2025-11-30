// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  login: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  roles: { type: [String], default: [] },
  permissions: { type: [String], default: [] },
  specializations: { type: [String], default: [] },
  workingHours: { type: [String], default: [] },
  facilities: [{
    facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    fullTimeHours: { type: Number, default: 0 },
    additionalHours: { type: Number, default: 0 },
    assignedGroups: { type: [String], default: [] },
  }],
  active: { type: Boolean, default: true }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
