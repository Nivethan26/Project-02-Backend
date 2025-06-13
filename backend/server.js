const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config(); // Load .env

const connectDB = require("./config/db"); // <- Add this line

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB(); // <- Add this line to invoke the connection

// Sample route
app.get("/", (req, res) => {
  res.send("Smart Pharmacy API is running...");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
