const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('🤖 Starting Gemini AI Database Updater...');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCTNUxL8jmHLmSo9hNx9LklRHChqOvZ1YI');

// Database connection with synchronous migration
let db;
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database('../deals.db', (err) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Database connected');
            
            // Add about column if it doesn't exist (migration)
            db.run('ALTER TABLE deals ADD COLUMN about TEXT', (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('❌ Migration error:', err.message);
                    reject(err);
                } else {
                    if (!err) {
                        console.log('✅ About column added to database');
                    }
                    
                    // Add software_name_slug column if it doesn't exist
                    db.run('ALTER TABLE deals ADD COLUMN software_name_slug TEXT', (slugErr) => {
                        if (slugErr && !slugErr.message.includes('duplicate column')) {
                            console.error('❌ Migration error for slug column:', slugErr.message);
                            reject(slugErr);
                        } else {
                            if (!slugErr) {
                                console.log('✅ Software_name_slug column added to database');
                            }
                            console.log('🔄 Database migration completed, ready to process files');
                            resolve();
                        }
                    });
                }
            });
        });
    });
}

// Configuration
const CONFIG = {
    RESULTS_DIR: './',  // Files are saved in current directory
    PROCESSED_DIR: './processed-results'
};

// Create processed directory if it doesn't exist
if (!fs.existsSync(CONFIG.PROCESSED_DIR)) {
    fs.mkdirSync(CONFIG.PROCESSED_DIR);
}

// No logging to file - console output only

// Extract software name from filename
function extractSoftwareName(filename) {
    // Remove timestamp and extensions - handle both search-results and clean-results
    let name = filename
        .replace(/-search-results-.*\.txt$/, '')
        .replace(/-clean-results-.*\.txt$/, '')
        .replace(/-\d{4}-\d{2}-\d{2}T.*\.txt$/, '') // Remove any timestamp pattern
        .replace(/-/g, ' ')
        .trim();
    
    // Capitalize first letter of each word for better database matching
    name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    return name;
}

// Analyze file content with Gemini AI with retry logic
async function analyzeWithGemini(fileContent, softwareName) {
    const maxRetries = 3;
    const retryDelay = 10000; // 10 seconds (longer delay)
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
Analyze this COMPLETE scraped data for "${softwareName}" including Google search results AND all ranked page content.

COMPLETE SCRAPED DATA:
${fileContent}

This file contains:
1. Google search results (showing why pages rank)
2. RANKED #1 RESULT - Full page content
3. RANKED #2 RESULT - Full page content  
4. RANKED #3 RESULT - Full page content

Analyze ALL sections to create the most comprehensive SEO strategy and description.

Please extract and return ONLY a JSON object with the following structure (no additional text):
{
    "software_name": "exact software name from all content",
    "best_discount": "highest discount percentage found across ALL content (number only)",
    "all_coupon_codes": ["complete", "list", "of", "ALL", "coupon", "codes", "found"],
    "seo_description": "compelling 150-160 character SEO description using insights from ALL pages",
    "detailed_description": "comprehensive 200-300 word software description explaining what it does, key benefits, and target users",
    "comprehensive_features": ["complete", "list", "of", "ALL", "features", "from", "all", "pages"],
    "ranking_analysis": "why top results rank (keywords, content depth, authority, user experience)",
    "pricing_comparison": "all pricing information found across all pages",
    "deal_websites": ["all", "websites", "offering", "deals", "from", "all", "pages"],
    "target_keywords": ["comprehensive", "SEO", "keywords", "from", "ALL", "content"],
    "content_themes": ["main", "themes", "and", "topics", "across", "all", "pages"],
    "user_benefits": ["key", "user", "benefits", "mentioned", "across", "all", "content"],
    "competitive_advantages": "what makes this software unique based on ALL content analysis",
    "deal_urgency": "any urgency or scarcity mentioned across all pages",
    "social_proof": "testimonials, reviews, user counts mentioned in any content",
    "technical_specs": "technical details and specifications from all pages",
    "categories": ["list", "of", "relevant", "categories", "this", "software", "belongs", "to"],
    "primary_category": "most relevant single category for this software",
    "expiration_info": "Generate SHORT expiration text (2-4 words max) based on deal data. Examples: 'Limited Time Only', 'New Users', 'Students Only', 'Annual Plans', 'First Month', 'Until Dec 31', etc. Keep it brief and user-friendly.",
    "logo_url": "Find the official domain for '${softwareName}'. Search the entire text for a URL like '${softwareName}.com' or '${softwareName}.io'. Extract only the domain part (e.g., 'dnrater.com'). Ignore social media links. If you find it, return the domain. If not, return null.",
    "comprehensive_about": "Complete About [Software Name] content with CREATIVE and VARIED section titles (MAXIMUM 2300 characters). DO NOT use repetitive formats like '[Name] + Topic'. Use DIVERSE, NATURAL titles such as: 'What is [Name]?', 'Key Features and Capabilities', 'Pricing Plans and Value', 'How [Name] Compares to Alternatives', 'User Experience and Reviews', 'Getting Started with [Name]', 'Advanced Features', 'Integration Possibilities', 'Who Should Use [Name]', 'Pros and Cons', 'Customer Support Quality', 'Market Position', 'Best Use Cases', 'Limitations to Consider', etc. Make each section title UNIQUE and ENGAGING, not formulaic. Only include sections with actual data. KEEP TOTAL LENGTH UNDER 2300 CHARACTERS."
}

Rules:
- Analyze ALL content sections for maximum SEO insights
- Find the HIGHEST discount from any page
- Collect ALL coupon codes from every section
- Create SEO description using best insights from all 3 ranked pages
- Extract comprehensive keyword list from all content
- Identify content themes that make pages rank well
- Focus on user benefits and competitive advantages
- SEO description should be 150-160 characters for optimal Google display
- CATEGORIES: Analyze software purpose and assign to relevant categories like: Automation, Productivity, Design, Writing, Software, Tools, Services, Marketing, Development, Business, AI, Analytics, CRM, E-commerce, Education, Finance, etc.
- PRIMARY_CATEGORY: Choose the single most relevant category
- MULTIPLE CATEGORIES: Software can belong to multiple categories (e.g., TaskMagic = Automation + Productivity + Tools)
- Return valid JSON only
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Try to parse JSON response
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsedData = JSON.parse(jsonMatch[0]);
                
                // Debug: Log what fields Gemini AI returned
                console.log('🔍 Gemini AI returned fields:', Object.keys(parsedData));
                console.log('🔍 Has comprehensive_about?', 'comprehensive_about' in parsedData);
                if (parsedData.comprehensive_about) {
                    console.log('🔍 About content type:', typeof parsedData.comprehensive_about);
                    console.log('🔍 About content length:', parsedData.comprehensive_about.length);
                }
                
                return parsedData;
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.log(`❌ JSON parse error for ${softwareName}: ${parseError.message}`);
            return null;
        }
        
    } catch (error) {
        if (error.message.includes('overloaded') || error.message.includes('503')) {
            console.log(`⚠️ Attempt ${attempt}/${maxRetries}: Gemini API overloaded, retrying in ${retryDelay/1000} seconds...`);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue; // Retry
            }
        }
        console.log(`❌ Gemini API error for ${softwareName}: ${error.message}`);
        return null;
    }
    }
    
    return null; // All retries failed
}

// Create category if it doesn't exist
async function createCategoryIfNotExists(categoryName) {
    return new Promise((resolve, reject) => {
        // Check if database is initialized
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        // Check if category exists
        db.get(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
            [categoryName],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row) {
                    // Category exists, return its ID
                    resolve(row.id);
                } else {
                    // Create new category
                    db.run(
                        'INSERT INTO categories (name, description) VALUES (?, ?)',
                        [categoryName, `Auto-generated category for ${categoryName} software`],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`📁 Created new category: ${categoryName}`);
                                resolve(this.lastID);
                            }
                        }
                    );
                }
            }
        );
    });
}

// Update software categories (supports multiple categories with 5-category limit)
async function updateSoftwareCategories(dealId, categories, primaryCategory) {
    try {
        // Check if database is initialized
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        // Enforce 5-category maximum limit
        let limitedCategories = [...categories];
        
        // Ensure primary category is always included
        if (primaryCategory && !limitedCategories.includes(primaryCategory)) {
            limitedCategories.unshift(primaryCategory);
        }
        
        // Limit to maximum 5 categories
        if (limitedCategories.length > 5) {
            // Keep primary category first, then take next 4 most relevant
            const primaryIndex = limitedCategories.indexOf(primaryCategory);
            if (primaryIndex > 0) {
                // Move primary to front
                limitedCategories.splice(primaryIndex, 1);
                limitedCategories.unshift(primaryCategory);
            }
            limitedCategories = limitedCategories.slice(0, 5);
            console.log(`⚠️ Limited categories to 5 maximum: ${limitedCategories.join(', ')}`);
        }
        
        // Get or create category IDs
        const categoryIds = [];
        let primaryCategoryId = null;
        
        for (const categoryName of limitedCategories) {
            const categoryId = await createCategoryIfNotExists(categoryName);
            categoryIds.push(categoryId);
            
            if (categoryName === primaryCategory) {
                primaryCategoryId = categoryId;
            }
        }
        
        // If primary category not found in categories list, create it
        if (!primaryCategoryId && primaryCategory) {
            primaryCategoryId = await createCategoryIfNotExists(primaryCategory);
        }
        
        // Update deal with primary category and all additional categories
        if (primaryCategoryId) {
            // Store additional category IDs (excluding primary) as comma-separated string
            const additionalCategoryIds = categoryIds.filter(id => id !== primaryCategoryId);
            const categoriesString = additionalCategoryIds.length > 0 ? additionalCategoryIds.join(',') : '';
            
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE deals SET category_id = ?, categories = ? WHERE id = ?',
                    [primaryCategoryId, categoriesString, dealId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        
        console.log(`🏷️ Updated categories: ${limitedCategories.join(', ')} (Primary: ${primaryCategory})`);
        
        if (categories.length > limitedCategories.length) {
            console.log(`📊 Reduced from ${categories.length} to ${limitedCategories.length} categories (5 max limit)`);
        }
        
    } catch (error) {
        console.error('❌ Error updating categories:', error.message);
    }
}

// Update database with analyzed data
async function updateDatabase(softwareName, analyzedData) {
    return new Promise((resolve, reject) => {
        // Check if database is initialized
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        // First, check if the software exists in database - improved search
        const searchTerm = softwareName.toLowerCase().replace(/[^a-z0-9]/g, '');
        db.get(
            `SELECT id, software_name FROM deals WHERE LOWER(REPLACE(software_name, ' ', '')) LIKE LOWER(?)`,
            [`%${searchTerm}%`],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row) {
                    // Update existing record ONLY
                    const updateQuery = `
                        UPDATE deals SET 
                            discount = COALESCE(?, discount),
                            description = COALESCE(?, description),
                            about = ?,
                            coupon_code = COALESCE(?, coupon_code),
                            time_limit = COALESCE(?, time_limit),
                            logo_url = IIF(? IS NOT NULL, ?, logo_url),
                            updated_at = datetime('now')
                        WHERE id = ?
                    `;
                    
                    const discount = analyzedData.best_discount ? `${analyzedData.best_discount}% OFF` : null;
                    const description = analyzedData.detailed_description || analyzedData.seo_description || null;
                    
                    // Handle comprehensive_about - convert object to formatted text if needed
                    let comprehensiveAbout = null;
                    if (analyzedData.comprehensive_about) {
                        if (typeof analyzedData.comprehensive_about === 'string') {
                            comprehensiveAbout = analyzedData.comprehensive_about;
                        } else if (typeof analyzedData.comprehensive_about === 'object') {
                            // Convert object to properly formatted text for display
                            try {
                                // If it's an object with sections, format it nicely
                                if (Array.isArray(analyzedData.comprehensive_about)) {
                                    comprehensiveAbout = analyzedData.comprehensive_about.join('\n\n');
                                } else {
                                    // Convert object properties to formatted text
                                    const sections = [];
                                    for (const [key, value] of Object.entries(analyzedData.comprehensive_about)) {
                                        if (value) {
                                            sections.push(`${key.replace(/_/g, ' ').toUpperCase()}\n${value}`);
                                        }
                                    }
                                    comprehensiveAbout = sections.join('\n\n');
                                }
                            } catch (error) {
                                // Fallback to JSON string if formatting fails
                                comprehensiveAbout = JSON.stringify(analyzedData.comprehensive_about, null, 2);
                            }
                        }
                    }
                    
                    const couponCode = analyzedData.all_coupon_codes && analyzedData.all_coupon_codes.length > 0 
                        ? analyzedData.all_coupon_codes[0] : null;
                    const expirationInfo = analyzedData.expiration_info || null;
                    const logoUrl = analyzedData.logo_url ? `https://logo.clearbit.com/${analyzedData.logo_url.trim()}` : null;
                    
                    // Debug: Log what we're about to store
                    console.log('🔍 Debug - About content length:', comprehensiveAbout ? comprehensiveAbout.length : 'undefined');
                    console.log('🕰️ Debug - Expiration info:', expirationInfo);
                    console.log('🇿️ Debug - Logo URL:', logoUrl);
                    if (comprehensiveAbout && typeof comprehensiveAbout === 'string') {
                        console.log('📝 About content preview:', comprehensiveAbout.substring(0, 100) + '...');
                    } else {
                        console.log('⚠️ About content is not a string or is undefined');
                    }
                    
                    db.run(updateQuery, [discount, description, comprehensiveAbout, couponCode, expirationInfo, logoUrl, logoUrl, row.id], async function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            // Update categories if provided
                            if (analyzedData.categories && analyzedData.categories.length > 0) {
                                await updateSoftwareCategories(
                                    row.id, 
                                    analyzedData.categories, 
                                    analyzedData.primary_category
                                );
                            }
                            
                            console.log(`📊 Step 3: ${row.software_name} - Updated existing software details in database`);
                            if (logoUrl) {
                                console.log('✅ Logo URL database update successful.');
                            }
                            resolve({ updated: true, id: row.id, software: row.software_name });
                        }
                    });
                } else {
                    // Software not found in database - add new software
                    console.log(`➕ ${softwareName} not found in database - adding as new software`);
                    
                    const discount = analyzedData.best_discount ? `${analyzedData.best_discount}% OFF` : null;
                    const description = analyzedData.detailed_description || analyzedData.seo_description || null;
                    const couponCode = analyzedData.all_coupon_codes && analyzedData.all_coupon_codes.length > 0 
                        ? analyzedData.all_coupon_codes[0] : null;
                    const expirationInfo = analyzedData.expiration_info || null;
                    const logoUrl = analyzedData.logo_url ? `https://logo.clearbit.com/${analyzedData.logo_url.trim()}` : null;
                    
                    // Handle comprehensive_about - convert object to formatted text if needed
                    let comprehensiveAbout = null;
                    if (analyzedData.comprehensive_about) {
                        if (typeof analyzedData.comprehensive_about === 'string') {
                            comprehensiveAbout = analyzedData.comprehensive_about;
                        } else if (typeof analyzedData.comprehensive_about === 'object') {
                            // Convert object to properly formatted text for display
                            try {
                                // If it's an object with sections, format it nicely
                                if (Array.isArray(analyzedData.comprehensive_about)) {
                                    comprehensiveAbout = analyzedData.comprehensive_about.join('\n\n');
                                } else {
                                    // Convert object properties to formatted text
                                    const sections = [];
                                    for (const [key, value] of Object.entries(analyzedData.comprehensive_about)) {
                                        if (value) {
                                            sections.push(`${key.replace(/_/g, ' ').toUpperCase()}\n${value}`);
                                        }
                                    }
                                    comprehensiveAbout = sections.join('\n\n');
                                }
                            } catch (error) {
                                // Fallback to JSON string if formatting fails
                                comprehensiveAbout = JSON.stringify(analyzedData.comprehensive_about, null, 2);
                            }
                        }
                    }
                    
                    // Get primary category ID (default to 1 if not found)
                    let primaryCategoryId = 1; // Default category
                    
                    // Handle category creation with promises
                    const processCategoryAndInsert = () => {
                        if (analyzedData.primary_category) {
                            createCategoryIfNotExists(analyzedData.primary_category)
                                .then((categoryId) => {
                                    primaryCategoryId = categoryId;
                                    insertNewSoftware();
                                })
                                .catch((error) => {
                                    console.log('⚠️ Could not create primary category, using default');
                                    insertNewSoftware();
                                });
                        } else {
                            insertNewSoftware();
                        }
                    };
                    
                    const insertNewSoftware = () => {
                    
                    const insertQuery = `
                        INSERT INTO deals (
                            software_name, software_name_slug, discount, description, about, 
                            coupon_code, time_limit, logo_url, category_id, referral_link, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `;
                    
                    const softwareSlug = softwareName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const referralLink = `https://example.com/${softwareSlug}`; // Default referral link
                    
                    db.run(insertQuery, [
                        softwareName, 
                        softwareSlug, 
                        discount, 
                        description, 
                        comprehensiveAbout, 
                        couponCode, 
                        expirationInfo, 
                        logoUrl, 
                        primaryCategoryId, 
                        referralLink
                    ], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            const newDealId = this.lastID;
                            
                            // Update categories if provided (handle async separately)
                            if (analyzedData.categories && analyzedData.categories.length > 0) {
                                updateSoftwareCategories(
                                    newDealId, 
                                    analyzedData.categories, 
                                    analyzedData.primary_category
                                ).then(() => {
                                    console.log(`📊 Step 3: ${softwareName} - Added new software to database with ID ${newDealId}`);
                                    resolve({ added: true, id: newDealId, software: softwareName });
                                }).catch((categoryError) => {
                                    console.log('⚠️ Category update failed, but software added successfully');
                                    console.log(`📊 Step 3: ${softwareName} - Added new software to database with ID ${newDealId}`);
                                    resolve({ added: true, id: newDealId, software: softwareName });
                                });
                            } else {
                                console.log(`📊 Step 3: ${softwareName} - Added new software to database with ID ${newDealId}`);
                                resolve({ added: true, id: newDealId, software: softwareName });
                            }
                        }
                    });
                    }; // Close insertNewSoftware function
                    
                    // Start the process
                    processCategoryAndInsert();
                }
            }
        );
    });
}

// Process a single file
async function processFile(filename) {
    const filePath = path.join(CONFIG.RESULTS_DIR, filename);
    
    try {
        console.log(`📄 Processing file: ${filename}`);
        
        // Read file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const softwareName = extractSoftwareName(filename);
        
        console.log(`🔍 Analyzing ${softwareName} with Gemini AI...`);
        
        // Analyze with Gemini
        const analyzedData = await analyzeWithGemini(fileContent, softwareName);
        
        if (analyzedData) {
            // Step 1: Analysis Success
            console.log(`✅ Step 1: ${analyzedData.software_name || softwareName} - Gemini AI analysis completed`);
            
            // Step 2: Coupon Data Found
            console.log(`🎯 Step 2: Found ${analyzedData.best_discount}% discount and ${analyzedData.all_coupon_codes?.length || 0} coupon codes`);
            
            // Update database
            const result = await updateDatabase(softwareName, analyzedData);
            
            // Save analysis results
            const analysisFile = path.join(CONFIG.PROCESSED_DIR, `${softwareName}-analysis.json`);
            fs.writeFileSync(analysisFile, JSON.stringify({
                filename: filename,
                software_name: softwareName,
                analyzed_at: new Date().toISOString(),
                gemini_analysis: analyzedData,
                database_result: result
            }, null, 2));
            
            // Move processed file
            const processedFile = path.join(CONFIG.PROCESSED_DIR, filename);
            fs.renameSync(filePath, processedFile);
            
            // All 3 steps completed successfully
            return { success: true, software: softwareName, result };
            
        } else {
            console.log(`❌ Failed to analyze ${softwareName} with Gemini`);
            return { success: false, software: softwareName, error: 'Gemini analysis failed' };
        }
        
    } catch (error) {
        console.log(`❌ Error processing ${filename}: ${error.message}`);
        return { success: false, software: extractSoftwareName(filename), error: error.message };
    }
}

// Process all unprocessed files
async function processAllFiles() {
    try {
        console.log('🚀 Starting batch file processing...');
        
        // Get all files in results directory
        const files = fs.readdirSync(CONFIG.RESULTS_DIR)
            .filter(file => file.endsWith('.txt'))
            .sort(); // Process in order
        
        if (files.length === 0) {
            console.log('📭 No files to process');
            return;
        }
        
        console.log(`📊 Found ${files.length} files to process`);
        
        const results = [];
        
        for (const file of files) {
            const result = await processFile(file);
            results.push(result);
            
            // Delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`🎉 Processing completed: ${successful} successful, ${failed} failed`);
        
        return results;
        
    } catch (error) {
        console.log(`❌ Batch processing error: ${error.message}`);
    }
}

// Watch for new files and process them automatically
function watchForNewFiles() {
    console.log('👀 Watching for new files...');
    
    fs.watch(CONFIG.RESULTS_DIR, (eventType, filename) => {
        if (eventType === 'rename' && filename && filename.endsWith('.txt')) {
            console.log(`📥 New file detected: ${filename}`);
            
            // Wait a moment for file to be fully written
            setTimeout(async () => {
                await processFile(filename);
            }, 5000);
        }
    });
}

// Main function
async function main() {
    console.log('🤖 Gemini AI Database Updater Started!');
    
    // Check API key
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.log('⚠️ Please set your GEMINI_API_KEY environment variable');
        console.log('💡 Get your API key from: https://makersuite.google.com/app/apikey');
        return;
    }
    
    // Initialize database and ensure about column exists
    try {
        await initializeDatabase();
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
        return;
    }
    
    // Process existing files
    await processAllFiles();
    
    // Start watching for new files
    watchForNewFiles();
    
    console.log('✅ Gemini AI system is now running and watching for new files');
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('👋 Shutting down Gemini AI analyzer...');
    db.close();
    process.exit(0);
});

// Wrapper function for external calls that ensures database is initialized
async function processFileWithInit(filename) {
    try {
        // Initialize database if not already done
        if (!db) {
            await initializeDatabase();
        }
        
        // Now process the file
        return await processFile(filename);
    } catch (error) {
        console.log(`❌ Error in processFileWithInit: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Export functions for use in other modules
module.exports = {
    processFile: processFileWithInit, // Export the wrapper instead
    processAllFiles,
    analyzeWithGemini,
    updateDatabase
};

// Run if called directly
if (require.main === module) {
    main();
}
