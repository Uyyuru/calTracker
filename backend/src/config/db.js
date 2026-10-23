const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to backend/.env");
  }

  const connection = await mongoose.connect(mongoUri);
  const { host, port, name } = connection.connection;

  console.log(`MongoDB connected: ${host}:${port}/${name}`);
  return connection;
};

module.exports = connectDB;
