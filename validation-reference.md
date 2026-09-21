# PhotoPro AI — Validation Reference (All Members)

> Each section shows the **exact validation code** from that member's branch, with
> comments explaining what every check does and why.

---

## Member 1 — `feature/user-customer` (kumudikasithhara)

### 1A. `server/controllers/customerController.js`

```js
// ── Allowed status values for the customer record ──
const STATUSES = ['Active', 'Inactive'];

// ── Email regex: standard RFC-style, rejects special chars like # $ % ^ & * ──
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ── Phone regex: 7–15 digits, optional leading + for country code ──
const PHONE_RE = /^\+?\d{7,15}$/;

/**
 * Validate customer data before create or update.
 * @param {object} body   - req.body
 * @param {boolean} isUpdate - true when called from update handler (skips required checks for missing fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateCustomerData(body, isUpdate = false) {
  const errors = [];
  const { name, email, phone, address, notes, status, bookings, spent } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not on partial update) ──
  if (!isUpdate) {
    if (!name || !String(name).trim())       errors.push('Name is required.');
    if (!email || !String(email).trim())      errors.push('Email is required.');
    if (!phone || !String(phone).trim())      errors.push('Phone is required.');
  }

  // ── NAME: must be 2–100 characters after trimming ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100)
      errors.push('Name must be between 2 and 100 characters.');
  }

  // ── EMAIL FORMAT: regex match, case-insensitive; rejects # $ etc. ──
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    }
  }

  // ── PHONE FORMAT: strip spaces/dashes/parens, then check 7–15 digit range ──
  if (phone !== undefined && phone !== null && phone !== '') {
    const p = String(phone).replace(/[\s\-().]/g, '');
    if (!PHONE_RE.test(p))
      errors.push('Phone must be 7-15 digits, optionally starting with +.');
  }

  // ── ADDRESS: max 200 characters ──
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }

  // ── NOTES: max 1000 characters ──
  if (notes !== undefined && notes !== null && String(notes).length > 1000) {
    errors.push('Notes cannot exceed 1000 characters.');
  }

  // ── STATUS ENUM: must be 'Active' or 'Inactive' ──
  if (status !== undefined && status !== null && status !== '' && !STATUSES.includes(status)) {
    errors.push('Status must be Active or Inactive.');
  }

  // ── BOOKINGS COUNT: cannot be negative (system-managed, but guarded) ──
  if (bookings !== undefined && bookings !== null && bookings !== '') {
    const b = Number(bookings);
    if (Number.isNaN(b) || b < 0) errors.push('Bookings cannot be negative.');
  }

  // ── SPENT AMOUNT: cannot be negative (system-managed, but guarded) ──
  if (spent !== undefined && spent !== null && spent !== '') {
    const s = Number(spent);
    if (Number.isNaN(s) || s < 0) errors.push('Spent amount cannot be negative.');
  }

  return errors;
}
```

**Duplicate email prevention** (in create/update handlers):
```js
// CREATE: reject if any customer already has this email
const dup = await Customer.findOne({ email });

// UPDATE: reject if a DIFFERENT customer has this email (exclude self by _id)
const dup = await Customer.findOne({ email, _id: { $ne: req.params.id } });
```

---

### 1B. `server/controllers/userController.js`

```js
// ── Allowed user roles ──
const ROLES = ['Admin', 'Staff', 'Customer'];

/**
 * Validate user data before create or update.
 * Same email/phone patterns as customerController.
 */
function _validateUserData(body, isUpdate = false) {
  const errors = [];
  const { name, email, password, phone, role, address } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!name || !String(name).trim())    errors.push('Name is required.');
    if (!email || !String(email).trim())   errors.push('Email is required.');
    if (!password)                         errors.push('Password is required.');
  }

  // ── NAME: 2–100 characters ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100)
      errors.push('Name must be between 2 and 100 characters.');
  }

  // ── EMAIL FORMAT: same regex, rejects # $ % ^ & * ──
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    }
  }

  // ── PASSWORD: minimum 6 characters ──
  if (password !== undefined && password !== null && password !== '') {
    if (typeof password !== 'string' || password.length < 6)
      errors.push('Password must be at least 6 characters.');
  }

  // ── PHONE: 7–15 digits with optional + ──
  if (phone !== undefined && phone !== null && phone !== '') {
    const p = String(phone).replace(/[\s\-().]/g, '');
    if (!PHONE_RE.test(p))
      errors.push('Phone must be 7-15 digits, optionally starting with +.');
  }

  // ── ROLE ENUM: must be Admin, Staff, or Customer ──
  if (role !== undefined && role !== null && role !== '' && !ROLES.includes(role)) {
    errors.push('Role must be Admin, Staff, or Customer.');
  }

  // ── ADDRESS: max 200 characters ──
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }

  return errors;
}
```

**Extra in update handler:**
```js
// ── Manual bcrypt hashing on update ──
// findByIdAndUpdate bypasses the User schema pre-save hook,
// so the password must be hashed manually before saving.
if (req.body.password) {
  const salt = await bcrypt.genSalt(10);
  req.body.password = await bcrypt.hash(req.body.password, salt);
}
```

---

## Member 2 — `feature/equipment-rental` (JANA26r)

### 2A. `server/controllers/equipmentController.js`

```js
// ── Allowed equipment categories ──
const CATEGORIES     = ['Camera', 'Lens', 'Lighting', 'Tripod', 'Audio', 'Accessory'];
// ── Allowed equipment conditions ──
const CONDITIONS     = ['New', 'Good', 'Fair', 'Needs Repair'];
// ── Allowed availability statuses ──
const AVAILABILITIES = ['Available', 'Rented', 'Under Maintenance'];

/**
 * Validate equipment data before create or update.
 */
function _validateEquipmentData(body, isUpdate = false) {
  const errors = [];
  const { name, category, brand, model, pricePerDay, condition,
          availability, serialNumber, description, specifications } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!name || !String(name).trim())                       errors.push('Name is required.');
    if (!category)                                           errors.push('Category is required.');
    if (!brand || !String(brand).trim())                     errors.push('Brand is required.');
    if (!model || !String(model).trim())                     errors.push('Model is required.');
    if (pricePerDay === undefined || pricePerDay === null
        || pricePerDay === '')                               errors.push('Price per day is required.');
  }

  // ── NAME: 2–100 characters ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100)
      errors.push('Name must be between 2 and 100 characters.');
  }

  // ── CATEGORY ENUM: must be one of the predefined list ──
  if (category !== undefined && category !== null && category !== ''
      && !CATEGORIES.includes(category)) {
    errors.push('Category must be one of: Camera, Lens, Lighting, Tripod, Audio, Accessory.');
  }

  // ── BRAND: 2–50 characters ──
  if (brand !== undefined && brand !== null && brand !== '') {
    const b = String(brand).trim();
    if (b.length < 2 || b.length > 50)
      errors.push('Brand must be between 2 and 50 characters.');
  }

  // ── MODEL: 1–50 characters ──
  if (model !== undefined && model !== null && model !== '') {
    const m = String(model).trim();
    if (m.length < 1 || m.length > 50)
      errors.push('Model must be between 1 and 50 characters.');
  }

  // ── PRICE PER DAY: must be a valid number, cannot be negative ──
  if (pricePerDay !== undefined && pricePerDay !== null && pricePerDay !== '') {
    const p = Number(pricePerDay);
    if (Number.isNaN(p))      errors.push('Price per day must be a valid number.');
    else if (p < 0)           errors.push('Price per day cannot be negative.');
  }

  // ── CONDITION ENUM: New, Good, Fair, or Needs Repair ──
  if (condition !== undefined && condition !== null && condition !== ''
      && !CONDITIONS.includes(condition)) {
    errors.push('Condition must be one of: New, Good, Fair, Needs Repair.');
  }

  // ── AVAILABILITY ENUM: Available, Rented, or Under Maintenance ──
  if (availability !== undefined && availability !== null && availability !== ''
      && !AVAILABILITIES.includes(availability)) {
    errors.push('Availability must be one of: Available, Rented, Under Maintenance.');
  }

  // ── SERIAL NUMBER: max 50 characters ──
  if (serialNumber !== undefined && serialNumber !== null
      && String(serialNumber).trim().length > 50) {
    errors.push('Serial number cannot exceeded 50 characters.');
  }

  // ── DESCRIPTION: max 500 characters ──
  if (description !== undefined && description !== null
      && String(description).length > 500) {
    errors.push('Description cannot exceed 500 characters.');
  }

  // ── SPECIFICATIONS: max 200 characters ──
  if (specifications !== undefined && specifications !== null
      && String(specifications).length > 200) {
    errors.push('Specifications cannot exceed 200 characters.');
  }

  return errors;
}
```

---

### 2B. `server/controllers/rentalController.js`

```js
// ── Allowed rental statuses ──
const STATUSES         = ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'];
// ── Allowed payment statuses ──
const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded'];
// ── MongoDB ObjectId format: exactly 24 hex characters ──
const OBJECT_ID_RE     = /^[0-9a-fA-F]{24}$/;

/**
 * Returns today's date as yyyy-MM-dd using LOCAL timezone.
 * Avoids UTC shift bugs in Sri Lanka (UTC+5:30) where
 * new Date('2026-09-15').toISOString() can return '2026-09-14'.
 */
function _todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Extract just the yyyy-MM-dd portion from any date value.
 * Works with ISO strings, date objects cast to string, etc.
 */
function _dateOnly(v) {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v).split('T')[0].slice(0, 10);
  return s;
}

/**
 * Validate rental data before create or update.
 */
function _validateRentalData(body, isUpdate = false) {
  const errors = [];
  const { customerId, equipmentId, startDate, endDate,
          totalCost, securityDeposit, status, paymentStatus, notes } = body;
  const todayStr = _todayStr();

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!customerId)  errors.push('Customer is required.');
    if (!equipmentId) errors.push('Equipment is required.');
    if (!startDate)   errors.push('Start date is required.');
    if (!endDate)     errors.push('End date is required.');
    if (totalCost === undefined || totalCost === null || totalCost === '')
                      errors.push('Total cost is required.');
  }

  // ── OBJECTID FORMAT: customerId must be 24 hex chars ──
  if (customerId !== undefined && customerId !== null && customerId !== ''
      && !OBJECT_ID_RE.test(String(customerId))) {
    errors.push('Invalid customer ID format.');
  }

  // ── OBJECTID FORMAT: equipmentId must be 24 hex chars ──
  if (equipmentId !== undefined && equipmentId !== null && equipmentId !== ''
      && !OBJECT_ID_RE.test(String(equipmentId))) {
    errors.push('Invalid equipment ID format.');
  }

  // ── DATE VALIDATION: startDate must be today or future ──
  // Uses _dateOnly() for string comparison to avoid UTC timezone bugs
  if (startDate !== undefined && startDate !== null && startDate !== '') {
    if (Number.isNaN(new Date(startDate).getTime()))
      errors.push('Start date is invalid.');
    else if (_dateOnly(startDate) < todayStr)
      errors.push('Start date cannot be in the past. Please choose today or a future date.');
  }

  // ── DATE VALIDATION: endDate must be today or future ──
  if (endDate !== undefined && endDate !== null && endDate !== '') {
    if (Number.isNaN(new Date(endDate).getTime()))
      errors.push('End date is invalid.');
    else if (_dateOnly(endDate) < todayStr)
      errors.push('End date cannot be in the past. Please choose today or a future date.');
  }

  // ── TOTAL COST: must be a valid number, cannot be negative ──
  if (totalCost !== undefined && totalCost !== null && totalCost !== '') {
    const c = Number(totalCost);
    if (Number.isNaN(c))      errors.push('Total cost must be a valid number.');
    else if (c < 0)           errors.push('Total cost cannot be negative.');
  }

  // ── SECURITY DEPOSIT: must be a valid number, cannot be negative ──
  if (securityDeposit !== undefined && securityDeposit !== null && securityDeposit !== '') {
    const d = Number(securityDeposit);
    if (Number.isNaN(d))      errors.push('Security deposit must be a valid number.');
    else if (d < 0)           errors.push('Security deposit cannot be negative.');
  }

  // ── STATUS ENUM: must be one of the predefined rental statuses ──
  if (status !== undefined && status !== null && status !== ''
      && !STATUSES.includes(status)) {
    errors.push('Status must be one of: Pending, Active, Returned, Overdue, Cancelled.');
  }

  // ── PAYMENT STATUS ENUM: Unpaid, Paid, or Refunded ──
  if (paymentStatus !== undefined && paymentStatus !== null && paymentStatus !== ''
      && !PAYMENT_STATUSES.includes(paymentStatus)) {
    errors.push('Payment status must be one of: Unpaid, Paid, Refunded.');
  }

  // ── NOTES: max 1000 characters ──
  if (notes !== undefined && notes !== null && String(notes).length > 1000) {
    errors.push('Notes cannot exceed 1000 characters.');
  }

  return errors;
}
```

**Create handler — extra validations:**
```js
// ── END DATE MUST BE AFTER START DATE ──
// Prevents rentals where the return date is before or equal to the pickup date
if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
  errors.push('End date must be after the start date.');
}

// ── EQUIPMENT DOUBLE-BOOKING PREVENTION ──
// Queries for overlapping date ranges on the same equipment
// Only checks Pending/Active rentals (Returned/Cancelled/Overdue don't block)
const conflict = await Rental.findOne({
  equipmentId,
  startDate: { $lte: new Date(endDate) },
  endDate:   { $gte: new Date(startDate) },
  status:    { $in: ['Pending', 'Active'] },
});

// ── EQUIPMENT EXISTENCE & AVAILABILITY CHECK ──
// Rejects rental if equipment doesn't exist or is under maintenance
if (!equipment) → 404 'Equipment not found'
if (equipment.availability === 'Under Maintenance') → 400 'cannot be rented'
```

**Update handler — extra validations:**
```js
// ── FINAL-VALUE END > START CHECK ──
// When only startDate or endDate is in the body, the other comes from the
// existing DB record. We compare the FINAL effective values to catch
// partial updates that would create invalid date ranges.
const finalStartDate = startDate ? new Date(startDate) : existingRental.startDate;
const finalEndDate   = endDate   ? new Date(endDate)   : existingRental.endDate;
if (finalEndDate <= finalStartDate) {
  errors.push('End date must be after the start date.');
}

// ── OVERLAP DETECTION (excluding current rental) ──
// Only re-checks when equipment, startDate, or endDate actually changed
// Uses _id: { $ne: req.params.id } to exclude the current rental
```

---

## Member 3 — `feature/photography-services` (nadeeshagehani-16)

### 3A. `server/controllers/packageController.js`

```js
/**
 * Validate package data before create or update.
 */
function _validatePackageData(body, isUpdate = false) {
  const errors = [];
  const { name, price, duration, photos, photographers, description } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!name || !name.trim())                                        errors.push('Package name is required.');
    if (price === undefined || price === null || price === '')        errors.push('Price is required.');
    if (!duration || !duration.trim())                                errors.push('Duration is required.');
  }

  // ── NAME: non-empty string, max 100 characters ──
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || !name.trim())
      errors.push('Package name cannot be empty.');
    else if (name.trim().length > 100)
      errors.push('Package name cannot exceed 100 characters.');
  }

  // ── PRICE: must be a valid number, cannot be negative ──
  if (price !== undefined && price !== null && price !== '') {
    const p = parseFloat(price);
    if (isNaN(p))       errors.push('Price must be a valid number.');
    else if (p < 0)     errors.push('Price cannot be negative.');
  }

  // ── DURATION: non-empty string, max 50 chars (e.g. "4 Hours", "Full Day") ──
  if (duration !== undefined && duration !== null && duration !== '') {
    if (typeof duration !== 'string' || !duration.trim())
      errors.push('Duration must be a non-empty string (e.g. "4 Hours").');
    else if (duration.trim().length > 50)
      errors.push('Duration cannot exceed 50 characters.');
  }

  // ── PHOTOS COUNT: non-negative integer (0 or more) ──
  if (photos !== undefined && photos !== null && photos !== '') {
    const n = parseInt(photos);
    if (isNaN(n) || n < 0)
      errors.push('Photos count must be 0 or a positive number.');
  }

  // ── PHOTOGRAPHERS COUNT: must be at least 1 ──
  if (photographers !== undefined && photographers !== null && photographers !== '') {
    const n = parseInt(photographers);
    if (isNaN(n) || n < 1)
      errors.push('Photographers count must be at least 1.');
  }

  // ── DESCRIPTION: max 1000 characters ──
  if (description !== undefined && description !== null
      && typeof description === 'string' && description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  return errors;
}
```

---

### 3B. `server/controllers/photographerController.js`

```js
/**
 * Validate photographer data before create or update.
 */
function _validatePhotographerData(body, isUpdate = false) {
  const errors = [];
  const { name, email, phone, specialization, projects, rating } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!name || !name.trim())              errors.push('Photographer name is required.');
    if (!email || !email.trim())            errors.push('Email is required.');
    if (!specialization || !specialization.trim())
                                            errors.push('Specialization is required.');
  }

  // ── NAME: non-empty, max 100 characters ──
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || !name.trim())
      errors.push('Name cannot be empty.');
    else if (name.trim().length > 100)
      errors.push('Name cannot exceed 100 characters.');
  }

  // ── EMAIL FORMAT: regex rejects special chars like # $ % ^ & * ──
  if (email !== undefined && email !== null && email !== '') {
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(String(email).trim()))
      errors.push('Please enter a valid email address (e.g. name@example.com).');
  }

  // ── PHONE: 7–15 digits, optional + prefix, strips spaces and dashes ──
  if (phone !== undefined && phone !== null && phone !== '') {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(String(phone).replace(/[\s-]/g, '')))
      errors.push('Please enter a valid phone number (7-15 digits).');
  }

  // ── SPECIALIZATION: non-empty string, max 100 characters ──
  if (specialization !== undefined && specialization !== null) {
    if (typeof specialization !== 'string' || !specialization.trim())
      errors.push('Specialization cannot be empty.');
    else if (specialization.trim().length > 100)
      errors.push('Specialization cannot exceed 100 characters.');
  }

  // ── PROJECTS COUNT: non-negative integer (0 or more) ──
  if (projects !== undefined && projects !== null && projects !== '') {
    const n = parseInt(projects);
    if (isNaN(n) || n < 0)
      errors.push('Projects count must be 0 or a positive number.');
  }

  // ── RATING: must be between 0 and 5 (inclusive) ──
  if (rating !== undefined && rating !== null && rating !== '') {
    const r = parseFloat(rating);
    if (isNaN(r) || r < 0 || r > 5)
      errors.push('Rating must be between 0 and 5.');
  }

  return errors;
}
```

**Duplicate email check:** Same pattern as M1 — `findOne({ email })` on create, `findOne({ email, _id: { $ne } })` on update.

---

### 3C. `server/controllers/serviceBookingController.js`

```js
const mongoose = require('mongoose');

/**
 * Validate service booking data before create or update.
 * Covers date, time, amount, and ObjectId validation.
 */
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { customerId, packageId, photographerId, event,
          date, startTime, endTime, location, amount } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!customerId)                          errors.push('Client is required.');
    if (!packageId)                           errors.push('Package is required.');
    if (!photographerId)                      errors.push('Photographer is required.');
    if (!event || !event.trim())              errors.push('Event type is required.');
    if (!date)                                errors.push('Booking date is required.');
    if (!startTime)                           errors.push('Start time is required.');
    if (!endTime)                             errors.push('End time is required.');
    if (!location || !location.trim())        errors.push('Location is required.');
    if (amount === undefined || amount === null || amount === '')
                                              errors.push('Amount is required.');
  }

  // ── OBJECTID FORMAT: uses mongoose.Types.ObjectId.isValid() ──
  // More robust than regex — also checks BSON validity
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId))
    errors.push('Invalid client ID format.');
  if (packageId && !mongoose.Types.ObjectId.isValid(packageId))
    errors.push('Invalid package ID format.');
  if (photographerId && !mongoose.Types.ObjectId.isValid(photographerId))
    errors.push('Invalid photographer ID format.');

  // ── TIME FORMAT: must match HH:MM in 24-hour format ──
  // Accepts 00:00–23:59; rejects "9:00" (missing leading zero) or "25:00"
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (startTime && !timeRegex.test(startTime))
    errors.push('Invalid start time format. Use HH:MM (e.g. 10:00).');
  if (endTime && !timeRegex.test(endTime))
    errors.push('Invalid end time format. Use HH:MM (e.g. 12:00).');

  // ── END TIME > START TIME (body-level check) ──
  // String comparison works because both are "HH:MM" format
  // Only runs when BOTH times are in the body (partial updates handled in the handler)
  if (startTime && endTime && endTime <= startTime)
    errors.push('End time must be after start time.');

  // ── DATE VALIDATION: past-date rejection ──
  // Compares yyyy-MM-dd strings; today-date constructed from local clock
  // to avoid UTC timezone shift in Sri Lanka (UTC+5:30)
  if (date) {
    const dateStr  = new Date(date).toISOString().split('T')[0];
    const today    = new Date();
    const todayStr = today.getFullYear() + '-'
      + String(today.getMonth() + 1).padStart(2, '0') + '-'
      + String(today.getDate()).padStart(2, '0');
    if (dateStr < todayStr)
      errors.push('Booking date cannot be in the past. Please select today or a future date.');
  }

  // ── AMOUNT: must be a valid number, cannot be negative ──
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0)
      errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  return errors;
}
```

**Create handler — conflict prevention:**
```js
// ── PHOTOGRAPHER TIME-SLOT CONFLICT PREVENTION ──
// Prevents the same photographer from being double-booked on the same date
// with overlapping start/end times. Only checks active statuses.
const conflict = await ServiceBooking.findOne({
  photographerId,
  date: new Date(date),
  startTime: { $lt: endTime },   // existing starts before new ends
  endTime:   { $gt: startTime },  // existing ends after new starts
  status: { $in: ['Pending', 'Confirmed', 'In Progress'] },
});
```

**Update handler — partial update safety:**
```js
// ── FINAL-VALUE END > START CHECK ──
// When only endTime is sent (no startTime), body-level validator skips the
// comparison because startTime is undefined. The handler loads the existing
// record, computes the FINAL effective values, then compares.
const finalStart = startTime || existing.startTime;
const finalEnd   = endTime   || existing.endTime;
if (finalEnd <= finalStart)
  return res.status(400).json({ success: false, message: 'End time must be after start time.' });

// ── PHOTOGRAPHER CONFLICT CHECK (excluding current booking) ──
// Uses _id: { $ne: req.params.id } so the current booking doesn't conflict with itself
// Only re-checks when photographer, date, or time fields actually changed
```

---

## Member 4 — `feature/payment` (Sheini12)

### 4A. `server/controllers/paymentController.js`

```js
// ── Allowed payment methods ──
const METHODS  = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'];
// ── Allowed payment types ──
const TYPES    = ['Booking', 'Rental', 'Studio', 'Package', 'Other'];
// ── Allowed payment statuses ──
const STATUSES = ['Pending', 'Completed', 'Failed', 'Refunded'];

/**
 * Validate payment data before create or update.
 */
function _validatePaymentData(body, isUpdate = false) {
  const errors = [];
  const { customerId, amount, method, type, status,
          date, referenceId, transactionRef, notes } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!customerId)                                      errors.push('Client is required.');
    if (amount === undefined || amount === null || amount === '')
                                                          errors.push('Amount is required.');
    if (!method)                                          errors.push('Payment method is required.');
    if (!type)                                            errors.push('Payment type is required.');
  }

  // ── OBJECTID FORMAT: customerId via mongoose.Types.ObjectId.isValid() ──
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId))
    errors.push('Invalid client ID format.');

  // ── AMOUNT: must be a valid number, cannot be negative ──
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a))       errors.push('Amount must be a valid number.');
    else if (a < 0)     errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  // ── PAYMENT METHOD ENUM ──
  if (method && !METHODS.includes(method))
    errors.push('Invalid payment method. Allowed: Credit Card, Debit Card, Bank Transfer, Cash, Online.');

  // ── PAYMENT TYPE ENUM ──
  if (type && !TYPES.includes(type))
    errors.push('Invalid payment type. Allowed: Booking, Rental, Studio, Package, Other.');

  // ── PAYMENT STATUS ENUM ──
  if (status && !STATUSES.includes(status))
    errors.push('Invalid payment status. Allowed: Pending, Completed, Failed, Refunded.');

  // ── DATE VALIDATION: past-date rejection ──
  // User-entered dates must be today or future.
  // Historical records already in the DB are not rewritten.
  if (date !== undefined && date !== null && date !== '') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      errors.push('Please enter a valid payment date.');
    } else {
      const dateStr  = new Date(date).toISOString().split('T')[0];
      const today    = new Date();
      const todayStr = today.getFullYear() + '-'
        + String(today.getMonth() + 1).padStart(2, '0') + '-'
        + String(today.getDate()).padStart(2, '0');
      if (dateStr < todayStr)
        errors.push('Date cannot be in the past. Please select today or a future date.');
    }
  }

  // ── STRING LENGTH GUARDS ──
  if (referenceId    && String(referenceId).length > 50)
    errors.push('Reference ID must be 50 characters or fewer.');
  if (transactionRef && String(transactionRef).length > 100)
    errors.push('Transaction reference must be 100 characters or fewer.');
  if (notes          && String(notes).length > 500)
    errors.push('Notes must be 500 characters or fewer.');

  return errors;
}
```

**Note:** The Payment model has no `startTime`/`endTime` fields, so the end-time-after-start-time rule does not apply here.

---

### 4B. `server/controllers/depositController.js`

```js
// ── Allowed deposit statuses ──
const STATUSES = ['Held', 'Refunded', 'Forfeited'];
// ── Allowed payment methods (same as payments) ──
const METHODS  = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'];

/**
 * Validate deposit data before create or update.
 */
function _validateDepositData(body, isUpdate = false) {
  const errors = [];
  const { customerId, rentalId, amount, purpose, status,
          paymentMethod, refundAmount, refundDate, transactionRef, notes } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!customerId)                                      errors.push('Client is required.');
    if (amount === undefined || amount === null || amount === '')
                                                          errors.push('Amount is required.');
    if (!purpose || !purpose.trim())                      errors.push('Purpose is required.');
    if (!paymentMethod)                                   errors.push('Payment method is required.');
  }

  // ── OBJECTID FORMAT: customerId ──
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId))
    errors.push('Invalid client ID format.');

  // ── OBJECTID FORMAT: rentalId (links deposit to a rental) ──
  if (rentalId && !mongoose.Types.ObjectId.isValid(rentalId))
    errors.push('Invalid rental ID format.');

  // ── DEPOSIT AMOUNT: must be a valid number, cannot be negative ──
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a))       errors.push('Amount must be a valid number.');
    else if (a < 0)     errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  // ── REFUND AMOUNT: must be a valid number, cannot be negative ──
  if (refundAmount !== undefined && refundAmount !== null && refundAmount !== '') {
    const r = parseFloat(refundAmount);
    if (isNaN(r))       errors.push('Refund amount must be a valid number.');
    else if (r < 0)     errors.push('Refund amount cannot be negative.');
  }

  // ── STATUS ENUM: Held, Refunded, or Forfeited ──
  if (status && !STATUSES.includes(status))
    errors.push('Invalid deposit status. Allowed: Held, Refunded, Forfeited.');

  // ── PAYMENT METHOD ENUM ──
  if (paymentMethod && !METHODS.includes(paymentMethod))
    errors.push('Invalid payment method. Allowed: Credit Card, Debit Card, Bank Transfer, Cash, Online.');

  // ── REFUND DATE: format validation only ──
  // Refund date is a TRANSACTION RECORD (the date a refund happened),
  // not a user-scheduled date, so past dates are allowed here.
  if (refundDate !== undefined && refundDate !== null && refundDate !== '') {
    if (isNaN(new Date(refundDate).getTime()))
      errors.push('Please enter a valid refund date.');
  }

  // ── STRING LENGTH GUARDS ──
  if (transactionRef && String(transactionRef).length > 100)
    errors.push('Transaction reference must be 100 characters or fewer.');
  if (notes          && String(notes).length > 500)
    errors.push('Notes must be 500 characters or fewer.');

  return errors;
}
```

**Update handler — extra validations:**
```js
// ── REFUND AMOUNT CANNOT EXCEED DEPOSIT AMOUNT ──
// Uses FINAL effective values (body or existing DB) to prevent over-refunding
const finalAmount = req.body.amount !== undefined && req.body.amount !== ''
  ? parseFloat(req.body.amount) : existing.amount;
const refund = req.body.refundAmount !== undefined && req.body.refundAmount !== null && req.body.refundAmount !== ''
  ? parseFloat(req.body.refundAmount) : existing.refundAmount;
if (refund > finalAmount)
  return res.status(400).json({ success: false, message: 'Refund amount cannot exceed the deposit amount.' });

// ── AUTO-STAMP REFUND DATE ──
// When status changes to 'Refunded' and no refundDate is provided (and none
// exists in the DB), automatically set it to the current date/time.
if (req.body.status === 'Refunded' && !req.body.refundDate && !existing.refundDate) {
  req.body.refundDate = new Date();
}
```

---

## Member 5 — `feature/studio-booking` (kumuthu7)

### 5A. `server/controllers/studioController.js`

```js
// ── Allowed studio availability statuses ──
const AVAILABILITIES = ['Available', 'Booked', 'Under Maintenance'];

/**
 * Validate studio data before create or update.
 */
function _validateStudioData(body, isUpdate = false) {
  const errors = [];
  const { name, location, capacity, pricePerHour, description, availability } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!name || !String(name).trim())              errors.push('Studio name is required.');
    if (!location || !String(location).trim())      errors.push('Location is required.');
    if (pricePerHour === undefined || pricePerHour === null || pricePerHour === '')
                                                    errors.push('Price per hour is required.');
  }

  // ── NAME: 2–100 characters ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100)
      errors.push('Studio name must be between 2 and 100 characters.');
  }

  // ── LOCATION: 2–200 characters ──
  if (location !== undefined && location !== null && location !== '') {
    const l = String(location).trim();
    if (l.length < 2 || l.length > 200)
      errors.push('Location must be between 2 and 200 characters.');
  }

  // ── CAPACITY: must be at least 1 ──
  if (capacity !== undefined && capacity !== null && capacity !== '') {
    const c = Number(capacity);
    if (isNaN(c) || c < 1)
      errors.push('Capacity must be at least 1.');
  }

  // ── PRICE PER HOUR: must be a valid number, cannot be negative ──
  if (pricePerHour !== undefined && pricePerHour !== null && pricePerHour !== '') {
    const p = Number(pricePerHour);
    if (isNaN(p))       errors.push('Price per hour must be a valid number.');
    else if (p < 0)     errors.push('Price per hour cannot be negative.');
  }

  // ── DESCRIPTION: max 500 characters ──
  if (description !== undefined && description !== null && String(description).length > 500)
    errors.push('Description cannot exceed 500 characters.');

  // ── AVAILABILITY ENUM ──
  if (availability !== undefined && availability !== null && availability !== ''
      && !AVAILABILITIES.includes(availability)) {
    errors.push('Availability must be one of: Available, Booked, Under Maintenance.');
  }

  return errors;
}
```

---

### 5B. `server/controllers/studioBookingController.js`

```js
const mongoose = require('mongoose');

/**
 * Validate studio booking data before create or update.
 */
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { studioId, customerId, date, startTime, endTime, totalCost, purpose } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate || studioId || customerId || date || startTime || endTime) {
    if (!studioId   && !isUpdate) errors.push('Studio is required.');
    if (!customerId && !isUpdate) errors.push('Customer is required.');
    if (!date       && !isUpdate) errors.push('Booking date is required.');
    if (!startTime  && !isUpdate) errors.push('Start time is required.');
    if (!endTime    && !isUpdate) errors.push('End time is required.');
  }

  // ── PURPOSE: required on create ──
  if (!isUpdate && (!purpose || !purpose.trim()))
    errors.push('Purpose is required.');

  // ── OBJECTID FORMAT: studioId and customerId ──
  if (studioId   && !mongoose.Types.ObjectId.isValid(studioId))
    errors.push('Invalid studio ID format.');
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId))
    errors.push('Invalid customer ID format.');

  // ── TIME FORMAT: HH:MM in 24-hour format ──
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (startTime && !timeRegex.test(startTime))
    errors.push('Invalid start time format. Use HH:MM (e.g. 10:00).');
  if (endTime && !timeRegex.test(endTime))
    errors.push('Invalid end time format. Use HH:MM (e.g. 12:00).');

  // ── END TIME > START TIME (body-level, when both present) ──
  if (startTime && endTime && endTime <= startTime)
    errors.push('End time must be after start time.');

  // ── DATE VALIDATION: past-date rejection ──
  // Uses LOCAL date construction (getFullYear/getMonth/getDate) to avoid
  // UTC timezone shift bugs in Sri Lanka (UTC+5:30).
  // This is the SAFEST approach — toISOString() can return the previous day.
  if (date) {
    const d = new Date(date);
    const dateStr = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
    const today    = new Date();
    const todayStr = today.getFullYear() + '-'
      + String(today.getMonth() + 1).padStart(2, '0') + '-'
      + String(today.getDate()).padStart(2, '0');
    if (dateStr < todayStr)
      errors.push('Booking date cannot be in the past.');
  }

  // ── TOTAL COST: cannot be negative ──
  if (totalCost !== undefined && totalCost !== null && totalCost !== '') {
    const cost = parseFloat(totalCost);
    if (isNaN(cost) || cost < 0)
      errors.push('Total cost cannot be negative.');
  }

  return errors;
}
```

**Create handler — conflict prevention:**
```js
// ── STUDIO DOUBLE-BOOKING PREVENTION ──
// Same pattern as M3's photographer conflict:
// queries overlapping time ranges for the same studio on the same date
const conflict = await StudioBooking.findOne({
  studioId,
  date: new Date(date),
  startTime: { $lt: endTime },
  endTime:   { $gt: startTime },
  status: { $in: ['Pending', 'Confirmed'] },
});
```

**Update handler — partial update safety:**
```js
// ── FINAL-VALUE END > START CHECK ──
// Merges body fields with existing DB values, then compares
const finalStart = startTime || existing.startTime;
const finalEnd   = endTime   || existing.endTime;
if (finalEnd <= finalStart)
  return res.status(400).json({ success: false, message: 'End time must be after start time' });

// ── STUDIO CONFLICT CHECK (excluding current booking) ──
// Only re-checks when studio, date, or time fields actually changed
```

---

### 5C. `server/controllers/serviceBookingController.js` (M5's copy)

```js
// Same structure as M3's serviceBookingController.js with these differences:

// 1. photographerId is NOT in the required fields list on create
//    (M3 requires it; M5 does not)

// 2. Date comparison uses LOCAL date construction (getFullYear/getMonth/getDate)
//    instead of toISOString().split('T')[0] — avoids UTC timezone shift

// 3. Same ObjectId, time format, end>start, amount, and conflict checks
```

**Full validation helper:**
```js
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { customerId, packageId, photographerId, event,
          date, startTime, endTime, location, amount } = body;

  // ── REQUIRED ON CREATE ──
  if (!isUpdate) {
    if (!customerId)                       errors.push('Client is required.');
    if (!packageId)                        errors.push('Package is required.');
    // NOTE: photographerId is NOT required here (unlike M3's version)
    if (!event || !event.trim())           errors.push('Event type is required.');
    if (!date)                             errors.push('Booking date is required.');
    if (!startTime)                        errors.push('Start time is required.');
    if (!endTime)                          errors.push('End time is required.');
    if (!location || !location.trim())     errors.push('Location is required.');
    if (amount === undefined || amount === null || amount === '')
                                           errors.push('Amount is required.');
  }

  // ── OBJECTID FORMAT ── (same as M3)
  // ── TIME FORMAT: HH:MM regex ── (same as M3)
  // ── END > START body-level ── (same as M3)

  // ── DATE VALIDATION: local-date construction (same as studioBookingController) ──
  if (date) {
    const d = new Date(date);
    const dateStr = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
    // ... compare to todayStr ...
    if (dateStr < todayStr)
      errors.push('Booking date cannot be in the past. Please select today or a future date.');
  }

  // ── AMOUNT: non-negative ── (same as M3)
}
```

**Update handler — same final-value pattern as M3.**

---

## Quick Reference — Validation Coverage Matrix

| Validation Type | M1 Customer | M1 User | M2 Equipment | M2 Rental | M3 Package | M3 Photographer | M3 ServiceBooking | M4 Payment | M4 Deposit | M5 Studio | M5 StudioBooking | M5 ServiceBooking |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Past date rejection** | — | — | — | startDate, endDate | — | — | date | date | — | — | date | date |
| **End > Start time** | — | — | — | endDate > startDate | — | — | endTime > startTime | — | — | — | endTime > startTime | endTime > startTime |
| **Non-negative amount** | bookings, spent | — | pricePerDay | totalCost, securityDeposit | price | — | amount | amount | amount, refundAmount | pricePerHour | totalCost | amount |
| **Email format** | yes | yes | — | — | — | yes | — | — | — | — | — | — |
| **Phone format** | yes | yes | — | — | — | yes | — | — | — | — | — | — |
| **ObjectId format** | — | — | — | customerId, equipmentId | — | — | customerId, packageId, photographerId | customerId | customerId, rentalId | — | studioId, customerId | customerId, packageId, photographerId |
| **Enum validation** | status | role | category, condition, availability | status, paymentStatus | — | — | — | method, type, status | status, paymentMethod | availability | — | — |
| **Duplicate prevention** | email | email | — | — | — | email | — | — | — | — | — | — |
| **Password min length** | — | 6 chars | — | — | — | — | — | — | — | — | — | — |
| **Partial update safety** | — | — | — | yes (finalEndDate) | — | — | yes (finalEnd/finalStart) | — | yes (refund > amount) | — | yes (finalEnd/finalStart) | yes (finalEnd/finalStart) |
