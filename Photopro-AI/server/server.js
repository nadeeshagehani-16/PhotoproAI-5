const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Test DB connection
connectDB();

app.listen(PORT, () => {
  console.log(`PhotoPro AI Server running on port ${PORT}`);
});
