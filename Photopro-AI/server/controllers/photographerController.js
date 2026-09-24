const Photographer = require('../models/Photographer');

// ── Shared validation helper for photographer data ──
/**
 * Validate photographer data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validatePhotographerData(body, isUpdate = false) {
  const errors = [];
  const { name, email, phone, specialization, projects, rating, avatar } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  // Name, email, and specialization are mandatory for new photographers
  if (!isUpdate) {
    if (!name || !name.trim()) errors.push('Photographer name is required.');
    if (!email || !email.trim()) errors.push('Email is required.');
    if (!specialization || !specialization.trim()) errors.push('Specialization is required.');
  }

  // ── NAME: non-empty string, max 100 characters ──
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || !name.trim()) {
      errors.push('Name cannot be empty.');
    } else if (name.trim().length > 100) {
      errors.push('Name cannot exceed 100 characters.');
    }
  }

  // ── EMAIL FORMAT: regex rejects special chars like # $ % ^ & * ──
  if (email !== undefined && email !== null && email !== '') {
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(email).trim())) {
      errors.push('Please enter a valid email address (e.g. name@example.com).');
    }
  }

  // ── PHONE: 7–15 digits, optional + prefix, strips spaces and dashes ──
  if (phone !== undefined && phone !== null && phone !== '') {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(String(phone).replace(/[\s-]/g, ''))) {
      errors.push('Please enter a valid phone number (7-15 digits).');
    }
  }

  // ── SPECIALIZATION: non-empty string, max 100 characters ──
  if (specialization !== undefined && specialization !== null) {
    if (typeof specialization !== 'string' || !specialization.trim()) {
      errors.push('Specialization cannot be empty.');
    } else if (specialization.trim().length > 100) {
      errors.push('Specialization cannot exceed 100 characters.');
    }
  }

  // ── PROJECTS COUNT: non-negative integer (0 or more) ──
  if (projects !== undefined && projects !== null && projects !== '') {
    const n = parseInt(projects);
    if (isNaN(n) || n < 0) {
      errors.push('Projects count must be 0 or a positive number.');
    }
  }

  // ── RATING: must be between 0 and 5 (inclusive) ──
  if (rating !== undefined && rating !== null && rating !== '') {
    const r = parseFloat(rating);
    if (isNaN(r) || r < 0 || r > 5) {
      errors.push('Rating must be between 0 and 5.');
    }
  }

  // ── AVATAR: optional; base64 image data-URL (from the image uploader) or a plain image URL ──
  if (avatar !== undefined && avatar !== null && avatar !== '') {
    if (typeof avatar !== 'string' || !avatar.trim()) {
      errors.push('Avatar must be a non-empty string.');
    } else if (avatar.startsWith('data:') && !avatar.startsWith('data:image/')) {
      errors.push('Avatar must be an image (data:image/... or an image URL).');
    } else if (avatar.length > 1500000) {
      errors.push('Avatar image is too large. Please upload a smaller image.');
    }
  }

  return errors;
}

// @route   GET /api/photographers — list all photographers
exports.getPhotographers = async (req, res, next) => {
  try {
    const photographers = await Photographer.find();
    res.json({ success: true, data: photographers });
  } catch (error) { next(error); }
};

// @route   GET /api/photographers/:id — get single photographer by ID
exports.getPhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findById(req.params.id);
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, data: photographer });
  } catch (error) { next(error); }
};

// @route   POST /api/photographers — create new photographer
exports.createPhotographer = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const validationErrors = _validatePhotographerData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // ── DUPLICATE EMAIL CHECK: reject if any photographer already has this email ──
    const existing = await Photographer.findOne({ email: String(req.body.email).toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A photographer with this email already exists.' });
    }

    const photographer = await Photographer.create(req.body);
    res.status(201).json({ success: true, message: 'Photographer created successfully', data: photographer });
  } catch (error) { next(error); }
};

// @route   PUT /api/photographers/:id — update existing photographer
exports.updatePhotographer = async (req, res, next) => {
  try {
    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const validationErrors = _validatePhotographerData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // ── DUPLICATE EMAIL CHECK: reject if a DIFFERENT photographer has this email ──
    // Uses _id: { $ne: req.params.id } to exclude the current record from the query
    if (req.body.email) {
      const existing = await Photographer.findOne({
        email: String(req.body.email).toLowerCase().trim(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A photographer with this email already exists.' });
      }
    }

    const photographer = await Photographer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, message: 'Photographer updated successfully', data: photographer });
  } catch (error) { next(error); }
};

// @route   DELETE /api/photographers/:id — delete a photographer
exports.deletePhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findByIdAndDelete(req.params.id);
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, message: 'Photographer deleted successfully' });
  } catch (error) { next(error); }
};
