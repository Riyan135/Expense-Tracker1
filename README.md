# SmartSpend - Full-Stack Personal Expense Tracker Web Application

SmartSpend is a professional personal financial dashboard built with the **MERN (without React, using Vanilla JS for MCA Project compatibility)** stack: Node.js, Express.js, MongoDB, and standard responsive frontend technologies (HTML5, Tailwind CSS, Chart.js, SweetAlert2, and jsPDF).

---

## Key Features

### 👤 User Portal
1. **Secure Authentication**: User registration and login utilizing encrypted passwords (bcryptjs) and JWT-based session security.
2. **Interactive Dashboard**: Real-time counter metrics for Total Income, Total Expenses, and Net Balance.
3. **Ledger CRUD Operations**: Log, modify, filter, and delete income/expense transactions.
4. **Predefined Categories**: Multi-category tagging (Food, Travel, Shopping, Bills, Health, Education, Orders, Salary, Business, Investment, Gifts, and Other).
5. **Budgets & Notifications**: Set a monthly spending threshold. Progress bar dynamically adjusts and fires warning alerts if current-month expenses exceed the limit.
6. **Data Analytics Visualizations**:
   - Doughnut charts showing monthly category distributions.
   - Bar charts comparing 6-month historical income vs expense trends.
   - Line graphs mapping daily spending curves for the last 7 days.
7. **Search & Filters**: Live search descriptions and filter listings by date ranges or categories.
8. **PDF Report Downloader**: Instant formatting and compilation of filtered ledgers into PDF sheets using jsPDF.
9. **Account Settings**: Manage username, emails, budget ceilings, and change passwords.
10. **Responsive Themes**: Mobile-first design with system-sync dark/light mode toggle.

### 🛡️ System Admin Portal
1. **Administrative Authentication**: Separate credentials check for system management.
2. **System Health Metrics**: Aggregated metrics of system-wide transactions count, total volume, and average transaction size.
3. **Ratio Statistics**: Analytics for user activity ratios and system-wide category distributions.
4. **User Access Directory**: Complete control panel of all registered users. Toggle accounts active/deactivated to restrict/grant database writing access.
5. **Master Audit Ledger**: Track all transaction ledger updates across all system users with user email markers.

---

## Project Structure
```
expense-tracker/
├── package.json         # Node packaging & scripts
├── server.js            # Main application starter
├── .env.example         # Template configuration env variables
├── README.md            # Setup documentation
├── src/                 # Backend source
│   ├── config/          # Mongoose database connector
│   ├── models/          # Schemas for User & Transaction
│   ├── middleware/      # JWT verification & Admin filters
│   ├── controllers/     # Controller logics (Auth, User, Transactions, Admin)
│   └── routes/          # REST API route endpoints
└── public/              # Static frontend assets
    ├── index.html       # Landing page
    ├── login.html       # Sign-in portal
    ├── register.html    # Sign-up portal
    ├── dashboard.html   # Main workspace
    ├── profile.html     # Profile & passwords
    ├── admin-login.html # System admin login
    ├── admin-dashboard.html # Admin control console
    ├── css/
    │   └── styles.css   # Theme stylesheets
    └── js/
        ├── config.js    # Fetch wraps & formatters
        ├── auth.js      # Register/Login handlers
        ├── theme.js     # Light/Dark toggler
        ├── dashboard.js # Charting, CRUD, & PDFs
        ├── profile.js   # User profiles
        └── admin.js     # System admin controllers
```

---

## Installation & Setup Instructions

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas Cloud URI.

### 2. Step-by-Step Installation
1. Clone the project and navigate to the directory:
   ```bash
   cd "Expense tracker"
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Duplicate `.env.example` as `.env` and adjust settings:
   ```bash
   cp .env.example .env
   ```
   *For Windows Command Prompt:*
   ```cmd
   copy .env.example .env
   ```

4. Open `.env` and verify the values:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/expense-tracker
   JWT_SECRET=my_expense_tracker_secret_jwt_key_2026
   ADMIN_SECRET_KEY=admin_expense_secret_9876
   ```

### 3. Run the Application
Start the development server with live reload:
```bash
npm run dev
```

Alternatively, run in production mode:
```bash
npm start
```

The console should print:
```
MongoDB Connected: 127.0.0.1
Server running in development mode on port 5000
```

### 4. Testing Portals
1. Open your browser and head to: **`http://localhost:5000`**
2. **User Registration**: Register a new user account.
3. **Admin Registration**: Register an account checking the "Register as System Admin" checkbox and supply the secret key defined in `.env` (`admin_expense_secret_9876` by default).
4. **Admin Dashboard**: Once logged in as admin, access the control dashboard at `http://localhost:5000/admin-dashboard.html`. Deactivate a test user and check if they are booted and locked out on the client side.
