const mongoose = require('mongoose');

const codeSettingsSchema = new mongoose.Schema({
  length: {
    type: Number,
    default: 6,
    min: 4,
    max: 20
  },
  useAlphanumeric: {
    type: Boolean,
    default: false
  },
  autoGenerate: { // np. czy ma się generować automatycznie co miesiąc/deaktywacja
    type: Boolean,
    default: false
  }
}, { _id: false });

const systemSettingsSchema = new mongoose.Schema({
  monthlyCode: {
    type: codeSettingsSchema,
    default: () => ({})
  },
  rootCode: {
    type: codeSettingsSchema,
    default: () => ({})
  },
  deactivationCode: {
    type: codeSettingsSchema,
    default: () => ({})
  },
  lastMonthlyCodeGenerated: {
    type: Date
  },
  // Możesz dodać inne globalne ustawienia
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
