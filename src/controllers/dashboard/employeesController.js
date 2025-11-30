const Employee = require('../../models/userModel');
const Facility = require('../../models/facilityModel');
const { roleLabels } = require('../../utils/labels');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const AuthCode = require('../../models/authCodeModel');
const generateCode = require('../../utils/generateCode');
const { encrypt, decrypt } = require('../../utils/aes');

// GET: Lista pracowników
exports.getEmployees = async (req, res) => {
  try {
    const roles = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));
    const filter = {};

    // Filtrowanie po imieniu/nazwisku
    if (req.query.name && req.query.name.trim() !== '') {
      const regex = new RegExp(req.query.name.trim(), 'i');
      filter.$or = [{ name: regex }, { surname: regex }];
    }
    // Filtrowanie po placówce
    if (req.query.facility && req.query.facility.trim() !== '') {
      filter['facilities.facilityId'] = req.query.facility;
    }
    // Filtrowanie po roli
    if (req.query.role && req.query.role.trim() !== '') {
      filter.roles = req.query.role;
    }
    // Filtrowanie po statusie aktywności
    if (req.query.status === 'active') {
      filter.active = true;
    } else if (req.query.status === 'inactive') {
      filter.active = false;
    }
    // UWAGA: jak status pusty/wszystkie, nie dodawaj nic do filtra

    const [employees, facilities] = await Promise.all([
      Employee.find(filter).populate('facilities.facilityId').lean(),
      Facility.find().lean()
    ]);
    const employeesWithFullName = employees.map(emp => ({
      ...emp,
      fullName: emp.name + ' ' + emp.surname
    }));

    res.render('dashboard/employees/index', {
      pageTitle: 'Organizacja - Pracownicy',
      currentView: 'employees',
      employees: employeesWithFullName,
      facilities,
      roles,
      roleLabels,
      searchQuery: req.query.name || '',
      selectedFacility: req.query.facility || '',
      selectedRole: req.query.role || '',
      statusFilter: req.query.status || '', // <-- DODAJ TO!
      error: null
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard/employees/index', {
      pageTitle: 'Organizacja - Pracownicy',
      currentView: 'employees',
      employees: [],
      facilities: [],
      roles: [],
      roleLabels,
      searchQuery: req.query.name || '',
      selectedFacility: req.query.facility || '',
      selectedRole: req.query.role || '',
      statusFilter: req.query.status || '', // <-- DODAJ TO!
      error: 'Wystąpił błąd podczas pobierania danych.'
    });
  }
};


// GET: Formularz tworzenia
exports.getCreateEmployee = async (req, res) => {
  try {
    const facilities = await Facility.find().lean();
    const roles = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));
    res.render('dashboard/employees/newUser', {
      pageTitle: 'Organizacja - Dodaj pracownika',
      currentView: 'employees',
      facilities,
      roles
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard/employees/newUser', {
      pageTitle: 'Organizacja - Dodaj pracownika',
      currentView: 'employees',
      facilities: [],
      roles: [],
      error: 'Nie udało się załadować danych do formularza.'
    });
  }
};

// POST: Tworzenie użytkownika
exports.postCreateEmployee = async (req, res) => {
  try {
    const { name, surname, roles = [], facilities = {} } = req.body;
    const loginBase = (name[0] + surname).toLowerCase();
    const login = loginBase + Math.floor(100 + Math.random() * 900);
    const rawPassword = crypto.randomBytes(4).toString('hex');
    const specializations = parseTagifyValues(req.body.specializations);
    const workingHours = parseTagifyValues(req.body.workingHours);
    const facilitiesData = Object.entries(facilities)
      .filter(([id, data]) => mongoose.Types.ObjectId.isValid(id) && typeof data === 'object')
      .map(([id, data]) => ({
        facilityId: new mongoose.Types.ObjectId(id),
        fullTimeHours: parseInt(data.fullTimeHours) || 0,
        additionalHours: parseInt(data.additionalHours) || 0,
        assignedGroups: Array.isArray(data.assignedGroups) ? data.assignedGroups : []
      }));

    const newEmployee = new Employee({
      name,
      surname,
      login,
      password: rawPassword,
      roles: Array.isArray(roles) ? roles : [roles],
      specializations,
      workingHours,
      facilities: facilitiesData
    });

    await newEmployee.save();

    req.session.createdEmployee = {
      id: newEmployee._id,
      rawPassword
    };

    req.session.flash = {
      type: 'success',
      message: 'Pracownik został dodany pomyślnie.'
    };

    res.redirect('/dashboard/employees/created');
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd podczas tworzenia pracownika. Sprawdź dane i spróbuj ponownie.'
    };
    res.redirect('/dashboard/employees');
  }
};

function parseTagifyValues(raw) {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.map(item => item.value).filter(Boolean);
    }
  } catch (e) {}
  return [];
}

exports.getCreatedEmployeeSummary = async (req, res) => {
  try {
    const { createdEmployee } = req.session;
    if (!createdEmployee || !createdEmployee.id) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono utworzonego użytkownika.'
      };
      return res.redirect('/dashboard/employees');
    }

    const employee = await Employee.findById(createdEmployee.id).lean();
    if (!employee) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono utworzonego użytkownika.'
      };
      return res.redirect('/dashboard/employees');
    }

    const rawPassword = createdEmployee.rawPassword;
    delete req.session.createdEmployee;

    res.render('dashboard/employees/created', {
      pageTitle: 'Użytkownik utworzony',
      currentView: 'employees',
      newEmployee: employee,
      rawPassword
    });
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd podczas ładowania podsumowania.'
    };
    res.redirect('/dashboard/employees');
  }
};

exports.getEditEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id).populate('facilities.facilityId').lean();
    if (!employee) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono pracownika.'
      };
      return res.redirect('/dashboard/employees');
    }
    if (Array.isArray(employee.facilities)) {
      employee.facilities = employee.facilities.filter(f => f.facilityId !== null);
    }
    const facilities = await Facility.find().lean();
    const roles = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

    res.render('dashboard/employees/editEmployee', {
      pageTitle: `Edytuj pracownika - ${employee.name} ${employee.surname}`,
      currentView: 'employees',
      employee,
      facilities,
      roles
    });
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd podczas ładowania formularza edycji.'
    };
    res.redirect('/dashboard/employees');
  }
};

exports.postEditEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, roles = [], facilities = {} } = req.body;
    const specializations = parseTagifyValues(req.body.specializations);
    const workingHours = parseTagifyValues(req.body.workingHours);
    const facilitiesData = Object.entries(facilities)
      .filter(([id, data]) => mongoose.Types.ObjectId.isValid(id) && typeof data === 'object')
      .map(([id, data]) => ({
        facilityId: new mongoose.Types.ObjectId(id),
        fullTimeHours: parseInt(data.fullTimeHours) || 0,
        additionalHours: parseInt(data.additionalHours) || 0,
        assignedGroups: Array.isArray(data.assignedGroups) ? data.assignedGroups : []
      }));

    const updated = await Employee.findByIdAndUpdate(id, {
      name,
      surname,
      roles: Array.isArray(roles) ? roles : [roles],
      specializations,
      workingHours,
      facilities: facilitiesData
    });

    if (!updated) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono pracownika do aktualizacji.'
      };
      return res.redirect('/dashboard/employees');
    }

    req.session.flash = {
      type: 'success',
      message: 'Dane pracownika zostały zaktualizowane.'
    };

    res.redirect('/dashboard/employees');
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Wystąpił błąd przy aktualizacji pracownika.'
    };
    res.redirect('/dashboard/employees');
  }
};

exports.getEmployeeDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Employee.findById(userId)
      .populate('facilities.facilityId')
      .lean();

    if (!user) {
      req.session.flash = {
        type: 'danger',
        message: 'Pracownik nie został znaleziony.'
      };
      return res.redirect('/dashboard/employees');
    }

    user.fullName = `${user.name} ${user.surname}`;

    res.render('dashboard/employees/show', {
      employee: user,
      pageTitle: `Szczegóły pracownika – ${user.name} ${user.surname}`,
      currentView: 'employees',
      userSession: req.user || {},
      userRoles: req.user?.roles || [],
      roleLabels
    });

  } catch (err) {
    console.error('Błąd ładowania szczegółów pracownika:', err);
    req.session.flash = {
      type: 'danger',
      message: 'Wystąpił błąd serwera.'
    };
    res.redirect('/dashboard/employees');
  }
};

// POST: Resetowanie hasła
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const newPassword = crypto.randomBytes(4).toString('hex'); // 8 znaków

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updated = await Employee.findByIdAndUpdate(id, { password: hashedPassword });

    if (!updated) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono użytkownika do zresetowania hasła.'
      };
      return res.redirect('/dashboard/employees');
    }

    req.session.resetPassword = {
      id,
      rawPassword: newPassword
    };

    req.session.flash = {
      type: 'success',
      message: 'Hasło zostało zresetowane. Nowe hasło jest dostępne w podsumowaniu.'
    };

    res.redirect(`/dashboard/employees/${id}/reset-summary`);
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd resetowania hasła użytkownika.'
    };
    res.redirect('/dashboard/employees');
  }
};

// GET: Podsumowanie resetu
exports.resetPasswordSummary = async (req, res) => {
  const { resetPassword } = req.session;

  if (!resetPassword || resetPassword.id !== req.params.id) {
    req.session.flash = {
      type: 'danger',
      message: 'Nie znaleziono użytkownika do podsumowania resetu.'
    };
    return res.redirect('/dashboard/employees');
  }

  const employee = await Employee.findById(resetPassword.id).lean();
  const rawPassword = resetPassword.rawPassword;

  delete req.session.resetPassword;

  res.render('dashboard/employees/reset-summary', {
    pageTitle: 'Hasło zresetowane',
    currentView: 'employees',
    employee,
    rawPassword
  });
};

// POST: Deaktywuj pracownika i wygeneruj kod dostępowy
exports.deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Oznacz konto jako nieaktywne
    const employee = await Employee.findByIdAndUpdate(id, { active: false }, { new: true });
    if (!employee) {
      req.session.flash = { type: 'danger', message: 'Nie znaleziono pracownika.' };
      return res.redirect('/dashboard/employees');
    }

    // Usuń stare kody dostępu dla tego usera (typu deactivation)
    await AuthCode.deleteMany({ type: 'deactivation', userId: employee._id });

    // Ustawienia kodu (z systemSettings)
    const settings = await require('../../models/systemSettingsModel').findOne({});
    const codeConfig = settings?.deactivationCode || { length: 8, useAlphanumeric: false };

    // Wygeneruj kod
    const accessCode = generateCode(codeConfig.length, codeConfig.useAlphanumeric);

    // Zaszyfruj kod
    const { encryptedData, iv } = encrypt(accessCode);

    // Zapisz kod w bazie
    await AuthCode.create({
      type: 'deactivation',
      encryptedCode: encryptedData,
      iv,
      userId: employee._id,
      createdAt: new Date(),
      expiresAt: null // lub możesz ustawiać czas ważności jeśli chcesz
    });

    // FLASH: tylko informacja (kod pojawi się w podsumowaniu)
    req.session.flash = {
      type: 'success',
      message: 'Pracownik został zdezaktywowany. Kod dostępowy został wygenerowany i wyświetlony w podsumowaniu.'
    };

    // TU: zapisujemy info do sesji na podsumowanie!
    req.session.deactivationEmployee = {
      id: employee._id.toString(),
      accessCode
    };

    // Przekierowanie do podsumowania (gdzie wyświetlisz kod jawnie)
    res.redirect(`/dashboard/employees/${employee._id}/deactivation-summary`);
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Błąd podczas deaktywacji pracownika.' };
    res.redirect('/dashboard/employees');
  }
};

// GET: Widok podsumowania deaktywacji i kodu dostępowego
exports.deactivationSummary = async (req, res) => {
  const { deactivationEmployee } = req.session;
  if (!deactivationEmployee || deactivationEmployee.id !== req.params.id) {
    req.session.flash = {
      type: 'danger',
      message: 'Nie znaleziono użytkownika do podsumowania dezaktywacji.'
    };
    return res.redirect('/dashboard/employees');
  }

  const employee = await Employee.findById(deactivationEmployee.id).lean();
  const accessCode = deactivationEmployee.accessCode;
  delete req.session.deactivationEmployee;

  res.render('dashboard/employees/deactivated', {
    pageTitle: 'Konto zdezaktywowane',
    currentView: 'employees',
    employee,
    accessCode
  });
};

// POST: Aktywuj pracownika (reaktywacja konta)
exports.activateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByIdAndUpdate(id, { active: true }, { new: true });
    if (!employee) {
      req.session.flash = { type: 'danger', message: 'Nie znaleziono pracownika.' };
      return res.redirect('/dashboard/employees');
    }

    // Usuwamy kod dostępowy (niepotrzebny już)
    await AuthCode.deleteMany({ type: 'deactivation', userId: employee._id });

    req.session.flash = { type: 'success', message: 'Konto pracownika zostało aktywowane.' };
    res.redirect('/dashboard/employees');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Błąd podczas aktywacji pracownika.' };
    res.redirect('/dashboard/employees');
  }
};

// GET: Wyświetl kod deaktywacyjny dla nieaktywnego użytkownika
exports.showDeactivationCode = async (req, res) => {
  try {
    const { id } = req.params;

    // Znajdź użytkownika
    const employee = await Employee.findById(id).lean();
    if (!employee) {
      req.session.flash = { type: 'danger', message: 'Nie znaleziono pracownika.' };
      return res.redirect('/dashboard/employees');
    }
    if (employee.active) {
      req.session.flash = { type: 'danger', message: 'To konto jest aktywne i nie ma kodu deaktywacyjnego.' };
      return res.redirect(`/dashboard/employees/${id}`);
    }

    // Szukamy kodu deaktywacyjnego
    const codeEntry = await AuthCode.findOne({ type: 'deactivation', userId: employee._id });
    let deactivationCode = null;

    if (codeEntry) {
      try {
        deactivationCode = decrypt(codeEntry.encryptedCode, codeEntry.iv);
      } catch (err) {
        deactivationCode = 'Błąd odszyfrowania!';
      }
    } else {
      deactivationCode = 'Brak kodu!';
    }

    res.render('dashboard/employees/deactivation-code', {
      pageTitle: 'Kod deaktywacyjny',
      currentView: 'employees',
      employee,
      deactivationCode
    });
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Błąd podczas pobierania kodu deaktywacyjnego.' };
    res.redirect('/dashboard/employees');
  }
};

// POST: Wygeneruj nowy kod deaktywacyjny dla nieaktywnego użytkownika
exports.resetDeactivationCode = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id).lean();
    if (!employee) {
      req.session.flash = { type: 'danger', message: 'Nie znaleziono pracownika.' };
      return res.redirect('/dashboard/employees');
    }
    if (employee.active) {
      req.session.flash = { type: 'danger', message: 'To konto jest aktywne i nie ma kodu deaktywacyjnego.' };
      return res.redirect(`/dashboard/employees/${id}`);
    }

    // Usuń stary kod
    await AuthCode.deleteMany({ type: 'deactivation', userId: employee._id });

    // Wczytaj ustawienia systemowe dla długości i typu kodu
    const settings = await require('../../models/systemSettingsModel').findOne({});
    const codeConfig = settings?.deactivationCode || { length: 8, useAlphanumeric: false };

    // Wygeneruj i zaszyfruj nowy kod
    const accessCode = generateCode(codeConfig.length, codeConfig.useAlphanumeric);
    const { encryptedData, iv } = encrypt(accessCode);

    await AuthCode.create({
      type: 'deactivation',
      encryptedCode: encryptedData,
      iv,
      userId: employee._id,
      createdAt: new Date(),
      expiresAt: null
    });

    req.session.flash = {
      type: 'success',
      message: 'Nowy kod deaktywacyjny został wygenerowany!'
    };

    // Przekieruj z powrotem do widoku z kodem (teraz już nowy będzie widoczny)
    res.redirect(`/dashboard/employees/${employee._id}/deactivation-code`);
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Błąd podczas generowania kodu deaktywacyjnego.' };
    res.redirect('/dashboard/employees');
  }
};
