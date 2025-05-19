const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      enum: ["Parent", "Child"],
    },
    permissions: {
      calendar: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      shoppingList: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      tasks: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      mealPlanning: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      notes: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      rewards: {
        read: { type: Boolean, default: true },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
    },
    customize: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Role", roleSchema);
