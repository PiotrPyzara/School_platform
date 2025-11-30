const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const facilitySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  type: {
    type: String,
    enum: ['preschool', 'school', 'nursery', 'counseling'],
    required: true
  },
  groups: {
    type: [String],
    default: []
  },
  workersCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Facility', facilitySchema);
