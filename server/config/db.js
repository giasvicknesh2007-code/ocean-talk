const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/oceantalk");
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        // Don't exit process in development if we want to fallback or just see the error
        // process.exit(1); 
    }
};

module.exports = connectDB;
