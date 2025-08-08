// Homepage functionality
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedDeals();
});

// Load featured deals from API
async function loadFeaturedDeals() {
    try {
        const response = await fetch('/api/deals');
        const data = await response.json();
        
        if (data.deals && data.deals.length > 0) {
            displayFeaturedDeals(data.deals.slice(0, 6)); // Show top 6 deals
        }
    } catch (error) {
        console.error('Error loading featured deals:', error);
        displayFallbackDeals();
    }
}

// Display featured deals
function displayFeaturedDeals(deals) {
    const grid = document.getElementById('featured-deals');
    grid.innerHTML = '';
    
    deals.forEach(deal => {
        const dealCard = createDealCard(deal);
        grid.appendChild(dealCard);
    });
}

// Create deal card element
function createDealCard(deal) {
    const card = document.createElement('a');
    card.className = 'deal-card';
    card.href = `/deal/${deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-')}`;
    
    // Generate logo (first letter if no logo URL)
    const logoContent = deal.logo_url ? 
        `<img src="${deal.logo_url}" alt="${deal.software_name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">` :
        deal.software_name.charAt(0).toUpperCase();
    
    card.innerHTML = `
        <div class="deal-header">
            <div class="deal-logo">${logoContent}</div>
            <div class="deal-info">
                <h3>${deal.software_name}</h3>
                <div class="deal-discount">${deal.discount}</div>
            </div>
        </div>
        <div class="deal-description">
            ${deal.description ? deal.description.substring(0, 100) + '...' : 'Great software deal available now!'}
        </div>
        <div class="deal-tags">
            <div class="deal-tag">${deal.category_name || 'Software'}</div>
            <div class="deal-tag">${deal.time_limit || 'Limited Time'}</div>
        </div>
    `;
    
    return card;
}

// Display fallback deals if API fails
function displayFallbackDeals() {
    const fallbackDeals = [
        {
            software_name: 'TaskMagic',
            discount: '20% OFF',
            description: 'Automate your repetitive tasks with ease. No coding required.',
            category_name: 'Automation',
            time_limit: 'Limited Time'
        },
        {
            software_name: 'Notion',
            discount: '50% OFF',
            description: 'All-in-one workspace for notes, tasks, and collaboration.',
            category_name: 'Productivity',
            time_limit: 'Student Discount'
        },
        {
            software_name: 'Canva Pro',
            discount: '30% OFF',
            description: 'Professional design tools for everyone.',
            category_name: 'Design',
            time_limit: 'First 3 Months'
        }
    ];
    
    displayFeaturedDeals(fallbackDeals);
}

// Search functionality
async function searchDeals() {
    const searchTerm = document.getElementById('search-input').value.trim();
    
    if (!searchTerm) {
        showNotification('Please enter a search term', 'error');
        return;
    }
    
    try {
        // Show loading state
        document.getElementById('deals-section-title').textContent = 'Searching...';
        document.getElementById('featured-deals').innerHTML = '<div style="text-align: center; padding: 2rem;">🔍 Searching for software...</div>';
        
        // Call search API
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (response.ok && data.deals) {
            displaySearchResults(data.deals, searchTerm);
        } else {
            showNoResults(searchTerm);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
        loadFeaturedDeals(); // Fallback to featured deals
    }
}

// Display search results
function displaySearchResults(deals, searchTerm) {
    const grid = document.getElementById('featured-deals');
    const title = document.getElementById('deals-section-title');
    const noResults = document.getElementById('no-results');
    const searchInfo = document.getElementById('search-results-info');
    const searchText = document.getElementById('search-results-text');
    
    // Update title and show search info
    title.textContent = `Search Results for "${searchTerm}"`;
    searchText.textContent = `Found ${deals.length} software deal${deals.length !== 1 ? 's' : ''} matching "${searchTerm}"`;
    searchInfo.style.display = 'block';
    
    if (deals.length > 0) {
        // Hide no results and show deals
        noResults.style.display = 'none';
        grid.innerHTML = '';
        
        deals.forEach(deal => {
            const dealCard = createDealCard(deal);
            grid.appendChild(dealCard);
        });
        
        // Removed notification popup
    } else {
        showNoResults(searchTerm);
    }
}

// Show no results
function showNoResults(searchTerm) {
    const grid = document.getElementById('featured-deals');
    const title = document.getElementById('deals-section-title');
    const noResults = document.getElementById('no-results');
    const searchInfo = document.getElementById('search-results-info');
    const searchText = document.getElementById('search-results-text');
    
    title.textContent = `No Results for "${searchTerm}"`;
    searchText.textContent = `No software found matching "${searchTerm}"`;
    searchInfo.style.display = 'block';
    
    grid.innerHTML = '';
    noResults.style.display = 'block';
    
    // Removed notification popup
}

// Clear search and show all deals
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const title = document.getElementById('deals-section-title');
    const searchInfo = document.getElementById('search-results-info');
    const noResults = document.getElementById('no-results');
    
    // Reset search input
    searchInput.value = '';
    
    // Hide search info and no results
    searchInfo.style.display = 'none';
    noResults.style.display = 'none';
    
    // Reset title and reload featured deals
    title.textContent = 'Featured Deals';
    loadFeaturedDeals();
    
    // Removed notification popup
}

// Handle Enter key in search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchDeals();
            }
        });
    }
});

// Browse category
function browseCategory(categoryName) {
    // Redirect to dashboard with category filter
    window.location.href = `/?category=${encodeURIComponent(categoryName)}`;
}

// View all deals
function viewAllDeals() {
    window.location.href = '/';
}

// Newsletter subscription
async function subscribeNewsletter() {
    const email = document.getElementById('email-input').value.trim();
    
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        // Here you would typically send to your newsletter API
        // For now, we'll just show a success message
        showNotification('Thanks for subscribing! You\'ll receive the best deals in your inbox.', 'success');
        document.getElementById('email-input').value = '';
    } catch (error) {
        showNotification('Failed to subscribe. Please try again.', 'error');
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Handle Enter key in email input
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                subscribeNewsletter();
            }
        });
    }
});

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
