const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
    mongoose.connection.on("error", (err) => console.error("MongoDB Error:", err.message));
    mongoose.connection.on("disconnected", () => console.warn("MongoDB Disconnected."));
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
