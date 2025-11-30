const express = require('express');
const Facility = require('../../models/facilityModel');
const router = express.Router();

// GET /api/facilities/:id/groups
router.get('/:id/groups', async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id).lean();

    if (!facility) {
      return res.status(404).json({ error: 'Placówka nie istnieje' });
    }

    res.json({ type: facility.type, groups: facility.groups });
  } catch (err) {
    console.error('Facility API error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
