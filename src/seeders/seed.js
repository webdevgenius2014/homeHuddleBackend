const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectToDatabase = require("../config/db");
const Role = require("../models/Role");
const User = require("../models/User");
const Family = require("../models/Family");

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
      members: [],
    });
    console.log("✅ Created family");

    // Create Users
    const users = await User.create([
      {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        familyId: family._id,
        role: parentRole._id,
        isPremium: true,
        isActive: true,
        emailVerified: true,
        refreshToken: null,
      },
      {
        name: "John Smith",
        email: "john.smith@example.com",
        familyId: family._id,
        role: parentRole._id,
        isPremium: true,
        isActive: true,
        emailVerified: true,
        refreshToken: null,
      },
      {
        name: "Timmy Smith",
        email: "timmy.smith@example.com",
        familyId: family._id,
        role: childRole._id,
        isPremium: false,
        isActive: true,
        emailVerified: true,
        refreshToken: null,
      },
    ]);

    // Update family members
    family.members = users.map((user) => user._id);
    await family.save();
    console.log("✅ Created users and updated family members");

    console.log("🎉 Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDatabase();
