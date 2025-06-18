// Dashboard JavaScript Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup animations
    setupAnimations();
    
    // Setup responsive behavior
    setupResponsive();
});

function initializeDashboard() {
    // Check user authentication first
    if (!checkUserAuthentication()) {
        return; // Stop initialization if not authenticated
    }
    
    // Add loading animation
    document.body.classList.add('loaded');
    
    // Initialize tooltips
    initializeTooltips();
    
    // Setup real-time updates
    setupRealTimeUpdates();
    
    console.log('Dashboard initialized successfully');
}

function setupEventListeners() {
    // Sidebar navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Stat cards hover effects
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', handleStatCardHover);
        card.addEventListener('mouseleave', handleStatCardLeave);
    });
    
    // Class items click
    const classItems = document.querySelectorAll('.class-item');
    classItems.forEach(item => {
        item.addEventListener('click', handleClassClick);
    });
    
    // Activity items click
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        item.addEventListener('click', handleActivityClick);
    });
    
    // Add class button
    const addBtn = document.querySelector('.add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', handleAddClass);
    }
    
    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Search functionality (if search input exists)
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

function handleNavigation(event) {
    event.preventDefault();
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    event.currentTarget.closest('.nav-item').classList.add('active');
    
    // Get the navigation target
    const navText = event.currentTarget.querySelector('span').textContent;
    
    // Show notification
    showNotification(`Navigasi ke ${navText}`, 'info');
    
    // Animate content transition
    animateContentTransition();
}

function handleStatCardHover(event) {
    const card = event.currentTarget;
    const icon = card.querySelector('.stat-icon');
    
    // Add pulse animation to icon
    icon.style.animation = 'pulse 0.6s ease-in-out';
    
    // Add subtle glow effect
    card.style.boxShadow = '0 8px 25px -5px rgba(59, 130, 246, 0.15)';
}

function handleStatCardLeave(event) {
    const card = event.currentTarget;
    const icon = card.querySelector('.stat-icon');
    
    // Remove animations
    icon.style.animation = '';
    card.style.boxShadow = '';
}

function handleClassClick(event) {
    const classItem = event.currentTarget;
    const className = classItem.querySelector('.class-name').textContent;
    
    // Add click animation
    classItem.style.transform = 'scale(0.98)';
    setTimeout(() => {
        classItem.style.transform = '';
    }, 150);
    
    showNotification(`Membuka kelas ${className}`, 'success');
}

function handleActivityClick(event) {
    const activityItem = event.currentTarget;
    const activityTitle = activityItem.querySelector('.activity-title').textContent;
    
    // Add click animation
    activityItem.style.transform = 'scale(0.98)';
    setTimeout(() => {
        activityItem.style.transform = '';
    }, 150);
    
    showNotification(`Membuka aktivitas: ${activityTitle}`, 'info');
}

function handleAddClass(event) {
    event.preventDefault();
    
    // Show modal or form (simulated)
    showNotification('Fitur tambah kelas akan segera hadir!', 'info');
    
    // Add button animation
    const btn = event.currentTarget;
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 150);
}

function handleLogout(event) {
    event.preventDefault();
    
    // Show confirmation
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        // Clear session data
        clearUserSession();
        
        // Show logout notification
        showNotification('Logout berhasil. Mengalihkan ke halaman login...', 'success');
        
        // Redirect to login page after delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}

// Function to clear user session
function clearUserSession() {
    try {
        // Clear localStorage - semua data session
        localStorage.removeItem('userSession');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('currentUser');  // Data Firebase
        localStorage.removeItem('userRole');     // Data Firebase
        localStorage.removeItem('rememberedUsername');
        
        // Clear sessionStorage
        sessionStorage.removeItem('currentRole');
        sessionStorage.removeItem('userPreferences');
        
        // Clear any session timers
        if (window.sessionTimer) {
            clearTimeout(window.sessionTimer);
        }
        
        // Logout dari Firebase jika tersedia
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch((error) => {
                console.error('Error signing out from Firebase:', error);
            });
        }
        
        console.log('User session cleared successfully');
    } catch (error) {
        console.error('Error clearing session:', error);
    }
}

// Function to check if user is authenticated
function checkUserAuthentication() {
    let sessionData = localStorage.getItem('userSession');
    
    // Jika tidak ada userSession, coba ambil dari data Firebase
    if (!sessionData) {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const userData = JSON.parse(currentUser);
                // Buat session data dari data Firebase
                const sessionInfo = {
                    username: userData.displayName,
                    email: userData.email,
                    role: userData.role,
                    loginTime: userData.loginTime,
                    uid: userData.uid
                };
                localStorage.setItem('userSession', JSON.stringify(sessionInfo));
                localStorage.setItem('currentRole', userData.role);
                sessionData = JSON.stringify(sessionInfo);
                console.log('Session data created from Firebase data');
            } catch (error) {
                console.error('Error creating session from Firebase data:', error);
            }
        }
    }
    
    if (!sessionData) {
        // No session found, redirect to login
        console.log('No session data found, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const session = JSON.parse(sessionData);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes
        
        // Check if session is expired
        if (now - loginTime > sessionTimeout) {
            clearUserSession();
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            window.location.href = 'login.html';
            return false;
        }
        
        // Update user info in dashboard
        updateUserInfo(session);
        return true;
        
    } catch (error) {
        console.error('Error parsing session data:', error);
        clearUserSession();
        window.location.href = 'login.html';
        return false;
    }
}

// Function to update user info in dashboard
function updateUserInfo(session) {
    // Update user name in welcome banner
    const welcomeTitle = document.querySelector('.welcome-content h1');
    if (welcomeTitle && session.username) {
        // Capitalize first letter
        const displayName = session.username.charAt(0).toUpperCase() + session.username.slice(1);
        welcomeTitle.textContent = `Selamat Datang, ${displayName}! 👋`;
    }
    
    // Update user profile in sidebar
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    
    if (userName && session.username) {
        const displayName = session.username.charAt(0).toUpperCase() + session.username.slice(1);
        userName.textContent = displayName;
    }
    
    if (userRole && session.role) {
        const roleNames = {
            'admin': 'Administrator',
            'user': 'User'
        };
        userRole.textContent = roleNames[session.role] || session.role;
    }
    
    // Update user avatar
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && session.username) {
        userAvatar.textContent = session.username.charAt(0).toUpperCase();
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // Filter class items
    const classItems = document.querySelectorAll('.class-item');
    classItems.forEach(item => {
        const className = item.querySelector('.class-name').textContent.toLowerCase();
        const classSubject = item.querySelector('.class-subject').textContent.toLowerCase();
        
        if (className.includes(searchTerm) || classSubject.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function setupAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.stat-card, .content-section').forEach(el => {
        observer.observe(el);
    });
    
    // Add CSS for scroll animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: slideInUp 0.6s ease forwards;
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
}

function setupResponsive() {
    // Mobile menu toggle
    let isMobileMenuOpen = false;
    
    // Create mobile menu button if not exists
    if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-btn')) {
        createMobileMenuButton();
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            // Desktop view
            document.querySelector('.sidebar').classList.remove('open');
            isMobileMenuOpen = false;
        }
    });
    
    function createMobileMenuButton() {
        const btn = document.createElement('button');
        btn.className = 'mobile-menu-btn';
        btn.innerHTML = '<i class="fas fa-bars"></i>';
        btn.style.cssText = `
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 1000;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
            display: none;
        `;
        
        if (window.innerWidth <= 768) {
            btn.style.display = 'block';
        }
        
        btn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            isMobileMenuOpen = !isMobileMenuOpen;
            
            if (isMobileMenuOpen) {
                sidebar.classList.add('open');
                btn.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                sidebar.classList.remove('open');
                btn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
        
        document.body.appendChild(btn);
    }
}

function initializeTooltips() {
    // Simple tooltip implementation
    const elementsWithTooltips = document.querySelectorAll('[data-tooltip]');
    
    elementsWithTooltips.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const element = event.currentTarget;
    const tooltipText = element.getAttribute('data-tooltip');
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
        position: absolute;
        background: #1f2937;
        color: white;
        padding: 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        z-index: 1000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    
    // Show tooltip
    setTimeout(() => {
        tooltip.style.opacity = '1';
    }, 10);
    
    element._tooltip = tooltip;
}

function hideTooltip(event) {
    const element = event.currentTarget;
    if (element._tooltip) {
        element._tooltip.remove();
        element._tooltip = null;
    }
}

function setupRealTimeUpdates() {
    // Simulate real-time updates
    setInterval(() => {
        updateActivityTimestamps();
    }, 60000); // Update every minute
    
    // Simulate new notifications
    setInterval(() => {
        if (Math.random() > 0.8) { // 20% chance every 30 seconds
            simulateNewActivity();
        }
    }, 30000);
}

function updateActivityTimestamps() {
    const timeElements = document.querySelectorAll('.activity-time');
    timeElements.forEach(element => {
        const currentText = element.textContent;
        if (currentText.includes('menit lalu')) {
            const minutes = parseInt(currentText.match(/\d+/)[0]) + 1;
            element.textContent = `${minutes} menit lalu`;
        } else if (currentText.includes('jam lalu')) {
            // Keep as is for now
        }
    });
}

function simulateNewActivity() {
    const activities = [
        'Tugas baru ditambahkan',
        'Siswa baru bergabung',
        'Nilai quiz diperbarui',
        'Presensi dicatat'
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    showNotification(randomActivity, 'info');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styling
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-size: 0.875rem;
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function animateContentTransition() {
    const mainContent = document.querySelector('.main-content');
    mainContent.style.opacity = '0.7';
    mainContent.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
    }, 200);
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Export functions for potential external use
window.DashboardApp = {
    showNotification,
    handleNavigation,
    formatNumber,
    formatDate,
    formatTime
};


// ===== FINANCIAL DASHBOARD FUNCTIONALITY =====

// Categories for different cashflow types
const categories = {
    income: [
        'Gaji', 'Freelance', 'Investasi', 'Bonus', 'Hadiah', 'Penjualan', 'Lainnya'
    ],
    expense: [
        'Makanan', 'Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Kesehatan', 
        'Pendidikan', 'Tagihan', 'Rumah Tangga', 'Lainnya'
    ],
    debt: [
        'Kartu Kredit', 'Pinjaman Bank', 'Pinjaman Pribadi', 'Cicilan', 'Hutang Usaha', 'Lainnya'
    ],
    save: [
        'Tabungan Reguler', 'Deposito', 'Investasi', 'Dana Darurat', 'Rencana Masa Depan', 'Lainnya'
    ]
};

// Global variables
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    // Hide all page contents
    const pageContents = document.querySelectorAll('.page-content');
    pageContents.forEach(content => {
        content.style.display = 'none';
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId + '-content');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update navigation active state
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page-specific data
    switch(pageId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'entry':
            initializeEntryForm();
            break;
        case 'settings':
            initializeSettings();
            break;
        case 'income':
            loadTransactionsByType('income');
            break;
        case 'expense':
            loadTransactionsByType('expense');
            break;
        case 'debts':
            loadTransactionsByType('debt');
            break;
        case 'save':
            loadTransactionsByType('save');
            break;
    }
}

// ===== ENTRY FORM FUNCTIONALITY =====
function initializeEntryForm() {
    const cashflowSelect = document.getElementById('cashflowType');
    const categorySelect = document.getElementById('category');
    const dateInput = document.getElementById('transactionDate');
    
    // Set today's date as default
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    // Handle cashflow type change
    if (cashflowSelect) {
        cashflowSelect.addEventListener('change', function() {
            updateCategoryOptions(this.value);
        });
    }
    
    // Handle form submission
    const entryForm = document.getElementById('entryForm');
    if (entryForm) {
        entryForm.addEventListener('submit', handleEntrySubmit);
    }
}

function updateCategoryOptions(cashflowType) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    // Clear existing options
    categorySelect.innerHTML = '<option value="">Pilih kategori</option>';
    
    if (cashflowType && categories[cashflowType]) {
        categories[cashflowType].forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
}

function handleEntrySubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const transaction = {
        id: Date.now().toString(),
        type: formData.get('cashflowType'),
        date: formData.get('transactionDate'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        description: formData.get('description') || '',
        createdAt: new Date().toISOString(),
        userId: currentUser.username || 'anto'
    };
    
    // Validate transaction
    if (!transaction.type || !transaction.date || !transaction.category || !transaction.amount) {
        showNotification('Mohon lengkapi semua field yang wajib diisi', 'error');
        return;
    }
    
    // Add transaction to storage
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Show success message
    showNotification('Transaksi berhasil disimpan!', 'success');
    
    // Reset form
    resetEntryForm();
    
    // Update dashboard if visible
    loadDashboardData();
}

function resetEntryForm() {
    const form = document.getElementById('entryForm');
    if (form) {
        form.reset();
        document.getElementById('transactionDate').valueAsDate = new Date();
        updateCategoryOptions('');
    }
}

// ===== DASHBOARD DATA LOADING =====
function loadDashboardData() {
    updateStatistics();
    loadRecentTransactions();
}

function updateStatistics() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
    });
    
    const stats = {
        income: monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        debt: monthlyTransactions.filter(t => t.type === 'debt').reduce((sum, t) => sum + t.amount, 0),
        save: monthlyTransactions.filter(t => t.type === 'save').reduce((sum, t) => sum + t.amount, 0)
    };
    
    // Update stat cards
    updateStatCard('total-income', stats.income);
    updateStatCard('total-expense', stats.expense);
    updateStatCard('total-debts', stats.debt);
    updateStatCard('total-save', stats.save);
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = formatCurrency(value);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function loadRecentTransactions() {
    const recentTransactionsContainer = document.getElementById('recent-transactions');
    if (!recentTransactionsContainer) return;
    
    const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentTransactions.length === 0) {
        recentTransactionsContainer.innerHTML = `
            <div class="empty-state">
                <p>Belum ada transaksi. <a href="#" onclick="showPage('entry')">Tambah transaksi pertama</a></p>
            </div>
        `;
        return;
    }
    
    recentTransactionsContainer.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas fa-${getTransactionIcon(transaction.type)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.category}</h4>
                    <p>${transaction.description || 'Tidak ada deskripsi'}</p>
                    <p>${formatDate(transaction.date)}</p>
                </div>
            </div>
            <div class="transaction-amount ${transaction.type === 'income' || transaction.type === 'save' ? 'positive' : 'negative'}">
                ${transaction.type === 'expense' || transaction.type === 'debt' ? '-' : '+'}${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

function getTransactionIcon(type) {
    const icons = {
        income: 'arrow-up',
        expense: 'arrow-down',
        debt: 'credit-card',
        save: 'piggy-bank'
    };
    return icons[type] || 'circle';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// ===== TRANSACTION PAGES =====
function loadTransactionsByType(type) {
    const container = document.getElementById(`${type}-list`);
    if (!container) return;
    
    const typeTransactions = transactions.filter(t => t.type === type);
    
    if (typeTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Belum ada transaksi ${type}. <a href="#" onclick="showPage('entry')">Tambah transaksi</a></p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = typeTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas fa-${getTransactionIcon(transaction.type)}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.category}</h4>
                        <p>${transaction.description || 'Tidak ada deskripsi'}</p>
                        <p>${formatDate(transaction.date)}</p>
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type === 'income' || transaction.type === 'save' ? 'positive' : 'negative'}">
                    ${formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
}

// ===== SETTINGS FUNCTIONALITY =====
function initializeSettings() {
    setupSettingsNavigation();
    loadUserSettings();
    checkAdminAccess();
}

function setupSettingsNavigation() {
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    settingsNavItems.forEach(item => {
        item.addEventListener('click', function() {
            const settingType = this.dataset.setting;
            showSettingPanel(settingType);
        });
    });
}

function showSettingPanel(settingType) {
    // Hide all panels
    const panels = document.querySelectorAll('.setting-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Show selected panel
    const targetPanel = document.getElementById(`${settingType}-settings`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    
    // Update navigation active state
    const navItems = document.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-setting="${settingType}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

function checkAdminAccess() {
    const userRole = currentUser.role || 'user';
    const adminOnlyElements = document.querySelectorAll('#users-nav, #security-nav');
    
    adminOnlyElements.forEach(element => {
        if (userRole === 'admin') {
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    });
    
    // Load users list if admin
    if (userRole === 'admin') {
        loadUsersList();
    }
}

function loadUserSettings() {
    const settings = JSON.parse(localStorage.getItem('userSettings')) || {};
    
    // Load account settings
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    
    if (fullNameInput) fullNameInput.value = settings.fullName || currentUser.fullName || 'Anto Sihombing';
    if (emailInput) emailInput.value = settings.email || currentUser.email || 'anto@example.com';
    if (usernameInput) usernameInput.value = settings.username || currentUser.username || 'anto';
    
    // Load UI settings
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    const currentTheme = settings.theme || 'light';
    themeInputs.forEach(input => {
        if (input.value === currentTheme) {
            input.checked = true;
        }
    });
    
    // Load other settings
    const settingsMap = {
        'fontSize': settings.fontSize || 'medium',
        'sidebarPosition': settings.sidebarPosition || 'left',
        'language': settings.language || 'id',
        'timezone': settings.timezone || 'Asia/Jakarta',
        'dateFormat': settings.dateFormat || 'dd/mm/yyyy',
        'currency': settings.currency || 'IDR',
        'defaultPage': settings.defaultPage || 'dashboard'
    };
    
    Object.entries(settingsMap).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
            element.value = value;
        }
    });
    
    // Load toggle settings
    const toggleSettings = {
        'twoFA': settings.twoFA || false,
        'emailTransactions': settings.emailTransactions !== false,
        'emailReports': settings.emailReports !== false,
        'emailReminders': settings.emailReminders !== false,
        'pushNotifications': settings.pushNotifications || false,
        'googleLogin': settings.googleLogin || false,
        'githubLogin': settings.githubLogin || false,
        'analyticsConsent': settings.analyticsConsent !== false,
        'marketingConsent': settings.marketingConsent || false
    };
    
    Object.entries(toggleSettings).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
            element.checked = value;
        }
    });
}

function loadUsersList() {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    // Simulated users data
    const users = JSON.parse(localStorage.getItem('systemUsers')) || [
        { id: 1, name: 'Anto Sihombing', email: 'anto@example.com', role: 'admin', status: 'active' },
        { id: 2, name: 'Budi Santoso', email: 'budi@example.com', role: 'user', status: 'active' },
        { id: 3, name: 'Siti Nurhaliza', email: 'siti@example.com', role: 'user', status: 'inactive' }
    ];
    
    usersList.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>
                <select onchange="updateUserRole(${user.id}, this.value)">
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                </select>
            </td>
            <td>
                <span class="status-badge ${user.status}">${user.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
            </td>
            <td>
                <button class="btn-secondary" onclick="editUser(${user.id})">Edit</button>
                <button class="btn-danger" onclick="deleteUser(${user.id})">Hapus</button>
            </td>
        </tr>
    `).join('');
}

// ===== SETTINGS ACTIONS =====
function updateUserRole(userId, newRole) {
    const users = JSON.parse(localStorage.getItem('systemUsers')) || [];
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].role = newRole;
        localStorage.setItem('systemUsers', JSON.stringify(users));
        showNotification(`Role pengguna berhasil diubah menjadi ${newRole}`, 'success');
    }
}

function editUser(userId) {
    showNotification('Fitur edit pengguna akan segera tersedia', 'info');
}

function deleteUser(userId) {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
        const users = JSON.parse(localStorage.getItem('systemUsers')) || [];
        const filteredUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('systemUsers', JSON.stringify(filteredUsers));
        loadUsersList();
        showNotification('Pengguna berhasil dihapus', 'success');
    }
}

// ===== THEME HANDLING =====
function handleThemeChange() {
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    themeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.checked) {
                applyTheme(this.value);
                saveUserSetting('theme', this.value);
            }
        });
    });
}

function applyTheme(theme) {
    const body = document.body;
    if (theme === 'dark') {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

// ===== SETTINGS SAVE FUNCTIONS =====
function saveUserSetting(key, value) {
    const settings = JSON.parse(localStorage.getItem('userSettings')) || {};
    settings[key] = value;
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function saveAllSettings() {
    const settings = {};
    
    // Collect all form values
    const inputs = document.querySelectorAll('#settings-content input, #settings-content select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            settings[input.id] = input.checked;
        } else if (input.type === 'radio' && input.checked) {
            settings[input.name] = input.value;
        } else if (input.type !== 'radio') {
            settings[input.id] = input.value;
        }
    });
    
    localStorage.setItem('userSettings', JSON.stringify(settings));
    showNotification('Pengaturan berhasil disimpan', 'success');
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// ===== ENHANCED INITIALIZATION =====
function initializeDashboard() {
    // Check user authentication
    checkUserAuthentication();
    
    // Update user info display
    updateUserInfo();
    
    // Setup navigation
    setupNavigation();
    
    // Setup logout functionality
    setupLogout();
    
    // Initialize mobile menu
    initializeMobileMenu();
    
    // Load initial data
    loadDashboardData();
    
    // Setup theme handling
    handleThemeChange();
    
    // Apply saved theme
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    if (savedSettings.theme) {
        applyTheme(savedSettings.theme);
    }
    
    // Setup auto-save for settings
    setupSettingsAutoSave();
    
    console.log('Financial Dashboard initialized successfully');
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.dataset.page;
            showPage(pageId);
        });
    });
    
    // Set dashboard as default active page
    showPage('dashboard');
}

function setupSettingsAutoSave() {
    // Auto-save settings when changed
    const settingsInputs = document.querySelectorAll('#settings-content input, #settings-content select');
    settingsInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.type === 'checkbox') {
                saveUserSetting(this.id, this.checked);
            } else if (this.type === 'radio' && this.checked) {
                saveUserSetting(this.name, this.value);
                if (this.name === 'theme') {
                    applyTheme(this.value);
                }
            } else if (this.type !== 'radio') {
                saveUserSetting(this.id, this.value);
            }
        });
    });
}

// ===== UTILITY FUNCTIONS =====
function exportData() {
    const data = {
        transactions: transactions,
        settings: JSON.parse(localStorage.getItem('userSettings')) || {},
        user: currentUser,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Data berhasil diekspor', 'success');
}

function deleteAccount() {
    if (confirm('Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.')) {
        if (confirm('Konfirmasi sekali lagi: Semua data akan dihapus permanen.')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);

