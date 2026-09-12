const Photographer = require('../models/Photographer');

// ── Shared validation helper ──
function _validatePhotographerData(body, isUpdate = false) {
  const errors = [];
  const { name, email, phone, specialization, projects, rating } = body;

  // Required fields on create
  if (!isUpdate) {
    if (!name || !name.trim()) errors.push('Photographer name is required.');
    if (!email || !email.trim()) errors.push('Email is required.');
    if (!specialization || !specialization.trim()) errors.push('Specialization is required.');
  }

  // Name validation
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || !name.trim()) {
      errors.push('Name cannot be empty.');
    } else if (name.trim().length > 100) {
      errors.push('Name cannot exceed 100 characters.');
    }
  }

  // Email validation: valid format, reject # $ % ^ & * etc.
  if (email !== undefined && email !== null && email !== '') {
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(email).trim())) {
      errors.push('Please enter a valid email address (e.g. name@example.com).');
    }
  }

  // Phone validation: 7-15 digits, optional + prefix
  if (phone !== undefined && phone !== null && phone !== '') {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(String(phone).replace(/[\s-]/g, ''))) {
      errors.push('Please enter a valid phone number (7-15 digits).');
    }
  }

  // Specialization validation
  if (specialization !== undefined && specialization !== null) {
    if (typeof specialization !== 'string' || !specialization.trim()) {
      errors.push('Specialization cannot be empty.');
    } else if (specialization.trim().length > 100) {
      errors.push('Specialization cannot exceed 100 characters.');
    }
  }

  // Projects count: non-negative integer when provided
  if (projects !== undefined && projects !== null && projects !== '') {
    const n = parseInt(projects);
    if (isNaN(n) || n < 0) {
      errors.push('Projects count must be 0 or a positive number.');
    }
  }

  // Rating: between 0 and 5 when provided
  if (rating !== undefined && rating !== null && rating !== '') {
    const r = parseFloat(rating);
    if (isNaN(r) || r < 0 || r > 5) {
      errors.push('Rating must be between 0 and 5.');
    }
  }

  return errors;
}

exports.getPhotographers = async (req, res, next) => {
  try {
    const photographers = await Photographer.find();
    res.json({ success: true, data: photographers });
  } catch (error) { next(error); }
};

exports.getPhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findById(req.params.id);
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, data: photographer });
  } catch (error) { next(error); }
};

exports.createPhotographer = async (req, res, next) => {
  try {
    // Comprehensive validation
    const validationErrors = _validatePhotographerData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // Duplicate email check
    const existing = await Photographer.findOne({ email: String(req.body.email).toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A photographer with this email already exists.' });
    }

    const photographer = await Photographer.create(req.body);
    res.status(201).json({ success: true, message: 'Photographer created successfully', data: photographer });
  } catch (error) { next(error); }
};

exports.updatePhotographer = async (req, res, next) => {
  try {
    // Validate incoming fields
    const validationErrors = _validatePhotographerData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // Duplicate email check (exclude current record)
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

exports.deletePhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findByIdAndDelete(req.params.id);
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, message: 'Photographer deleted successfully' });
  } catch (error) { next(error); }
};
