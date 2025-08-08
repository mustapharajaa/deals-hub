# Dynamic Coupon & Deal Website

A professional, SEO-optimized coupon website with a full-featured admin dashboard, powered by a Node.js backend and SQLite database. This system allows for easy management of software deals and categories, with dynamically generated, SEO-friendly pages for each deal.

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Key Libraries**: `sqlite3` for database access, `express` for the server.

## 📁 File Structure

```
SEO-DYNAMIC/
├── dashboard.html      # Admin panel for managing content
├── dashboard.js        # Frontend logic for the admin panel
├── index.html          # Portable template for all deal pages
├── app.js              # Frontend logic for dynamic deal pages
├── server.js           # Express backend server
├── deals.db            # SQLite database file
├── init-database.js    # Script to initialize the database schema
├── styles.css          # Shared CSS for all pages
├── package.json        # Project dependencies and scripts
└── README.md           # This documentation
```

## 🛠️ Setup and Installation

Follow these steps to run the project on your local machine.

### 1. Install Dependencies
First, make sure you have [Node.js](https://nodejs.org/) installed. Then, open a terminal in the project directory and run:
```bash
npm install
```
This will install all the necessary packages, including Express and the SQLite driver.

### 2. Initialize the Database
If you are starting fresh or the `deals.db` file is missing, run the initialization script:
```bash
node init-database.js
```
This command creates the `deals.db` file and sets up the required tables (`deals`, `categories`, `analytics`).

### 3. Start the Server
To start the web server, run:
```bash
node server.js
```
The server will start, and you'll see the message: `Server running at http://localhost:3000/`.

## ⚙️ How to Manage Content

All content (deals and categories) is managed through the admin dashboard.

### Accessing the Dashboard
1. Make sure the server is running.
2. Open your web browser and navigate to: **[http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html)**

### Dashboard Overview
- **Analytics**: Displays key stats like Total Softwares, Categories, Views, and Clicks.
- **Add Category**: A form to create new software categories.
- **Add New Deal**: A comprehensive form to add new software deals.
- **All Deals**: A table listing all existing deals with options to **View**, **Edit**, or **Delete** them.

### Adding a New Deal
1. Go to the **Add New Deal** section in the dashboard.
2. Fill in all the fields:
   - **Software Name**: The name of the software (e.g., "TaskMagic").
   - **Logo URL**: A direct link to the software's logo.
   - **Website URL**: The official website link.
   - **Discount**: The discount offer (e.g., "70% OFF").
   - **Category**: Select from the dropdown of existing categories.
   - **Coupon Code**: The promo code (e.g., "WINTER70").
   - **Expiration Date**: The offer's expiration date.
   - **Description**: A detailed description of the software and the deal.
   - **Referral Link**: Your affiliate or referral link for the deal.
3. Click the **Add Deal** button. The new deal will appear in the "All Deals" list.

### Editing a Deal
1. In the **All Deals** list, find the deal you want to modify.
2. Click the green **Edit** button. A modal window will appear with the deal's current information.
3. Update the fields as needed and click **Save Changes**.

### Deleting a Deal
1. In the **All Deals** list, find the deal you want to remove.
2. Click the red **Delete** button. You will be asked for confirmation before the deal is permanently removed.

## 🌐 Viewing Live Deal Pages

Once a deal is added, it is instantly available on the live site at two SEO-friendly URLs:
- `/deal/software-name`
- `/coupon-code/software-name`

For example, a deal for "TaskMagic" can be viewed at `http://localhost:3000/deal/taskmagic`.

You can also click the blue **View** button next to any deal in the dashboard to open its live page in a new tab.
