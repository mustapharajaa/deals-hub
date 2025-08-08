// Dashboard JavaScript with Database Integration
class DashboardManager {
    constructor() {
        this.deals = [];
        this.categories = [];
        this.stats = {};
        this.topDealsLimit = 5; // Initial limit for top deals
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadDeals();
        await this.loadStats();
        await this.loadAnalytics();
        this.displayTopDeals();
        this.setupEventListeners();
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/all-categories');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.categories = data.categories || [];
            console.log('All categories loaded from database:', this.categories.length);
            this.displayCategories();
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showNotification('Failed to load categories. Make sure the server is running.', 'error');
            // Show error message in categories list
            const categoriesList = document.getElementById('categories-list');
            if (categoriesList) {
                categoriesList.innerHTML = '<div class="loading" style="color: red;">❌ Failed to load categories. Make sure the server is running.</div>';
            }
        }
    }

    async loadDeals() {
        try {
            const response = await fetch('/api/deals');
            const data = await response.json();
            this.deals = data.deals;
            console.log('Deals loaded from database:', this.deals.length);
            this.displayDeals();
            this.displayTopDeals(); // Also refresh the top deals display
        } catch (error) {
            console.error('Error loading deals:', error);
            this.showNotification('Failed to load deals', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            this.stats = data.stats;
            console.log('Stats loaded from database:', this.stats);
            this.displayStats();
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showNotification('Failed to load stats', 'error');
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/analytics');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.analytics = data.analytics || [];
            console.log('Analytics loaded from database:', this.analytics.length);
            this.displayAnalytics();
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showNotification('Failed to load analytics. Make sure the server is running.', 'error');
            // Show error message in analytics table
            const analyticsTable = document.getElementById('analytics-table');
            if (analyticsTable) {
                analyticsTable.innerHTML = '<div class="loading" style="color: red;">❌ Failed to load analytics. Make sure the server is running.</div>';
            }
        }
    }

    displayCategories() {
        // Update category dropdown
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }

        // Update edit category dropdown
        const editCategorySelect = document.getElementById('edit-category');
        if (editCategorySelect) {
            editCategorySelect.innerHTML = '<option value="">Select Category</option>';
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                editCategorySelect.appendChild(option);
            });
        }

        // Update the Categories header with total count
        const categoriesHeader = document.querySelector('#categories .table-header h3');
        if (categoriesHeader) {
            categoriesHeader.textContent = `Categories (${this.categories.length})`;
        } else {
            // Fallback: try to find any h3 that contains "Categories"
            const allH3s = document.querySelectorAll('h3');
            allH3s.forEach(h3 => {
                if (h3.textContent.includes('Categories')) {
                    h3.textContent = `Categories (${this.categories.length})`;
                }
            });
        }

        // Display categories list
        const categoriesList = document.getElementById('categories-list');
        if (categoriesList) {
            if (this.categories.length === 0) {
                categoriesList.innerHTML = '<div class="loading">No categories found. Add your first category!</div>';
                return;
            }

            categoriesList.innerHTML = this.categories.map(category => `
                <div class="deal-row" data-id="${category.id}">
                    <div class="deal-info">
                        <strong>${category.name}</strong>
                    </div>
                    <div class="deal-details">
                        <div><strong>Description:</strong> ${category.description || 'No description'}</div>
                        <div><strong>Created:</strong> ${new Date(category.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="deal-actions">
                        <button onclick="dashboard.editCategory(${category.id})" class="btn btn-sm" style="background: #28a745; margin-right: 0.5rem;">✏️ Edit</button>
                        <button onclick="dashboard.deleteCategory(${category.id})" class="btn btn-sm btn-danger">🗑️ Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }

    displayDeals() {
        const dealsContainer = document.getElementById('deals-list');
        if (!dealsContainer) return;

        // Update the All Deals header with total count
        const dealsHeader = document.querySelector('#deals h3');
        if (dealsHeader) {
            dealsHeader.textContent = `All Deals (${this.deals.length})`;
        }

        if (this.deals.length === 0) {
            dealsContainer.innerHTML = '<div class="loading">No deals found. Add your first deal!</div>';
            return;
        }

        dealsContainer.innerHTML = this.deals.map(deal => `
            <div class="deal-row" data-id="${deal.id}">
                <div class="deal-info">
                    <strong>${deal.software_name}</strong>
                    <span class="category-badge">${deal.category_name || 'Uncategorized'}</span>
                </div>
                <div class="deal-details">
                    <div><strong>Discount:</strong> ${deal.discount || 'N/A'}</div>
                    <div><strong>Code:</strong> ${deal.coupon_code || 'N/A'}</div>
                    <div><strong>Expires:</strong> ${deal.time_limit || 'N/A'}</div>
                </div>
                <div class="deal-stats">
                    <div class="click-count">
                        <strong>📊 ${deal.clicks || 0}</strong>
                        <small>Clicks</small>
                    </div>
                </div>
                <div class="deal-actions">
                    <button onclick="dashboard.viewDeal(${deal.id})" class="btn btn-sm" style="background: #17a2b8; margin-right: 0.5rem;">👁️ View</button>
                    <button onclick="dashboard.editDeal(${deal.id})" class="btn btn-sm" style="background: #28a745; margin-right: 0.5rem;">✏️ Edit</button>
                    <button onclick="dashboard.deleteDeal(${deal.id})" class="btn btn-sm btn-danger">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    displayStats() {
        const statsGrid = document.getElementById('stats-grid');
        if (statsGrid && this.stats) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${this.stats.totalDeals || 0}</div>
                    <div class="stat-label">Total Softwares</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.stats.totalCategories || 0}</div>
                    <div class="stat-label">Categories</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.stats.totalViews || 0}</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.stats.totalClicks || 0}</div>
                    <div class="stat-label">Total Clicks</div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Add category form
        const addCategoryForm = document.getElementById('add-category-form');
        if (addCategoryForm) {
            addCategoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addCategory();
            });
        }

        // Add deal form
        const addForm = document.getElementById('add-deal-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveDeal();
            });
        }

        // Edit deal form
        const editForm = document.getElementById('edit-deal-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateDeal();
            });
        }

        // Close modal buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    async saveDeal() {
        try {
            const dealData = {
                software_name: document.getElementById('software-name').value.trim(),
                category_id: document.getElementById('category').value,
                discount: document.getElementById('discount').value.trim(),
                coupon_code: document.getElementById('coupon-code').value.trim(),
                website_url: document.getElementById('website-url').value.trim(),
                referral_link: document.getElementById('referral-link').value.trim(),
                logo_url: document.getElementById('logo-url').value.trim(),
                time_limit: document.getElementById('time-limit').value.trim(),
                description: document.getElementById('description').value.trim()
            };

            // Validate required fields
            if (!dealData.software_name || !dealData.discount) {
                this.showNotification('Software name and discount are required', 'error');
                return;
            }

            console.log('Saving deal to database:', dealData);
            
            // Send data to server
            const response = await fetch('/api/deals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dealData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Deal saved successfully!', 'success');
                
                // Reset form
                document.getElementById('add-deal-form').reset();
                
                // Reload data
                await this.loadDeals();
                await this.loadStats();
            } else {
                this.showNotification(data.error || 'Failed to save deal', 'error');
            }
        } catch (error) {
            console.error('Error saving deal:', error);
            this.showNotification('Failed to save deal. Make sure the server is running.', 'error');
        }
    }

    viewDeal(id) {
        const deal = this.deals.find(d => d.id === id);
        if (!deal) return;

        // Create SEO-friendly URL for the deal
        const softwareSlug = deal.software_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
        const dealUrl = `/deal/${softwareSlug}`;
        
        // Open deal page in new tab
        window.open(dealUrl, '_blank');
        
        // Optional: Track view analytics
        console.log(`Viewing deal: ${deal.software_name}`);
    }

    editDeal(id) {
        const deal = this.deals.find(d => d.id === id);
        if (!deal) return;

        // Populate edit form
        document.getElementById('edit-software-name').value = deal.software_name;
        document.getElementById('edit-category').value = deal.category_id;
        document.getElementById('edit-discount').value = deal.discount;
        document.getElementById('edit-coupon-code').value = deal.coupon_code;
        document.getElementById('edit-website-url').value = deal.website_url;
        document.getElementById('edit-referral-link').value = deal.referral_link;
        document.getElementById('edit-logo-url').value = deal.logo_url;
        document.getElementById('edit-time-limit').value = deal.time_limit;
        document.getElementById('edit-description').value = deal.description;

        // Show edit modal
        document.getElementById('edit-modal').style.display = 'block';
        this.editingDealId = id;
    }

    async updateDeal() {
        try {
            const dealData = {
                software_name: document.getElementById('edit-software-name').value.trim(),
                category_id: document.getElementById('edit-category').value,
                discount: document.getElementById('edit-discount').value.trim(),
                coupon_code: document.getElementById('edit-coupon-code').value.trim(),
                website_url: document.getElementById('edit-website-url').value.trim(),
                referral_link: document.getElementById('edit-referral-link').value.trim(),
                logo_url: document.getElementById('edit-logo-url').value.trim(),
                time_limit: document.getElementById('edit-time-limit').value.trim(),
                description: document.getElementById('edit-description').value.trim()
            };

            // Validate required fields
            if (!dealData.software_name || !dealData.discount) {
                this.showNotification('Software name and discount are required', 'error');
                return;
            }

            console.log('Updating deal in database:', dealData);
            
            // Send PUT request to update deal in database
            const response = await fetch(`/api/deals/${this.editingDealId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dealData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Deal updated successfully!', 'success');
                
                this.closeModal();
                await this.loadDeals();
                await this.loadStats();
            } else {
                this.showNotification(data.error || 'Failed to update deal', 'error');
            }
        } catch (error) {
            console.error('Error updating deal:', error);
            this.showNotification('Failed to update deal. Make sure the server is running.', 'error');
        }
    }

    async deleteDeal(id) {
        try {
            console.log('Deleting deal from database:', id);
            
            // Make the actual DELETE request to the server
            const response = await fetch(`/api/deals/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Deal deleted successfully!', 'success');
                
                // Reload the deals list and stats
                await this.loadDeals();
                await this.loadStats();
            } else {
                throw new Error('Server returned failure response');
            }
        } catch (error) {
            console.error('Error deleting deal:', error);
            this.showNotification('Failed to delete deal', 'error');
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.style.display = 'none');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    displayTopDeals() {
        const topDealsContainer = document.getElementById('top-deals');
        if (topDealsContainer && this.deals) {
            // Sort deals by clicks (highest first) for better "top performing" display
            const sortedDeals = this.deals.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
            const topDeals = sortedDeals.slice(0, this.topDealsLimit);
            
            if (this.deals.length === 0) {
                topDealsContainer.innerHTML = '<p>No deals available yet.</p>';
                return;
            }
            
            let html = topDeals.map(deal => `
                <div class="deal-row">
                    <div class="deal-info">
                        <strong>${deal.software_name}</strong>
                        <span class="category-badge">${deal.category_name || 'Uncategorized'}</span>
                    </div>
                    <div class="deal-discount">${deal.discount}</div>
                    <div class="deal-code">${deal.coupon_code}</div>
                    <div class="deal-clicks">
                        <strong>📊 ${deal.clicks || 0}</strong>
                        <small>clicks</small>
                    </div>
                </div>
            `).join('');
            
            // Add Load More button if there are more deals to show
            if (this.topDealsLimit < sortedDeals.length) {
                html += `
                    <div class="load-more-container" style="text-align: center; margin-top: 1rem;">
                        <button class="btn" onclick="dashboard.loadMoreTopDeals()" style="background: #6c757d; color: white; padding: 0.5rem 1rem;">
                            🔄 Load More (${sortedDeals.length - this.topDealsLimit} remaining)
                        </button>
                    </div>
                `;
            } else if (this.topDealsLimit > 5 && sortedDeals.length > 5) {
                // Show "Show Less" button if we're showing more than 5 and there are more than 5 total
                html += `
                    <div class="load-more-container" style="text-align: center; margin-top: 1rem;">
                        <button class="btn" onclick="dashboard.showLessTopDeals()" style="background: #6c757d; color: white; padding: 0.5rem 1rem;">
                            ⬆️ Show Less
                        </button>
                    </div>
                `;
            }
            
            topDealsContainer.innerHTML = html;
        }
    }

    async addCategory() {
        try {
            const categoryName = document.getElementById('category-name').value.trim();
            const categoryDescription = document.getElementById('category-description').value.trim();
            
            if (!categoryName) {
                this.showNotification('Category name is required', 'error');
                return;
            }
            
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: categoryName,
                    description: categoryDescription
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Category added successfully!', 'success');
                
                // Clear form
                document.getElementById('category-name').value = '';
                document.getElementById('category-description').value = '';
                
                // Reload categories and stats
                await this.loadCategories();
                await this.loadStats();
            } else {
                this.showNotification(data.error || 'Failed to add category', 'error');
            }
        } catch (error) {
            console.error('Error adding category:', error);
            this.showNotification('Failed to add category. Make sure the server is running.', 'error');
        }
    }

    async editCategory(id) {
        // TODO: Implement edit category functionality
        this.showNotification('Edit category functionality coming soon!', 'info');
    }

    async deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) return;
        
        try {
            const response = await fetch(`/api/categories/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Category deleted successfully!', 'success');
                await this.loadCategories();
                await this.loadStats();
            } else {
                this.showNotification('Failed to delete category', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showNotification('Failed to delete category', 'error');
        }
    }

    displayAnalytics() {
        const analyticsTable = document.getElementById('analytics-table');
        if (!analyticsTable) return;

        if (this.analytics.length === 0) {
            analyticsTable.innerHTML = '<div class="loading">No analytics data found. Activity will appear here when users interact with deals.</div>';
            return;
        }

        analyticsTable.innerHTML = `
            <div class="analytics-header">
                <div><strong>Action</strong></div>
                <div><strong>Software</strong></div>
                <div><strong>Time</strong></div>
                <div><strong>IP Address</strong></div>
            </div>
            ${this.analytics.map(item => `
                <div class="analytics-row">
                    <div class="analytics-action">
                        <span class="action-badge ${item.action}">
                            ${item.action === 'click' ? '🖱️ Click' : item.action === 'view' ? '👁️ View' : '📋 ' + item.action}
                        </span>
                    </div>
                    <div class="analytics-software">
                        <strong>${item.software_name || 'Unknown'}</strong>
                        ${item.discount ? `<small>${item.discount}</small>` : ''}
                    </div>
                    <div class="analytics-time">
                        ${new Date(item.timestamp).toLocaleString()}
                    </div>
                    <div class="analytics-ip">
                        ${item.ip_address || 'N/A'}
                    </div>
                </div>
            `).join('')}
        `;
    }

    loadMoreTopDeals() {
        this.topDealsLimit += 5; // Show 5 more deals
        this.displayTopDeals();
    }

    showLessTopDeals() {
        this.topDealsLimit = 5; // Reset to show only top 5
        this.displayTopDeals();
    }
}

// Global functions for HTML navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function loadDeals() {
    if (dashboard) {
        dashboard.loadDeals();
    }
}

function loadCategories() {
    if (dashboard) {
        dashboard.loadCategories();
    }
}

function loadAnalytics() {
    if (dashboard) {
        dashboard.loadAnalytics();
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});
