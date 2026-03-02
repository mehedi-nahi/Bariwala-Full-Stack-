const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS:          60000,
            heartbeatFrequencyMS:     10000,
            maxPoolSize:              10,
            minPoolSize:              2,
            connectTimeoutMS:         20000,
            retryWrites:              true,
            retryReads:               true,
            autoIndex:                true,
        });
        console.log("✅  Database connected successfully");
    } catch (err) {
        console.log("❌  Database connection failed:", err.message);
        process.exit(1);
    }
};

// Auto-reconnect on unexpected disconnection
mongoose.connection.on("disconnected", () => {
    console.log("⚠️   MongoDB disconnected — attempting reconnect...");
    setTimeout(connectDB, 3000);
});

mongoose.connection.on("error", (err) => {
    console.log("❌  MongoDB error:", err.message);
});

mongoose.connection.on("reconnected", () => {
    console.log("✅  MongoDB reconnected");
});

module.exports = connectDB;
