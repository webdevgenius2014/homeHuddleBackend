const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectToDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

module.exports = connectToDatabase;
