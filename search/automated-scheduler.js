const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

console.log('🚀 Starting Automated Software Search Scheduler...');

// Database connection
const db = new sqlite3.Database('../deals.db', (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
        return;
    }
    console.log('✅ Database connected');
});

// Load configuration from JSON file
function loadConfig() {
    try {
        const configPath = './scheduler-config.json';
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            // Validate configuration
            if (!config.searchIntervalMonths || config.searchIntervalMonths < 1) {
                throw new Error('searchIntervalMonths must be at least 1');
            }
            if (!config.minDelayMinutes || config.minDelayMinutes < 1) {
                throw new Error('minDelayMinutes must be at least 1');
            }
            if (!config.maxDelayMinutes || config.maxDelayMinutes < config.minDelayMinutes) {
                throw new Error('maxDelayMinutes must be greater than minDelayMinutes');
            }
            
            // Validate new software configuration
            if (config.newSoftware) {
                if (!config.newSoftware.minDelayMinutes || config.newSoftware.minDelayMinutes < 1) {
                    throw new Error('newSoftware.minDelayMinutes must be at least 1');
                }
                if (!config.newSoftware.maxDelayMinutes || config.newSoftware.maxDelayMinutes < config.newSoftware.minDelayMinutes) {
                    throw new Error('newSoftware.maxDelayMinutes must be greater than newSoftware.minDelayMinutes');
                }
                if (config.newSoftware.searchKeywords && !Array.isArray(config.newSoftware.searchKeywords)) {
                    throw new Error('newSoftware.searchKeywords must be an array');
                }
            }
            
            return {
                SEARCH_INTERVAL_MONTHS: config.searchIntervalMonths,
                MIN_DELAY_MINUTES: config.minDelayMinutes,
                MAX_DELAY_MINUTES: config.maxDelayMinutes,
                NEW_SOFTWARE: config.newSoftware || {
                    minDelayMinutes: 15,
                    maxDelayMinutes: 60,
                    sourceFile: './new softwers.txt',
                    searchKeywords: ['coupon code', 'discount', 'promo code']
                },
                RESULTS_DIR: './search-results',
                SCHEDULE_FILE: './search-schedule.json',
                NEW_SOFTWARE_SCHEDULE_FILE: './new-software-schedule.json'
            };
        }
    } catch (error) {
        console.log(`⚠️ Error loading config: ${error.message}`);
        console.log('📝 Using default configuration');
    }
    
    // Default configuration if file doesn't exist or has errors
    return {
        SEARCH_INTERVAL_MONTHS: 3,
        MIN_DELAY_MINUTES: 30,
        MAX_DELAY_MINUTES: 180,
        NEW_SOFTWARE: {
            minDelayMinutes: 15,
            maxDelayMinutes: 60,
            sourceFile: './new softwers.txt',
            searchKeywords: ['coupon code', 'discount', 'promo code']
        },
        RESULTS_DIR: './search-results',
        SCHEDULE_FILE: './search-schedule.json',
        NEW_SOFTWARE_SCHEDULE_FILE: './new-software-schedule.json'
    };
}

// Load configuration
const CONFIG = loadConfig();

// Display current configuration
function displayConfig() {
    console.log('⚙️ Current Configuration:');
    console.log(`   📅 Existing software interval: ${CONFIG.SEARCH_INTERVAL_MONTHS} month(s)`);
    console.log(`   ⏰ Existing software delay: ${CONFIG.MIN_DELAY_MINUTES}-${CONFIG.MAX_DELAY_MINUTES} minutes`);
    console.log(`   🆕 New software: Process immediately (no interval)`);
    console.log(`   ⚡ New software delay: ${CONFIG.NEW_SOFTWARE.minDelayMinutes}-${CONFIG.NEW_SOFTWARE.maxDelayMinutes} minutes`);
    console.log(`   📄 New software file: ${CONFIG.NEW_SOFTWARE.sourceFile}`);
    console.log(`   🔍 Search keywords: [${CONFIG.NEW_SOFTWARE.searchKeywords.join(', ')}]`);
    console.log(`   📁 Results directory: ${CONFIG.RESULTS_DIR}`);
    console.log(`   📋 Schedule files: ${CONFIG.SCHEDULE_FILE}, ${CONFIG.NEW_SOFTWARE_SCHEDULE_FILE}`);
    console.log(`   💡 To change settings, edit: scheduler-config.json`);
}

// Create results directory if it doesn't exist
if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR);
}

// Load or create search schedule
function loadSchedule() {
    try {
        if (fs.existsSync(CONFIG.SCHEDULE_FILE)) {
            const data = fs.readFileSync(CONFIG.SCHEDULE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('⚠️ Could not load schedule, creating new one');
    }
    return {};
}

// Save search schedule
function saveSchedule(schedule) {
    fs.writeFileSync(CONFIG.SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
}

// Generate random delay in milliseconds
function getRandomDelay() {
    const minMs = CONFIG.MIN_DELAY_MINUTES * 60 * 1000;
    const maxMs = CONFIG.MAX_DELAY_MINUTES * 60 * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Check if software needs to be searched (3 months since last search)
function needsSearch(lastSearchDate) {
    if (!lastSearchDate) return true;
    
    const now = new Date();
    const lastSearch = new Date(lastSearchDate);
    const monthsDiff = (now - lastSearch) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsDiff >= CONFIG.SEARCH_INTERVAL_MONTHS;
}

// New software is always processed immediately (no interval check needed)
// We only track what has been processed to avoid duplicates in same session

// Load new software schedule
function loadNewSoftwareSchedule() {
    try {
        if (fs.existsSync(CONFIG.NEW_SOFTWARE_SCHEDULE_FILE)) {
            const data = fs.readFileSync(CONFIG.NEW_SOFTWARE_SCHEDULE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('⚠️ Could not load new software schedule, creating new one');
    }
    return {};
}

// Save new software schedule
function saveNewSoftwareSchedule(schedule) {
    fs.writeFileSync(CONFIG.NEW_SOFTWARE_SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
}

// Parse software name and keyword selector (e.g., "Notion (2)" -> use keyword 2)
function parseSoftwareEntry(entry) {
    const keywordMatch = entry.match(/^(.+?)\s*\((\d+)\)\s*$/);
    
    if (keywordMatch) {
        const softwareName = keywordMatch[1].trim();
        const keywordIndex = parseInt(keywordMatch[2]) - 1; // Convert to 0-based index
        return { softwareName, keywordIndex };
    }
    
    // No keyword selector, use default (first keyword)
    return { softwareName: entry.trim(), keywordIndex: 0 };
}

// Build search query using software name and selected keyword
function buildSearchQuery(softwareName, keywordIndex) {
    const keywords = CONFIG.NEW_SOFTWARE.searchKeywords || ['coupon code'];
    const selectedKeyword = keywords[keywordIndex] || keywords[0] || 'coupon code';
    return `${softwareName} ${selectedKeyword}`;
}

// Get new software from text file
function getNewSoftwareFromFile() {
    try {
        if (fs.existsSync(CONFIG.NEW_SOFTWARE.sourceFile)) {
            const content = fs.readFileSync(CONFIG.NEW_SOFTWARE.sourceFile, 'utf8');
            return content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(entry => {
                    const parsed = parseSoftwareEntry(entry);
                    const searchQuery = buildSearchQuery(parsed.softwareName, parsed.keywordIndex);
                    return {
                        software_name: parsed.softwareName,
                        search_query: searchQuery,
                        keyword_index: parsed.keywordIndex,
                        original_entry: entry
                    };
                });
        }
    } catch (error) {
        console.log(`⚠️ Could not read new software file: ${error.message}`);
    }
    return [];
}

// Generate random delay for new software (separate from main delay)
function getNewSoftwareRandomDelay() {
    const minMs = CONFIG.NEW_SOFTWARE.minDelayMinutes * 60 * 1000;
    const maxMs = CONFIG.NEW_SOFTWARE.maxDelayMinutes * 60 * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Get all software from database
async function getAllSoftware() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, software_name FROM deals ORDER BY RANDOM()`, // Random order
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Perform search for a single software
async function searchSoftware(softwareName, searchQuery = null) {
    const queryToUse = searchQuery || `${softwareName} coupon code`;
    console.log(`🔍 Starting search for: ${softwareName}`);
    console.log(`🔎 Search query: ${queryToUse}`);
    
    try {
        // Launch browser with maximum stealth and English language
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-web-security',
                '--disable-features=site-per-process',
                '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end',
                '--disable-extensions-except',
                '--disable-extensions',
                '--disable-plugins-discovery',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-popup-blocking',
                '--disable-translate',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-ipc-flooding-protection',
                '--lang=en-US',
                '--accept-lang=en-US,en',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });
        
        console.log('✅ Ultra-stealth browser launched!');
        
        // Get all pages and use the first one
        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        
        // Remove automation indicators
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            delete window.navigator.__proto__.webdriver;
            
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });
        
        // Set realistic viewport and headers
        await page.setViewport({ width: 1366, height: 768 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        });
        
        console.log('🔍 Navigating to Google with stealth...');
        
        // First go to Google homepage
        await page.goto('https://www.google.com', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait to look human
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Search for software with configured keyword
        console.log(`🎯 Searching for: ${queryToUse}`);
        
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(queryToUse)}`;
        
        await page.goto(googleSearchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('✅ Search completed!');
        
        // Wait for search results to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Copying entire page content...');
        
        // Copy search results
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.keyboard.down('Control');
        await page.keyboard.press('c');
        await page.keyboard.up('Control');
        
        console.log('✅ Page content copied!');
        
        // Get and clean page content
        const pageContent = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        console.log(`📊 Raw content length: ${pageContent.length} characters`);
        
        // Clean the content
        const cleanContent = pageContent
            .replace(/Liens d'accessibilité[\s\S]*?Résultats de recherche/g, '')
            .replace(/Accessibility links[\s\S]*?Search results/g, '')
            .replace(/Passer directement au contenu principal[\s\S]*?Résultats de recherche/g, '')
            .replace(/Skip to main content[\s\S]*?Search results/g, '')
            .replace(/Looking for results in English\?/g, '')
            .replace(/Change to English/g, '')
            .replace(/Continuer en Français/g, '')
            .replace(/Paramètres de langue/g, '')
            .replace(/Looking for results in English\?[\s\S]*?Paramètres de langue/g, '')
            .replace(/Change to English[\s\S]*?langue/g, '')
            .replace(/Navigation par pages[\s\S]*?Conditions/g, '')
            .replace(/1\s+2\s+3\s+4\s+5\s+6\s+7\s+8\s+9\s+10\s+Suivant/g, '')
            .replace(/AideEnvoyer des commentairesConfidentialitéConditions.*?\n/g, '')
            .replace(/^\s*\n/gm, '')
            .trim();
        
        console.log(`✨ Cleaned content length: ${cleanContent.length} characters`);
        
        // Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${CONFIG.RESULTS_DIR}/${softwareName.replace(/[^a-zA-Z0-9]/g, '-')}-search-results-${timestamp}.txt`;
        
        let fileContent = `${softwareName} Coupon Code Search Results - Automated\n`;
        fileContent += `Search Query: ${searchQuery}\n`;
        fileContent += `Scraped on: ${new Date().toLocaleString()}\n`;
        fileContent += `Clean Content Length: ${cleanContent.length} characters\n`;
        fileContent += `${'='.repeat(60)}\n\n`;
        fileContent += cleanContent;
        
        fs.writeFileSync(filename, fileContent, 'utf8');
        
        console.log('💾 Search results saved to:', filename);
        
        // Close browser
        await browser.close();
        
        return {
            success: true,
            filename: filename,
            contentLength: cleanContent.length
        };
        
    } catch (error) {
        console.error(`❌ Error searching ${softwareName}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Main automation loop
async function runAutomation() {
    console.log('🎯 Starting automated software search cycle...');
    
    try {
        // Load schedules
        const schedule = loadSchedule();
        const newSoftwareSchedule = loadNewSoftwareSchedule();
        
        // Get all software from database
        const allSoftware = await getAllSoftware();
        console.log(`📊 Found ${allSoftware.length} existing software entries in database`);
        
        // Get new software from file
        const newSoftware = getNewSoftwareFromFile();
        console.log(`🆕 Found ${newSoftware.length} new software entries in file`);
        
        let existingSearchCount = 0;
        let newSearchCount = 0;
        
        // Process existing software from database
        console.log('\n🔄 Processing existing software from database...');
        for (const software of allSoftware) {
            const softwareName = software.software_name;
            const lastSearchDate = schedule[softwareName];
            
            // Check if this software needs to be searched
            if (needsSearch(lastSearchDate)) {
                console.log(`\n🔄 Processing existing: ${softwareName}`);
                console.log(`📅 Last searched: ${lastSearchDate || 'Never'}`);
                
                // Perform the search
                const result = await searchSoftware(softwareName);
                
                if (result.success) {
                    // Update schedule
                    schedule[softwareName] = new Date().toISOString();
                    saveSchedule(schedule);
                    
                    existingSearchCount++;
                    console.log(`✅ Successfully searched ${softwareName}`);
                    console.log(`📁 Results saved: ${result.filename}`);
                } else {
                    console.log(`❌ Failed to search ${softwareName}: ${result.error}`);
                }
                
                // Random delay before next search (only if not the last item)
                if (software !== allSoftware[allSoftware.length - 1]) {
                    const delay = getRandomDelay();
                    const delayMinutes = Math.round(delay / (1000 * 60));
                    console.log(`⏰ Waiting ${delayMinutes} minutes before next search...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } else {
                console.log(`⏭️ Skipping ${softwareName} (searched recently)`);
            }
        }
        
        // Process new software from file (immediate processing)
        console.log('\n🆕 Processing new software from file (immediate processing)...');
        for (const software of newSoftware) {
            const softwareName = software.software_name;
            const searchQuery = software.search_query;
            const keywordIndex = software.keyword_index;
            const originalEntry = software.original_entry;
            const lastSearchDate = newSoftwareSchedule[softwareName];
            
            // Process all new software immediately (no interval check)
            console.log(`\n🆕 Processing new: ${softwareName}`);
            console.log(`📅 Last searched: ${lastSearchDate || 'Never'}`);
            console.log(`🔎 Using keyword: ${CONFIG.NEW_SOFTWARE.searchKeywords[keywordIndex]} (index ${keywordIndex + 1})`);
            console.log(`📝 Original entry: ${originalEntry}`);
            
            // Perform the search with custom query
            const result = await searchSoftware(softwareName, searchQuery);
            
            if (result.success) {
                // Update new software schedule (for tracking purposes)
                newSoftwareSchedule[softwareName] = new Date().toISOString();
                saveNewSoftwareSchedule(newSoftwareSchedule);
                
                newSearchCount++;
                console.log(`✅ Successfully searched new software ${softwareName}`);
                console.log(`📁 Results saved: ${result.filename}`);
            } else {
                console.log(`❌ Failed to search new software ${softwareName}: ${result.error}`);
            }
            
            // Random delay before next search (only if not the last item)
            if (software !== newSoftware[newSoftware.length - 1]) {
                const delay = getNewSoftwareRandomDelay();
                const delayMinutes = Math.round(delay / (1000 * 60));
                console.log(`⚡ Waiting ${delayMinutes} minutes before next new software search...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`\n🎉 Automation cycle completed!`);
        console.log(`📊 Existing software searched: ${existingSearchCount}`);
        console.log(`🆕 New software searched: ${newSearchCount}`);
        console.log(`📊 Total searches: ${existingSearchCount + newSearchCount}`);
        console.log(`📅 Next cycle will run in 24 hours`);
        
    } catch (error) {
        console.error('❌ Automation error:', error.message);
    }
}

// Start the automation
console.log('🚀 Automated Software Search Scheduler Started!');
displayConfig();

// Run automation immediately
runAutomation();

// Schedule to run every 24 hours
setInterval(() => {
    console.log('\n🔄 Starting scheduled automation cycle...');
    runAutomation();
}, 24 * 60 * 60 * 1000); // 24 hours

// Keep the process running
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down automation scheduler...');
    db.close();
    process.exit(0);
});

module.exports = { runAutomation, searchSoftware };
