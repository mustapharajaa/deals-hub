// Simple Node.js Express Server with Database
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = 3001;

// Database setup
const dbPath = path.join(__dirname, 'deals.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        // Run migrations: Add 'likes' column if it doesn't exist
        db.run(`ALTER TABLE deals ADD COLUMN likes INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding likes column:', err.message);
            }
        });
        
        // Create related_deal_likes table for contextual likes
        db.run(`CREATE TABLE IF NOT EXISTS related_deal_likes (
            source_deal_id INTEGER,
            related_deal_id INTEGER,
            likes INTEGER DEFAULT 1,
            PRIMARY KEY (source_deal_id, related_deal_id),
            FOREIGN KEY (source_deal_id) REFERENCES deals(id),
            FOREIGN KEY (related_deal_id) REFERENCES deals(id)
        )`, (err) => {
            if (err) {
                console.error('Error creating related_deal_likes table:', err.message);
            } else {
                console.log(' Database schema up-to-date.');
            }
        });
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory cache for fallback SVG images (max 26 items = ~7KB)
const fallbackImageCache = new Map();

// Helper function to generate fallback SVG images with in-memory caching
function fallbackSvg(softwareName) {
    const firstLetter = softwareName.charAt(0).toUpperCase();
    
    // Check if we already have this image cached in memory
    if (fallbackImageCache.has(firstLetter)) {
        return fallbackImageCache.get(firstLetter);
    }
    
    // Generate new SVG image
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${firstLetter}</text></svg>`;
    const base64Image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    
    // Store in memory cache for instant future access
    fallbackImageCache.set(firstLetter, base64Image);
    
    return base64Image;
}

// Default route - serve homepage (MUST be before static middleware)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Dashboard route (stays in root for security)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Category index page - shows all categories
app.get('/categories', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 87;
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    db.get('SELECT COUNT(*) as total FROM categories', [], (countErr, countResult) => {
        if (countErr) {
            console.error('Error counting categories:', countErr);
            return res.status(500).send('Error loading categories');
        }
        
        const totalCategories = countResult.total;
        const hasNextPage = offset + limit < totalCategories;
        
        db.all('SELECT id, name, description FROM categories ORDER BY name LIMIT ? OFFSET ?', [limit, offset], (err, categories) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).send('Error loading categories');
        }
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Categories - August 2025 - Discover Amazing Deals on Premium Tools!</title>
    <meta name="description" content="Browse all deals categories and discover amazing deals on premium tools. Find the best discounts and save money on top tools.">
    <link rel="stylesheet" href="/home-styles.css">
    <style>
        /* Hero Section */
        .categories-hero { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 0; text-align: center; }
        .categories-hero .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .categories-hero h1 { color: white; margin-bottom: 20px; font-size: 2rem; font-weight: 500; }
        .categories-hero .category-search { margin-bottom: 0; }
        .categories-hero .category-search input { padding: 10px 20px; width: 300px; border: none; border-radius: 25px; font-size: 14px; outline: none; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .categories-hero .category-search input:focus { box-shadow: 0 4px 20px rgba(0,212,170,0.3); }
        .categories-hero .category-search input::placeholder { color: #999; }
        
        /* Main Content */
        .categories-main { padding: 60px 0; background: #f8f9fa; }
        .categories-main .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .categories-main .categories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; justify-content: stretch; width: 100%; }
        .categories-main .category-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-decoration: none; color: inherit; transition: transform 0.2s; }
        .categories-main .category-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .categories-main .category-name { font-size: 1.2em; font-weight: bold; color: #00D4AA; margin-bottom: 10px; }
        .categories-main .category-desc { color: #666; line-height: 1.4; }
        .pagination { text-align: center; margin-top: 40px; }
        .next-btn { background: #00D4AA; color: white; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; transition: background 0.3s; }
        .next-btn:hover { background: #00B894; }
        .next-btn:disabled { background: #ccc; cursor: not-allowed; }
        @media (max-width: 768px) { .categories-main .categories-grid { grid-template-columns: 1fr; } }
        @media (max-width: 1024px) and (min-width: 769px) { .categories-main .categories-grid { grid-template-columns: repeat(2, 1fr); } }
        
        /* Contact Popup Styles */
        .contact-popup {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        }
        .contact-popup.active {
            display: flex;
        }
        .contact-popup-content {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .contact-popup-close {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #999;
            transition: color 0.3s ease;
        }
        .contact-popup-close:hover {
            color: #333;
        }
        .contact-popup h2 {
            color: #333;
            margin: 0 0 20px 0;
            font-size: 1.8rem;
        }
        .contact-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .contact-form input,
        .contact-form textarea {
            padding: 15px;
            border: 2px solid #eee;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        .contact-form input:focus,
        .contact-form textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .contact-form textarea {
            min-height: 120px;
            resize: vertical;
        }
        .contact-submit-btn {
            background: #667eea;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        .contact-submit-btn:hover {
            background: #5a67d8;
        }
        .contact-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .contact-info h3 {
            margin: 0 0 15px 0;
            color: #333;
        }
        .contact-info p {
            margin: 5px 0;
            color: #666;
        }
        .contact-info a {
            color: #667eea;
            text-decoration: none;
        }
        .contact-info a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="logo">
                <h2>Deal Hub</h2>
            </div>
            <nav class="nav">
                <a href="/all-deals">All Deals</a>
                <a href="/blog">Blog</a>
                <a href="/faq">FAQ</a>
                <a href="/hire-us">Hire Us</a>
                <a href="#" onclick="openContactPopup()">Contact Us</a>
            </nav>
            <div class="social-icons">
                <a href="#" class="social-icon"><img src="/images/facebook.png" alt="Facebook" style="width: 24px; height: 24px;"></a>
                <a href="#" class="social-icon"><img src="/images/x.png" alt="X/Twitter" style="width: 24px; height: 24px;"></a>
                <a href="#" class="social-icon"><img src="/images/linkedin.png" alt="LinkedIn" style="width: 24px; height: 24px;"></a>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="categories-hero">
        <div class="container">
            <h1>All Categories</h1>
            <div class="category-search">
                <input type="text" id="category-search" placeholder="Search categories..." onkeyup="filterCategories()">
            </div>
        </div>
    </section>

    <!-- Categories Main Section -->
    <section class="categories-main">
        <div class="container">
            <div class="categories-grid" id="categories-grid">`;
        
        categories.forEach(category => {
            const categorySlug = category.name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/--+/g, '-')
                .replace(/^-|-$/g, '');
            
            html += `
            <a href="/category/${categorySlug}" class="category-card">
                <div class="category-name">${category.name}</div>
                <div class="category-desc">${category.description || 'Discover great deals and discounts in this category.'}</div>
            </a>`;
        });
        
        html += `
            </div>
            <div class="pagination">
                ${hasNextPage ? `<button class="next-btn" onclick="loadNextPage(${page + 1})">Next Page</button>` : ''}
            </div>
        </div>
    </section>

    <!-- Newsletter Signup -->
    <section class="newsletter">
        <div class="container">
            <h2 class="newsletter-title">Stay updated on sweet deals!</h2>
            <p class="newsletter-subtitle">You don't want to miss out</p>
            <div class="newsletter-form">
                <input type="email" placeholder="Enter your email address" class="email-input" id="email-input">
                <button class="newsletter-btn" onclick="subscribeNewsletter()">Give Me Free Stuff</button>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-logo">
                <h2>Deal Hub</h2>
            </div>
            <div class="footer-social">
                <a href="#" class="social-icon"><img src="/images/facebook.png" alt="Facebook" style="width: 24px; height: 24px;"></a>
                <a href="#" class="social-icon"><img src="/images/x.png" alt="X/Twitter" style="width: 24px; height: 24px;"></a>
                <a href="#" class="social-icon"><img src="/images/linkedin.png" alt="LinkedIn" style="width: 24px; height: 24px;"></a>
            </div>
            <div class="footer-text">
                © 2025 Made with Love by <span class="highlight">Deal Hub</span>
            </div>
        </div>
    </footer>

    <!-- Contact Popup Modal -->
    <div class="contact-popup" id="contact-popup">
        <div class="contact-popup-content">
            <button class="contact-popup-close" onclick="closeContactPopup()">&times;</button>
            <h2>Contact Deal Hub</h2>
            
            <form class="contact-form" onsubmit="submitContactForm(event)">
                <input type="text" placeholder="Your Name" required>
                <input type="email" placeholder="Your Email" required>
                <input type="text" placeholder="Subject" required>
                <textarea placeholder="Your Message" required></textarea>
                <button type="submit" class="contact-submit-btn">Send Message</button>
            </form>
            
            <div class="contact-info">
                <h3>Get in Touch</h3>
                <p><strong>Email:</strong> <a href="mailto:hello@dealhub.com">hello@dealhub.com</a></p>
                <p><strong>Partnership Inquiries:</strong> <a href="mailto:partnerships@dealhub.com">partnerships@dealhub.com</a></p>
                <p><strong>Response Time:</strong> Within 24 hours</p>
            </div>
        </div>
    </div>

    <script src="/home-script.js"></script>
    <script>
        // Contact popup functions
        function openContactPopup() {
            document.getElementById('contact-popup').classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function closeContactPopup() {
            document.getElementById('contact-popup').classList.remove('active');
            document.body.style.overflow = 'auto'; // Restore scrolling
        }

        function submitContactForm(event) {
            event.preventDefault();
            alert('Thank you for your message! We\\'ll get back to you within 24 hours.');
            closeContactPopup();
            event.target.reset(); // Clear form
        }

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('contact-popup');
            if (e.target === popup) {
                closeContactPopup();
            }
        });

        function filterCategories() {
            const searchTerm = document.getElementById('category-search').value.toLowerCase();
            const categoryCards = document.querySelectorAll('.category-card');
            
            categoryCards.forEach(card => {
                const categoryName = card.querySelector('.category-name').textContent.toLowerCase();
                
                if (categoryName.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        function loadNextPage(page) {
            window.location.href = '/categories?page=' + page;
        }
    </script>
</body>
</html>`;
        
        res.send(html);
        });
    });
});

// Category pages route with Server-Side Rendering (SSR)
app.get('/category/:categorySlug', async (req, res) => {
    const categorySlug = req.params.categorySlug.toLowerCase();

    try {
        // Get category data
        const category = await new Promise((resolve, reject) => {
            const categoryQuery = `
                SELECT id, name FROM categories 
                WHERE LOWER(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(TRIM(name), '  ', ' '), 
                                ' ', '-'
                            ), 
                            '--', '-'
                        ), 
                        '^-', ''
                    )
                ) = ? 
                OR LOWER(REPLACE(name, ' ', '')) = ?
            `;
            
            db.get(categoryQuery, [categorySlug, categorySlug.replace(/[^a-z0-9]/g, '')], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        if (!category) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        // Get deals for this category
        const deals = await new Promise((resolve, reject) => {
            const dealsQuery = `
                SELECT id, software_name, discount, description, website_url, logo_url, time_limit 
                FROM deals 
                WHERE category_id = ?
                ORDER BY software_name
                LIMIT 82
            `;
            
            db.all(dealsQuery, [category.id], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        // Get sidebar categories (random selection from actual database categories)
        const allDbCategories = await new Promise((resolve, reject) => {
            db.all('SELECT id, name FROM categories ORDER BY name', [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
        
        // Randomly shuffle and select up to 10 categories from database
        const shuffled = [...allDbCategories].sort(() => 0.5 - Math.random());
        const sidebarCategories = shuffled.slice(0, Math.min(10, shuffled.length));

        // Generate category color (same logic as frontend)
        function generateColorFromString(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            return `hsl(${hue}, 75%, 55%)`;
        }

        function darkenColor(hslColor, amount = 15) {
            const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (!match) return hslColor;
            
            const [, h, s, l] = match.map(Number);
            const newL = Math.max(0, l - amount);
            return `hsl(${h}, ${s}%, ${newL}%)`;
        }

        const categoryColor = generateColorFromString(category.name);
        const darkerColor = darkenColor(categoryColor);

        // Generate deals HTML
        const dealsHTML = deals.length > 0 ? deals.map(deal => {
            // Use AI-generated logo URL or SVG fallback (no automatic Clearbit generation)
            let logoUrl = deal.logo_url || fallbackSvg(deal.software_name);
            
            return `
                <a href="/deal/${deal.software_name.toLowerCase().replace(/\s+/g, '')}" class="deal-item">
                    <div class="deal-logo">
                        <img src="${logoUrl}" alt="${deal.software_name} Logo">
                    </div>
                    <div class="deal-info">
                        <h3>${deal.discount} ${deal.software_name} Coupon Code</h3>
                        <p class="deal-subtitle">${deal.software_name}</p>
                        <p class="deal-description">${deal.description && deal.description.length > 120 ? deal.description.substring(0, 120) + '...' : (deal.description || '')}</p>
                        <div class="deal-meta">
                            <span>🏷️ ${deal.software_name}</span>
                            <span>💰 ${deal.discount}</span>
                            <span>⏰ ${deal.time_limit || 'Limited Time'}</span>
                            <span>📅 Updated ${new Date().toLocaleDateString('en-US')}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('') : '<div class="no-deals"><p>No deals found in this category yet.</p></div>';

        // Generate sidebar categories HTML
        const sidebarHTML = sidebarCategories.map(cat => {
            const catSlug = cat.name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const catColor = generateColorFromString(cat.name);
            return `<a href="/category/${catSlug}" class="category-tag" style="background-color: ${catColor};">${cat.name}</a>`;
        }).join('');

        // Read the template HTML file
        const templatePath = path.join(__dirname, 'public', 'category.html');
        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders with actual data
        const currentDate = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonth = monthNames[currentDate.getMonth()];
        const currentYear = currentDate.getFullYear();
        
        html = html.replace(/<title>.*?<\/title>/, `<title>${category.name} Deals - coupons&promo ${currentMonth} ${currentYear}</title>`);
        html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="Discover the best ${category.name.toLowerCase()} deals and discounts. Save money on top ${category.name.toLowerCase()} tools and services.">`);
        html = html.replace(/Deals in: Category/, `Deals in: ${category.name}`);
        html = html.replace(/<!-- Deals will be loaded here -->/, dealsHTML);
        html = html.replace(/<!-- Categories will be loaded here -->/, sidebarHTML);
        
        // Add dynamic hero background styling
        html = html.replace(/\/\* Background will be set dynamically by server-side rendering \*\//, `background: linear-gradient(135deg, ${categoryColor}, ${darkerColor});`);

        res.send(html);

    } catch (error) {
        console.error(`Error rendering category page for ${categorySlug}:`, error);
        res.status(500).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

// All Deals page route with Server-Side Rendering (SSR)
app.get('/deals', async (req, res) => {
    try {
        // Get all deals from database
        const deals = await new Promise((resolve, reject) => {
            const dealsQuery = `
                SELECT id, software_name, discount, description, website_url, logo_url, time_limit 
                FROM deals 
                ORDER BY software_name
                LIMIT 100
            `;
            
            db.all(dealsQuery, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        // Get sidebar categories (random selection from actual database categories)
        const allDbCategories = await new Promise((resolve, reject) => {
            db.all('SELECT id, name FROM categories ORDER BY name', [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
        
        // Randomly shuffle and select up to 10 categories from database
        const shuffled = [...allDbCategories].sort(() => 0.5 - Math.random());
        const sidebarCategories = shuffled.slice(0, Math.min(10, shuffled.length));

        // Generate color for each category
        function generateColorFromString(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            const colors = [
                '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
                '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
                '#ff9a9e', '#fecfef', '#ffeaa7', '#fab1a0', '#fd79a8', '#fdcb6e'
            ];
            
            return colors[Math.abs(hash) % colors.length];
        }

        // Read the deals.html template
        let html = fs.readFileSync(path.join(__dirname, 'public', 'deals.html'), 'utf8');

        // Generate deals HTML
        const dealsHTML = deals.map(deal => {
            const logoSrc = deal.logo_url || `data:image/svg+xml;base64,${Buffer.from(`<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="#00D4AA" rx="12"/><text x="40" y="55" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${deal.software_name.charAt(0).toUpperCase()}</text></svg>`).toString('base64')}`;
            const softwareSlug = deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const truncatedDescription = deal.description && deal.description.length > 120 ? deal.description.substring(0, 120) + '...' : deal.description;
            
            return `
                <a href="/deal/${softwareSlug}" class="deal-item">
                    <div class="deal-logo">
                        <img src="${logoSrc}" alt="${deal.software_name} Logo">
                    </div>
                    <div class="deal-info">
                        <h3>${deal.software_name}</h3>
                        <div class="deal-subtitle">${deal.discount}</div>
                        <div class="deal-description">${truncatedDescription || 'Great software deal available'}</div>
                        <div class="deal-meta">
                            <span>🏷️ ${deal.software_name}</span>
                            <span>💰 ${deal.discount}</span>
                            <span>⏰ ${deal.time_limit || 'Limited Time'}</span>
                            <span>📅 Updated ${new Date().toLocaleDateString('en-US')}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        // Generate sidebar categories HTML
        const sidebarHTML = sidebarCategories.map(category => {
            const categoryColor = generateColorFromString(category.name);
            const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            return `<a href="/category/${categorySlug}" class="category-tag" style="background-color: ${categoryColor};">${category.name}</a>`;
        }).join('');

        // Replace placeholders in HTML
        html = html.replace(/<!-- Deals will be loaded here -->/, dealsHTML);
        html = html.replace(/<!-- Categories will be loaded here -->/, sidebarHTML);
        html = html.replace(/Loading.../, `${deals.length}`);

        res.send(html);

    } catch (error) {
        console.error(`Error rendering deals page:`, error);
        res.status(500).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

// Search page route
app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'search.html'));
});

// Newsletter page route with SSR
app.get('/newsletter', async (req, res) => {
    try {
        // Get top 6 categories (random selection from database)
        const categories = await new Promise((resolve, reject) => {
            db.all('SELECT id, name FROM categories ORDER BY RANDOM() LIMIT 6', [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        // Get top 12 most liked deals
        const deals = await new Promise((resolve, reject) => {
            const query = `
                SELECT d.*, c.name as category_name 
                FROM deals d 
                LEFT JOIN categories c ON d.category_id = c.id 
                ORDER BY d.likes DESC, d.id DESC
                LIMIT 12
            `;
            db.all(query, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        // Get total counts for stats
        const totalDeals = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM deals', [], (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.count : 0);
            });
        });

        const totalCategories = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.count : 0);
            });
        });

        // Read the newsletter.html template
        let html = fs.readFileSync(path.join(__dirname, 'public', 'newsletter.html'), 'utf8');

        // Generate categories HTML
        const categoryIcons = ['💻', '🎨', '📊', '🚀', '💰', '📱'];
        const categoriesHTML = categories.map((category, index) => {
            const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const randomCount = Math.floor(Math.random() * 15) + 5; // Random count between 5-20
            
            return `
                <a href="/category/${categorySlug}" class="category-item">
                    <div class="category-icon">${categoryIcons[index % categoryIcons.length]}</div>
                    <div class="category-info">
                        <div class="category-name">${category.name}</div>
                        <div class="category-count">${randomCount} deals available</div>
                    </div>
                </a>
            `;
        }).join('');

        // Generate deals HTML
        const dealsHTML = deals.map(deal => {
            const logoSrc = deal.logo_url || `data:image/svg+xml;base64,${Buffer.from(`<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="#00D4AA" rx="8"/><text x="25" y="35" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">${deal.software_name.charAt(0).toUpperCase()}</text></svg>`).toString('base64')}`;
            const softwareSlug = deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            return `
                <a href="/deal/${softwareSlug}" class="deal-item-mini">
                    <div class="deal-logo-mini">
                        <img src="${logoSrc}" alt="${deal.software_name} Logo">
                    </div>
                    <div class="deal-info-mini">
                        <div class="deal-name">${deal.software_name}</div>
                        <div class="deal-discount">${deal.discount}</div>
                    </div>
                </a>
            `;
        }).join('');

        // Replace placeholders in HTML
        html = html.replace('{{CATEGORIES_HTML}}', categoriesHTML);
        html = html.replace('{{DEALS_HTML}}', dealsHTML);
        html = html.replace('{{TOTAL_DEALS}}', totalDeals);
        html = html.replace('{{TOTAL_CATEGORIES}}', totalCategories);

        res.send(html);
    } catch (error) {
        console.error('Error rendering newsletter page:', error);
        res.status(500).send('Error loading newsletter page');
    }
});

// FAQ page route
app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

app.get('/api/deal/:softwareSlug/related', async (req, res) => {
    const { softwareSlug } = req.params;
    const requestedLimit = 3; // Always return exactly 3 deals
    const offset = parseInt(req.query.offset, 10) || 0;
    const excludeIds = req.query.exclude ? req.query.exclude.split(',').map(id => parseInt(id)) : [];

    try {
        // Step 1: Get the current deal's ID from its slug using strict matching
        const deal = await new Promise((resolve, reject) => {
            const query = `SELECT id, software_name FROM deals WHERE LOWER(REPLACE(REPLACE(TRIM(software_name), ' ', '-'), '--', '-')) = ?`;
            
            db.get(query, [softwareSlug], (err, row) => {
                if (err) return reject(new Error('DB error fetching deal'));
                if (row) {
                    return resolve(row);
                } else {
                    return reject(new Error('Deal not found'));
                }
            });
        });

        const sourceDealId = deal.id;
        const allExcludeIds = [sourceDealId, ...excludeIds];

        // Step 2: Build query with proper NOT IN clause (no OFFSET needed since we exclude specific IDs)
        const placeholders = allExcludeIds.map(() => '?').join(',');
        const findRelatedQuery = `
            SELECT d.*, COALESCE(rdl.likes, 0) as contextual_likes
            FROM deals d
            LEFT JOIN related_deal_likes rdl ON d.id = rdl.related_deal_id AND rdl.source_deal_id = ?
            WHERE d.id NOT IN (${placeholders})
            ORDER BY contextual_likes DESC, d.likes DESC
            LIMIT ?
        `;

        const relatedDeals = await new Promise((resolve, reject) => {
            db.all(findRelatedQuery, [sourceDealId, ...allExcludeIds, requestedLimit], (err, rows) => {
                if (err) {
                    return reject(new Error('DB error fetching related deals'));
                }
                resolve(rows);
            });
        });

        // Add server-generated logo URLs to each related deal
        const relatedDealsWithLogos = relatedDeals.map(deal => {
            // Use AI-generated logo URL or server-side SVG fallback (same as main deal logic)
            const logoUrl = deal.logo_url || fallbackSvg(deal.software_name);
            return {
                ...deal,
                logo_url: logoUrl
            };
        });

        res.json({ relatedDeals: relatedDealsWithLogos });

    } catch (error) {
        if (error.message === 'Deal not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// API endpoint to get deal by software slug (xxx-xxx-xxx format)
app.get('/api/deal/:softwareSlug', (req, res) => {
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
            const additionalCategoryIds = (deal.categories || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
            const allCategoryIds = [...new Set([deal.category_id, ...additionalCategoryIds])];
            
            if (allCategoryIds.length > 0) {
                const placeholders = allCategoryIds.map(() => '?').join(',');
                db.all(`SELECT name FROM categories WHERE id IN (${placeholders})`, allCategoryIds, (err, categoryRows) => {
                    if (err) {
                        deal.all_categories = [deal.category_name]; // Fallback
                    } else {
                        deal.all_categories = categoryRows.map(c => c.name);
                    }
                    res.json({ deal: deal });
                });
            } else {
                deal.all_categories = deal.category_name ? [deal.category_name] : [];
                res.json({ deal: deal });
            }
        }
    });
});

// API endpoint to LIKE a related deal in a specific context
app.post('/api/related-like', (req, res) => {
    const { sourceDealId, relatedDealId } = req.body;
    if (!sourceDealId || !relatedDealId) {
        return res.status(400).json({ error: 'Missing source or related deal ID.' });
    }
    // First try to update existing record, then insert if not exists
    const updateQuery = 'UPDATE related_deal_likes SET likes = likes + 1 WHERE source_deal_id = ? AND related_deal_id = ?';
    db.run(updateQuery, [sourceDealId, relatedDealId], function(err) {
        if (err) {
            console.error('Error updating like:', err);
            res.status(500).json({ error: 'Failed to add like' });
            return;
        }
        
        // If no rows were updated, insert new record
        if (this.changes === 0) {
            const insertQuery = 'INSERT INTO related_deal_likes (source_deal_id, related_deal_id, likes) VALUES (?, ?, 1)';
            db.run(insertQuery, [sourceDealId, relatedDealId], function(err) {
                if (err) {
                    console.error('Error inserting like:', err);
                    res.status(500).json({ error: 'Failed to add like' });
                } else {
                    res.json({ message: 'Liked successfully and saved. Total likes: 1' });
                }
            });
        } else {
            // Get the updated like count
            const countQuery = 'SELECT likes FROM related_deal_likes WHERE source_deal_id = ? AND related_deal_id = ?';
            db.get(countQuery, [sourceDealId, relatedDealId], (err, row) => {
                if (err) {
                    res.json({ message: 'Liked successfully and saved.' });
                } else {
                    const likeCount = row ? row.likes : 1;
                    res.json({ message: `Liked successfully and saved. Total likes: ${likeCount}` });
                }
            });
        }
    });
});

// API endpoint to UNLIKE a related deal in a specific context
app.post('/api/related-unlike', (req, res) => {
    const { sourceDealId, relatedDealId } = req.body;
    if (!sourceDealId || !relatedDealId) {
        return res.status(400).json({ error: 'Missing source or related deal ID.' });
    }
    // This query simply removes the like relationship.
    const query = `DELETE FROM related_deal_likes WHERE source_deal_id = ? AND related_deal_id = ?`;
    db.run(query, [sourceDealId, relatedDealId], function(err) {
        if (err) {
            console.error('Error unliking related deal:', err.message);
            return res.status(500).json({ error: 'Failed to remove like from database.' });
        }
        res.status(200).json({ message: 'Unliked successfully and removed.' });
    });
});

function generateRelatedDealsHTML(deals) {
    if (!deals || deals.length === 0) {
        return '<style>#related-deals-section { display: none; }</style>';
    }

    const dealCards = deals.map(deal => {
        const dealUrl = `/deal/${deal.software_name.toLowerCase().replace(/ /g, '-')}`;
        const dealTitle = `${deal.software_name} Lifetime Deal: ${deal.description.split('.')[0]}`;
        const fallbackImage = fallbackSvg(deal.software_name);

        return `
            <div class="related-deal-card">
                <a href="${dealUrl}" class="related-deal-logo-link">
                    <img src="${deal.logo_url || fallbackImage}" alt="${deal.software_name} Logo" class="related-deal-logo">
                </a>
                <div class="related-deal-content">
                    <a href="${dealUrl}" class="related-deal-title-link">
                        <h4 class="related-deal-name">${dealTitle} <span class="external-link-icon">↗</span></h4>
                    </a>
                    <div class="related-deal-footer">
                        <button class="like-button" data-deal-id="${deal.id}">
                            <span class="like-icon">👍</span>
                            <span class="like-count">${deal.contextual_likes || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return dealCards;
}

// Server-Side Rendering for Deal Pages
const dealRoutes = ['/deal/:softwareSlug'];
function parseAboutText(text) {
    if (!text) return '';

    let html = '';
    
    // Split by double line breaks to get sections
    const sections = text.split(/\n\n+/);
    
    sections.forEach(section => {
        section = section.trim();
        if (!section) return;
        
        // Check if this section starts with a title pattern
        const titleMatch = section.match(/^([^\n]+)\n([\s\S]*)$/);
        
        if (titleMatch && !titleMatch[1].includes('.') && titleMatch[1].length < 100) {
            // This looks like a title + content
            const title = titleMatch[1].trim();
            const content = titleMatch[2].trim();
            
            html += `<h4>${title}</h4>`;
            
            // Process the content
            if (content.includes('\n• ') || content.includes('\n- ')) {
                // This has bullet points
                const parts = content.split(/\n(?=[•-])/);
                let paragraphText = '';
                let listItems = [];
                
                parts.forEach(part => {
                    part = part.trim();
                    if (part.startsWith('• ') || part.startsWith('- ')) {
                        if (paragraphText) {
                            html += `<p>${paragraphText}</p>`;
                            paragraphText = '';
                        }
                        listItems.push(part.replace(/^[•-]\s*/, ''));
                    } else if (part) {
                        paragraphText += (paragraphText ? ' ' : '') + part;
                    }
                });
                
                if (paragraphText) {
                    html += `<p>${paragraphText}</p>`;
                }
                
                if (listItems.length > 0) {
                    html += '<ul>';
                    listItems.forEach(item => {
                        html += `<li>${item}</li>`;
                    });
                    html += '</ul>';
                }
            } else {
                // Regular paragraph content
                html += `<p>${content}</p>`;
            }
        } else {
            // This is just regular content, treat as paragraph
            html += `<p>${section}</p>`;
        }
    });
    
    return html;
}

app.get(dealRoutes, (req, res) => {
    const softwareSlug = req.params.softwareSlug;

    const dealQuery = `
        SELECT d.*, c.name as category_name 
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id 
        WHERE LOWER(REPLACE(REPLACE(TRIM(d.software_name), ' ', '-'), '--', '-')) = ?
    `;

    db.get(dealQuery, [softwareSlug], (err, deal) => {
        if (err) {
            console.error('SSR Error fetching deal:', err);
            return res.status(500).send('Error loading the page.');
        }
        if (!deal) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8', (err, template) => {
            if (err) {
                console.error('SSR Error reading template:', err);
                return res.status(500).send('Error loading the page.');
            }

            const seoTitle = `${deal.discount} Discount on ${deal.software_name} | Coupon Promo Code`;
            const seoDescription = deal.description || `Get the best deal on ${deal.software_name}.`;
            const seoImage = deal.logo_url || '';

            const aboutHtml = deal.about ? `<h3>About ${deal.software_name}</h3>${parseAboutText(deal.about)}` : '';

            // Fetch related deals for server-side rendering
            const findRelatedQuery = `
                SELECT d.*, COALESCE(rdl.likes, 0) as contextual_likes
                FROM deals d
                LEFT JOIN related_deal_likes rdl ON rdl.related_deal_id = d.id AND rdl.source_deal_id = ?
                WHERE d.id != ?
                ORDER BY contextual_likes DESC, d.likes DESC
                LIMIT 6;
            `;

            db.all(findRelatedQuery, [deal.id, deal.id], (err, relatedDeals) => {
                if (err) {
                    console.error('SSR Error fetching related deals:', err);
                    relatedDeals = [];
                }

                const relatedDealsHtml = generateRelatedDealsHTML(relatedDeals);
                const softwareLogoHtml = `<img id="software-logo" src="${deal.logo_url || fallbackSvg(deal.software_name)}" alt="${deal.software_name} Logo">`;

                // Function to generate final content with category badges
                function generateContent(bottomCategoryBadges) {
                    return template
                        .replace(/{{PAGE_TITLE}}/g, seoTitle)
                        .replace(/{{META_DESCRIPTION}}/g, seoDescription)
                        .replace(/{{OG_TITLE}}/g, seoTitle)
                        .replace(/{{OG_DESCRIPTION}}/g, seoDescription)
                        .replace(/{{OG_IMAGE}}/g, seoImage)
                        .replace(/{{TWITTER_TITLE}}/g, seoTitle)
                        .replace(/{{TWITTER_DESCRIPTION}}/g, seoDescription)
                        .replace(/{{TWITTER_IMAGE}}/g, seoImage)
                        .replace(/{{CANONICAL_URL}}/g, `https://yourdomain.com/deal/${softwareSlug}`)
                        .replace(/{{DEAL_TITLE}}/g, `${deal.deal_title || `${deal.discount} ${deal.software_name}`} - Coupon Code - ${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()} Promo Codes`)
                        .replace(/{{SOFTWARE_DESCRIPTION}}/g, deal.description || '')
                        .replace(/{{SOFTWARE_LOGO_HTML}}/g, softwareLogoHtml)
                        .replace(/{{SOFTWARE_NAME_H1}}/g, deal.software_name)
                        .replace(/{{SOFTWARE_NAME}}/g, deal.software_name)
                        .replace(/{{SOFTWARE_CATEGORY}}/g, deal.category_name || 'Software')
                        .replace(/{{CATEGORY_NAME}}/g, deal.category_name || 'Software')
                        .replace(/{{BOTTOM_CATEGORY_BADGES}}/g, bottomCategoryBadges)
                        .replace(/{{DISCOUNT_TEXT}}/g, deal.discount)
                        .replace(/{{EXPIRY_DATE}}/g, deal.time_limit || 'N/A')
                        .replace(/{{COUPON_CODE}}/g, deal.coupon_code || 'N/A')
                        .replace(/{{GA_TRACKING_ID}}/g, 'YOUR_GA_TRACKING_ID') // Replace with your actual ID
                        .replace(/{{ABOUT_HEADING}}/g, `About ${deal.software_name}`)
                        .replace(/{{ABOUT_CONTENT}}/g, parseAboutText(deal.about || '')) // Use the 'about' column
                        .replace(/{{ABOUT_SECTION_CONTENT}}/g, aboutHtml)
                        .replace(/{{RELATED_DEALS_GRID}}/g, relatedDealsHtml);
                }

                // Generate all_categories data like JavaScript does
                const additionalCategoryIds = (deal.categories || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
                const allCategoryIds = [...new Set([deal.category_id, ...additionalCategoryIds])];
                
                if (allCategoryIds.length > 1) {
                    // Multiple categories - fetch all category names
                    const placeholders = allCategoryIds.map(() => '?').join(',');
                    db.all(`SELECT name FROM categories WHERE id IN (${placeholders})`, allCategoryIds, (err, categoryRows) => {
                        let allCategoriesHtml = '';
                        if (err || !categoryRows || categoryRows.length === 0) {
                            // Fallback to single category name (like JavaScript)
                            allCategoriesHtml = deal.category_name || 'Software';
                        } else {
                            // Generate multiple category badges (like JavaScript)
                            allCategoriesHtml = categoryRows.map(cat => `<span class="category-badge">${cat.name}</span>`).join('');
                        }
                        
                        const content = generateContent(allCategoriesHtml);
                        res.send(content);
                    });
                } else {
                    // Single category - fallback (like JavaScript)
                    const allCategoriesHtml = deal.category_name || 'Software';
                    const content = generateContent(allCategoriesHtml);
                    res.send(content);
                }
            });
        });
    });
});

// Sitemap Index (Lists all sitemap files)
app.get('/sitemap.xml', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM deals', [], (err, row) => {
        if (err) {
            console.error('Error counting deals:', err);
            res.status(500).send('Error generating sitemap index');
            return;
        }
        
        const baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
        const totalDeals = row.count;
        const urlsPerSitemap = 25000; // Conservative limit (Google allows 50k)
        const totalSitemaps = Math.ceil(totalDeals / urlsPerSitemap);
        
        let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
        
        // Add main pages sitemap
        sitemapIndex += `  <sitemap>
    <loc>${baseUrl}/sitemap-main.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
`;
        
        // Add category sitemap
        sitemapIndex += `  <sitemap>
    <loc>${baseUrl}/sitemap-category.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
`;
        
        // Add deal sitemaps
        for (let i = 1; i <= totalSitemaps; i++) {
            sitemapIndex += `  <sitemap>
    <loc>${baseUrl}/sitemap-deals-${i}.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
`;
        }
        
        sitemapIndex += `</sitemapindex>`;
        
        res.set('Content-Type', 'application/xml');
        res.send(sitemapIndex);
    });
});

// Main pages sitemap (homepage only)
app.get('/sitemap-main.xml', (req, res) => {
    const baseUrl = 'https://yourdomain.com';
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;
    
    // Add homepage
    sitemap += `  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;
    
    // Add categories index page
    sitemap += `  <url>
    <loc>${baseUrl}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
    
    // Add deals page
    sitemap += `  <url>
    <loc>${baseUrl}/deals</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
    
    // Add search page
    sitemap += `  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    
    // Add newsletter page
    sitemap += `  <url>
    <loc>${baseUrl}/newsletter</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    
    // Add FAQ page
    sitemap += `  <url>
    <loc>${baseUrl}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    
    // Add RSS discovery page (it's a regular web page)
    sitemap += `  <url>
    <loc>${baseUrl}/rss</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    
    sitemap += `</urlset>`;
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
});

// Category sitemap (categories only)
app.get('/sitemap-category.xml', (req, res) => {
    const baseUrl = 'https://yourdomain.com';
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;
    
    // Add categories
    db.all('SELECT name FROM categories ORDER BY name', [], (err, categories) => {
        if (!err && categories) {
            categories.forEach(cat => {
                const categorySlug = cat.name.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/--+/g, '-')
                    .replace(/^-|-$/g, '');
                sitemap += `  <url>
    <loc>${baseUrl}/category/${categorySlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
            });
        }
        
        sitemap += `</urlset>`;
        res.set('Content-Type', 'application/xml');
        res.send(sitemap);
    });
});

// Individual deal sitemaps (paginated)
app.get('/sitemap-deals-:page.xml', (req, res) => {
    const page = parseInt(req.params.page) || 1;
    const urlsPerSitemap = 25000;
    const dealsPerSitemap = urlsPerSitemap; // One URL per deal
    const offset = (page - 1) * dealsPerSitemap;
    
    db.all(
        'SELECT software_name, updated_at FROM deals ORDER BY software_name LIMIT ? OFFSET ?',
        [dealsPerSitemap, offset],
        (err, rows) => {
            if (err) {
                console.error('Error generating deal sitemap:', err);
                res.status(500).send('Error generating sitemap');
                return;
            }
            
            const baseUrl = 'https://yourdomain.com';
            let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;
            
            rows.forEach(deal => {
                const softwareSlug = deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
                const lastmod = deal.updated_at ? new Date(deal.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                
                // Add /deal/ URL only
                sitemap += `  <url>
    <loc>${baseUrl}/deal/${softwareSlug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
            });
            
            sitemap += `</urlset>`;
            
            res.set('Content-Type', 'application/xml');
            res.send(sitemap);
        }
    );
});

// Serve static files (after specific routes)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes for Dashboard
// Search deals/software
app.get('/api/search', (req, res) => {
    const searchTerm = req.query.q;
    const category = req.query.category;
    
    if (!searchTerm && !category) {
        return res.status(400).json({ error: 'Search term or category is required' });
    }
    
    let query = `
        SELECT d.*, c.name as category_name 
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id 
        WHERE 1=1
    `;
    let params = [];
    
    // Add search term filter (search only in software name)
    if (searchTerm) {
        query += ` AND d.software_name LIKE ?`;
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern);
    }
    
    // Add category filter
    if (category) {
        query += ` AND c.name LIKE ?`;
        params.push(`%${category}%`);
    }
    
    query += ` ORDER BY d.software_name ASC LIMIT 12`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error searching deals:', err);
            res.status(500).json({ error: 'Failed to search deals' });
        } else {
            res.json({ 
                deals: rows,
                count: rows.length,
                searchTerm: searchTerm,
                category: category
            });
        }
    });
});

// Get all categories
// API endpoint to like a deal
app.post('/api/deal/:id/like', (req, res) => {
    const dealId = req.params.id;
    db.run('UPDATE deals SET likes = likes + 1 WHERE id = ?', [dealId], function(err) {
        if (err) {
            console.error('Error liking deal:', err.message);
            return res.status(500).json({ error: 'Failed to like deal' });
        }
        res.json({ message: 'Like recorded', likes: this.changes });
    });
});

// API endpoint to unlike a deal
app.post('/api/deal/:id/unlike', (req, res) => {
    const dealId = req.params.id;
    // Ensure likes don't go below 0
    db.run('UPDATE deals SET likes = MAX(0, likes - 1) WHERE id = ?', [dealId], function(err) {
        if (err) {
            console.error('Error unliking deal:', err.message);
            return res.status(500).json({ error: 'Failed to unlike deal' });
        }
        res.json({ message: 'Unlike recorded' });
    });
});

app.get('/api/categories', (req, res) => {
    // Fetch a random subset of 10 categories for dynamic display
    db.all('SELECT * FROM categories ORDER BY RANDOM() LIMIT 10', [], (err, rows) => {
        if (err) {
            console.error('Error fetching random categories:', err);
            res.status(500).json({ error: 'Failed to fetch categories' });
        } else {
            res.json({ categories: rows });
        }
    });
});

// Get all deals
app.get('/api/deals', (req, res) => {
    const sortBy = req.query.sortBy || 'id';
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    let orderClause = 'ORDER BY d.id DESC';
    if (sortBy === 'likes') {
        orderClause = 'ORDER BY d.likes DESC, d.id DESC';
    }
    
    let limitClause = '';
    if (limit && limit > 0) {
        limitClause = `LIMIT ${limit}`;
    }
    
    const query = `
        SELECT d.*, c.name as category_name 
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id 
        ${orderClause}
        ${limitClause}
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching deals:', err);
            res.status(500).json({ error: 'Failed to fetch deals' });
        } else {
            res.json({ deals: rows });
        }
    });
});

// Add new category
app.post('/api/categories', (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    
    const query = 'INSERT INTO categories (name, description) VALUES (?, ?)';
    db.run(query, [name, description], function(err) {
        if (err) {
            console.error('Error adding category:', err);
            res.status(500).json({ error: 'Failed to add category' });
        } else {
            res.json({ 
                success: true, 
                category: { id: this.lastID, name, description }
            });
        }
    });
});

// Add new deal
app.post('/api/deals', (req, res) => {
    const {
        software_name, category_id, logo_url, website_url, referral_link,
        discount, coupon_code, time_limit, description
    } = req.body;
    
    if (!software_name || !discount) {
        return res.status(400).json({ error: 'Software name and discount are required' });
    }
    
    const query = `
        INSERT INTO deals (
            software_name, category_id, logo_url, website_url, referral_link,
            discount, coupon_code, time_limit, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
        software_name, category_id, logo_url, website_url, referral_link,
        discount, coupon_code, time_limit, description
    ], function(err) {
        if (err) {
            console.error('Error adding deal:', err);
            res.status(500).json({ error: 'Failed to add deal' });
        } else {
            res.json({ 
                success: true, 
                deal: { id: this.lastID, software_name, discount }
            });
        }
    });
});

// Update deal
app.put('/api/deals/:id', (req, res) => {
    const dealId = req.params.id;
    const {
        software_name, category_id, logo_url, website_url, referral_link,
        discount, coupon_code, time_limit, description
    } = req.body;
    
    const query = `
        UPDATE deals SET 
            software_name = ?, category_id = ?, logo_url = ?, website_url = ?, 
            referral_link = ?, discount = ?, coupon_code = ?, time_limit = ?, 
            description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    db.run(query, [
        software_name, category_id, logo_url, website_url, referral_link,
        discount, coupon_code, time_limit, description, dealId
    ], function(err) {
        if (err) {
            console.error('Error updating deal:', err);
            res.status(500).json({ error: 'Failed to update deal' });
        } else {
            res.json({ success: true });
        }
    });
});

// Delete deal
app.delete('/api/deals/:id', (req, res) => {
    const dealId = req.params.id;
    
    db.run('DELETE FROM deals WHERE id = ?', [dealId], function(err) {
        if (err) {
            console.error('Error deleting deal:', err);
            res.status(500).json({ error: 'Failed to delete deal' });
        } else {
            res.json({ success: true });
        }
    });
});

// Delete category
app.delete('/api/categories/:id', (req, res) => {
    const categoryId = req.params.id;
    
    db.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
        if (err) {
            console.error('Error deleting category:', err);
            res.status(500).json({ error: 'Failed to delete category' });
        } else {
            res.json({ success: true });
        }
    });
});

// Track analytics (clicks, views)
app.post('/api/analytics', (req, res) => {
    const { deal_id, action, ip_address, user_agent } = req.body;
    
    const query = 'INSERT INTO analytics (deal_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)';
    db.run(query, [deal_id, action, ip_address, user_agent], function(err) {
        if (err) {
            console.error('Error tracking analytics:', err);
            res.status(500).json({ error: 'Failed to track analytics' });
        } else {
            // Update clicks count in deals table if it's a click action
            if (action === 'click') {
                db.run('UPDATE deals SET clicks = clicks + 1 WHERE id = ?', [deal_id]);
            }
            res.json({ success: true });
        }
    });
});

// Get analytics data
app.get('/api/analytics', (req, res) => {
    const analyticsQuery = `
        SELECT 
            a.id,
            a.action,
            a.timestamp,
            a.ip_address,
            d.software_name,
            d.discount
        FROM analytics a
        LEFT JOIN deals d ON a.deal_id = d.id
        ORDER BY a.timestamp DESC
        LIMIT 50
    `;
    
    db.all(analyticsQuery, [], (err, rows) => {
        if (err) {
            console.error('Error fetching analytics:', err);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        } else {
            res.json({ analytics: rows || [] });
        }
    });
});

// API endpoint to get all categories (limited for sidebar use)
app.get('/api/categories', (req, res) => {
    db.all('SELECT id, name FROM categories ORDER BY name LIMIT 10', [], (err, rows) => {
        if (err) {
            console.error('Error fetching categories:', err);
            res.status(500).json({ error: 'Failed to fetch categories' });
        } else {
            res.json({ categories: rows });
        }
    });
});

// API endpoint to get ALL categories (for dashboard use)
app.get('/api/all-categories', (req, res) => {
    db.all('SELECT id, name, description, created_at FROM categories ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Error fetching all categories:', err);
            res.status(500).json({ error: 'Failed to fetch all categories' });
        } else {
            res.json({ categories: rows });
        }
    });
});

// API endpoint to get all deals for a specific category
app.get('/api/category/:categorySlug', (req, res) => {
    const categorySlug = req.params.categorySlug.toLowerCase();

    // First, get the category details from the slug
    // We need to match against category names converted to the same slug format
    const categoryQuery = `
        SELECT id, name FROM categories 
        WHERE LOWER(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(TRIM(name), '  ', ' '), 
                        ' ', '-'
                    ), 
                    '--', '-'
                ), 
                '^-', ''
            )
        ) = ? 
        OR LOWER(REPLACE(name, ' ', '')) = ?
    `;

    db.get(categoryQuery, [categorySlug, categorySlug.replace(/[^a-z0-9]/g, '')], (err, category) => {
        if (err) {
            console.error(`[Category Fetch Error for ${categorySlug}]:`, err);
            return res.status(500).json({ error: 'Failed to fetch category details' });
        }
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const categoryId = category.id;
        
        // Now, find all deals in this category (primary category only for now)
        const dealsQuery = `
            SELECT id, software_name, discount, description, website_url, logo_url, time_limit 
            FROM deals 
            WHERE category_id = ?
            ORDER BY software_name
        `;

        db.all(dealsQuery, [categoryId], (err, deals) => {
            if (err) {
                console.error(`[Deals for Category Fetch Error for ${categorySlug}]:`, err);
                return res.status(500).json({ error: 'Failed to fetch deals for this category' });
            }
            res.json({ category, deals });
        });
    });
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    const statsQuery = `
        SELECT 
            (SELECT COUNT(*) FROM deals) as totalDeals,
            (SELECT COUNT(*) FROM categories) as totalCategories,
            (SELECT COUNT(*) FROM analytics WHERE action = 'view') as totalViews,
            (SELECT COUNT(*) FROM analytics WHERE action = 'click') as totalClicks
    `;
    
    db.get(statsQuery, [], (err, row) => {
        if (err) {
            console.error('Error fetching stats:', err);
            res.status(500).json({ error: 'Failed to fetch stats' });
        } else {
            res.json({ stats: row });
        }
    });
});

// API endpoint to get individual deal by slug
app.get('/api/deal/:softwareSlug', (req, res) => {
    const softwareSlug = req.params.softwareSlug.toLowerCase(); // Ensure lowercase for matching
    
    // Query to find deal by slug (convert software_name to slug format and compare)
    const query = `
        SELECT d.*, c.name as category_name,
               GROUP_CONCAT(c2.name) as all_categories
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN categories c2 ON (d.category_id = c2.id OR d.categories LIKE '%' || c2.id || '%')
        WHERE LOWER(REPLACE(REPLACE(TRIM(d.software_name), ' ', '-'), '--', '-')) = ?
        GROUP BY d.id
    `;
    
    db.get(query, [softwareSlug], (err, row) => {
        if (err) {
            console.error('Error fetching deal:', err);
            res.status(500).json({ error: 'Failed to fetch deal' });
        } else if (row) {
            // Parse all_categories into an array
            if (row.all_categories) {
                row.all_categories = row.all_categories.split(',').filter(Boolean);
            } else {
                row.all_categories = [row.category_name];
            }
            
            // Use AI-generated logo URL or server-side SVG fallback
            if (!row.logo_url) {
                const firstLetter = row.software_name.charAt(0).toUpperCase();
                row.logo_url = `data:image/svg+xml;base64,${Buffer.from(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${firstLetter}</text></svg>`).toString('base64')}`;
            }
            
            res.json({ deal: row });
        } else {
            res.status(404).json({ error: 'Deal not found' });
        }
    });
});

// RSS Feed Helper Functions
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function generateRssItem(deal, baseUrl) {
    const dealUrl = `${baseUrl}/deal/${deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    const pubDate = new Date(deal.created_at || deal.updated_at).toUTCString();
    
    // Protected description with attribution and partial content
    const shortDescription = deal.description ? 
        (deal.description.length > 100 ? deal.description.substring(0, 100) + '...' : deal.description) : 
        'Exclusive software deal available now';
    
    const description = `🎯 ${escapeXml(deal.discount)} OFF ${escapeXml(deal.software_name)} | ${escapeXml(shortDescription)} 💰 Visit Deal Hub for full details and coupon code. Source: Deal Hub (${baseUrl})`;
    
    // Protected title with branding
    const protectedTitle = `${escapeXml(deal.software_name)} - ${escapeXml(deal.discount)} Deal (Deal Hub Exclusive)`;
    
    return `    <item>
      <title>${protectedTitle}</title>
      <link>${dealUrl}</link>
      <description>${description}</description>
      <category>${escapeXml(deal.category_name || 'Software')}</category>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${dealUrl}</guid>
      <source url="${baseUrl}">Deal Hub</source>
    </item>`;
}

function generateRssHeader(title, description, baseUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />`;
}

function generateRssFooter() {
    return `  </channel>
</rss>`;
}

// Main RSS Feed - Latest 50 deals
app.get('/rss.xml', (req, res) => {
    const baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
    
    const query = `
        SELECT d.*, c.name as category_name 
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id 
        ORDER BY d.updated_at DESC, d.created_at DESC 
        LIMIT 50
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error generating RSS feed:', err);
            res.status(500).send('Error generating RSS feed');
            return;
        }
        
        let rss = generateRssHeader(
            'Deal Hub - Latest Software Deals & Coupon Codes',
            'Discover the latest software deals, discounts, and coupon codes. Save money on your favorite tools and applications.',
            baseUrl
        );
        
        rows.forEach(deal => {
            rss += '\n' + generateRssItem(deal, baseUrl);
        });
        
        rss += '\n' + generateRssFooter();
        
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(rss);
    });
});

// Category-specific RSS Feed
app.get('/rss/category/:categorySlug.xml', (req, res) => {
    const categorySlug = req.params.categorySlug.toLowerCase();
    const baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
    
    // First, get the category details
    const categoryQuery = `
        SELECT id, name FROM categories 
        WHERE LOWER(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(TRIM(name), '  ', ' '), 
                        ' ', '-'
                    ), 
                    '--', '-'
                ), 
                '^-', ''
            )
        ) = ? 
        OR LOWER(REPLACE(name, ' ', '')) = ?
    `;
    
    db.get(categoryQuery, [categorySlug, categorySlug.replace(/[^a-z0-9]/g, '')], (err, category) => {
        if (err || !category) {
            res.status(404).send('Category not found');
            return;
        }
        
        // Get deals for this category
        const dealsQuery = `
            SELECT d.*, c.name as category_name 
            FROM deals d 
            LEFT JOIN categories c ON d.category_id = c.id 
            WHERE d.category_id = ? OR d.categories LIKE '%' || ? || '%'
            ORDER BY d.updated_at DESC, d.created_at DESC 
            LIMIT 50
        `;
        
        db.all(dealsQuery, [category.id, category.id], (err, rows) => {
            if (err) {
                console.error('Error generating category RSS feed:', err);
                res.status(500).send('Error generating RSS feed');
                return;
            }
            
            let rss = generateRssHeader(
                `Deal Hub - ${category.name} Deals & Coupon Codes`,
                `Latest ${category.name} software deals, discounts, and coupon codes. Save money on ${category.name} tools and applications.`,
                baseUrl
            );
            
            rows.forEach(deal => {
                rss += '\n' + generateRssItem(deal, baseUrl);
            });
            
            rss += '\n' + generateRssFooter();
            
            res.set('Content-Type', 'application/rss+xml; charset=utf-8');
            res.send(rss);
        });
    });
});

// Recently Updated Deals RSS Feed
app.get('/rss/recent-deals.xml', (req, res) => {
    const baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
    
    const query = `
        SELECT d.*, c.name as category_name 
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id 
        WHERE d.updated_at > datetime('now', '-7 days')
        ORDER BY d.updated_at DESC 
        LIMIT 30
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error generating recent RSS feed:', err);
            res.status(500).send('Error generating RSS feed');
            return;
        }
        
        let rss = generateRssHeader(
            'Deal Hub - Recently Updated Deals',
            'Recently updated software deals and coupon codes. Stay up-to-date with the latest changes and new offers.',
            baseUrl
        );
        
        rows.forEach(deal => {
            rss += '\n' + generateRssItem(deal, baseUrl);
        });
        
        rss += '\n' + generateRssFooter();
        
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(rss);
    });
});

// RSS Discovery endpoint - lists all available RSS feeds
app.get('/rss', (req, res) => {
    const baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
    
    // Get all categories for category feed links
    db.all('SELECT name FROM categories ORDER BY name', [], (err, categories) => {
        if (err) {
            console.error('Error fetching categories for RSS discovery:', err);
            res.status(500).send('Error loading RSS feeds');
            return;
        }
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSS Feeds - Deal Hub</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .feed-list { list-style: none; padding: 0; }
        .feed-item { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .feed-title { font-weight: bold; color: #00D4AA; }
        .feed-url { font-family: monospace; color: #666; margin-top: 5px; }
        .category-feeds { margin-top: 30px; }
    </style>
</head>
<body>
    <h1>📡 RSS Feeds - Deal Hub</h1>
    <p>Subscribe to our RSS feeds to stay updated with the latest software deals and coupon codes.</p>
    
    <h2>Main Feeds</h2>
    <ul class="feed-list">
        <li class="feed-item">
            <div class="feed-title">Latest Deals</div>
            <div>All the latest software deals and coupon codes</div>
            <div class="feed-url"><a href="${baseUrl}/rss.xml">${baseUrl}/rss.xml</a></div>
        </li>
        <li class="feed-item">
            <div class="feed-title">Recent Deals</div>
            <div>Deals updated in the last 7 days</div>
            <div class="feed-url"><a href="${baseUrl}/rss/recent-deals.xml">${baseUrl}/rss/recent-deals.xml</a></div>
        </li>
    </ul>
    
    <div class="category-feeds">
        <h2>Category Feeds</h2>
        <ul class="feed-list">`;
        
        categories.forEach(category => {
            const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            html += `
            <li class="feed-item">
                <div class="feed-title">${escapeXml(category.name)} Deals</div>
                <div>Latest deals in the ${escapeXml(category.name)} category</div>
                <div class="feed-url"><a href="${baseUrl}/rss/category/${categorySlug}.xml">${baseUrl}/rss/category/${categorySlug}.xml</a></div>
            </li>`;
        });
        
        html += `
        </ul>
    </div>
    
    <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
        <h3>How to Subscribe</h3>
        <p>Copy any RSS feed URL above and paste it into your favorite RSS reader or news aggregator:</p>
        <ul>
            <li><strong>Feedly:</strong> Add feed URL in Feedly</li>
            <li><strong>RSS readers:</strong> Most support direct URL input</li>
            <li><strong>Browsers:</strong> Some browsers have built-in RSS support</li>
        </ul>
    </div>
</body>
</html>`;
        
        res.send(html);
    });
});

// Catch-all route for 404 errors - must be last
app.get('*', (req, res) => {
    // Check if it's an API request
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        // Serve the 404 page for all other invalid URLs
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

// Start server
app.listen(PORT, 'localhost', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}`);
    console.log(`🎯 Deal pages: http://localhost:${PORT}/deal/taskmagic`);
});
