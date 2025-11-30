const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workHourEntrySchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  date:       { type: Date, required: true },
  startTime:  { type: String, required: true }, // format HH:mm
  endTime:    { type: String, required: true }, // format HH:mm
  hours:      { type: Number, required: true }, // liczba godzin (wyliczana przed zapisaniem)
  hoursType:  { 
    type: String,
    enum: ['etatowe', 'dodatkowe'],
    required: true
  },
  note:       { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('WorkHourEntry', workHourEntrySchema);
