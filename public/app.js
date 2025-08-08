// Global variables
let currentDealData = null;
let relatedDealsCache = {};
let carouselOffset = 0;
let nextButtonClicks = 0; // Track number of Next button clicks

document.addEventListener('DOMContentLoaded', () => {
    // Clear related deals cache on page refresh to ensure fresh data with updated like counts
    relatedDealsCache = {};
    
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p);

    if (pathParts.length > 1) {
        const softwareName = pathParts[pathParts.length - 1];
        fetchDealData(softwareName);
    } else {
        console.log('No software specified in URL.');
    }
});

async function fetchDealData(softwareName) {
    try {
        const response = await fetch(`/api/deal/${softwareName}`);
        if (!response.ok) {
            if (response.status === 404) {
                window.location.href = '/404.html';
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.deal) {
            displayDeal(data.deal);
        } else {
            window.location.href = '/404.html';
        }
    } catch (error) {
        console.error('Error fetching deal data:', error);
    }
}

function displayDeal(deal) {
    // Store deal data globally for button access
    currentDealData = deal;
    


    // Update h1 title
        const mainTitle = `${deal.discount} ${deal.software_name} Coupon Code - ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()} Promo Codes`;

    // Populate the page with deal data
    document.getElementById('software-name').textContent = deal.software_name;
    document.getElementById('deal-title').textContent = mainTitle;
    document.getElementById('software-description').textContent = deal.description;
    document.getElementById('coupon-code').textContent = deal.coupon_code;
    document.getElementById('category-display').textContent = deal.category_name;
    document.getElementById('discount-display').textContent = deal.discount;
    document.getElementById('expiry-display').textContent = deal.time_limit;
    document.getElementById('updated-display').textContent = `Updated ${deal.updated_at ? new Date(deal.updated_at).toLocaleDateString() : new Date(deal.created_at).toLocaleDateString()}`;
    document.getElementById('category').textContent = deal.category_name;
    document.getElementById('discount-tag').textContent = deal.discount;
    document.getElementById('time-limit').textContent = deal.time_limit;
    document.getElementById('software-category').textContent = deal.category_name;
    document.getElementById('category-badge').textContent = deal.category_name;

    // Display all categories as badges
    const bottomCategoryContainer = document.getElementById('bottom-category');
    bottomCategoryContainer.innerHTML = ''; // Clear existing content
    if (deal.all_categories && deal.all_categories.length > 0) {
        deal.all_categories.forEach(categoryName => {
            const categoryBadge = document.createElement('span');
            categoryBadge.className = 'category-badge';
            categoryBadge.textContent = categoryName;
            bottomCategoryContainer.appendChild(categoryBadge);
        });
    } else {
        bottomCategoryContainer.textContent = deal.category_name; // Fallback
    }

    const logoImg = document.getElementById('software-logo');
    logoImg.src = deal.logo_url;
    logoImg.alt = `${deal.software_name} Logo`;

    // Fallback for broken images
    logoImg.onerror = function() {
        this.onerror=null;
        const firstLetter = deal.software_name.charAt(0).toUpperCase();
        this.src = `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${firstLetter}</text></svg>`)}`;
    };



    // Related deals are now fully server-side rendered with pure CSS carousel.
    // Add like button event listeners for server-side rendered buttons
    addLikeButtonListeners();
    
    // Add Next button to carousel
    addNextButton();
}

// Add event listeners to like buttons (for server-side rendered content)
function addLikeButtonListeners() {
    const likeButtons = document.querySelectorAll('.like-button');
    likeButtons.forEach(button => {
        // Remove any existing listeners to avoid duplicates
        button.removeEventListener('click', handleLikeClick);
        button.addEventListener('click', handleLikeClick);
    });
    
    // Add scroll hint on first hover
    addScrollHintToCarousel();
}

// Add scroll hint animation on first hover to show users the carousel is scrollable
function addScrollHintToCarousel() {
    const carousel = document.getElementById('related-deals-grid');
    console.log('Carousel element found:', carousel);
    
    if (!carousel) {
        console.error('Related deals carousel not found!');
        return;
    }
    
    // Clear the hint flag for testing (remove this line in production)
    localStorage.removeItem('carousel-hint-shown');
    
    let hasShownHint = localStorage.getItem('carousel-hint-shown') === 'true';
    console.log('Has shown hint before:', hasShownHint);
    
    if (!hasShownHint) {
        const showScrollHint = () => {
            console.log('Showing scroll hint animation...');
            
            // Animate only the deal cards, not the entire carousel
            const dealCards = carousel.querySelectorAll('.related-deal-card');
            
            dealCards.forEach(card => {
                card.style.transition = 'transform 0.6s ease-in-out';
                card.style.transform = 'translateX(-30px)';
            });
            
            setTimeout(() => {
                dealCards.forEach(card => {
                    card.style.transform = 'translateX(0)';
                });
                console.log('Scroll hint animation completed');
                
                // Clean up styles after animation
                setTimeout(() => {
                    dealCards.forEach(card => {
                        card.style.transition = '';
                        card.style.transform = '';
                    });
                }, 600);
            }, 800);
            
            // Mark hint as shown so it only happens once
            localStorage.setItem('carousel-hint-shown', 'true');
            carousel.removeEventListener('mouseenter', showScrollHint);
        };
        
        console.log('Adding mouseenter event listener to carousel');
        carousel.addEventListener('mouseenter', showScrollHint);
        
        // Also add to the parent container for better hover detection
        const carouselSection = document.getElementById('related-deals-section');
        if (carouselSection) {
            console.log('Also adding hover listener to carousel section');
            carouselSection.addEventListener('mouseenter', showScrollHint);
        }
        
        // Fallback: trigger on first click if hover doesn't work
        const fallbackTrigger = () => {
            console.log('Fallback trigger activated');
            showScrollHint();
            carousel.removeEventListener('click', fallbackTrigger);
        };
        carousel.addEventListener('click', fallbackTrigger);
    }
}

// Add Next button to carousel
function addNextButton() {
    const carousel = document.getElementById('related-deals-grid');
    if (!carousel) return;
    
    const nextButton = document.createElement('div');
    nextButton.className = 'carousel-next-button';
    nextButton.style.cssText = 'flex: 0 0 120px; min-width: 120px; display: flex; align-items: center; justify-content: center; scroll-snap-align: start; padding: 20px;';
    nextButton.innerHTML = '<button class="next-deals-btn" onclick="loadMoreDeals()"><span>Next</span><span class="arrow">→</span></button>';
    
    // Add button styles
    if (!document.getElementById('next-btn-styles')) {
        const style = document.createElement('style');
        style.id = 'next-btn-styles';
        style.textContent = `.next-deals-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; padding: 15px 20px; cursor: pointer; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); } .next-deals-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); }`;
        document.head.appendChild(style);
    }
    
    carousel.appendChild(nextButton);
}

// Load 3 more deals when Next button is clicked
async function loadMoreDeals() {
    // Check if we've already reached the 2-click limit
    if (nextButtonClicks >= 2) {
        const nextBtn = document.querySelector('.next-deals-btn');
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }
    
    const path = window.location.pathname;
    const softwareName = path.split('/').pop();
    if (!softwareName) return;
    
    // Increment click counter
    nextButtonClicks++;
    
    const nextBtn = document.querySelector('.next-deals-btn');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.innerHTML = '<span>Loading...</span>';
    }
    
    try {
        const currentDeals = document.querySelectorAll('.related-deal-card').length - 1; // -1 for next button
        console.log(`[DEBUG] Current deals before loading: ${currentDeals}`);
        
        // Don't load more deals if we already have 12 or more
        // This ensures Next button shows only 2 times: 6→9 deals, then 9→12 deals
        if (currentDeals >= 12) {
            console.log(`[DEBUG] Already have 12+ deals, hiding Next button`);
            document.querySelector('.carousel-next-button').style.display = 'none';
            return;
        }
        
        // Get existing deal IDs to send to backend for filtering
        const existingDealIds = [];
        document.querySelectorAll('.like-button[data-deal-id]').forEach(button => {
            existingDealIds.push(button.dataset.dealId);
        });
        
        // Backend will filter duplicates and return exactly 3 unique deals
        const excludeParam = existingDealIds.length > 0 ? `?exclude=${existingDealIds.join(',')}` : '';
        const apiUrl = `/api/deal/${softwareName}/related${excludeParam}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.relatedDeals && data.relatedDeals.length > 0) {
            const carousel = document.getElementById('related-deals-grid');
            const nextButton = carousel.querySelector('.carousel-next-button');
            
            data.relatedDeals.forEach(deal => {
                const dealCard = createDealCard(deal);
                carousel.insertBefore(dealCard, nextButton);
            });
            
            addLikeButtonListeners();
            
            // Count actual deal cards (more accurate counting)
            const totalDeals = document.querySelectorAll('.related-deal-card:not(.carousel-next-button)').length;
            
            // Hide Next button after exactly 2 clicks (regardless of deal count)
            if (nextButtonClicks >= 2) {
                nextButton.style.display = 'none';
            } else if (data.relatedDeals.length < 3) {
                nextButton.style.display = 'none';
            }
        } else {
            document.querySelector('.carousel-next-button').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading more deals:', error);
    } finally {
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = '<span>Next</span><span class="arrow">→</span>';
        }
    }
}

// Create deal card HTML
function createDealCard(deal) {
    const dealUrl = `/deal/${deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-')}`;
    const dealTitle = `${deal.software_name} Lifetime Deal: ${deal.description.split('.')[0]}`;
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'related-deal-card';
    cardDiv.innerHTML = `
        <a href="${dealUrl}" class="related-deal-logo-link">
            <img src="${deal.logo_url}" alt="${deal.software_name} Logo" class="related-deal-logo">
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
    `;
    
    return cardDiv;
}

// All carousel functionality is now handled by pure CSS.
// Like button functionality for related deals is preserved for user interaction.

async function handleLikeClick(event) {
    console.log('Like button clicked!');
    const button = event.currentTarget;
    const relatedDealId = button.dataset.dealId;
    const countSpan = button.querySelector('.like-count');
    const sourceDealId = currentDealData ? currentDealData.id : null;

    console.log('Current deal data:', currentDealData);
    console.log('Source deal ID:', sourceDealId);
    console.log('Related deal ID:', relatedDealId);

    if (!sourceDealId || !relatedDealId) {
        console.error('Missing deal ID for like action. Source:', sourceDealId, 'Related:', relatedDealId);
        return;
    }

    if (button.dataset.processing === 'true') {
        return;
    }
    button.dataset.processing = 'true';

    const likedDeals = JSON.parse(localStorage.getItem(`likedDeals_${sourceDealId}`)) || {};
    const isCurrentlyLiked = likedDeals[relatedDealId] === true;
    
    // Only allow unlike if user has actually liked this deal in their current browser session
    if (isCurrentlyLiked) {
        // Unlike the deal - only works if user liked it in this session
        const endpoint = '/api/related-unlike';
        let currentLikes = parseInt(countSpan.textContent, 10);
        button.classList.remove('liked');
        countSpan.textContent = Math.max(0, currentLikes - 1);
        delete likedDeals[relatedDealId];
        localStorage.setItem(`likedDeals_${sourceDealId}`, JSON.stringify(likedDeals));
        
        // Send unlike request to database
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceDealId: sourceDealId, relatedDealId: relatedDealId })
            });
            if (!response.ok) {
                // Revert on error
                button.classList.add('liked');
                countSpan.textContent = currentLikes;
                likedDeals[relatedDealId] = true;
                localStorage.setItem(`likedDeals_${sourceDealId}`, JSON.stringify(likedDeals));
            }
        } catch (error) {
            console.error('Error unliking:', error);
            // Revert on error
            button.classList.add('liked');
            countSpan.textContent = currentLikes;
            likedDeals[relatedDealId] = true;
            localStorage.setItem(`likedDeals_${sourceDealId}`, JSON.stringify(likedDeals));
        }
        button.dataset.processing = 'false';
        return; // Exit early for unlike
    }
    
    // Like the deal - always allowed, database will increment
    const endpoint = '/api/related-like';
    let currentLikes = parseInt(countSpan.textContent, 10);
    button.classList.add('liked');
    countSpan.textContent = currentLikes + 1;
    likedDeals[relatedDealId] = true;
    localStorage.setItem(`likedDeals_${sourceDealId}`, JSON.stringify(likedDeals));
    
    // Trigger animation when liking
    button.classList.add('liked-animation');
    setTimeout(() => button.classList.remove('liked-animation'), 500);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceDealId: sourceDealId, relatedDealId: relatedDealId })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Server error');
        }
    } catch (error) {
        console.error('Error sending like request:', error);
        
        // Revert UI on error
        button.classList.toggle('liked'); 
        countSpan.textContent = currentLikes; 

        // Revert localStorage
        const revertedLikedDeals = JSON.parse(localStorage.getItem(`likedDeals_${sourceDealId}`)) || {};
        if (isCurrentlyLiked) { 
            revertedLikedDeals[relatedDealId] = true;
        } else { 
            delete revertedLikedDeals[relatedDealId];
        }
        localStorage.setItem(`likedDeals_${sourceDealId}`, JSON.stringify(revertedLikedDeals));
        
    } finally {
        button.dataset.processing = 'false';
    }
}

// Copy coupon code function
function copyCoupon() {
    const couponCode = document.getElementById('coupon-code').textContent;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(couponCode).then(function() {
            showCopyFeedback();
        }).catch(function(err) {
            fallbackCopyTextToClipboard(couponCode);
        });
    } else {
        fallbackCopyTextToClipboard(couponCode);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback();
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopyFeedback() {
    const copyBtn = document.querySelector('.copy-btn');
    const originalHTML = copyBtn.innerHTML;
    
    copyBtn.innerHTML = '✅';
    copyBtn.style.background = '#28a745';
    
    setTimeout(function() {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.background = '#00D4AA';
    }, 2000);
}

// Setup event listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Get Deal button event listener
    const getDealBtn = document.getElementById('get-deal');
    if (getDealBtn) {
        getDealBtn.addEventListener('click', function() {
            // Track the click in analytics
            trackClick('click');
            
            // Get the website URL from the current deal data
            const websiteUrl = getCurrentDealWebsiteUrl();
            if (websiteUrl) {
                window.open(websiteUrl, '_blank');
            }
        });
    }
    
    // View Website button event listener
    const viewWebsiteBtn = document.getElementById('view-website');
    if (viewWebsiteBtn) {
        viewWebsiteBtn.addEventListener('click', function() {
            // Track the click in analytics
            trackClick('view');
            
            const websiteUrl = getCurrentDealWebsiteUrl();
            if (websiteUrl) {
                window.open(websiteUrl, '_blank');
            }
        });
    }
});

// Store current deal data globally for button access
// (currentDealData is declared at the top of the file)

function getCurrentDealWebsiteUrl() {
    return currentDealData ? currentDealData.website_url || currentDealData.referral_link : null;
}

// Track click analytics
async function trackClick(action) {
    if (!currentDealData || !currentDealData.id) {
        console.error('No deal data available for tracking');
        return;
    }
    
    try {
        const analyticsData = {
            deal_id: currentDealData.id,
            action: action, // 'click' or 'view'
            ip_address: 'unknown', // Client-side can't get real IP
            user_agent: navigator.userAgent
        };
        
        const response = await fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analyticsData)
        });
        
        if (!response.ok) {
            console.error('Failed to track analytics:', response.status);
        }
    } catch (error) {
        console.error('Error tracking click:', error);
    }
}

// Admin panel functions

// Fetches categories and populates the admin dropdown
async function populateCategoryDropdown() {
    try {
        const response = await fetch('/api/all-categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        const selectElement = document.getElementById('admin-category');
        if (selectElement && data.categories) {
            selectElement.innerHTML = ''; // Clear static/old options
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating categories:', error);
    }
}

function toggleAdmin() {
    const adminPanel = document.getElementById('admin-panel');
    const isVisible = adminPanel.style.display === 'flex';

    if (isVisible) {
        adminPanel.style.display = 'none';
    } else {
        if (currentDealData) {
            // Populate the form with the current deal's data
            document.getElementById('admin-software-name').value = currentDealData.software_name || '';
            document.getElementById('admin-logo-url').value = currentDealData.logo_url || '';
            document.getElementById('admin-website-url').value = currentDealData.website_url || '';
            document.getElementById('admin-discount').value = currentDealData.discount || '';
            document.getElementById('admin-coupon').value = currentDealData.coupon_code || '';
            document.getElementById('admin-time-limit').value = currentDealData.time_limit || '';
            document.getElementById('admin-description').value = currentDealData.description || '';
            document.getElementById('admin-category').value = currentDealData.category_id;
        }
        adminPanel.style.display = 'flex';
    }
}

// This listener sets up the admin form functionality when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    // Populate the category dropdown as soon as the page loads
    populateCategoryDropdown();

    const dealForm = document.getElementById('deal-form');
    if (dealForm) {
        dealForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop the form from submitting the traditional way
            if (!currentDealData) {
                alert('No deal data loaded to update.');
                return;
            }

            // Collect updated data from the form
            const updatedData = {
                software_name: document.getElementById('admin-software-name').value,
                logo_url: document.getElementById('admin-logo-url').value,
                website_url: document.getElementById('admin-website-url').value,
                discount: document.getElementById('admin-discount').value,
                coupon_code: document.getElementById('admin-coupon').value,
                time_limit: document.getElementById('admin-time-limit').value,
                description: document.getElementById('admin-description').value,
                category_id: document.getElementById('admin-category').value
            };

            // Send the updated data to the server
            try {
                const response = await fetch(`/api/deals/${currentDealData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (!response.ok) {
                    const errorResult = await response.json();
                    throw new Error(errorResult.error || 'Failed to update deal');
                }

                // Reload the page to show the changes
                window.location.reload();

            } catch (error) {
                console.error('Error updating deal:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }
});
