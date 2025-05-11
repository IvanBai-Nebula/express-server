# Express Server for Medical Learning Platform

This repository contains the Express.js server for a medical learning platform.

## Setting up the Admin User

There are multiple ways to create an admin user:

### Method 1: Using the Sync Database Script

This method will recreate all tables and add the admin user:

```bash
node syncDatabase.js
```

This will create an admin user with:
- Username: admin
- Email: admin@example.com
- Password: Admin@123

### Method 2: Using the Create Admin Script

If you already have the database tables set up and just want to add the admin user:

```bash
node createAdmin.js
```

### Method 3: Using Direct SQL (if needed)

You can also use the SQL script to directly insert the admin user:

```sql
-- From createAdminSQL.sql
INSERT INTO Staff (
  staffID, 
  username, 
  passwordHash, 
  email, 
  isAdmin, 
  isActive, 
  emailVerified, 
  preferredLanguage, 
  tokenVersion, 
  createdAt, 
  updatedAt
) VALUES (
  UUID(),
  'admin', 
  '$2a$10$XvnQaQ8UqEiVH1J1H6nuFewRNRhvDwODSRcwP21J9QvzC0Q4g.J4a', -- password is 'Admin@123'
  'admin@example.com', 
  1, -- isAdmin = true
  1, -- isActive = true
  1, -- emailVerified = true
  'zh-CN', 
  0, -- tokenVersion
  NOW(), -- createdAt
  NOW()  -- updatedAt
);
```

## Running the Tests

Before running tests, make sure that test/helpers.js has the correct admin credentials:

```javascript
const adminCredentials = {
  usernameOrEmail: "admin", 
  password: "Admin@123", 
};
``` 