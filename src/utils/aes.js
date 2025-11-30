require('dotenv').config();
const crypto = require('crypto');
const SECRET = process.env.AUTH_SECRET;

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return { encryptedData: encrypted, iv: iv.toString('hex') };
}

function decrypt(encryptedData, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
