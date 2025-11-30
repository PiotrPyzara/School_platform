const AuthCode = require('../models/authCodeModel');
const { encrypt } = require('./aes');

// Generuje losowy 6-cyfrowy kod (np. 748295)
function generateRandomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 📅 GENERUJ KOD MIESIĘCZNY
async function generateMonthlyCode() {
  const code = generateRandomCode();
  const { encryptedData, iv } = encrypt(code);

  await AuthCode.findOneAndUpdate(
    { type: 'monthly' },
    { encryptedCode: encryptedData, iv, createdAt: new Date() },
    { upsert: true }
  );

  console.log(`✅ Kod miesięczny zapisany: ${code}`);
  return code;
}

// 🔐 USTAW RĘCZNIE KOD ROOT (np. 'superhaslo123')
async function setRootCode(code) {
  const { encryptedData, iv } = encrypt(code);

  await AuthCode.findOneAndUpdate(
    { type: 'root' },
    { encryptedCode: encryptedData, iv, createdAt: new Date() },
    { upsert: true }
  );

  console.log(`✅ Kod root został zapisany.`);
}

// 🔐 WYGENERUJ LOSOWY KOD ROOT (opcjonalnie – np. do testów)
async function generateRootCode() {
  const code = generateRandomCode();
  await setRootCode(code);
  console.log(`✅ Kod root zapisany (losowy): ${code}`);
  return code;
}

module.exports = {
  generateMonthlyCode,
  setRootCode,
  generateRootCode,
};
