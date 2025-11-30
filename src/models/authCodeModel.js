// models/authCodeModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const authCodeSchema = new Schema({
  type: {
    type: String,
    enum: ['monthly', 'root', 'deactivation'],
    required: true
  },
  encryptedCode: { type: String, required: true },
  iv: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  userId: { type: Schema.Types.ObjectId, ref: 'User' } // dla deactivation
});

module.exports = mongoose.model('AuthCode', authCodeSchema);
