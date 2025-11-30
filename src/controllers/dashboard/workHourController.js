const WorkHourEntry = require('../../models/workHourEntryModel');
const Facility = require('../../models/facilityModel');
const User = require('../../models/userModel');
const dayjs = require('dayjs');

// Lista godzin pracownika (dla siebie)
exports.getMyHours = async (req, res) => {
  const user = res.locals.user;

  const { month, year } = req.query;
  const now = dayjs();
  const currentMonth = month ? parseInt(month) : now.month() + 1; // month: 1–12
  const currentYear = year ? parseInt(year) : now.year();

  const start = dayjs(`${currentYear}-${currentMonth}-01`).startOf('month');
  const end = start.endOf('month');

  const hours = await WorkHourEntry.find({
    userId: user._id,
    date: { $gte: start.toDate(), $lte: end.toDate() }
  }).populate('facilityId').lean();

  // Sumowanie godzin po typie
  const summary = {};
  hours.forEach(h => {
    summary[h.hoursType] = (summary[h.hoursType] || 0) + h.hours;
  });

  res.render('dashboard/workhours/me', {
    pageTitle: 'Moje godziny pracy',
    currentView: 'working-hours',
    hours,
    summary,
    month: currentMonth,
    year: currentYear
  });
};

// Dodanie wpisu przez dyrekcję/admina
exports.addWorkHourEntry = async (req, res) => {
  try {
    const { userId, facilityId, date, startTime, endTime, hoursType, note } = req.body;

    // Automatyczne liczenie liczby godzin
    const start = dayjs(`${date}T${startTime}`);
    const end = dayjs(`${date}T${endTime}`);
    const hours = parseFloat((end.diff(start, 'minute') / 60).toFixed(2));

    if (hours <= 0) {
      req.session.flash = { type: 'danger', message: 'Godzina końca musi być później niż początek!' };
      return res.redirect('back');
    }

    await WorkHourEntry.create({
      userId,
      facilityId,
      date,
      startTime,
      endTime,
      hours,
      hoursType,
      note
    });

    req.session.flash = { type: 'success', message: 'Wpis godzin dodany.' };
    res.redirect('back');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'danger', message: 'Błąd przy dodawaniu wpisu.' };
    res.redirect('back');
  }
};

// Widok wprowadzania dla admina/dyrekcji (lista + formularz)
exports.getAddHoursView = async (req, res) => {
  const facilities = await Facility.find().lean();
  const users = await User.find({ active: true }).lean();
  res.render('dashboard/workhours/add', { facilities, users, pageTitle: 'Dodaj godziny pracy',currentView: 'working-hours' });
};

exports.getMainView = (req, res) => {
  res.render('dashboard/workhours/index', {
    pageTitle: 'Godziny pracy',
    currentView: 'working-hours',
    user: res.locals.user // <-- musi być przekazany!
  });
};
