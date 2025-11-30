// scripts/createMainUser.js

const mongoose = require('mongoose');
const User = require('../src/models/userModel');
const AuthCode = require('../src/models/authCodeModel');
const { encrypt, decrypt } = require('../src/utils/aes');
require('dotenv').config();

// Generator kodów (np. 6-cyfrowy)
function generateSimpleCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function main() {
  // 1. Połącz się z bazą (nie korzystamy z app.js!)
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname';
  await mongoose.connect(dbUri);

  try {
    // 2. Tworzenie głównego użytkownika
    const login = process.env.MAIN_LOGIN || 'ppyzara123';
    const password = process.env.MAIN_PASSWORD || 'admin123'; // Na prod podaj przez ENV!
    const name = process.env.MAIN_NAME || 'Piotr';
    const surname = process.env.MAIN_SURNAME || 'Pyzara';
    const defaultFacilityId = process.env.FACILITY_ID || '6857c166fa9423bf425b7e6e'; // Popraw na realne

    const existingUser = await User.findOne({ login });
    if (!existingUser) {
      const user = new User({
        login,
        password,
        name,
        surname,
        roles: ['headAdmin'],
        permissions: ['root'],
        specializations: ['Psychiatra'],
        workingHours: ['8:00-12:00 - lekcje', '12:00-13:00 - dyżur'],
        facilities: [{
          facilityId: new mongoose.Types.ObjectId(defaultFacilityId),
          fullTimeHours: 20,
          additionalHours: 4,
          assignedGroups: []
        }]
      });

      await user.save();
      console.log('✅ Główny użytkownik utworzony.');
    } else {
      console.log('ℹ️ Użytkownik już istnieje.');
    }

    // 3. Kod root – tworzenie jeśli nie istnieje
    const existingRootCode = await AuthCode.findOne({ type: 'root' });
    if (!existingRootCode) {
      const plainRootCode = generateSimpleCode();
      const { encryptedData, iv } = encrypt(plainRootCode);

      await AuthCode.create({
        type: 'root',
        encryptedCode: encryptedData,
        iv,
        createdAt: new Date()
      });

      console.log('✅ Kod root został utworzony.');
      console.log('🔑 Twój tymczasowy root kod to:', plainRootCode);
    } else {
      const decrypted = decrypt(existingRootCode.encryptedCode, existingRootCode.iv);
      console.log('ℹ️ Kod root już istnieje. Odszyfrowany kod:', decrypted);
    }

    // 4. Kod miesięczny – tworzenie jeśli nie istnieje
    const existingMonthlyCode = await AuthCode.findOne({ type: 'monthly' });
    if (!existingMonthlyCode) {
      const plainMonthlyCode = generateSimpleCode();
      const { encryptedData, iv } = encrypt(plainMonthlyCode);

      await AuthCode.create({
        type: 'monthly',
        encryptedCode: encryptedData,
        iv,
        createdAt: new Date()
      });

      console.log('✅ Kod miesięczny został utworzony.');
      console.log('📆 Twój tymczasowy kod miesięczny to:', plainMonthlyCode);
    } else {
      const decrypted = decrypt(existingMonthlyCode.encryptedCode, existingMonthlyCode.iv);
      console.log('ℹ️ Kod miesięczny już istnieje. Odszyfrowany kod:', decrypted);
    }
  } catch (err) {
    console.error('❌ Błąd przy inicjalizacji:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
