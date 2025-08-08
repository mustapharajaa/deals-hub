# 🤖 Gemini AI Database Updater Setup Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd search
npm install
```

### 2. Get Gemini API Key
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

### 3. Set Environment Variable
**Windows:**
```cmd
set GEMINI_API_KEY=your_api_key_here
```

**Or create `.env` file:**
```
GEMINI_API_KEY=your_api_key_here
```

### 4. Run Gemini Analyzer
```bash
node gemini-analyzer.js
```

## 🎯 How It Works

### **Automatic File Processing:**
1. **Watches** `./search-results/` directory for new files
2. **Analyzes** each file with Gemini AI to extract:
   - Software name and description
   - Best discount percentage
   - Coupon codes found
   - Deal websites
   - Key features
   - Pricing information

### **Database Updates:**
- **Updates existing** software records with new coupon data
- **Creates new records** for software not in database
- **Logs all activity** to `gemini-analysis.log`

### **File Management:**
- **Moves processed files** to `./processed-results/`
- **Saves analysis results** as JSON files
- **Prevents duplicate processing**

## 📊 Integration with Automation

### **Complete Workflow:**
1. **`automated-scheduler.js`** → Searches for software coupons
2. **Saves results** → `./search-results/software-name-timestamp.txt`
3. **`gemini-analyzer.js`** → Automatically detects new files
4. **Gemini AI** → Analyzes content and extracts structured data
5. **Database** → Updates with new coupon information
6. **File cleanup** → Moves to processed folder

## 🔧 Configuration

Edit `gemini-analyzer.js` to customize:
- `SEARCH_INTERVAL_MONTHS` - How often to re-analyze
- `RESULTS_DIR` - Where to look for files
- `PROCESSED_DIR` - Where to move completed files

## 📝 Logs and Monitoring

- **Activity log**: `gemini-analysis.log`
- **Analysis results**: `./processed-results/software-name-analysis.json`
- **Console output**: Real-time processing status

## 🎉 Benefits

- ✅ **Fully automated** - No manual data entry
- ✅ **AI-powered** - Intelligent content extraction
- ✅ **Database integration** - Automatic updates
- ✅ **Error handling** - Robust processing
- ✅ **File management** - Organized storage
- ✅ **Logging** - Complete audit trail

## 🚨 Troubleshooting

**API Key Issues:**
- Make sure environment variable is set correctly
- Check API key is valid and has credits

**File Processing Issues:**
- Check file permissions in directories
- Ensure database is accessible
- Review logs for specific errors

**Database Issues:**
- Verify SQLite database exists and is writable
- Check database schema matches expectations
