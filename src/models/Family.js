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
      // uppercase: true,
      // minlength: 8,
      // maxlength: 8,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Family", familySchema);
