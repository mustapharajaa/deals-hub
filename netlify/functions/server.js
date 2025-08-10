const serverless = require('serverless-http');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// Database setup for serverless
let db;
let dbInitialized = false;

function initDatabase() {
    return new Promise((resolve, reject) => {
        if (dbInitialized) {
            return resolve(db);
        }
        
        // Use in-memory database for serverless
        db = new sqlite3.Database(':memory:', (err) => {
            if (err) {
                console.error('Error connecting to database:', err.message);
                return reject(err);
            } else {
                console.log('Connected to in-memory SQLite database');
                
                // Create tables
                db.serialize(() => {
                    // Create categories table
                    db.run(`CREATE TABLE IF NOT EXISTS categories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE
                    )`);
                    
                    // Create deals table
                    db.run(`CREATE TABLE IF NOT EXISTS deals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        software_name TEXT NOT NULL,
                        description TEXT,
                        discount TEXT,
                        coupon_code TEXT,
                        website_url TEXT,
                        logo_url TEXT,
                        time_limit TEXT,
                        category_id INTEGER,
                        categories TEXT,
                        about TEXT,
                        deal_title TEXT,
                        likes INTEGER DEFAULT 0,
                        FOREIGN KEY (category_id) REFERENCES categories(id)
                    )`);
                    
                    // Insert sample data and mark as initialized
                    insertSampleData(() => {
                        dbInitialized = true;
                        resolve(db);
                    });
                });
            }
        });
    });
}

function insertSampleData(callback) {
    // Insert sample categories
    const categories = [
        'AI', 'Marketing', 'Business', 'Design', 'Development', 'Productivity',
        'Analytics', 'CRM', 'E-commerce', 'Communication'
    ];
    
    let categoriesInserted = 0;
    categories.forEach(category => {
        db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category], () => {
            categoriesInserted++;
            if (categoriesInserted === categories.length) {
                insertDeals(callback);
            }
        });
    });
}

function insertDeals(callback) {
    // Insert sample deals
    const deals = [
        {
            software_name: 'Dnrater',
            description: 'AI-driven solution designed to help users select the most suitable and accurate domain names.',
            discount: '76% OFF',
            coupon_code: 'FREEDOMAIN1',
            website_url: 'https://dnrater.com',
            logo_url: '',
            time_limit: 'Limited Time',
            category_id: 1,
            about: 'Dnrater is an AI-driven solution designed to help users select the most suitable and accurate domain names. It analyzes various factors to determine a domain\'s potential, assisting users in making informed decisions.',
            deal_title: '76% OFF Dnrater Coupon Code - August 2025 Promo Codes'
        },
        {
            software_name: 'TaskMagic',
            description: 'Powerful automation tool for streamlining workflows and increasing productivity.',
            discount: '50% OFF',
            coupon_code: 'MAGIC50',
            website_url: 'https://taskmagic.com',
            logo_url: '',
            time_limit: 'Limited Time',
            category_id: 6,
            about: 'TaskMagic is a powerful automation platform that helps businesses streamline their workflows.',
            deal_title: '50% OFF TaskMagic Lifetime Deal - Automation Software'
        }
    ];
    
    let dealsInserted = 0;
    deals.forEach(deal => {
        db.run(`INSERT OR IGNORE INTO deals (
            software_name, description, discount, coupon_code, website_url, 
            logo_url, time_limit, category_id, about, deal_title
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            deal.software_name, deal.description, deal.discount, deal.coupon_code,
            deal.website_url, deal.logo_url, deal.time_limit, deal.category_id,
            deal.about, deal.deal_title
        ], () => {
            dealsInserted++;
            if (dealsInserted === deals.length) {
                console.log('Sample data inserted successfully');
                if (callback) callback();
            }
        });
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Helper function to generate fallback SVG images
function fallbackSvg(softwareName) {
    const letter = softwareName.charAt(0).toUpperCase();
    return `data:image/svg+xml;base64,${Buffer.from(`<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="#00D4AA" rx="12"/><text x="40" y="55" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${letter}</text></svg>`).toString('base64')}`;
}

// Deal page route with SSR
app.get('/deal/:softwareSlug', async (req, res) => {
    try {
        await initDatabase(); // Ensure database is initialized
        
        const softwareSlug = req.params.softwareSlug;
        const dealQuery = `
            SELECT d.*, c.name as category_name 
            FROM deals d 
            LEFT JOIN categories c ON d.category_id = c.id 
            WHERE LOWER(REPLACE(REPLACE(TRIM(d.software_name), ' ', '-'), '--', '-')) = ?
        `;

        db.get(dealQuery, [softwareSlug], (err, deal) => {
            if (err || !deal) {
                return res.status(404).send('Deal not found');
            }

            // Read template and replace placeholders
            const templatePath = path.join(process.cwd(), 'public', 'index.html');
            let html = fs.readFileSync(templatePath, 'utf8');
            
            const seoTitle = `${deal.discount} Discount on ${deal.software_name} | Coupon Promo Code`;
            const seoDescription = deal.description || `Get the best deal on ${deal.software_name}.`;
            const softwareLogoHtml = `<img id="software-logo" src="${deal.logo_url || fallbackSvg(deal.software_name)}" alt="${deal.software_name} Logo">`;

            html = html
                .replace(/{{PAGE_TITLE}}/g, seoTitle)
                .replace(/{{META_DESCRIPTION}}/g, seoDescription)
                .replace(/{{SOFTWARE_LOGO_HTML}}/g, softwareLogoHtml)
                .replace(/{{SOFTWARE_NAME_H1}}/g, deal.software_name)
                .replace(/{{SOFTWARE_NAME}}/g, deal.software_name)
                .replace(/{{SOFTWARE_CATEGORY}}/g, deal.category_name || 'Software')
                .replace(/{{CATEGORY_NAME}}/g, deal.category_name || 'Software')
                .replace(/{{DISCOUNT_TEXT}}/g, deal.discount)
                .replace(/{{EXPIRY_DATE}}/g, deal.time_limit || 'Limited Time')
                .replace(/{{COUPON_CODE}}/g, deal.coupon_code || 'N/A')
                .replace(/{{DEAL_TITLE}}/g, deal.deal_title || `${deal.discount} ${deal.software_name}`)
                .replace(/{{SOFTWARE_DESCRIPTION}}/g, deal.description || '')
                .replace(/{{ABOUT_SECTION_CONTENT}}/g, deal.about || '')
                .replace(/{{RELATED_DEALS_GRID}}/g, '')
                .replace(/{{BOTTOM_CATEGORY_BADGES}}/g, `<span class="category-badge">${deal.category_name}</span>`);

            res.send(html);
        });
    } catch (error) {
        console.error('Error rendering deal page:', error);
        res.status(500).send('Error loading page');
    }
});

// Home page route
app.get('/', async (req, res) => {
    try {
        await initDatabase(); // Ensure database is initialized
        const indexPath = path.join(process.cwd(), 'public', 'index.html');
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).send('Error loading page');
    }
});

// API endpoint to get deal by software slug
app.get('/api/deal/:softwareSlug', async (req, res) => {
    try {
        await initDatabase(); // Ensure database is initialized
        
        const softwareSlug = req.params.softwareSlug;
        const dealQuery = `
            SELECT d.*, c.name as category_name 
            FROM deals d 
            LEFT JOIN categories c ON d.category_id = c.id 
            WHERE LOWER(REPLACE(REPLACE(TRIM(d.software_name), ' ', '-'), '--', '-')) = ?
        `;
        
        db.get(dealQuery, [softwareSlug], (err, deal) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch deal' });
            } else if (!deal) {
                return res.status(404).json({ error: 'Deal not found' });
            } else {
                res.json({ deal: deal });
            }
        });
    } catch (error) {
        console.error('Error in API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Catch all route
app.get('*', async (req, res) => {
    try {
        await initDatabase(); // Ensure database is initialized
        const indexPath = path.join(process.cwd(), 'public', 'index.html');
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error in catch-all route:', error);
        res.status(500).send('Error loading page');
    }
});

module.exports.handler = serverless(app);
