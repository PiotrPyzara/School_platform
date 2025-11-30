const AuthCode = require('../models/authCodeModel');
const SystemSettings = require('../models/systemSettingsModel');
const { encrypt, decrypt } = require('./aes');
const generateCode = require('./generateCode'); // powinno mieć obsługę alfanumerycznych!

function isFromCurrentMonth(date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

async function ensureMonthlyCode() {
  try {
    // Pobierz ustawienia systemowe (mogą być null)
    const settings = await SystemSettings.findOne({}) || {};
    const codeLength = settings.defaultMonthlyCodeLength || 6;
    const useAlphanumeric = settings.useAlphanumeric || false;
    const autoGenerate = settings.autoGenerateMonthlyCode !== false; // domyślnie true

    // Jeśli auto-generate jest wyłączone, nie generuj kodu miesięcznego!
    if (!autoGenerate) {
      console.log('⏩ Automatyczne generowanie kodu miesięcznego jest wyłączone.');
      return;
    }

    const existingMonthly = await AuthCode.findOne({ type: 'monthly' });

    // Jeśli istnieje i jest aktualny – nie generujemy nowego
    if (existingMonthly && isFromCurrentMonth(existingMonthly.createdAt)) {
      const decrypted = decrypt(existingMonthly.encryptedCode, existingMonthly.iv);
      console.log('ℹ️  Kod miesięczny aktualny:', decrypted);
      return;
    }

    // Generuj nowy kod wg ustawień
    const newCode = generateCode(codeLength, useAlphanumeric);
    const { encryptedData, iv } = encrypt(newCode);

    await AuthCode.findOneAndUpdate(
      { type: 'monthly' },
      {
        encryptedCode: encryptedData,
        iv,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // Aktualizujemy timestamp w SystemSettings (opcja)
    await SystemSettings.findOneAndUpdate(
      {},
      { lastMonthlyCodeGenerated: new Date() },
      { upsert: true }
    );

    console.log('✅ Wygenerowano nowy kod miesięczny:', newCode);

  } catch (err) {
    console.error('❌ Błąd podczas generowania kodu miesięcznego:', err);
  }
}

module.exports = { ensureMonthlyCode };
