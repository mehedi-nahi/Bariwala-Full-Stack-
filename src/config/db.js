const mongoose = require("mongoose");

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return; // already connected
    await mongoose.connect(process.env.DB_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS:         5000,
        socketTimeoutMS:          30000,
        maxPoolSize:              5,
        minPoolSize:              0,
        retryWrites:              true,
        retryReads:               true,
    });
};

module.exports = connectDB;
