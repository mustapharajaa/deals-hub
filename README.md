# Dynamic Coupon & Deal Website

A professional, SEO-optimized coupon website with a full-featured admin dashboard, powered by a Node.js backend and SQLite database. This system allows for easy management of software deals and categories, with dynamically generated, SEO-friendly pages for each deal.

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Search Automation**: Puppeteer, Google Gemini AI
- **Key Libraries**: `sqlite3` for database access, `express` for the server, `puppeteer-extra` for web scraping, `@google/generative-ai` for AI analysis.

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
├── search/             # Search automation system
│   ├── serche-data.js          # Main search automation script
│   ├── automated-scheduler.js  # Scheduled automation runner
│   ├── gemini-analyzer.js      # AI content analysis engine
│   ├── scheduler-config.json   # Automation configuration
│   ├── new softwers.txt        # Queue of software to process
│   ├── GEMINI-SETUP.md         # AI setup instructions
│   └── processed-results/      # Scraped content storage
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

## 🤖 Search Automation System

The project includes a powerful automated search and content generation system that can automatically discover, analyze, and add new software deals to your database using AI-powered web scraping.

### 🔍 How Search Automation Works

The search automation system consists of three main components:

1. **Web Scraping Engine** (`serche-data.js`)
   - Uses ultra-stealth Puppeteer to bypass detection
   - Searches Google for software + "coupon code" queries
   - Scrapes top 3 search results for comprehensive data
   - Extracts deal information, pricing, and content

2. **AI Content Analyzer** (`gemini-analyzer.js`)
   - Powered by Google Gemini AI
   - Analyzes scraped content for SEO insights
   - Generates professional descriptions and categories
   - Extracts logos, pricing, and deal details
   - Creates comprehensive "About" sections

3. **Continuous Monitoring** (`automated-scheduler.js`)
   - Monitors configuration and software queue
   - Processes software with configurable delays
   - Automatically manages the automation lifecycle
   - Provides real-time enable/disable control

### ⚙️ Configuration

All automation settings are controlled via `search/scheduler-config.json`:

```json
{
  "enabled": true,
  "searchIntervalMonths": 1,
  "minDelayMinutes": 20,
  "maxDelayMinutes": 120,
  "newSoftware": {
    "minDelayMinutes": 2,
    "maxDelayMinutes": 3,
    "sourceFile": "./new softwers.txt",
    "searchKeywords": ["coupon code", "discount", "promo code"]
  }
}
```

**Key Settings:**
- `enabled`: Master ON/OFF switch for all automation
- `newSoftware.minDelayMinutes/maxDelayMinutes`: Random delay between processing each software
- `searchKeywords`: Keywords to append to software names during search
- `sourceFile`: Text file containing software names to process

### 🚀 Running Search Automation

#### Method 1: Manual Single Run
```bash
cd search
node serche-data.js
```

#### Method 2: Continuous Monitoring
The script automatically monitors for:
- `"enabled": true` in configuration
- Software entries in `new softwers.txt`
- Processes all software with configured delays
- Continues monitoring even when disabled

### 📝 Adding Software to Process

1. **Add software names** to `search/new softwers.txt` (one per line):
   ```
   Adobe Photoshop
   Canva Pro
   Figma
   Sketch
   ```

2. **Configure search keywords** (optional):
   - Default: Uses first keyword ("coupon code")
   - Specific: Add `(2)` for second keyword, `(3)` for third
   - Example: `Adobe Photoshop (2)` → searches "Adobe Photoshop discount"

3. **Enable automation**:
   ```json
   {
     "enabled": true
   }
   ```

### 🔄 Automation Workflow

1. **Detection**: Monitors config and software queue every 2-3 minutes
2. **Search**: Launches stealth browser and searches Google
3. **Scraping**: Extracts content from top 3 search results
4. **AI Analysis**: Gemini AI analyzes content and generates data
5. **Database Update**: Adds software with categories, descriptions, and metadata
6. **Queue Management**: Removes processed software and continues to next
7. **Browser Cleanup**: Closes browser after each completion
8. **Delay**: Waits configured time before processing next software

### 🎛️ Real-Time Control

**Start Automation:**
- Set `"enabled": true` in `scheduler-config.json`
- Add software names to `new softwers.txt`
- Automation starts automatically

**Stop Automation:**
- Set `"enabled": false` in `scheduler-config.json`
- Current software completes, then stops
- Returns to monitoring mode

**Resume Automation:**
- Set `"enabled": true` again
- Continues from remaining software in queue

**Adjust Timing:**
- Change `minDelayMinutes` and `maxDelayMinutes`
- New delays apply immediately (no restart needed)

### 🛡️ Features

- **Ultra-Stealth**: Bypasses Google detection with advanced techniques
- **AI-Powered**: Generates professional content using Gemini AI
- **Real-Time Config**: Change settings without restarting
- **Persistent Monitoring**: Never stops, just pauses when disabled
- **Clean Resource Management**: Browsers close after each completion
- **Comprehensive Data**: Extracts logos, categories, descriptions, pricing
- **SEO Optimized**: Generates SEO-friendly content and metadata
- **Error Handling**: Continues processing even if individual items fail

### 📊 What Gets Generated

For each software, the AI automatically creates:
- **SEO Title & Description**
- **Professional Categories** (auto-created if new)
- **Comprehensive About Section** (2000+ characters)
- **Logo URL** (extracted from official domain)
- **Pricing Information**
- **Deal Details & Expiration**
- **Target Keywords**
- **User Benefits & Features**

### 🔧 Prerequisites

1. **Google Gemini AI API Key**: Required for content analysis
   - See `search/GEMINI-SETUP.md` for setup instructions

2. **Node.js Dependencies**: Install automation packages
   ```bash
   cd search
   npm install
   ```

3. **Chrome/Chromium**: Required for Puppeteer browser automation

The search automation system transforms manual content creation into a fully automated, AI-powered workflow that can process hundreds of software entries with minimal human intervention.
