const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'deals.db');
const db = new sqlite3.Database(dbPath);

console.log('🗄️ Initializing database...');

// Create tables
db.serialize(() => {
    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Software deals table
    db.run(`CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        software_name TEXT NOT NULL,
        software_name_slug TEXT,
        category_id INTEGER,
        categories TEXT,
        logo_url TEXT,
        website_url TEXT,
        referral_link TEXT,
        discount TEXT NOT NULL,
        coupon_code TEXT,
        time_limit TEXT,
        description TEXT,
        about TEXT,
        is_active BOOLEAN DEFAULT 1,
        clicks INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories (id)
    )`);

    // Analytics table for tracking
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        action TEXT, -- 'view', 'click', 'copy_code'
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals (id)
    )`);

    console.log('✅ Database tables created successfully!');

    // Insert default categories
    const categories = [
        ['Automation', 'Workflow automation and productivity tools'],
        ['Productivity', 'Tools to enhance productivity and organization'],
        ['Design', 'Graphic design and creative software'],
        ['Writing', 'Writing assistance and content creation tools'],
        ['Software', 'General software applications'],
        ['Tools', 'Utility and development tools'],
        ['Services', 'Online services and platforms'],
        ['Marketing', 'Marketing and advertising tools'],
        ['Development', 'Programming and development software'],
        ['Business', 'Business management and enterprise tools']
    ];

    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
    categories.forEach(category => {
        insertCategory.run(category);
    });
    insertCategory.finalize();

    console.log('✅ Default categories inserted!');

    // Insert sample deals
    const sampleDeals = [
        {
            software_name: 'TaskMagic',
            category: 'Automation',
            logo_url: '',
            website_url: 'https://taskmagic.com',
            referral_link: 'https://taskmagic.com?ref=DEALHUB',
            discount: '20% off',
            coupon_code: 'SYRUP',
            time_limit: 'Limited Time Only',
            description: 'TaskMagic is like an automated virtual assistant. It turns your walkthrough videos into automations. If a human can do it on the web, it can be automated. No more repetitive tasks you don\'t want to do. Simply record yourself doing the task once, then never do it again.'
        },
        {
            software_name: 'Notion',
            category: 'Productivity',
            logo_url: '',
            website_url: 'https://notion.so',
            referral_link: 'https://notion.so?ref=STUDENT50',
            discount: '50% off',
            coupon_code: 'STUDENT50',
            time_limit: 'Valid for Students',
            description: 'Notion is an all-in-one workspace where you can write, plan, collaborate and get organized. It allows you to take notes, add tasks, manage projects & more. Imagine a lego structure. Notion provides the building blocks and you can create your own layouts and toolkit to get work done.'
        },
        {
            software_name: 'Canva Pro',
            category: 'Design',
            logo_url: '',
            website_url: 'https://canva.com',
            referral_link: 'https://canva.com/pro?ref=DESIGN30',
            discount: '30% off',
            coupon_code: 'DESIGN30',
            time_limit: 'First 3 Months',
            description: 'Canva Pro is a design platform that allows you to create stunning graphics, presentations, posters, documents and other visual content. Access millions of premium photos, videos, audio, and graphic elements. Perfect for businesses, marketers, and content creators.'
        },
        {
            software_name: 'Grammarly Premium',
            category: 'Writing',
            logo_url: '',
            website_url: 'https://grammarly.com',
            referral_link: 'https://grammarly.com/premium?ref=WRITE25',
            discount: '25% off',
            coupon_code: 'WRITE25',
            time_limit: 'Annual Plans Only',
            description: 'Grammarly Premium helps you write clearly and effectively. Get advanced grammar and style suggestions, vocabulary enhancement suggestions, genre-specific writing style checks, and plagiarism detection. Perfect for professionals, students, and anyone who wants to improve their writing.'
        },
        {
            software_name: 'Figma Professional',
            category: 'Design',
            logo_url: '',
            website_url: 'https://figma.com',
            referral_link: 'https://figma.com/pricing?ref=DESIGN40',
            discount: '40% off',
            coupon_code: 'DESIGN40',
            time_limit: 'New Users Only',
            description: 'Figma is a collaborative interface design tool. Build better products as a team. Design, prototype, and gather feedback all in one place. Perfect for UI/UX designers, product teams, and anyone working on digital products. Real-time collaboration makes it easy to work with your team.'
        }
    ];

    // Get category IDs and insert deals
    db.all('SELECT id, name FROM categories', (err, categories) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return;
        }

        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });

        const insertDeal = db.prepare(`
            INSERT INTO deals (
                software_name, category_id, logo_url, website_url, referral_link,
                discount, coupon_code, time_limit, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        sampleDeals.forEach(deal => {
            const categoryId = categoryMap[deal.category];
            insertDeal.run(
                deal.software_name,
                categoryId,
                deal.logo_url,
                deal.website_url,
                deal.referral_link,
                deal.discount,
                deal.coupon_code,
                deal.time_limit,
                deal.description
            );
        });

        insertDeal.finalize();
        console.log('✅ Sample deals inserted!');
        console.log('🎉 Database initialization complete!');
        console.log(`📍 Database location: ${dbPath}`);
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('🔒 Database connection closed.');
            }
        });
    });
});
