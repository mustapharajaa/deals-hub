document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    const categorySlug = pathParts[pathParts.length - 1];

    if (categorySlug) {
        fetchDealsForCategory(categorySlug);
        fetchAllCategories();
    }
});

// Function to generate a vibrant, consistent color from a string
function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate a hue between 0-360, with high saturation and medium lightness for vibrant colors
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 75%, 55%)`;
}

// Function to create a darker shade for gradients
function darkenColor(hslColor, amount = 15) {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return hslColor;
    
    const [, h, s, l] = match.map(Number);
    const newL = Math.max(0, l - amount);
    return `hsl(${h}, ${s}%, ${newL}%)`;
}

async function fetchDealsForCategory(slug) {
    try {
        const response = await fetch(`/api/category/${slug}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        displayCategoryDeals(data.category, data.deals);
    } catch (error) {
        console.error('Error fetching deals for category:', error);
        const dealsList = document.getElementById('deals-list');
        dealsList.innerHTML = '<div class="error-message"><p>Could not load deals for this category.</p></div>';
    }
}

async function fetchAllCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        displayCategories(data.categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

function displayCategories(categories) {
    const categoriesList = document.getElementById('categories-list');
    
    // Limit to first 10 categories
    const limitedCategories = categories.slice(0, 10);
    
    const categoriesHTML = limitedCategories.map(category => {
        const categorySlug = category.name.toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, '')     // Keep only letters, numbers, and hyphens
            .replace(/-+/g, '-')            // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
        const categoryColor = generateColorFromString(category.name);
        return `<a href="/category/${categorySlug}" class="category-tag" style="background-color: ${categoryColor};">${category.name}</a>`;
    }).join('');
    
    categoriesList.innerHTML = categoriesHTML;
}

function displayCategoryDeals(category, deals) {
    const categoryTitle = document.getElementById('category-title');
    const categoryHero = document.getElementById('category-hero');
    const dealsList = document.getElementById('deals-list');

    // Update page title and meta
    document.title = `Deals in ${category.name} - Deal Hub`;
    categoryTitle.textContent = `Deals in: ${category.name}`;
    
    // Add category-specific styling to hero with dynamic colors
    const categoryColor = generateColorFromString(category.name);
    const darkerColor = darkenColor(categoryColor);
    categoryHero.style.background = `linear-gradient(135deg, ${categoryColor}, ${darkerColor})`;

    if (deals.length === 0) {
        dealsList.innerHTML = '<div class="no-deals"><p>No deals found in this category yet.</p></div>';
        return;
    }

    // Generate deals HTML in Syrup style
    const dealsHTML = deals.map(deal => {
        const dealUrl = `/deal/${deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-')}`;
        // Use only AI-generated logo URL from database - preserve SSR SVG if no logo_url
        const logoUrl = deal.logo_url || 'data:image/svg+xml;base64,' + btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${deal.software_name.charAt(0).toUpperCase()}</text></svg>`);
        
        return `
            <div class="deal-item">
                <div class="deal-logo">
                    <img src="${logoUrl}" alt="${deal.software_name} Logo">
                </div>
                <div class="deal-info">
                    <h3><a href="${dealUrl}">${deal.discount} ${deal.software_name} Coupon Code</a></h3>
                    <p class="deal-subtitle">${deal.software_name}</p>
                    <p class="deal-description">${deal.description && deal.description.length > 120 ? deal.description.substring(0, 120) + '...' : (deal.description || '')}</p>
                    <div class="deal-meta">
                        <span>🏷️ ${deal.software_name}</span>
                        <span>💰 ${deal.discount}</span>
                        <span>⏰ ${deal.time_limit || 'Limited Time'}</span>
                        <span>📅 Updated ${new Date().toLocaleDateString('en-US')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    dealsList.innerHTML = dealsHTML;
}
