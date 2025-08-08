// Default deal data
let dealData = {
    softwareName: "TaskMagic",
    logoUrl: `data:image/svg+xml;base64,${btoa('<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">TM</text></svg>')}`,
    websiteUrl: "https://taskmagic.com",
    discount: "20% off",
    category: "Services",
    couponCode: "SYRUP",
    timeLimit: "Limited Time Only",
    description: "TaskMagic is like an automated virtual assistant. It turns your walkthrough videos into automations. It a human can do it on the web, it can be automated. No more repetitive tasks you don't want to do. Simply record yourself doing the task once, then never do it again."
};

// Initialize page on load
document.addEventListener('DOMContentLoaded', function() {
    loadDealData();
    setupEventListeners();
    loadFromLocalStorage();
});

// Load deal data into the page
function loadDealData() {
    // Update software logo and name with error handling
    const logoImg = document.getElementById('software-logo');
    logoImg.onerror = function() {
        // Create a fallback logo with first letter of software name
        const firstLetter = dealData.softwareName.charAt(0).toUpperCase();
        this.src = `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${firstLetter}</text></svg>`)}`;
    };
    logoImg.src = dealData.logoUrl || `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#00D4AA" rx="15"/><text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">${dealData.softwareName.charAt(0).toUpperCase()}</text></svg>`)}`;
    logoImg.alt = dealData.softwareName + " Logo";
    document.getElementById('software-name').textContent = dealData.softwareName;
    
    // Update deal title
    document.getElementById('deal-title').textContent = dealData.discount + " " + dealData.softwareName;
    
    // Update meta information
    document.getElementById('category-display').textContent = dealData.category;
    document.getElementById('discount-display').textContent = dealData.discount;
    document.getElementById('expiry-display').textContent = dealData.timeLimit;
    
    // Update tags
    document.getElementById('category').textContent = dealData.category;
    document.getElementById('discount-tag').textContent = dealData.discount;
    document.getElementById('time-limit').textContent = dealData.timeLimit;
    
    // Update details section
    document.getElementById('software-category').textContent = dealData.category;
    document.getElementById('software-description').textContent = dealData.description;
    
    // Update coupon code
    document.getElementById('coupon-code').textContent = dealData.couponCode;
    
    // Update category badges
    document.getElementById('category-badge').textContent = dealData.category;
    document.getElementById('bottom-category').textContent = dealData.category;
    
    // Update page title
    document.title = dealData.discount + " " + dealData.softwareName + " - Dynamic Coupon Page";
    
    // Update meta description
    updateMetaDescription();
}

// Update meta description for SEO
function updateMetaDescription() {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = `Get ${dealData.discount} on ${dealData.softwareName}! Use coupon code ${dealData.couponCode}. ${dealData.description.substring(0, 100)}...`;
}

// Setup event listeners
function setupEventListeners() {
    // View website button
    document.getElementById('view-website').addEventListener('click', function() {
        window.open(dealData.websiteUrl, '_blank');
    });
    
    // Get deal button
    document.getElementById('get-deal').addEventListener('click', function() {
        window.open(dealData.websiteUrl, '_blank');
    });
    
    // Admin form submission
    document.getElementById('deal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateDealFromForm();
    });
    
    // Share buttons
    setupShareButtons();
}

// Copy coupon code function
function copyCoupon() {
    const couponCode = document.getElementById('coupon-code').textContent;
    
    // Try to use the modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(couponCode).then(function() {
            showCopyFeedback();
        }).catch(function(err) {
            fallbackCopyTextToClipboard(couponCode);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyTextToClipboard(couponCode);
    }
}

// Fallback copy method for older browsers
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

// Show copy feedback
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

// Toggle admin panel
function toggleAdmin() {
    const adminPanel = document.getElementById('admin-panel');
    const isVisible = adminPanel.style.display === 'flex';
    
    if (isVisible) {
        adminPanel.style.display = 'none';
    } else {
        adminPanel.style.display = 'flex';
        populateAdminForm();
    }
}

// Populate admin form with current data
function populateAdminForm() {
    document.getElementById('admin-software-name').value = dealData.softwareName;
    document.getElementById('admin-logo-url').value = dealData.logoUrl;
    document.getElementById('admin-website-url').value = dealData.websiteUrl;
    document.getElementById('admin-discount').value = dealData.discount;
    document.getElementById('admin-category').value = dealData.category;
    document.getElementById('admin-coupon').value = dealData.couponCode;
    document.getElementById('admin-time-limit').value = dealData.timeLimit;
    document.getElementById('admin-description').value = dealData.description;
}

// Update deal from admin form
function updateDealFromForm() {
    // Get form values
    dealData.softwareName = document.getElementById('admin-software-name').value || dealData.softwareName;
    dealData.logoUrl = document.getElementById('admin-logo-url').value || dealData.logoUrl;
    dealData.websiteUrl = document.getElementById('admin-website-url').value || dealData.websiteUrl;
    dealData.discount = document.getElementById('admin-discount').value || dealData.discount;
    dealData.category = document.getElementById('admin-category').value || dealData.category;
    dealData.couponCode = document.getElementById('admin-coupon').value || dealData.couponCode;
    dealData.timeLimit = document.getElementById('admin-time-limit').value || dealData.timeLimit;
    dealData.description = document.getElementById('admin-description').value || dealData.description;
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Reload the page data
    loadDealData();
    
    // Close admin panel
    toggleAdmin();
    
    // Show success message
    showUpdateSuccess();
}

// Show update success message
function showUpdateSuccess() {
    const successMsg = document.createElement('div');
    successMsg.innerHTML = '✅ Deal updated successfully!';
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(successMsg);
    
    setTimeout(function() {
        successMsg.remove();
    }, 3000);
}

// Save data to localStorage
function saveToLocalStorage() {
    localStorage.setItem('dealData', JSON.stringify(dealData));
}

// Load data from localStorage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('dealData');
    if (savedData) {
        dealData = { ...dealData, ...JSON.parse(savedData) };
        loadDealData();
    }
}

// Setup share buttons
function setupShareButtons() {
    const shareButtons = document.querySelectorAll('.share-btn');
    
    shareButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const platform = this.classList.contains('facebook') ? 'facebook' : 
                           this.classList.contains('twitter') ? 'twitter' : 'linkedin';
            shareOnPlatform(platform);
        });
    });
}

// Share on social platforms
function shareOnPlatform(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Get ${dealData.discount} on ${dealData.softwareName}! Use code ${dealData.couponCode}`);
    
    let shareUrl = '';
    
    switch(platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// URL parameter handling for dynamic content
function loadFromURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('software')) dealData.softwareName = urlParams.get('software');
    if (urlParams.has('discount')) dealData.discount = urlParams.get('discount');
    if (urlParams.has('code')) dealData.couponCode = urlParams.get('code');
    if (urlParams.has('category')) dealData.category = urlParams.get('category');
    if (urlParams.has('logo')) dealData.logoUrl = urlParams.get('logo');
    if (urlParams.has('website')) dealData.websiteUrl = urlParams.get('website');
    if (urlParams.has('description')) dealData.description = decodeURIComponent(urlParams.get('description'));
    
    loadDealData();
}

// Generate URL with current deal data
function generateDealURL() {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
        software: dealData.softwareName,
        discount: dealData.discount,
        code: dealData.couponCode,
        category: dealData.category,
        logo: dealData.logoUrl,
        website: dealData.websiteUrl,
        description: dealData.description
    });
    
    return `${baseUrl}?${params.toString()}`;
}

// Export deal data as JSON
function exportDealData() {
    const dataStr = JSON.stringify(dealData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${dealData.softwareName.toLowerCase().replace(/\s+/g, '-')}-deal.json`;
    link.click();
}

// Import deal data from JSON
function importDealData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                dealData = { ...dealData, ...importedData };
                loadDealData();
                saveToLocalStorage();
                showUpdateSuccess();
            } catch (error) {
                alert('Error importing data: Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize URL params on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFromURLParams();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + E to open admin panel
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleAdmin();
    }
    
    // Escape to close admin panel
    if (e.key === 'Escape') {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel.style.display === 'flex') {
            toggleAdmin();
        }
    }
});

// Add smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading animation for images
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '1';
    });
    
    img.addEventListener('error', function() {
        this.src = 'https://via.placeholder.com/100x100/cccccc/ffffff?text=No+Image';
    });
});

// Add intersection observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.deal-section, .browse-section');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
