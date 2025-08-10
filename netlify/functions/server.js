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

            // Generate HTML directly instead of reading template file
            const seoTitle = `${deal.discount} Discount on ${deal.software_name} | Coupon Promo Code`;
            const seoDescription = deal.description || `Get the best deal on ${deal.software_name}.`;
            const softwareLogoHtml = `<img id="software-logo" src="${deal.logo_url || fallbackSvg(deal.software_name)}" alt="${deal.software_name} Logo">`;

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${seoTitle}</title>
    <meta name="description" content="${seoDescription}">
    <link rel="stylesheet" href="/styles.css">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 0; }
        .nav { display: flex; gap: 20px; align-items: center; }
        .nav a { color: white; text-decoration: none; padding: 10px 15px; }
        .hero-section { text-align: center; padding: 60px 0; background: #f8f9fa; }
        .software-logo img { width: 120px; height: 120px; border-radius: 12px; margin-bottom: 20px; }
        .deal-section { padding: 40px 0; }
        .coupon-code { background: #00D4AA; color: white; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; }
        .get-deal-btn { background: #00D4AA; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="nav">
                <h2>DealHub</h2>
                <a href="/deals">All Deals</a>
                <a href="/blog">Blog</a>
                <a href="/faq">FAQ</a>
                <a href="/hire-us">Hire Us</a>
                <a href="#" onclick="openContactPopup()">Contact Us</a>
            </div>
        </div>
    </header>

    <main>
        <section class="hero-section">
            <div class="container">
                <div class="software-logo">${softwareLogoHtml}</div>
                <h1>${deal.software_name}</h1>
                <div class="tags">
                    <span class="tag discount">${deal.discount}</span>
                    <span class="tag limited-time">${deal.time_limit || 'Limited Time'}</span>
                </div>
            </div>
        </section>

        <section class="deal-section">
            <div class="container">
                <div class="deal-content">
                    <h2>${deal.deal_title || deal.software_name + ' Deal'}</h2>
                    <p><strong>Category:</strong> ${deal.category_name || 'Software'}</p>
                    <p>${deal.description || ''}</p>
                    
                    <div class="coupon-section">
                        <label>COUPON CODE:</label>
                        <div class="coupon-code">${deal.coupon_code || 'N/A'}</div>
                        <button class="get-deal-btn" onclick="window.open('${deal.website_url}', '_blank')">Get Deal</button>
                    </div>
                    
                    ${deal.about ? `<div class="about-section"><h3>About ${deal.software_name}</h3><p>${deal.about}</p></div>` : ''}
                </div>
            </div>
        </section>
    </main>

    <footer style="background: #333; color: white; text-align: center; padding: 20px;">
        <p>&copy; 2024 DealHub. All rights reserved.</p>
    </footer>
</body>
</html>`;

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
        
        // Generate simple home page HTML
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DealHub - Best Software Deals & Discounts</title>
    <meta name="description" content="Discover the best software deals and discounts. Save money on top tools and services.">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 0; }
        .nav { display: flex; gap: 20px; align-items: center; }
        .nav a { color: white; text-decoration: none; padding: 10px 15px; }
        .hero { text-align: center; padding: 80px 0; background: #f8f9fa; }
        .deals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 40px 0; }
        .deal-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .deal-logo { width: 60px; height: 60px; border-radius: 8px; margin-bottom: 15px; }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="nav">
                <h2>DealHub</h2>
                <a href="/deals">All Deals</a>
                <a href="/blog">Blog</a>
                <a href="/faq">FAQ</a>
                <a href="/hire-us">Hire Us</a>
                <a href="#" onclick="alert('Contact popup would open here')">Contact Us</a>
            </div>
        </div>
    </header>

    <main>
        <section class="hero">
            <div class="container">
                <h1>Best Software Deals & Discounts</h1>
                <p>Discover amazing deals on top software tools</p>
            </div>
        </section>

        <section class="deals-grid">
            <div class="container">
                <h2>Featured Deals</h2>
                <div class="deal-card">
                    <img src="${fallbackSvg('Dnrater')}" alt="Dnrater" class="deal-logo">
                    <h3>Dnrater</h3>
                    <p>76% OFF - AI domain name selection tool</p>
                    <a href="/deal/dnrater" style="background: #00D4AA; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Deal</a>
                </div>
                <div class="deal-card">
                    <img src="${fallbackSvg('TaskMagic')}" alt="TaskMagic" class="deal-logo">
                    <h3>TaskMagic</h3>
                    <p>50% OFF - Automation platform</p>
                    <a href="/deal/taskmagic" style="background: #00D4AA; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Deal</a>
                </div>
            </div>
        </section>
    </main>

    <footer style="background: #333; color: white; text-align: center; padding: 20px;">
        <p>&copy; 2024 DealHub. All rights reserved.</p>
    </footer>
</body>
</html>`;
        
        res.send(html);
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

// Catch all route - return 404 for unknown routes
app.get('*', async (req, res) => {
    try {
        await initDatabase(); // Ensure database is initialized
        
        // Generate 404 page HTML
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - DealHub</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; text-align: center; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 0; }
        .nav { display: flex; gap: 20px; align-items: center; justify-content: center; }
        .nav a { color: white; text-decoration: none; padding: 10px 15px; }
        .error-content { padding: 60px 0; }
        .error-code { font-size: 72px; font-weight: bold; color: #667eea; margin-bottom: 20px; }
        .error-message { font-size: 24px; margin-bottom: 30px; color: #333; }
        .back-btn { background: #00D4AA; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; }
    </style>
</head>
<body>
    <header class="header">
        <div class="nav">
            <h2>DealHub</h2>
            <a href="/">Home</a>
            <a href="/deals">All Deals</a>
            <a href="/blog">Blog</a>
            <a href="/faq">FAQ</a>
        </div>
    </header>

    <div class="container">
        <div class="error-content">
            <div class="error-code">404</div>
            <div class="error-message">Page Not Found</div>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/" class="back-btn">Back to Home</a>
        </div>
    </div>

    <footer style="background: #333; color: white; text-align: center; padding: 20px; margin-top: 40px;">
        <p>&copy; 2024 DealHub. All rights reserved.</p>
    </footer>
</body>
</html>`;
        
        res.status(404).send(html);
    } catch (error) {
        console.error('Error in catch-all route:', error);
        res.status(500).send('Error loading page');
    }
});

module.exports.handler = serverless(app);


