const Facility = require('../../models/facilityModel');

// Pomocnicza funkcja: przekształcenie danych Tagify do tablicy stringów
const parseTagify = (input) => {
  try {
    const parsed = JSON.parse(input || '[]');
    return Array.isArray(parsed) ? parsed.map(item => item.value) : [];
  } catch {
    return [];
  }
};

// GET: Lista placówek z filtrowaniem
exports.getFacilities = async (req, res) => {
  try {
    let filter = {};

    if (req.query.name?.trim()) {
      filter.name = { $regex: req.query.name.trim(), $options: 'i' };
    }
    if (['school', 'preschool', 'nursery', 'counseling'].includes(req.query.type)) {
      filter.type = req.query.type;
    }

    const facilities = await Facility.find(filter).sort({ name: 1 });

    res.render('dashboard/facilities/index', {
      pageTitle: 'Organizacja - Placówki',
      currentView: 'facilities',
      facilities,
      searchQuery: req.query.name || '',
      searchType: req.query.type || ''
    });
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Wystąpił błąd podczas pobierania placówek.'
    };
    res.redirect('/dashboard/facilities');
  }
};

// GET: Formularz dodawania placówki
exports.getCreate = (req, res) => {
  res.render('dashboard/facilities/create', {
    pageTitle: 'Organizacja - Dodawanie Placówki',
    currentView: 'facilities',
    error: null
  });
};

// POST: Dodawanie nowej placówki
exports.postCreate = async (req, res) => {
  try {
    const { name, type, groups } = req.body;

    if (!name || !type) {
      req.session.flash = {
        type: 'danger',
        message: 'Wszystkie pola są wymagane.'
      };
      return res.redirect('/dashboard/facilities/create');
    }

    const newFacility = new Facility({
      name: name.trim(),
      type,
      groups: parseTagify(groups)
    });

    await newFacility.save();

    req.session.flash = {
      type: 'success',
      message: 'Placówka została dodana pomyślnie.'
    };
    res.redirect('/dashboard/facilities');
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Coś poszło nie tak. Spróbuj ponownie.'
    };
    res.redirect('/dashboard/facilities/create');
  }
};

// GET: Formularz edycji placówki
exports.getEdit = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono placówki.'
      };
      return res.redirect('/dashboard/facilities');
    }

    res.render('dashboard/facilities/edit', {
      pageTitle: 'Organizacja - Edycja placówki',
      currentView: 'facilities',
      facility,
      error: null
    });
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd podczas ładowania formularza edycji.'
    };
    res.redirect('/dashboard/facilities');
  }
};

// PUT: Zapis zmian placówki
exports.postEdit = async (req, res) => {
  try {
    const { name, type, groups } = req.body;

    if (!name || !type) {
      req.session.flash = {
        type: 'danger',
        message: 'Wszystkie pola są wymagane.'
      };
      return res.redirect(`/dashboard/facilities/edit/${req.params.id}`);
    }

    await Facility.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      type,
      groups: parseTagify(groups)
    });

    req.session.flash = {
      type: 'success',
      message: 'Placówka została zaktualizowana.'
    };
    res.redirect('/dashboard/facilities');
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Wystąpił błąd podczas zapisu zmian.'
    };
    res.redirect(`/dashboard/facilities/edit/${req.params.id}`);
  }
};

// GET: Potwierdzenie usunięcia
exports.getDeleteConfirmation = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      req.session.flash = {
        type: 'danger',
        message: 'Nie znaleziono placówki do usunięcia.'
      };
      return res.redirect('/dashboard/facilities');
    }

    res.render('dashboard/facilities/delete', {
      pageTitle: 'Potwierdzenie usunięcia',
      currentView: 'facilities',
      facility
    });
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd podczas ładowania potwierdzenia usunięcia.'
    };
    res.redirect('/dashboard/facilities');
  }
};

// DELETE: Usuwanie placówki
exports.deleteFacility = async (req, res) => {
  try {
    await Facility.findByIdAndDelete(req.params.id);
    req.session.flash = {
      type: 'success',
      message: 'Placówka została pomyślnie usunięta.'
    };
    res.redirect('/dashboard/facilities');
  } catch (err) {
    console.error(err);
    req.session.flash = {
      type: 'danger',
      message: 'Błąd podczas usuwania placówki.'
    };
    res.redirect('/dashboard/facilities');
  }
};
