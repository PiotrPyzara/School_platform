const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const AuthCode = require('../models/authCodeModel');
const { decrypt } = require('../utils/aes');
const { version } = require('../../package.json');

// GET: formularz logowania
exports.getLogin = (req, res) => {
  if(req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { error: null, version, pageTitle: 'Logowanie' });
};

// POST: logowanie z kodem (wspiera kody reaktywacyjne!)
exports.postLogin = async (req, res) => {
  const { login, password, authCode } = req.body;

  // Szukamy użytkownika
  const user = await User.findOne({ login }).populate('facilities.facilityId');
  if (!user) {
    return res.status(401).render('auth/login', {
      error: 'Nieprawidłowy login, hasło lub kod',
      version,
      pageTitle: 'Logowanie'
    });
  }

  // Sprawdzamy hasło
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).render('auth/login', {
      error: 'Nieprawidłowy login, hasło lub kod',
      version,
      pageTitle: 'Logowanie'
    });
  }

  // Konto aktywne – klasyczne logowanie
  if (user.active) {
    // Sprawdzamy kod autoryzacyjny miesięczny i root
    const monthlyCodeEntry = await AuthCode.findOne({ type: 'monthly' });
    const rootCodeEntry = await AuthCode.findOne({ type: 'root' });

    let decryptedMonthlyCode = null;
    let decryptedRootCode = null;

    try {
      if (monthlyCodeEntry) {
        decryptedMonthlyCode = decrypt(monthlyCodeEntry.encryptedCode, monthlyCodeEntry.iv);
      }
      if (rootCodeEntry) {
        decryptedRootCode = decrypt(rootCodeEntry.encryptedCode, rootCodeEntry.iv);
      }
    } catch (err) {
      return res.status(500).render('auth/login', {
        error: 'Błąd podczas weryfikacji kodu',
        version,
        pageTitle: 'Logowanie'
      });
    }

    // Sprawdzamy kod w zależności od typu użytkownika
    const isRoot = user.roles?.includes('headAdmin');
    if (isRoot) {
      if (authCode !== decryptedMonthlyCode && authCode !== decryptedRootCode) {
        return res.status(401).render('auth/login', {
          error: 'Nieprawidłowy kod autoryzacyjny',
          version,
          pageTitle: 'Logowanie'
        });
      }
    } else {
      if (authCode !== decryptedMonthlyCode) {
        return res.status(401).render('auth/login', {
          error: 'Nieprawidłowy kod autoryzacyjny',
          version,
          pageTitle: 'Logowanie'
        });
      }
    }

    // Wszystko się zgadza – logujemy
    req.session.user = user;
    req.session.isLoggedIn = true;
    return res.redirect('/dashboard');
  }

  // === KONTO NIEAKTYWNE ===
  // Szukamy kodu reaktywacyjnego powiązanego z tym userem
  const deactivationCodeEntry = await AuthCode.findOne({ type: 'deactivation', userId: user._id });
  let decryptedDeactivationCode = null;
  if (deactivationCodeEntry) {
    try {
      decryptedDeactivationCode = decrypt(deactivationCodeEntry.encryptedCode, deactivationCodeEntry.iv);
    } catch (err) {
      return res.status(500).render('auth/login', {
        error: 'Błąd podczas weryfikacji kodu reaktywacyjnego',
        version,
        pageTitle: 'Logowanie'
      });
    }
  }

  // Jeśli NIE MA kodu deaktywacyjnego lub jest błędny
  if (!deactivationCodeEntry || authCode !== decryptedDeactivationCode) {
    return res.status(401).render('auth/login', {
      error: 'To konto jest nieaktywne. Skontaktuj się z administratorem, aby je aktywować lub uzyskać dostęp.',
      version,
      pageTitle: 'Logowanie'
    });
  }

  // **Kod jest poprawny – pozwalamy się zalogować jako nieaktywny**
  req.session.user = user;
  req.session.isLoggedIn = true;

  // Opcjonalnie możesz dodać specjalną flagę do sesji: req.session.loggedWithDeactivationCode = true;

  return res.redirect('/dashboard');
};

// Wylogowanie
exports.postLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Błąd przy wylogowaniu' });
    return res.redirect('/');
  });
};
