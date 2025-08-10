const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, 'scheduler-config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('❌ Error loading config:', error.message);
    process.exit(1);
}

// Skip initial config check - let continuous monitoring handle everything

// Start ultra-stealth browser automation
async function startPuppeteerSearch() {
    try {
        console.log('🕵️ Launching ultra-stealth browser...');
        
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
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--disable-background-networking',
                '--disable-sync',
                '--metrics-recording-only',
                '--disable-default-apps',
                '--mute-audio',
                '--no-pings',
                '--disable-logging',
                '--disable-permissions-api'
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
            
            // Remove automation flags
            delete window.navigator.__proto__.webdriver;
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Override plugins length
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });
        
        // Set realistic viewport
        await page.setViewport({ width: 1366, height: 768 });
        
        // Add realistic headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        });
        
        console.log('🔍 Navigating to Google with stealth...');
        
        // First go to Google homepage to establish session with retry logic
        let retries = 3;
        let connected = false;
        
        while (retries > 0 && !connected) {
            try {
                await page.goto('https://www.google.com', { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000 
                });
                connected = true;
                console.log('✅ Successfully connected to Google!');
            } catch (error) {
                retries--;
                console.log(`⚠️ Connection attempt failed. Retries left: ${retries}`);
                if (retries > 0) {
                    console.log('🔄 Waiting 5 seconds before retry...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    throw new Error(`Failed to connect to Google after multiple attempts: ${error.message}`);
                }
            }
        }
        
        // Wait a bit to look human
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Read from text file and parse the first entry
        const searchKeywords = ['coupon code', 'discount', 'promo code'];
        
        // Read the text file
        let softwareName = 'TaskMagic'; // fallback
        let keywordIndex = 0; // fallback
        
        // Simple file reading with error handling
        try {
            const textFileContent = require('fs').readFileSync('./new softwers.txt', 'utf8');
            const lines = textFileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
            if (lines.length > 0) {
                const firstEntry = lines[0];
                console.log(`📄 Reading from file: ${firstEntry}`);
                
                // Parse entry (e.g., "Notion (3)")
                const keywordMatch = firstEntry.match(/^(.+?)\s*\((\d+)\)\s*$/);
                
                if (keywordMatch) {
                    softwareName = keywordMatch[1].trim();
                    keywordIndex = parseInt(keywordMatch[2]) - 1; // Convert to 0-based index
                    console.log(`🔍 Parsed: ${softwareName} with keyword index ${keywordIndex + 1}`);
                } else {
                    // No keyword selector, use default
                    softwareName = firstEntry.trim();
                    keywordIndex = 0;
                    console.log(`🔍 Parsed: ${softwareName} with default keyword`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Could not read file: ${error.message}`);
        }
        
        const selectedKeyword = searchKeywords[keywordIndex] || searchKeywords[0];
        const searchQuery = `${softwareName} ${selectedKeyword}`;
        
        console.log(`🎯 Software: ${softwareName}`);
        console.log(`🔑 Keyword: ${selectedKeyword} (index ${keywordIndex + 1})`);
        console.log(`🔍 Final query: ${searchQuery}`);
        console.log(`🎯 Searching for: ${searchQuery}`);
        
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        
        await page.goto(googleSearchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log(`✅ ${softwareName} search completed!`);
        
        // Wait for search results to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Copying entire page content...');
        
        // Select all content (Ctrl+A) and copy (Ctrl+C)
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.keyboard.down('Control');
        await page.keyboard.press('c');
        await page.keyboard.up('Control');
        
        console.log('✅ Page content copied to clipboard!');
        
        // Get the page content
        const pageContent = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        console.log(`📊 Raw page content length: ${pageContent.length} characters`);
        
        // Clean the content by removing Google navigation and interface elements
        const cleanContent = pageContent
            .replace(/Liens d'accessibilité[\s\S]*?Résultats de recherche/g, '') // Remove French navigation
            .replace(/Accessibility links[\s\S]*?Search results/g, '') // Remove English navigation
            .replace(/Passer directement au contenu principal[\s\S]*?Résultats de recherche/g, '')
            .replace(/Skip to main content[\s\S]*?Search results/g, '')
            .replace(/Aide sur l'accessibilité.*?\n/g, '')
            .replace(/Commentaires sur l'accessibilité.*?\n/g, '')
            .replace(/Connexion.*?\n/g, '')
            .replace(/Filtres et thèmes.*?\n/g, '')
            .replace(/Tous\s+Vidéos\s+Images\s+Actualités.*?\n/g, '')
            .replace(/Web\s+Livres\s+Plus\s+Outils.*?\n/g, '')
            // Remove language selection elements - multiple patterns
            .replace(/Looking for results in English\?/g, '')
            .replace(/Change to English/g, '')
            .replace(/Continuer en Français/g, '')
            .replace(/Paramètres de langue/g, '')
            .replace(/Looking for results in English\?[\s\S]*?Paramètres de langue/g, '')
            .replace(/Change to English[\s\S]*?langue/g, '')
            .replace(/Résultats de recherche.*?\n/g, '')
            // Remove pagination and footer elements
            .replace(/Navigation par pages[\s\S]*?Conditions/g, '') // Remove entire footer section
            .replace(/1\s+2\s+3\s+4\s+5\s+6\s+7\s+8\s+9\s+10\s+Suivant/g, '') // Remove pagination numbers
            .replace(/Liens de pied de page.*?\n/g, '')
            .replace(/Maroc.*?\n/g, '')
            .replace(/Marrakech.*?\n/g, '')
            .replace(/- D'après votre adresse IP.*?\n/g, '')
            .replace(/- Mettre à jour ma position.*?\n/g, '')
            .replace(/AideEnvoyer des commentairesConfidentialitéConditions.*?\n/g, '')
            .replace(/Aide.*?Envoyer des commentaires.*?Confidentialité.*?Conditions.*?\n/g, '')
            .replace(/^\s*\n/gm, '') // Remove empty lines
            .trim();
        
        console.log(`✨ Cleaned content length: ${cleanContent.length} characters`);
        
        // Save cleaned page content to text file
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${softwareName.toLowerCase().replace(/\s+/g, '-')}-clean-results-${timestamp}.txt`;
        
        let fileContent = `${softwareName} Google Search - Clean Results Only\n`;
        fileContent += `Search Query: ${searchQuery}\n`;
        fileContent += `Scraped on: ${new Date().toLocaleString()}\n`;
        fileContent += `Clean Content Length: ${cleanContent.length} characters\n`;
        fileContent += `${'='.repeat(60)}\n\n`;
        fileContent += cleanContent;
        
        fs.writeFileSync(filename, fileContent, 'utf8');
        
        console.log('💾 Full page content saved to:', filename);
        
        // Find the top 3 non-Google search result URLs
        console.log('🔍 Finding top 3 non-Google search results...');
        // Use the existing googleSearchUrl variable from earlier in the function

        const rankedUrls = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('div.g a[href], div.Ww4FFb a[href], h3 a[href]'));
            const uniqueUrls = new Set();
            const googleDomains = [
                'google.com', 'youtube.com', 'google.co', 'google.co.uk', 'google.de',
                'google.fr', 'google.es', 'google.it', 'google.ca', 'google.com.au',
                'gstatic.com', 'googleusercontent.com', 'googleapis.com', 'googlesyndication.com',
                'googletagmanager.com', 'doubleclick.net', 'googleadservices.com'
            ];

            for (const link of links) {
                try {
                    const url = new URL(link.href);
                    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
                    
                    const isGoogleDomain = googleDomains.some(domain => url.hostname.endsWith(domain));
                    if (!isGoogleDomain && !link.href.startsWith('/search?q=')) {
                        uniqueUrls.add(link.href);
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            }
            return Array.from(uniqueUrls).slice(0, 3);
        });

        if (rankedUrls.length === 0) {
            console.log('⚠️ No non-Google search results found on the page.');
            return;
        }

        console.log(`✅ Found ${rankedUrls.length} unique non-Google URLs to scrape.`);
        
        // Click on the first search result
        console.log('🖱️ Clicking on first search result...');
        
        try {
            // Wait a moment before navigating
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Navigate directly to the first URL
            const firstUrl = rankedUrls[0];
            console.log(`🎯 Navigating to: ${firstUrl}`);
            
            if (firstUrl) {
                await page.goto(firstUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                console.log('✅ First result loaded successfully!');
                
                // Additional wait to ensure content is rendered
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log('🎯 First result page fully loaded!');
                
                // Copy content from the first result page (Ctrl+A, Ctrl+C)
                console.log('🔍 Copying first result page content...');
                
                await page.keyboard.down('Control');
                await page.keyboard.press('a');
                await page.keyboard.up('Control');
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                await page.keyboard.down('Control');
                await page.keyboard.press('c');
                await page.keyboard.up('Control');
                
                console.log('✅ First result page content copied!');
                
                // Get the page content with error handling
                const firstResultContent = await page.evaluate(() => {
                    // Wait for body to be available and return content
                    if (document.body) {
                        return document.body.innerText || document.documentElement.innerText || 'Content not available';
                    } else {
                        return 'Page body not loaded';
                    }
                });
                
                console.log(`📊 First result content length: ${firstResultContent.length} characters`);
                
                // Append ranked #1 content to the same file
                let appendContent = `\n\n${'='.repeat(80)}\n`;
                appendContent += `RANKED #1 RESULT - FULL PAGE CONTENT\n`;
                appendContent += `Clicked on first result and scraped content\n`;
                appendContent += `Content Length: ${firstResultContent.length} characters\n`;
                appendContent += `${'='.repeat(80)}\n\n`;
                appendContent += firstResultContent;
                
                // Append to the existing file
                const fs = require('fs');
                fs.appendFileSync(filename, appendContent, 'utf8');
                
                console.log('💾 Ranked #1 content appended to same file:', filename);
                
                // Now navigate to the second result
                console.log('🔙 Returning to search results page...');
                await page.goto(googleSearchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log('🖱️ Clicking on second search result...');
                
                // Navigate directly to the second URL
                if (rankedUrls.length > 1) {
                    const secondUrl = rankedUrls[1];
                    console.log(`🎯 Navigating to: ${secondUrl}`);
                    
                    await page.goto(secondUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                    console.log('✅ Second result loaded successfully!');
                    
                    // Additional wait to ensure content is rendered
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log('🎯 Second result page fully loaded!');
                    
                    // Copy content from the second result page
                    console.log('🔍 Copying second result page content...');
                    
                    await page.keyboard.down('Control');
                    await page.keyboard.press('a');
                    await page.keyboard.up('Control');
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    await page.keyboard.down('Control');
                    await page.keyboard.press('c');
                    await page.keyboard.up('Control');
                    
                    console.log('✅ Second result page content copied!');
                    
                    // Get the second result page content with error handling
                    const secondResultContent = await page.evaluate(() => {
                        if (document.body) {
                            return document.body.innerText || document.documentElement.innerText || 'Content not available';
                        } else {
                            return 'Page body not loaded';
                        }
                    });
                    
                    console.log(`📊 Second result content length: ${secondResultContent.length} characters`);
                    
                    // Append ranked #2 content to the same file
                    let appendContent2 = `\n\n${'='.repeat(80)}\n`;
                    appendContent2 += `RANKED #2 RESULT - FULL PAGE CONTENT\n`;
                    appendContent2 += `Clicked on second result and scraped content\n`;
                    appendContent2 += `Content Length: ${secondResultContent.length} characters\n`;
                    appendContent2 += `${'='.repeat(80)}\n\n`;
                    appendContent2 += secondResultContent;
                    
                    // Append to the existing file
                    fs.appendFileSync(filename, appendContent2, 'utf8');
                    
                    console.log('💾 Ranked #2 content appended to same file:', filename);
                    
                    // Now navigate to the third result
                    console.log('🔙 Returning to search results for third result...');
                    await page.goto(googleSearchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    console.log('🖱️ Clicking on third search result...');
                    
                    // Navigate directly to the third URL
                    if (rankedUrls.length > 2) {
                        const thirdUrl = rankedUrls[2];
                        console.log(`🎯 Navigating to: ${thirdUrl}`);
                        
                        await page.goto(thirdUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                        console.log('✅ Third result loaded successfully!');
                        
                        // Additional wait to ensure content is rendered
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        console.log('🎯 Third result page fully loaded!');
                        
                        // Copy content from the third result page
                        console.log('🔍 Copying third result page content...');
                        
                        await page.keyboard.down('Control');
                        await page.keyboard.press('a');
                        await page.keyboard.up('Control');
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        await page.keyboard.down('Control');
                        await page.keyboard.press('c');
                        await page.keyboard.up('Control');
                        
                        console.log('✅ Third result page content copied!');
                        
                        // Get the third result page content
                        const thirdResultContent = await page.evaluate(() => {
                            return document.body.innerText;
                        });
                        
                        console.log(`📊 Third result content length: ${thirdResultContent.length} characters`);
                        
                        // Append ranked #3 content to the same file
                        let appendContent3 = `\n\n${'='.repeat(80)}\n`;
                        appendContent3 += `RANKED #3 RESULT - FULL PAGE CONTENT\n`;
                        appendContent3 += `Clicked on third result and scraped content\n`;
                        appendContent3 += `Content Length: ${thirdResultContent.length} characters\n`;
                        appendContent3 += `${'='.repeat(80)}\n\n`;
                        appendContent3 += thirdResultContent;
                        
                        // Append to the existing file
                        fs.appendFileSync(filename, appendContent3, 'utf8');
                        
                        console.log('💾 Ranked #3 content appended to same file:', filename);
                        
                    } else {
                        console.log('⚠️ No third result available');
                    }
                    
                } else {
                    console.log('⚠️ No second result available');
                }
                
            } else {
                console.log('⚠️ Could not find first result to click');
                
                // Debug: Let's see what links are actually available
                console.log('🔍 Debugging: Looking for available search result links...');
                try {
                    const allLinks = await page.$$eval('a[href]', links => 
                        links.map(link => ({
                            href: link.href,
                            text: (link.textContent || link.innerText || '').trim().substring(0, 50),
                            selector: link.tagName + (link.className ? '.' + link.className.split(' ').join('.') : '')
                        })).filter(link => 
                            link.href && 
                            !link.href.includes('google.com') && 
                            !link.href.includes('youtube.com') &&
                            !link.href.includes('maps.google') &&
                            link.text.length > 5
                        ).slice(0, 5)
                    );
                    console.log('🔍 Available search result links:', allLinks);
                    
                    // Try to click the first available link
                    if (allLinks.length > 0) {
                        console.log('🎯 Trying to click first available link...');
                        const firstAvailableLink = await page.$(`a[href="${allLinks[0].href}"]`);
                        if (firstAvailableLink) {
                            await firstAvailableLink.click();
                            console.log('✅ Successfully clicked first available link!');
                            
                            // Continue with the copy logic
                            try {
                                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
                            } catch (error) {
                                console.log('⚠️ Page load timeout, continuing...');
                            }
                            
                            // Copy content using Ctrl+A, Ctrl+C
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            console.log('🔍 Copying first result page content...');
                            
                            // Select all content (Ctrl+A)
                            await page.keyboard.down('Control');
                            await page.keyboard.press('a');
                            await page.keyboard.up('Control');
                            
                            // Wait for selection
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            // Copy to clipboard (Ctrl+C)
                            await page.keyboard.down('Control');
                            await page.keyboard.press('c');
                            await page.keyboard.up('Control');
                            
                            // Wait for copy to complete
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            console.log('✅ Content copied to clipboard!');
                            
                            // Wait longer for page content to fully load
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            // Get the page content - use simple and reliable method with debugging
                            const firstResultContent = await page.evaluate(() => {
                                console.log('Starting content extraction...');
                                
                                // Get the main content using multiple methods
                                let content = '';
                                
                                // Method 1: Try body.innerText first (most reliable)
                                if (document.body && document.body.innerText) {
                                    content = document.body.innerText.trim();
                                    console.log('Method 1 - Body innerText length:', content.length);
                                }
                                
                                // Method 2: If content is too short, try textContent
                                if (!content || content.length < 100) {
                                    if (document.body && document.body.textContent) {
                                        content = document.body.textContent.trim();
                                        console.log('Method 2 - Body textContent length:', content.length);
                                    }
                                }
                                
                                // Method 3: Try main content areas
                                if (!content || content.length < 100) {
                                    const mainSelectors = ['main', '[role="main"]', '.content', '.main-content', 'article', '.post', '.entry'];
                                    for (const selector of mainSelectors) {
                                        const mainElement = document.querySelector(selector);
                                        if (mainElement && mainElement.innerText?.trim()) {
                                            content = mainElement.innerText.trim();
                                            console.log('Method 3 - Main content length:', content.length);
                                            break;
                                        }
                                    }
                                }
                                
                                // Clean up the content but preserve line breaks
                                if (content) {
                                    content = content
                                        .replace(/\t/g, ' ')  // Replace tabs with spaces
                                        .replace(/[ ]{2,}/g, ' ')  // Replace multiple spaces with single space
                                        .trim();
                                }
                                
                                console.log('Final content length:', content.length);
                                console.log('Content preview (first 200 chars):', content.substring(0, 200));
                                
                                return content || 'Content extraction failed - page may not be fully loaded';
                            });
                            
                            console.log(`📊 Extracted content length: ${firstResultContent.length} characters`);
                            console.log(`📝 Content preview: ${firstResultContent.substring(0, 100)}...`);
                            
                            // Append to file
                            let appendContent = `\n\n${'='.repeat(80)}\n`;
                            appendContent += `RANKED #1 RESULT - FULL PAGE CONTENT\n`;
                            appendContent += `Clicked on first result and scraped content\n`;
                            appendContent += `Content Length: ${firstResultContent.length} characters\n`;
                            appendContent += `${'='.repeat(80)}\n\n`;
                            appendContent += firstResultContent;
                            
                            fs.appendFileSync(filename, appendContent, 'utf8');
                            console.log('💾 Ranked #1 content appended to file');
                            
                            // Now go back and click result #2
                            console.log('🔙 Going back to search results for result #2...');
                            await page.goBack();
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            console.log('🖱️ Clicking on second search result...');
                            const secondResult = await page.$('div.g:nth-of-type(2) h3 a') ||
                                               await page.$('div.g:nth-of-type(2) a[href]:not([href*="google.com"])') ||
                                               await page.$$('div.g h3 a').then(links => links[1]) ||
                                               await page.$$('h3 a').then(links => links.filter(a => !a.href?.includes('google.com'))[1]);
                            
                            if (secondResult) {
                                await secondResult.click();
                                console.log('✅ Second result clicked successfully!');
                                
                                try {
                                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
                                } catch (error) {
                                    console.log('⚠️ Second page load timeout, continuing...');
                                }
                                
                                // Copy content using Ctrl+A, Ctrl+C
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                console.log('🔍 Copying second result page content...');
                                
                                // Select all content (Ctrl+A)
                                await page.keyboard.down('Control');
                                await page.keyboard.press('a');
                                await page.keyboard.up('Control');
                                
                                // Wait for selection
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                // Copy to clipboard (Ctrl+C)
                                await page.keyboard.down('Control');
                                await page.keyboard.press('c');
                                await page.keyboard.up('Control');
                                
                                // Wait for copy to complete
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                console.log('✅ Second result content copied to clipboard!');
                                
                                const secondResultContent = await page.evaluate(() => {
                                    // Remove unwanted elements first
                                    const elementsToRemove = document.querySelectorAll('script, style, noscript, nav, header, footer, .cookie-banner, .popup, .modal');
                                    elementsToRemove.forEach(el => el.remove());
                                    
                                    // Get the main content
                                    let content = '';
                                    
                                    // Try to get content from main content areas first
                                    const mainSelectors = ['main', '[role="main"]', '.content', '.main-content', 'article', '.post', '.entry'];
                                    for (const selector of mainSelectors) {
                                        const mainElement = document.querySelector(selector);
                                        if (mainElement && mainElement.innerText?.trim()) {
                                            content = mainElement.innerText.trim();
                                            break;
                                        }
                                    }
                                    
                                    // Fallback to body content if no main content found
                                    if (!content || content.length < 100) {
                                        content = document.body?.innerText || document.body?.textContent || '';
                                    }
                                    
                                    // Clean up the content
                                    return content
                                        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                                        .replace(/\n\s*\n/g, '\n')  // Replace multiple newlines with single newline
                                        .trim() || 'Content not available';
                                });
                                
                                // Append to file
                                let appendContent2 = `\n\n${'='.repeat(80)}\n`;
                                appendContent2 += `RANKED #2 RESULT - FULL PAGE CONTENT\n`;
                                appendContent2 += `Clicked on second result and scraped content\n`;
                                appendContent2 += `Content Length: ${secondResultContent.length} characters\n`;
                                appendContent2 += `${'='.repeat(80)}\n\n`;
                                appendContent2 += secondResultContent;
                                
                                fs.appendFileSync(filename, appendContent2, 'utf8');
                                console.log('💾 Ranked #2 content appended to file');
                                
                                // Now go back and click result #3
                                console.log('🔙 Going back to search results for result #3...');
                                await page.goBack();
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                
                                console.log('🖱️ Clicking on third search result...');
                                const thirdResult = await page.$('div.g:nth-of-type(3) h3 a') ||
                                                   await page.$('div.g:nth-of-type(3) a[href]:not([href*="google.com"])') ||
                                                   await page.$$('div.g h3 a').then(links => links[2]) ||
                                                   await page.$$('h3 a').then(links => links.filter(a => !a.href?.includes('google.com'))[2]);
                                
                                if (thirdResult) {
                                    await thirdResult.click();
                                    console.log('✅ Third result clicked successfully!');
                                    
                                    try {
                                        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
                                    } catch (error) {
                                        console.log('⚠️ Third page load timeout, continuing...');
                                    }
                                    
                                    // Copy content using Ctrl+A, Ctrl+C
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    console.log('🔍 Copying third result page content...');
                                    
                                    // Select all content (Ctrl+A)
                                    await page.keyboard.down('Control');
                                    await page.keyboard.press('a');
                                    await page.keyboard.up('Control');
                                    
                                    // Wait for selection
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    
                                    // Copy to clipboard (Ctrl+C)
                                    await page.keyboard.down('Control');
                                    await page.keyboard.press('c');
                                    await page.keyboard.up('Control');
                                    
                                    // Wait for copy to complete
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    
                                    console.log('✅ Third result content copied to clipboard!');
                                    
                                    const thirdResultContent = await page.evaluate(() => {
                                        // Remove unwanted elements first
                                        const elementsToRemove = document.querySelectorAll('script, style, noscript, nav, header, footer, .cookie-banner, .popup, .modal');
                                        elementsToRemove.forEach(el => el.remove());
                                        
                                        // Get the main content
                                        let content = '';
                                        
                                        // Try to get content from main content areas first
                                        const mainSelectors = ['main', '[role="main"]', '.content', '.main-content', 'article', '.post', '.entry'];
                                        for (const selector of mainSelectors) {
                                            const mainElement = document.querySelector(selector);
                                            if (mainElement && mainElement.innerText?.trim()) {
                                                content = mainElement.innerText.trim();
                                                break;
                                            }
                                        }
                                        
                                        // Fallback to body content if no main content found
                                        if (!content || content.length < 100) {
                                            content = document.body?.innerText || document.body?.textContent || '';
                                        }
                                        
                                        // Clean up the content
                                        return content
                                            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                                            .replace(/\n\s*\n/g, '\n')  // Replace multiple newlines with single newline
                                            .trim() || 'Content not available';
                                    });
                                    
                                    // Append to file
                                    let appendContent3 = `\n\n${'='.repeat(80)}\n`;
                                    appendContent3 += `RANKED #3 RESULT - FULL PAGE CONTENT\n`;
                                    appendContent3 += `Clicked on third result and scraped content\n`;
                                    appendContent3 += `Content Length: ${thirdResultContent.length} characters\n`;
                                    appendContent3 += `${'='.repeat(80)}\n\n`;
                                    appendContent3 += thirdResultContent;
                                    
                                    fs.appendFileSync(filename, appendContent3, 'utf8');
                                    console.log('💾 Ranked #3 content appended to file');
                                    
                                } else {
                                    console.log('⚠️ Could not find third result to click');
                                }
                                
                            } else {
                                console.log('⚠️ Could not find second result to click');
                            }
                        }
                    }
                } catch (debugError) {
                    console.log('❌ Debug error:', debugError.message);
                }
            }
        } catch (error) {
            console.log('❌ Error clicking first result:', error.message);
        }
        
        console.log('🎉 Ultra-stealth browser showing search results!');
        
        // Start Gemini AI analysis
        console.log('🤖 Starting Gemini AI analysis of scraped data...');
        try {
            const geminiAnalyzer = require('./gemini-analyzer');
            const result = await geminiAnalyzer.processFile(filename);
            
            // If processing was successful, remove the software from the text file
            if (result && result.success) {
                console.log('✅ Processing successful! Removing software from text file...');
                try {
                    const textFileContent = require('fs').readFileSync('./new softwers.txt', 'utf8');
                    const lines = textFileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    
                    // Remove the first line (processed software) and keep the rest
                    const remainingLines = lines.slice(1);
                    const updatedContent = remainingLines.join('\n') + (remainingLines.length > 0 ? '\n' : '');
                    
                    require('fs').writeFileSync('./new softwers.txt', updatedContent, 'utf8');
                    console.log(`🗑️ Removed "${softwareName}" from text file. ${remainingLines.length} software(s) remaining.`);
                    
                    // Close browser after automation completes
                    console.log('🔒 Closing browser...');
                    await browser.close();
                    
                    // Check if there are more software to process
                    if (remainingLines.length > 0) {
                        console.log(`⏳ Waiting ${getRandomDelay()} minutes before processing next software...`);
                        const delayMs = getRandomDelay() * 60 * 1000;
                        setTimeout(() => {
                            // Check config again before processing next software
                            try {
                                const configPath = path.join(__dirname, 'scheduler-config.json');
                                const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                                if (!updatedConfig.enabled) {
                                    console.log('⏹️ Automation DISABLED in config - stopping loop');
                                    console.log('🔄 Returning to monitoring mode...');
                                    // Return to monitoring instead of stopping completely
                                    scheduleNextCheck(updatedConfig);
                                    return;
                                }
                            } catch (configError) {
                                console.log('⚠️ Could not read config, continuing with automation...');
                            }
                            
                            console.log('🔄 Starting next software processing...');
                            startPuppeteerSearch();
                        }, delayMs);
                    } else {
                        console.log('✅ All software processed! No more entries in new softwers.txt');
                    }
                } catch (fileError) {
                    console.log(`⚠️ Could not update text file: ${fileError.message}`);
                }
            }
        } catch (aiError) {
            console.log('⚠️ Gemini AI analysis failed:', aiError.message);
            console.log('💡 You can run it manually: node gemini-analyzer.js');
        }
        
    } catch (error) {
        console.error('❌ Error during search automation:', error);
    }
}

// Function to get random delay for new software processing
function getRandomDelay() {
    try {
        // Read current config to get latest delay settings
        const configPath = path.join(__dirname, 'scheduler-config.json');
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const min = currentConfig.newSoftware.minDelayMinutes;
        const max = currentConfig.newSoftware.maxDelayMinutes;
        return Math.random() * (max - min) + min;
    } catch (error) {
        // Fallback to cached config if file read fails
        const min = config.newSoftware.minDelayMinutes;
        const max = config.newSoftware.maxDelayMinutes;
        return Math.random() * (max - min) + min;
    }
}

// Function to just open browser without automation
async function openBrowserOnly() {
    try {
        // Launch browser with same stealth settings but no automation
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
                '--disable-default-apps',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--lang=en-US',
                '--accept-lang=en-US,en;q=0.9'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set user agent and other stealth properties
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to Google and wait
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
        
    } catch (error) {
        console.error('❌ Error opening browser:', error);
    }
}

// Continuous monitoring function
function startContinuousMonitoring() {
    console.log('🔄 Starting continuous monitoring...');
    console.log('👁️ Monitoring config and software queue with configured delays...');
    
    // Check immediately on start
    checkAndStartAutomation();
}

// Function to check config and start automation if conditions are met
function checkAndStartAutomation() {
    try {
        // Read current config
        const configPath = path.join(__dirname, 'scheduler-config.json');
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Check if automation is enabled
        if (!currentConfig.enabled) {
            // Schedule next check with configured delay
            scheduleNextCheck(currentConfig);
            return;
        }
        
        // Check if there are software in the queue
        const softwareFile = './new softwers.txt';
        if (!fs.existsSync(softwareFile)) {
            // Schedule next check with configured delay
            scheduleNextCheck(currentConfig);
            return;
        }
        
        const fileContent = fs.readFileSync(softwareFile, 'utf8');
        const softwareList = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (softwareList.length === 0) {
            // Schedule next check with configured delay
            scheduleNextCheck(currentConfig);
            return;
        }
        
        // Both conditions met - start automation
        console.log(`✅ Conditions met: enabled=true, ${softwareList.length} software in queue`);
        console.log('🚀 Starting automation...');
        
        // Update global config reference
        config = currentConfig;
        
        // Start the automation
        startPuppeteerSearch();
        
    } catch (error) {
        console.log('⚠️ Error during monitoring check:', error.message);
        // Schedule next check even on error
        try {
            const configPath = path.join(__dirname, 'scheduler-config.json');
            const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            scheduleNextCheck(currentConfig);
        } catch (configError) {
            // Fallback to 30 second check if config can't be read
            setTimeout(() => checkAndStartAutomation(), 30000);
        }
    }
}

// Function to schedule next monitoring check based on configured delays
function scheduleNextCheck(currentConfig) {
    const min = currentConfig.newSoftware.minDelayMinutes;
    const max = currentConfig.newSoftware.maxDelayMinutes;
    const delayMinutes = Math.random() * (max - min) + min;
    const delayMs = delayMinutes * 60 * 1000;
    
    setTimeout(() => {
        checkAndStartAutomation();
    }, delayMs);
}

// Continuous monitoring function
function startContinuousMonitoring() {
    console.log('🔄 Starting continuous monitoring...');
    console.log('👁️ Monitoring config and software queue with configured delays...');
    
    // Check immediately on start
    checkAndStartAutomation();
}

// Start continuous monitoring instead of single execution
startContinuousMonitoring();

// ... (rest of the code remains the same)
