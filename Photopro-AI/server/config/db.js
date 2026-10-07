const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ADDED BY TEAM - DB Timeout: bound connection + server selection explicitly.
    // Mongoose's default serverSelectionTimeoutMS is 30000ms — during a MongoDB
    // outage every API request hung for that same 30 s window that UI automation
    // waits for, surfacing on the frontend as
    // "Implicit Wait timed out after 30000ms". Failing fast (10 s) gives the
    // backend a clear error and the frontend a timely, handled response instead
    // of a silent hang. Normal operation is unaffected.
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
