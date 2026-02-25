const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            user: process.env.DB_USER || undefined,
            pass: process.env.DB_PASS || undefined,
            autoIndex: true,
            serverSelectionTimeoutMS: 50000
        });
        console.log("Database connected successfully");
    } catch (err) {
        console.log("Database connection failed:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;

