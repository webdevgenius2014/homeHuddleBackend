const mongoose = require("mongoose");

const familySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Family name is required"],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      required: [true, "Family code is required"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Family", familySchema);
