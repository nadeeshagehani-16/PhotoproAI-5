const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { errorHandler } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const packageRoutes = require('./routes/packageRoutes');
const photographerRoutes = require('./routes/photographerRoutes');
const serviceBookingRoutes = require('./routes/serviceBookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const depositRoutes = require('./routes/depositRoutes');
const studioRoutes = require('./routes/studioRoutes');
const studioBookingRoutes = require('./routes/studioBookingRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Middleware
app.use(cors());
// 2mb limit so base64-uploaded images (e.g. photographer avatars) fit in JSON bodies
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/photographers', photographerRoutes);
app.use('/api/service-bookings', serviceBookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/studio-bookings', studioBookingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PhotoPro AI API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
