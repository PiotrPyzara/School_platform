const Schedule = require('../../models/scheduleModel');
const User = require('../../models/userModel');
const Facility = require('../../models/facilityModel');
const { hasAnyRole, hasRole } = require('../../utils/permissions');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const mongoose = require('mongoose');
require('dayjs/locale/pl');
dayjs.locale('pl');
dayjs.extend(isoWeek);

exports.getSchedule = async (req, res) => {
  try {
    const user = res.locals.user;
    const isAdmin = hasAnyRole(user, ['admin', 'headAdmin', 'director']);
    // const userIsTeacher = user.roles?.includes('teacher');
    const userIsTeacher = hasRole(user, 'teacher');

    // Obsługa trybu własnego grafiku przez admina/nauczyciela
    const isOwnView = req.query.isOwnView === '1' || req.query.isOwnView === 1;

    if (!isAdmin || isOwnView) {
      // Jeśli nauczyciel, lub admin/teacher wszedł w swój własny grafik
      let weekOffset = parseInt(req.query.weekOffset) || 0;
      let selectedDate = null;
      if (req.query.dateInput) {
        selectedDate = dayjs(req.query.dateInput);
        const today = dayjs().startOf('day');
        const selectedMonday = selectedDate.isoWeekday(1);
        const thisMonday = today.isoWeekday(1);
        weekOffset = selectedMonday.diff(thisMonday, 'week');
      }

      const monday = dayjs().isoWeekday(1).add(weekOffset, 'week');
      const sunday = monday.add(6, 'day');
      const formattedRange = `${monday.format('DD.MM')} - ${sunday.format('DD.MM.YYYY')}`;

      const schedules = await Schedule.find({
        teacherId: user._id,
        date: {
          $gte: monday.startOf('day').toDate(),
          $lte: sunday.endOf('day').toDate()
        }
      }).populate('teacherId facilityId').lean();

      const scheduleByDay = {};
      schedules.forEach(entry => {
        if (!scheduleByDay[entry.dayOfWeek]) {
          scheduleByDay[entry.dayOfWeek] = [];
        }
        scheduleByDay[entry.dayOfWeek].push(entry);
      });

      const weekDays = {
        1: 'Poniedziałek',
        2: 'Wtorek',
        3: 'Środa',
        4: 'Czwartek',
        5: 'Piątek',
        6: 'Sobota',
        7: 'Niedziela'
      };

      const teacherObj = {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        workingHours: user.workingHours,
        schedule: scheduleByDay
      };

      return res.render('dashboard/schedule/index', {
        pageTitle: 'Mój grafik',
        currentView: 'schedule',
        teachers: [teacherObj],
        weekDays,
        weekOffset,
        formattedRange,
        allFacilities: [],
        search: '',
        selectedFacilities: [],
        selectedDate: req.query.dateInput || '',
        fromDate: monday.startOf('day').format('YYYY-MM-DD'),
        toDate: sunday.endOf('day').format('YYYY-MM-DD'),
        isOwnView: true,
        userIsTeacher,
        isAdmin,
        userId: user._id
      });
    }

    // --- Admin/dyrektor/headAdmin: tryb pełny ---
    let weekOffset = parseInt(req.query.weekOffset) || 0;
    let selectedDate = null;

    if (req.query.dateInput) {
      selectedDate = dayjs(req.query.dateInput);
      const today = dayjs().startOf('day');
      const selectedMonday = selectedDate.isoWeekday(1);
      const thisMonday = today.isoWeekday(1);
      weekOffset = selectedMonday.diff(thisMonday, 'week');
    }

    const monday = dayjs().isoWeekday(1).add(weekOffset, 'week');
    const sunday = monday.add(6, 'day');
    const formattedRange = `${monday.format('DD.MM')} - ${sunday.format('DD.MM.YYYY')}`;

    const { search, facilities } = req.query;

    const schedules = await Schedule.find({
      date: {
        $gte: monday.startOf('day').toDate(),
        $lte: sunday.endOf('day').toDate()
      }
    }).populate('teacherId facilityId').lean();

    let filteredSchedules = schedules;

    if (search?.trim()) {
      const query = search.trim().toLowerCase();
      filteredSchedules = filteredSchedules.filter(s =>
        (s.teacherId.name + ' ' + s.teacherId.surname).toLowerCase().includes(query)
      );
    }

    const selectedFacilities = Array.isArray(facilities)
      ? facilities
      : facilities
      ? [facilities]
      : [];

    if (selectedFacilities.length > 0) {
      filteredSchedules = filteredSchedules.filter(s =>
        s.facilityId && selectedFacilities.includes(String(s.facilityId._id))
      );
    }

    // Grupowanie po nauczycielach i dniach tygodnia
    const grouped = {};
    filteredSchedules.forEach(entry => {
      const teacher = entry.teacherId;
      if (!teacher) return;

      if (!grouped[teacher._id]) {
        grouped[teacher._id] = {
          _id: teacher._id,
          name: teacher.name,
          surname: teacher.surname,
          workingHours: teacher.workingHours,
          schedule: {}
        };
      }

      if (!grouped[teacher._id].schedule[entry.dayOfWeek]) {
        grouped[teacher._id].schedule[entry.dayOfWeek] = [];
      }

      grouped[teacher._id].schedule[entry.dayOfWeek].push(entry);
    });

    const weekDays = {
      1: 'Poniedziałek',
      2: 'Wtorek',
      3: 'Środa',
      4: 'Czwartek',
      5: 'Piątek',
      6: 'Sobota',
      7: 'Niedziela'
    };

    const allFacilities = await Facility.find().lean();

    res.render('dashboard/schedule/index', {
      pageTitle: 'Organizacja - Grafik',
      currentView: 'schedule',
      teachers: Object.values(grouped),
      weekDays,
      weekOffset,
      formattedRange,
      allFacilities,
      search,
      selectedFacilities,
      selectedDate: req.query.dateInput || '',
      fromDate: monday.startOf('day').format('YYYY-MM-DD'),
      toDate: sunday.endOf('day').format('YYYY-MM-DD'),
      isOwnView: false,
      userIsTeacher,
      isAdmin,
      userId: user._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd ładowania grafiku: ' + err.message);
  }
};

exports.getPrintableSchedule = async (req, res) => {
  try {
    const user = res.locals.user;
    const isAdmin = hasAnyRole(user, ['admin', 'headAdmin', 'director']);
    const isOwnView = req.query.isOwnView === '1' || req.query.isOwnView === 1;

    let weekOffset = parseInt(req.query.weekOffset) || 0;
    let selectedDate = null;

    if (req.query.dateInput) {
      selectedDate = dayjs(req.query.dateInput);
      const today = dayjs().startOf('day');
      const selectedMonday = selectedDate.isoWeekday(1);
      const thisMonday = today.isoWeekday(1);
      weekOffset = selectedMonday.diff(thisMonday, 'week');
    }

    const monday = dayjs().isoWeekday(1).add(weekOffset, 'week');
    const sunday = monday.add(6, 'day');
    const formattedRange = `${monday.format('DD.MM')} - ${sunday.format('DD.MM.YYYY')}`;

    // Jeśli nauczyciel, LUB admin z trybem „mój grafik” (isOwnView) – zawsze wydruk własnego grafiku
    if (!isAdmin || isOwnView) {
      const schedules = await Schedule.find({
        teacherId: user._id,
        date: {
          $gte: monday.startOf('day').toDate(),
          $lte: sunday.endOf('day').toDate()
        }
      }).populate('teacherId facilityId').lean();

      const scheduleByDay = {};
      schedules.forEach(entry => {
        if (!scheduleByDay[entry.dayOfWeek]) scheduleByDay[entry.dayOfWeek] = [];
        scheduleByDay[entry.dayOfWeek].push(entry);
      });

      const weekDays = {
        1: 'Poniedziałek',
        2: 'Wtorek',
        3: 'Środa',
        4: 'Czwartek',
        5: 'Piątek',
        6: 'Sobota',
        7: 'Niedziela'
      };

      const teacherObj = {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        workingHours: user.workingHours,
        schedule: scheduleByDay
      };

      return res.render('dashboard/schedule/print', {
        pageTitle: 'Mój grafik do druku',
        teachers: [teacherObj],
        weekDays,
        formattedRange,
        weekOffset,
        selectedDate: req.query.dateInput || '',
        search: '',
        selectedFacilities: []
      });
    }

    // ADMIN/HEADADMIN/DIRECTOR – z filtrami
    const { search, facilities } = req.query;

    const schedules = await Schedule.find({
      date: {
        $gte: monday.startOf('day').toDate(),
        $lte: sunday.endOf('day').toDate()
      }
    }).populate('teacherId facilityId').lean();

    let filteredSchedules = schedules;

    if (search?.trim()) {
      const query = search.trim().toLowerCase();
      filteredSchedules = filteredSchedules.filter(s =>
        (s.teacherId.name + ' ' + s.teacherId.surname).toLowerCase().includes(query)
      );
    }

    const selectedFacilities = Array.isArray(facilities)
      ? facilities
      : facilities
      ? [facilities]
      : [];

    if (selectedFacilities.length > 0) {
      filteredSchedules = filteredSchedules.filter(s =>
        s.facilityId && selectedFacilities.includes(String(s.facilityId._id))
      );
    }

    const grouped = {};
    filteredSchedules.forEach(entry => {
      const teacher = entry.teacherId;
      if (!teacher) return;

      if (!grouped[teacher._id]) {
        grouped[teacher._id] = {
          _id: teacher._id,
          name: teacher.name,
          surname: teacher.surname,
          workingHours: teacher.workingHours,
          schedule: {}
        };
      }

      if (!grouped[teacher._id].schedule[entry.dayOfWeek]) {
        grouped[teacher._id].schedule[entry.dayOfWeek] = [];
      }

      grouped[teacher._id].schedule[entry.dayOfWeek].push(entry);
    });

    const weekDays = {
      1: 'Poniedziałek',
      2: 'Wtorek',
      3: 'Środa',
      4: 'Czwartek',
      5: 'Piątek',
      6: 'Sobota',
      7: 'Niedziela'
    };

    res.render('dashboard/schedule/print', {
      pageTitle: 'Grafik do druku',
      teachers: Object.values(grouped),
      weekDays,
      formattedRange,
      weekOffset,
      selectedDate: req.query.dateInput || '',
      search,
      selectedFacilities
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd przy tworzeniu wydruku: ' + err.message);
  }
};

exports.getEditTeacherSchedule = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    let weekOffset = parseInt(req.query.weekOffset) || 0;
    let selectedDate = null;

    if (req.query.dateInput) {
      selectedDate = dayjs(req.query.dateInput);
      const today = dayjs().startOf('day');
      const selectedMonday = selectedDate.isoWeekday(1);
      const thisMonday = today.isoWeekday(1);
      weekOffset = selectedMonday.diff(thisMonday, 'week');
    }

    const monday = dayjs().isoWeekday(1).add(weekOffset, 'week');
    const sunday = monday.add(6, 'day');
    const formattedRange = `${monday.format('DD.MM')} - ${sunday.format('DD.MM.YYYY')}`;

    const teacher = await User.findById(teacherId)
      .populate('facilities.facilityId')
      .lean();

    if (!teacher) {
      return res.status(404).render('error', { message: 'Nie znaleziono nauczyciela.', pageTitle: 'Błąd' });
    }

    const facilities = await Facility.find().lean();
    const scheduleEntries = await Schedule.find({
      teacherId,
      date: {
        $gte: monday.startOf('day').toDate(),
        $lte: sunday.endOf('day').toDate()
      }
    }).lean();

    const existingSchedule = {};
    scheduleEntries.forEach(lesson => {
      const day = lesson.dayOfWeek;
      if (!existingSchedule[day]) existingSchedule[day] = [];
      existingSchedule[day].push(lesson);
    });

    const daysOfWeek = [
      { label: 'Poniedziałek', value: 1 },
      { label: 'Wtorek', value: 2 },
      { label: 'Środa', value: 3 },
      { label: 'Czwartek', value: 4 },
      { label: 'Piątek', value: 5 },
      { label: 'Sobota', value: 6 },
      { label: 'Niedziela', value: 7 }
    ];

    res.render('dashboard/schedule/editTeacherSchedule', {
      pageTitle: `Edycja grafiku - ${teacher.name} ${teacher.surname}`,
      currentView: 'schedule',
      teacher,
      existingSchedule,
      daysOfWeek,
      facilities,
      weekOffset,
      formattedRange,
      selectedDate: req.query.dateInput || ''
    });
  } catch (err) {
    console.error('Błąd w getEditTeacherSchedule:', err);
    res.status(500).render('error', { message: 'Wystąpił błąd podczas ładowania grafiku.', pageTitle: 'Błąd' });
  }
};

exports.postUpdateTeacherSchedule = async (req, res) => {
  const { teacherId, lessons, weekOffset } = req.body;
  const selectedDate = req.query.dateInput || '';

  try {
    if (!teacherId) {
      throw new Error('Brak identyfikatora nauczyciela.');
    }

    await Schedule.deleteMany({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      date: {
        $gte: dayjs().isoWeekday(1).add(weekOffset, 'week').startOf('day').toDate(),
        $lte: dayjs().isoWeekday(1).add(weekOffset, 'week').add(6, 'day').endOf('day').toDate()
      }
    });

    const newLessons = [];
    const monday = dayjs().isoWeekday(1).add(parseInt(weekOffset), 'week');

    if (lessons) {
      Object.values(lessons).forEach(entry => {
        entry.forEach(e => {
          const { dayOfWeek, startTime, endTime, lessonDescription, room, notes, facilityId } = e;

          if (
            dayOfWeek &&
            startTime?.trim() &&
            endTime?.trim() &&
            lessonDescription?.trim() &&
            facilityId
          ) {
            const date = monday.add(dayOfWeek - 1, 'day').toDate();

            newLessons.push({
              teacherId: new mongoose.Types.ObjectId(teacherId),
              facilityId: new mongoose.Types.ObjectId(facilityId),
              dayOfWeek: parseInt(dayOfWeek),
              date,
              startTime: startTime.trim(),
              endTime: endTime.trim(),
              lessonDescription: lessonDescription.trim(),
              room: room?.trim() || '',
              notes: notes?.trim() || ''
            });
          }
        });
      });
    }

    if (newLessons.length > 0) {
      await Schedule.insertMany(newLessons);
    }

    req.session.flash = {
      type: newLessons.length > 0 ? 'success' : 'info',
      message: newLessons.length > 0
        ? 'Zmiany zostały zapisane.'
        : 'Grafik został wyczyszczony – zapisano pusty tydzień.'
    };

    const redirectUrl = `/dashboard/schedule/edit/${teacherId}?weekOffset=${weekOffset}` + (selectedDate ? `&dateInput=${selectedDate}` : '');
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Błąd przy zapisie grafiku:', err);
    res.status(500).render('error', {
      message: 'Wystąpił błąd przy zapisie grafiku.',
      pageTitle: 'Błąd'
    });
  }
};

exports.getSingleTeacherPrintableSchedule = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const fromDateRaw = req.query.fromDate;
    const toDateRaw = req.query.toDate;
    const user = res.locals.user;

    // Helper – tylko admin/headAdmin/director LUB właściciel
    const isAdmin = hasAnyRole(user, ['admin', 'headAdmin', 'director']);
    if (!isAdmin && String(user._id) !== String(teacherId)) {
      return res.status(403).render('error', {
        errorCode: 403,
        errorIcon: 'bi-lock',
        pageTitle: 'Brak dostępu',
        message: 'Nie masz uprawnień do podglądu tego grafiku.',
        buttonText: 'Powrót do swojego grafiku',
        buttonLink: '/dashboard/schedule'
      });
    }

    let weeks = [];
    let formattedRange = '';

    const teacher = await User.findById(teacherId).populate('facilities.facilityId').lean();
    if (!teacher) {
      return res.status(404).render('error', {
        errorCode: 404,
        errorIcon: 'bi-person-x',
        message: 'Nie znaleziono nauczyciela.',
        pageTitle: 'Błąd'
      });
    }

    if (!fromDateRaw || !toDateRaw) {
      const today = dayjs();
      const defaultFrom = today.isoWeekday(1).startOf('day');
      const defaultTo = defaultFrom.add(6, 'day').endOf('day');

      const weekEntries = await Schedule.find({
        teacherId,
        date: {
          $gte: defaultFrom.toDate(),
          $lte: defaultTo.toDate()
        }
      }).populate('facilityId').lean();

      const schedule = {};
      weekEntries.forEach(entry => {
        if (!schedule[entry.dayOfWeek]) schedule[entry.dayOfWeek] = [];
        schedule[entry.dayOfWeek].push(entry);
      });

      weeks.push({
        schedule,
        weekDays: {
          1: 'Poniedziałek',
          2: 'Wtorek',
          3: 'Środa',
          4: 'Czwartek',
          5: 'Piątek',
          6: 'Sobota',
          7: 'Niedziela'
        },
        rangeText: `${defaultFrom.format('DD.MM')} - ${defaultTo.format('DD.MM.YYYY')}`
      });

      return res.render('dashboard/schedule/print-single', {
        pageTitle: `Grafik do druku – ${teacher.name} ${teacher.surname}`,
        teacher,
        fromDate: defaultFrom.format('YYYY-MM-DD'),
        toDate: defaultTo.format('YYYY-MM-DD'),
        weeks
      });
    }

    // Zakres z formularza
    const fromDate = dayjs(fromDateRaw).startOf('day');
    const toDate = dayjs(toDateRaw).endOf('day');

    formattedRange = `${fromDate.format('DD.MM.YYYY')} - ${toDate.format('DD.MM.YYYY')}`;

    let currentMonday = fromDate.isoWeekday(1);
    while (currentMonday.isBefore(toDate)) {
      const currentSunday = currentMonday.add(6, 'day');

      const weekEntries = await Schedule.find({
        teacherId,
        date: {
          $gte: currentMonday.toDate(),
          $lte: currentSunday.toDate()
        }
      }).populate('facilityId').lean();

      const schedule = {};
      weekEntries.forEach(entry => {
        if (!schedule[entry.dayOfWeek]) schedule[entry.dayOfWeek] = [];
        schedule[entry.dayOfWeek].push(entry);
      });

      weeks.push({
        schedule,
        weekDays: {
          1: 'Poniedziałek',
          2: 'Wtorek',
          3: 'Środa',
          4: 'Czwartek',
          5: 'Piątek',
          6: 'Sobota',
          7: 'Niedziela'
        },
        rangeText: `${currentMonday.format('DD.MM')} - ${currentSunday.format('DD.MM.YYYY')}`
      });

      currentMonday = currentMonday.add(1, 'week');
    }

    res.render('dashboard/schedule/print-single', {
      pageTitle: `Grafik do druku – ${teacher.name} ${teacher.surname}`,
      teacher,
      fromDate: fromDateRaw || '',
      toDate: toDateRaw || '',
      weeks
    });
  } catch (err) {
    console.error('Błąd w getSingleTeacherPrintableSchedule:', err);
    res.status(500).render('error', {
      message: 'Wystąpił błąd podczas generowania widoku do druku.',
      pageTitle: 'Błąd'
    });
  }
};
