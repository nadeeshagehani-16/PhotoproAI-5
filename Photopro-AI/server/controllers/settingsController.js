const Setting = require('../models/Setting');

// ── Shared validation helper for the settings document ──
/**
 * Validate the studio settings payload before save.
 * @param {object} body - req.body (partial document allowed)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateSettingsData(body) {
  const errors = [];
  const { studioName, website, address, description, notifications, payments, ai } = body;

  if (studioName !== undefined && studioName !== null && studioName !== '' && String(studioName).trim().length > 100) {
    errors.push('Studio name must be 100 characters or fewer.');
  }
  if (website !== undefined && website !== null && String(website).trim().length > 200) {
    errors.push('Website must be 200 characters or fewer.');
  }
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }
  if (description !== undefined && description !== null && String(description).length > 1000) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  if (payments && typeof payments === 'object') {
    if (payments.dueDays !== undefined && payments.dueDays !== null && payments.dueDays !== '') {
      const d = Number(payments.dueDays);
      if (Number.isNaN(d) || d < 0 || d > 365) errors.push('Due days must be between 0 and 365.');
    }
    if (payments.currency !== undefined && payments.currency !== null && String(payments.currency).length > 10) {
      errors.push('Currency label must be 10 characters or fewer.');
    }
    if (payments.invoicePrefix !== undefined && payments.invoicePrefix !== null && String(payments.invoicePrefix).length > 10) {
      errors.push('Invoice prefix must be 10 characters or fewer.');
    }
  }

  if (ai && typeof ai === 'object') {
    if (ai.enhancementLevel !== undefined && !['Low', 'Medium', 'High'].includes(ai.enhancementLevel)) {
      errors.push('Enhancement level must be Low, Medium or High.');
    }
    if (ai.outputFormat !== undefined && !['JPEG (High Quality)', 'PNG', 'TIFF'].includes(ai.outputFormat)) {
      errors.push('Output format must be JPEG (High Quality), PNG or TIFF.');
    }
  }

  return errors;
}

// @route   GET /api/settings — get the studio settings (created with defaults if absent)
exports.getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    res.json({ success: true, data: setting });
  } catch (error) { next(error); }
};

// @route   PUT /api/settings — update the studio settings (partial body allowed)
exports.updateSettings = async (req, res, next) => {
  try {
    const errors = _validateSettingsData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    Object.assign(setting, req.body);
    await setting.save();
    res.json({ success: true, message: 'Settings saved successfully', data: setting });
  } catch (error) { next(error); }
};
