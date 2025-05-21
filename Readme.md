# HomeHuddle Backend

## Overview

HomeHuddle is a family management app designed to simplify household organization. It provides a central hub for families to manage shared calendars, shopping lists, tasks, meal planning, notes, reminders, and rewards. The backend, built with Node.js, Express, and MongoDB, supports a freemium model with role-based permissions for family members (Parent and Child). This repository contains the server setup and core configurations for the HomeHuddle mobile application.

## Features

- **Shared Calendar**: Manage family events with customizable notifications (Free).
- **Shopping List**: Collaborative list for groceries and household items (Free).
- **Task Management**: Assign and track tasks with a leaderboard (Premium).
- **Meal Planning**: Plan weekly meals and generate shopping lists (Premium).
- **Notes & Reminders**: Share notes and set reminders (Free).
- **Rewards System**: Earn points for tasks and redeem rewards (Premium).
- **Privacy & Safety**: Role-based permissions to control access (Free).

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MongoDB (via Mongoose)
- **Security**: Helmet, CORS, Express-Session
- **Logging**: Morgan
- **Environment**: Dotenv
- **Password Hashing**: Bcryptjs

## Project Structure

```

homeHuddleBackend/
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection setup
│   ├── helpers/
│   │   └── responseHelper.js   # Standardized API response utilities
│   ├── models/
│   │   ├── Role.js            # Role model for permissions
│   │   ├── User.js            # User model with authentication
│   │   ├── Family.js          # Family model for grouping users
│   ├── routes/
│   │   └── index.js           # API routes (placeholder)
│   ├── seeders/
│   │   └── seed.js            # Seeder for sample data
│   └── server.js              # Main server file
├── .env                       # Environment variables
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation

````

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB instance
- Git

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/webdevgenius2014/homeHuddleBackend.git
   cd homeHuddleBackend
````

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**

   * Copy `.env.example` (if available) to `.env` or create a `.env` file.
   * Update the following variables:

     * `PORT`: Server port (e.g., 8060)
     * `MONGO_URI`: MongoDB connection string
     * `SESSION_SECRET`: Secret for session management
     * `JWT_SECRET` and `JWT_REFRESH_SECRET`: JWT secrets
     * `CORS_ORIGIN`: Frontend URL (e.g., [http://localhost:3000](http://localhost:3000))
     * `FRONTEND_URL`: Frontend URL
     * `TRANSPORT_SERVICE`, `TRANSPORT_USER`, `TRANSPORT_PASSWORD`: Email service (if used)

4. **Run the Server:**

   * Development mode (with auto-restart):

     ```bash
     npm run dev
     ```

   * Production mode:

     ```bash
     npm start
     ```

5. **Seed the Database (optional, for testing):**

   ```bash
   npm run seed
   ```

   This populates the database with sample roles (Parent, Child), a family, and users.

### Access the API:

* Health check: `http://localhost:8060/health`
* API base: `http://localhost:8060/api/v1`

## Scripts

* `npm start`: Run the server in production mode.
* `npm run dev`: Run the server in development mode with Nodemon.
* `npm run seed`: Populate the database with sample data.

## Completed Tasks

* Server setup with Express and middleware (CORS, Helmet, Morgan, Session).
* Database configuration with MongoDB and Mongoose.
* Environment configuration via Dotenv.
* Response helper for standardized API responses.
* Role model for Parent and Child permissions.
* User model with authentication and family association.
* Family model for grouping users.
* Seeder to create sample roles, family, and users.

## Role-Based Permissions

* **Parent**: Full access to create, edit, and delete calendar events, shopping lists, tasks, meal plans, notes, and rewards. Can customize permissions (Premium).
* **Child**: Read-only access to most features; can add to shopping lists and notes (Free).

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## Issues

Report bugs or issues at: [https://github.com/webdevgenius2014/homeHuddleBackend/issues](https://github.com/webdevgenius2014/homeHuddleBackend/issues)


