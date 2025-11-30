const bcrypt = require('bcrypt');
const AuthCode = require('../../models/authCodeModel');
const User = require('../../models/userModel');
const SystemSettings = require('../../models/systemSettingsModel');
const { encrypt, decrypt } = require('../../utils/aes');
const generateCode = require('../../utils/generateCode');
const { hasRole, hasAnyRole } = require('../../utils/permissions');

// GET: Strona ustawień
exports.getSettings = async (req, res) => {
  try {
    let currentMonthCode = '';
    let currentRootCode = '';

    // Zawsze pokazuj kod miesięczny jeśli istnieje
    const monthCodeDoc = await AuthCode.findOne({ type: 'monthly' });
    if (monthCodeDoc?.encryptedCode && monthCodeDoc?.iv) {
      currentMonthCode = decrypt(monthCodeDoc.encryptedCode, monthCodeDoc.iv);
    }

    // Kod root tylko dla headAdmin
    if (hasRole(res.locals.user, 'headAdmin')) {
      const rootCodeDoc = await AuthCode.findOne({ type: 'root' });
      if (rootCodeDoc?.encryptedCode && rootCodeDoc?.iv) {
        currentRootCode = decrypt(rootCodeDoc.encryptedCode, rootCodeDoc.iv);
      }
    }

    const settings = await SystemSettings.findOne({}) || {};

    res.render('dashboard/settings/index', {
      pageTitle: 'Organizacja - Ustawienia',
      currentView: 'settings',
      currentMonthCode,
      currentRootCode,
      settings
    });
  } catch (err) {
    console.error('Błąd podczas ładowania ustawień:', err);
    res.status(500).render('error', {
      message: 'Błąd ładowania ustawień.',
      pageTitle: 'Błąd'
    });
  }
};

// POST: Zmiana hasła użytkownika
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(res.locals.user._id);

  if (!user) {
    req.session.flash = { type: 'danger', message: 'Nie znaleziono użytkownika.' };
    return res.redirect('/dashboard/settings');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    req.session.flash = { type: 'danger', message: 'Nieprawidłowe aktualne hasło.' };
    return res.redirect('/dashboard/settings');
  }

  if (newPassword !== confirmPassword) {
    req.session.flash = { type: 'danger', message: 'Nowe hasła nie są zgodne.' };
    return res.redirect('/dashboard/settings');
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  await user.save();

  req.session.flash = { type: 'success', message: 'Hasło zostało zmienione.' };
  res.redirect('/dashboard/settings');
};

// POST: Zmiana kodu miesięcznego
exports.updateMonthCode = async (req, res) => {
  const { monthCode } = req.body;

  try {
    const { encryptedData, iv } = encrypt(monthCode);
    await AuthCode.findOneAndUpdate(
      { type: 'monthly' },
      { encryptedCode: encryptedData, iv, updatedAt: new Date() },
      { upsert: true }
    );
    req.session.flash = { type: 'success', message: 'Kod miesięczny został zmieniony.' };
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Nie udało się zaktualizować kodu miesięcznego.' };
  }

  res.redirect('/dashboard/settings');
};

// POST: Zmiana kodu root (tylko headAdmin)
exports.updateRootCode = async (req, res) => {
  const { rootCode, adminPassword } = req.body;
  const user = await User.findById(res.locals.user._id);

  if (!user || !hasRole(user, 'headAdmin')) {
    req.session.flash = { type: 'danger', message: 'Brak uprawnień do zmiany kodu root.' };
    return res.redirect('/dashboard/settings');
  }

  const isMatch = await bcrypt.compare(adminPassword, user.password);
  if (!isMatch) {
    req.session.flash = { type: 'danger', message: 'Błędne hasło administratora.' };
    return res.redirect('/dashboard/settings');
  }

  try {
    const { encryptedData, iv } = encrypt(rootCode);
    await AuthCode.findOneAndUpdate(
      { type: 'root' },
      { encryptedCode: encryptedData, iv, updatedAt: new Date() },
      { upsert: true }
    );
    req.session.flash = { type: 'success', message: 'Kod root został zmieniony.' };
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Błąd podczas zapisu kodu root.' };
  }

  res.redirect('/dashboard/settings');
};

// POST: Uniwersalna konfiguracja wszystkich kodów
exports.updateCodesConfig = async (req, res) => {
  const {
    monthlyLength, monthlyAlpha, monthlyAuto,
    rootLength, rootAlpha, rootAuto,
    deactivationLength, deactivationAlpha, deactivationAuto
  } = req.body;

  try {
    await SystemSettings.findOneAndUpdate(
      {},
      {
        monthlyCode: {
          length: parseInt(monthlyLength) || 6,
          useAlphanumeric: !!monthlyAlpha,
          autoGenerate: !!monthlyAuto
        },
        rootCode: {
          length: parseInt(rootLength) || 10,
          useAlphanumeric: !!rootAlpha,
          autoGenerate: !!rootAuto
        },
        deactivationCode: {
          length: parseInt(deactivationLength) || 8,
          useAlphanumeric: !!deactivationAlpha,
          autoGenerate: !!deactivationAuto
        }
      },
      { upsert: true }
    );

    req.session.flash = { type: 'success', message: 'Ustawienia kodów zostały zapisane.' };
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Nie udało się zapisać ustawień.' };
  }

  res.redirect('/dashboard/settings');
};

// POST: Generowanie kodu miesięcznego zgodnie z nowymi ustawieniami
exports.generateMonthCode = async (req, res) => {
  try {
    const settings = await SystemSettings.findOne({});
    const monthly = settings?.monthlyCode || {};
    const codeLength = monthly.length || 6;
    const isAlphanumeric = monthly.useAlphanumeric || false;

    const newCode = generateCode(codeLength, isAlphanumeric);
    const { encryptedData, iv } = encrypt(newCode);

    await AuthCode.findOneAndUpdate(
      { type: 'monthly' },
      { encryptedCode: encryptedData, iv, updatedAt: new Date() },
      { upsert: true }
    );

    req.session.flash = { type: 'success', message: `Wygenerowano nowy kod miesięczny: ${newCode}` };
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Nie udało się wygenerować kodu.' };
  }

  res.redirect('/dashboard/settings');
};
