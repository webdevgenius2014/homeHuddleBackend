const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectToDatabase = require("../config/db");
const Role = require("../models/Role");
const User = require("../models/User");
const Family = require("../models/Family");
const bcrypt = require("bcryptjs");

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Clear existing data
    await Role.deleteMany({});
    await User.deleteMany({});
    await Family.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Create Roles
    const parentRole = await Role.create({
      name: "Parent",
      permissions: {
        calendar: { read: true, write: true, delete: true },
        shoppingList: { read: true, write: true, delete: true },
        tasks: { read: true, write: true, delete: true },
        mealPlanning: { read: true, write: true, delete: true },
        notes: { read: true, write: true, delete: true },
        rewards: { read: true, write: true, delete: true },
      },
      customize: true,
    });

    const childRole = await Role.create({
      name: "Child",
      permissions: {
        calendar: { read: true, write: false, delete: false },
        shoppingList: { read: true, write: true, delete: false },
        tasks: { read: true, write: false, delete: false },
        mealPlanning: { read: true, write: false, delete: false },
        notes: { read: true, write: true, delete: false },
        rewards: { read: true, write: false, delete: false },
      },
      customize: false,
    });
    console.log("✅ Created roles");

    // Create Family
    const family = await Family.create({
      name: "Smith Family",
      code: "SMITH123",
    });
    console.log("✅ Created family");

    // Create Users
    await User.create([
      {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        password: await bcrypt.hash("password123", 12),
        familyId: family._id,
        role: parentRole._id,
        isPremium: true,
      },
      {
        name: "John Smith",
        email: "john.smith@example.com",
        password: await bcrypt.hash("password123", 12),
        familyId: family._id,
        role: parentRole._id,
        isPremium: true,
      },
      {
        name: "Timmy Smith",
        email: "timmy.smith@example.com",
        password: await bcrypt.hash("password123", 12),
        familyId: family._id,
        role: childRole._id,
        isPremium: false,
      },
    ]);
    console.log("✅ Created users");

    console.log("🎉 Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDatabase();
