<<<<<<< HEAD
﻿const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
    mongoose.connection.on("error", (err) => console.error("MongoDB Error:", err.message));
    mongoose.connection.on("disconnected", () => console.warn("MongoDB Disconnected."));
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
=======
// config/database.js
// MongoDB connection with retry logic

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected. Retrying...');
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
    process.exit(1);
  }
};

module.exports = connectDB;
