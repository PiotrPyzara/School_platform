const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scheduleSchema = new Schema({
  teacherId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facilityId: {
    type: Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  date: {
    type: Date,
    required: true // 🆕 data konkretnego dnia tygodnia np. 2025-06-17
  },
  startTime: {
    type: String,
    required: true // np. "08:00"
  },
  endTime: {
    type: String,
    required: true // np. "08:45"
  },
  room: {
    type: String,
    default: ''
  },
  lessonDescription: {
    type: String,
    required: true
  },
  assignedGroup: {
    type: String,
    default: '' // np. "Klasa 2A", "Grupa Pszczółki"
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Schedule', scheduleSchema);
