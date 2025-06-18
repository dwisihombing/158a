// Enhanced Financial Dashboard with Firebase Integration

// Application State
let currentUser = null;
let currentPage = 'dashboard';
let transactions = [];
let users = [];

// Categories for different cashflow types
const CATEGORIES = {
    income: ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Hadiah', 'Penjualan', 'Lainnya'],
    expense: ['Makanan', 'Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Tagihan', 'Rumah Tangga', 'Lainnya'],
    debt: ['Kartu Kredit', 'Pinjaman Bank', 'Pinjaman Pribadi', 'Cicilan', 'Hutang Usaha', 'Lainnya'],
    save: ['Tabungan Reguler', 'Deposito', 'Investasi', 'Dana Darurat', 'Rencana Masa Depan', 'Lainnya']
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    // Hapus checkAuthentication() - biarkan onAuthStateChanged yang handle
});

function initializeApp() {
    console.log('Financial Dashboard initialized');
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Initialize Firebase Auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User is authenticated:', user);
            loadUserData(user);
            loadTransactions();
            loadUsers();
        } else {
            console.log('User is not authenticated');
            // Delay sedikit untuk memastikan tidak ada race condition
            setTimeout(() => {
                if (!firebase.auth().currentUser) {
                    redirectToLogin();
                }
            }, 100);
        }
    });
}

function setupEventListeners() {
    // Sidebar navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Profile dropdown
    const userProfileDropdown = document.getElementById('userProfileDropdown');
    if (userProfileDropdown) {
        userProfileDropdown.addEventListener('click', toggleProfileDropdown);
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('profileDropdownMenu');
        const trigger = document.getElementById('userProfileDropdown');
        
        if (dropdown && trigger && !trigger.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Profile dropdown actions
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', handleDropdownAction);
    });
    
    // Entry form
    const entryForm = document.getElementById('entryForm');
    if (entryForm) {
        entryForm.addEventListener('submit', handleEntrySubmit);
    }
    
    // Cashflow type change
    const cashflowType = document.getElementById('cashflowType');
    if (cashflowType) {
        cashflowType.addEventListener('change', updateCategories);
    }
    
    // Reset form button
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('click', resetEntryForm);
    }
    
    // Admin tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    
    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', showAddUserModal);
    }
}

function checkAuthentication() {
    const user = firebase.auth().currentUser;
    if (!user) {
        redirectToLogin();
        return false;
    }
    return true;
}

function redirectToLogin() {
    window.location.href = './login.html';
}

async function loadUserData(user) {
    try {
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            role: localStorage.getItem('userRole') || 'user'
        };
        
        // Try to get user data from Firestore
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser = { ...currentUser, ...userData };
        }
        
        updateUserInterface();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback to localStorage data
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            updateUserInterface();
        }
    }
}

function updateUserInterface() {
    if (!currentUser) return;
    
    // Update user info in header
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userNameLarge = document.getElementById('userNameLarge');
    const userEmail = document.getElementById('userEmail');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (userName) userName.textContent = currentUser.displayName;
    if (userRole) userRole.textContent = currentUser.role;
    if (userNameLarge) userNameLarge.textContent = currentUser.displayName;
    if (userEmail) userEmail.textContent = currentUser.email;
    if (welcomeMessage) welcomeMessage.textContent = `Selamat Datang, ${currentUser.displayName}! 👋`;
    
    // Show/hide admin menu based on role
    const adminMenu = document.querySelector('.admin-only');
    if (adminMenu) {
        adminMenu.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    }
    
    // Update role switcher
    updateRoleSwitcher();
}

function updateRoleSwitcher() {
    const roleSwitcher = document.getElementById('roleSwitcher');
    if (!roleSwitcher || !currentUser) return;
    
    // For now, we'll allow users to switch between available roles
    // In a real app, this would be based on user permissions from the database
    const availableRoles = ['user', 'admin'];
    
    roleSwitcher.innerHTML = '';
    
    availableRoles.forEach(role => {
        const roleOption = document.createElement('div');
        roleOption.className = `role-option ${currentUser.role === role ? 'active' : ''}`;
        roleOption.innerHTML = `
            <input type="radio" name="role" value="${role}" ${currentUser.role === role ? 'checked' : ''}>
            <label>${role === 'admin' ? 'Administrator' : 'User'}</label>
        `;
        
        roleOption.addEventListener('click', () => switchRole(role));
        roleSwitcher.appendChild(roleOption);
    });
}

async function switchRole(newRole) {
    if (!currentUser || currentUser.role === newRole) return;
    
    try {
        currentUser.role = newRole;
        localStorage.setItem('userRole', newRole);
        
        // Update in Firestore
        const db = firebase.firestore();
        await db.collection('users').doc(currentUser.uid).update({
            role: newRole
        });
        
        updateUserInterface();
        showNotification('success', `Peran berhasil diubah ke ${newRole}`);
        
    } catch (error) {
        console.error('Error switching role:', error);
        showNotification('error', 'Gagal mengubah peran');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const container = document.querySelector('.container');
    
    if (sidebar && container) {
        sidebar.classList.toggle('collapsed');
        container.classList.toggle('sidebar-collapsed');
    }
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdownMenu');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function handleDropdownAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    
    switch (action) {
        case 'settings':
            showPage('settings');
            break;
        case 'preferences':
            showPreferencesModal();
            break;
        case 'logout':
            handleLogout();
            break;
    }
    
    // Close dropdown
    const dropdown = document.getElementById('profileDropdownMenu');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

function handleNavigation(event) {
    event.preventDefault();
    const page = event.currentTarget.dataset.page;
    if (page) {
        showPage(page);
    }
}

function showPage(pageId) {
    // Update active nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`)?.closest('.nav-item');
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Update page content
    const pageContents = document.querySelectorAll('.page-content');
    pageContents.forEach(content => content.classList.remove('active'));
    
    const targetContent = document.getElementById(`${pageId}-content`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const titles = {
            dashboard: 'Dashboard',
            entry: 'Entry Transaksi',
            income: 'Income',
            expense: 'Expense',
            debts: 'Debts',
            save: 'Save',
            admin: 'Admin Panel'
        };
        pageTitle.textContent = titles[pageId] || 'Dashboard';
    }
    
    currentPage = pageId;
    
    // Load page-specific data
    switch (pageId) {
        case 'dashboard':
            updateDashboardStats();
            loadRecentTransactions();
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
        case 'admin':
            loadUsers();
            break;
    }
}

function updateCategories() {
    const cashflowType = document.getElementById('cashflowType').value;
    const categorySelect = document.getElementById('category');
    
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="">Pilih kategori</option>';
    
    if (cashflowType && CATEGORIES[cashflowType]) {
        CATEGORIES[cashflowType].forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
}

async function handleEntrySubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const transaction = {
        id: Date.now().toString(),
        type: formData.get('cashflowType'),
        date: formData.get('transactionDate'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        description: formData.get('description'),
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
    };
    
    try {
        // Save to Firestore
        const db = firebase.firestore();
        await db.collection('transactions').add(transaction);
        
        // Add to local array
        transactions.push(transaction);
        
        showNotification('success', 'Transaksi berhasil disimpan!');
        resetEntryForm();
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        showNotification('error', 'Gagal menyimpan transaksi');
    }
}

function resetEntryForm() {
    const form = document.getElementById('entryForm');
    if (form) {
        form.reset();
        
        // Reset date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('transactionDate');
        if (dateInput) {
            dateInput.value = today;
        }
        
        // Clear categories
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Pilih kategori</option>';
        }
    }
}

async function loadTransactions() {
    if (!currentUser) return;
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        transactions = [];
        snapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        
        updateDashboardStats();
        loadRecentTransactions();
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        // Fallback to localStorage
        const storedTransactions = localStorage.getItem('transactions');
        if (storedTransactions) {
            transactions = JSON.parse(storedTransactions);
            updateDashboardStats();
            loadRecentTransactions();
        }
    }
}

function updateDashboardStats() {
    const stats = {
        income: 0,
        expense: 0,
        debt: 0,
        save: 0
    };
    
    transactions.forEach(transaction => {
        if (stats.hasOwnProperty(transaction.type)) {
            stats[transaction.type] += transaction.amount;
        }
    });
    
    // Update UI
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    const totalDebts = document.getElementById('totalDebts');
    const totalSave = document.getElementById('totalSave');
    
    if (totalIncome) totalIncome.textContent = formatCurrency(stats.income);
    if (totalExpense) totalExpense.textContent = formatCurrency(stats.expense);
    if (totalDebts) totalDebts.textContent = formatCurrency(stats.debt);
    if (totalSave) totalSave.textContent = formatCurrency(stats.save);
}

function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    const recentTransactions = transactions.slice(0, 5);
    
    if (recentTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
                <a href="#" class="btn btn-primary" data-page="entry">Tambah Transaksi</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-icon ${transaction.type}">
                <i class="fas ${getTransactionIcon(transaction.type)}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">${transaction.category}</div>
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

function loadTransactionsByType(type) {
    const container = document.getElementById(`${type}Transactions`);
    if (!container) return;
    
    const filteredTransactions = transactions.filter(t => t.type === type);
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas ${getTransactionIcon(type)}"></i>
                <p>Belum ada transaksi ${type}</p>
                <a href="#" class="btn btn-primary" data-page="entry">Tambah Transaksi</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="transactions-list">
            ${filteredTransactions.map(transaction => `
                <div class="transaction-item">
                    <div class="transaction-icon ${transaction.type}">
                        <i class="fas ${getTransactionIcon(transaction.type)}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-title">${transaction.category}</div>
                        <div class="transaction-description">${transaction.description}</div>
                        <div class="transaction-date">${formatDate(transaction.date)}</div>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${formatCurrency(transaction.amount)}
                    </div>
                    <div class="transaction-actions">
                        <button class="btn-icon" onclick="editTransaction('${transaction.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteTransaction('${transaction.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadUsers() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('users').get();
        
        users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        updateUsersTable();
        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function updateUsersTable() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Belum ada pengguna</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="users-table">
            <div class="table-header">
                <div class="table-cell">Nama</div>
                <div class="table-cell">Email</div>
                <div class="table-cell">Peran</div>
                <div class="table-cell">Bergabung</div>
                <div class="table-cell">Aksi</div>
            </div>
            ${users.map(user => `
                <div class="table-row">
                    <div class="table-cell">
                        <div class="user-info">
                            <div class="user-avatar-small">${user.displayName?.charAt(0) || 'U'}</div>
                            <span>${user.displayName || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="table-cell">${user.email}</div>
                    <div class="table-cell">
                        <span class="role-badge ${user.role}">${user.role}</span>
                    </div>
                    <div class="table-cell">${formatDate(user.createdAt)}</div>
                    <div class="table-cell">
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="editUser('${user.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" onclick="deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function handleTabSwitch(event) {
    const tabId = event.target.dataset.tab;
    
    // Update active tab button
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update active tab pane
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    const targetPane = document.getElementById(`${tabId}-tab`);
    if (targetPane) {
        targetPane.classList.add('active');
    }
}

async function handleLogout() {
    try {
        await firebase.auth().signOut();
        
        // Clear local storage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        sessionStorage.clear();
        
        console.log('User logged out');
        
        // Redirect to login page
        window.location.href = './login.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('error', 'Terjadi kesalahan saat logout.');
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getTransactionIcon(type) {
    const icons = {
        income: 'fa-arrow-up',
        expense: 'fa-arrow-down',
        debt: 'fa-credit-card',
        save: 'fa-piggy-bank'
    };
    return icons[type] || 'fa-circle';
}

function showNotification(type, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

function showAddUserModal() {
    // Implementation for add user modal
    showNotification('info', 'Fitur tambah pengguna akan segera tersedia');
}

function showPreferencesModal() {
    // Implementation for preferences modal
    showNotification('info', 'Fitur preferensi akan segera tersedia');
}

function editTransaction(id) {
    // Implementation for edit transaction
    showNotification('info', 'Fitur edit transaksi akan segera tersedia');
}

function deleteTransaction(id) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        // Implementation for delete transaction
        showNotification('info', 'Fitur hapus transaksi akan segera tersedia');
    }
}

function editUser(id) {
    // Implementation for edit user
    showNotification('info', 'Fitur edit pengguna akan segera tersedia');
}

function deleteUser(id) {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
        // Implementation for delete user
        showNotification('info', 'Fitur hapus pengguna akan segera tersedia');
    }
}

// Export functions for global access
window.handleLogout = handleLogout;
window.showPage = showPage;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editUser = editUser;
window.deleteUser = deleteUser;


// Enhanced Admin Functions and Firestore Integration

// Admin-specific functions
async function createUser(userData) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat menambah pengguna.');
        return;
    }
    
    try {
        // Create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            userData.email, 
            userData.password
        );
        
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: userData.displayName
        });
        
        // Save additional user data to Firestore
        const db = firebase.firestore();
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.uid,
            isActive: true
        });
        
        showNotification('success', 'Pengguna berhasil ditambahkan!');
        loadUsers(); // Refresh users list
        
    } catch (error) {
        console.error('Error creating user:', error);
        
        let errorMessage = 'Gagal menambahkan pengguna.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email sudah terdaftar.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password terlalu lemah.';
                break;
        }
        
        showNotification('error', errorMessage);
    }
}

async function updateUserRole(userId, newRole) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat mengubah peran pengguna.');
        return;
    }
    
    try {
        const db = firebase.firestore();
        await db.collection('users').doc(userId).update({
            role: newRole,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        });
        
        showNotification('success', 'Peran pengguna berhasil diubah!');
        loadUsers(); // Refresh users list
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification('error', 'Gagal mengubah peran pengguna.');
    }
}

async function deleteUserAccount(userId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat menghapus pengguna.');
        return;
    }
    
    if (userId === currentUser.uid) {
        showNotification('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Soft delete - mark as inactive instead of actually deleting
        await db.collection('users').doc(userId).update({
            isActive: false,
            deletedAt: new Date().toISOString(),
            deletedBy: currentUser.uid
        });
        
        showNotification('success', 'Pengguna berhasil dinonaktifkan!');
        loadUsers(); // Refresh users list
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('error', 'Gagal menghapus pengguna.');
    }
}

async function exportUserData() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat mengekspor data.');
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        const usersData = [];
        usersSnapshot.forEach(doc => {
            usersData.push({ id: doc.id, ...doc.data() });
        });
        
        // Get all transactions
        const transactionsSnapshot = await db.collection('transactions').get();
        const transactionsData = [];
        transactionsSnapshot.forEach(doc => {
            transactionsData.push({ id: doc.id, ...doc.data() });
        });
        
        const exportData = {
            users: usersData,
            transactions: transactionsData,
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser.uid
        };
        
        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `keuangan-158a-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        showNotification('success', 'Data berhasil diekspor!');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('error', 'Gagal mengekspor data.');
    }
}

async function resetAllData() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat mereset data.');
        return;
    }
    
    const confirmation = prompt('Ketik "RESET" untuk mengkonfirmasi penghapusan semua data transaksi:');
    if (confirmation !== 'RESET') {
        showNotification('info', 'Reset data dibatalkan.');
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Get all transactions
        const snapshot = await db.collection('transactions').get();
        
        // Delete all transactions in batches
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Clear local data
        transactions = [];
        localStorage.removeItem('transactions');
        
        // Update UI
        updateDashboardStats();
        loadRecentTransactions();
        
        showNotification('success', 'Semua data transaksi berhasil dihapus!');
        
    } catch (error) {
        console.error('Error resetting data:', error);
        showNotification('error', 'Gagal mereset data.');
    }
}

// Enhanced user management functions
function showAddUserModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat menambah pengguna.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Tambah Pengguna Baru</h2>
                <button class="close-modal" onclick="closeModal(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="addUserForm">
                <div class="form-group">
                    <label for="newUserName">Nama Lengkap</label>
                    <input type="text" id="newUserName" name="displayName" required>
                </div>
                <div class="form-group">
                    <label for="newUserEmail">Email</label>
                    <input type="email" id="newUserEmail" name="email" required>
                </div>
                <div class="form-group">
                    <label for="newUserPassword">Password</label>
                    <input type="password" id="newUserPassword" name="password" minlength="6" required>
                </div>
                <div class="form-group">
                    <label for="newUserRole">Peran</label>
                    <select id="newUserRole" name="role" required>
                        <option value="">Pilih peran</option>
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Batal</button>
                    <button type="submit" class="btn btn-primary">Tambah Pengguna</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    const form = modal.querySelector('#addUserForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const userData = {
            displayName: formData.get('displayName'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role')
        };
        
        await createUser(userData);
        closeModal(modal.querySelector('.close-modal'));
    });
}

function editUser(userId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat mengedit pengguna.');
        return;
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('error', 'Pengguna tidak ditemukan.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Pengguna</h2>
                <button class="close-modal" onclick="closeModal(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="editUserForm">
                <div class="form-group">
                    <label for="editUserName">Nama Lengkap</label>
                    <input type="text" id="editUserName" name="displayName" value="${user.displayName || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editUserEmail">Email</label>
                    <input type="email" id="editUserEmail" name="email" value="${user.email}" readonly>
                    <small>Email tidak dapat diubah</small>
                </div>
                <div class="form-group">
                    <label for="editUserRole">Peran</label>
                    <select id="editUserRole" name="role" required>
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="isActive" ${user.isActive !== false ? 'checked' : ''}>
                        Akun Aktif
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Batal</button>
                    <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    const form = modal.querySelector('#editUserForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updates = {
            displayName: formData.get('displayName'),
            role: formData.get('role'),
            isActive: formData.has('isActive'),
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        };
        
        try {
            const db = firebase.firestore();
            await db.collection('users').doc(userId).update(updates);
            
            showNotification('success', 'Pengguna berhasil diperbarui!');
            loadUsers();
            closeModal(modal.querySelector('.close-modal'));
            
        } catch (error) {
            console.error('Error updating user:', error);
            showNotification('error', 'Gagal memperbarui pengguna.');
        }
    });
}

function deleteUser(userId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('error', 'Akses ditolak. Hanya admin yang dapat menghapus pengguna.');
        return;
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('error', 'Pengguna tidak ditemukan.');
        return;
    }
    
    if (userId === currentUser.uid) {
        showNotification('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        return;
    }
    
    const confirmation = confirm(`Apakah Anda yakin ingin menghapus pengguna "${user.displayName || user.email}"?`);
    if (confirmation) {
        deleteUserAccount(userId);
    }
}

function closeModal(element) {
    const modal = element.closest('.modal');
    if (modal) {
        modal.remove();
    }
}

// Enhanced transaction management
async function editTransaction(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
        showNotification('error', 'Transaksi tidak ditemukan.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Transaksi</h2>
                <button class="close-modal" onclick="closeModal(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="editTransactionForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="editCashflowType">Jenis Cashflow</label>
                        <select id="editCashflowType" name="type" required>
                            <option value="income" ${transaction.type === 'income' ? 'selected' : ''}>Income</option>
                            <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Expense</option>
                            <option value="debt" ${transaction.type === 'debt' ? 'selected' : ''}>Debt</option>
                            <option value="save" ${transaction.type === 'save' ? 'selected' : ''}>Save</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editTransactionDate">Tanggal</label>
                        <input type="date" id="editTransactionDate" name="date" value="${transaction.date}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editCategory">Kategori</label>
                        <select id="editCategory" name="category" required>
                            <option value="${transaction.category}" selected>${transaction.category}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editAmount">Jumlah (Rp)</label>
                        <input type="number" id="editAmount" name="amount" value="${transaction.amount}" min="0" step="1000" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="editDescription">Deskripsi</label>
                    <textarea id="editDescription" name="description" rows="3">${transaction.description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Batal</button>
                    <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Populate categories based on current type
    const typeSelect = modal.querySelector('#editCashflowType');
    const categorySelect = modal.querySelector('#editCategory');
    
    function updateEditCategories() {
        const type = typeSelect.value;
        categorySelect.innerHTML = '';
        
        if (CATEGORIES[type]) {
            CATEGORIES[type].forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                option.selected = category === transaction.category;
                categorySelect.appendChild(option);
            });
        }
    }
    
    updateEditCategories();
    typeSelect.addEventListener('change', updateEditCategories);
    
    // Handle form submission
    const form = modal.querySelector('#editTransactionForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updates = {
            type: formData.get('type'),
            date: formData.get('date'),
            category: formData.get('category'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            updatedAt: new Date().toISOString()
        };
        
        try {
            const db = firebase.firestore();
            await db.collection('transactions').doc(transactionId).update(updates);
            
            // Update local array
            const index = transactions.findIndex(t => t.id === transactionId);
            if (index !== -1) {
                transactions[index] = { ...transactions[index], ...updates };
            }
            
            showNotification('success', 'Transaksi berhasil diperbarui!');
            updateDashboardStats();
            loadRecentTransactions();
            
            // Refresh current page if viewing specific transaction type
            if (currentPage !== 'dashboard' && currentPage !== 'entry') {
                loadTransactionsByType(currentPage);
            }
            
            closeModal(modal.querySelector('.close-modal'));
            
        } catch (error) {
            console.error('Error updating transaction:', error);
            showNotification('error', 'Gagal memperbarui transaksi.');
        }
    });
}

async function deleteTransaction(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
        showNotification('error', 'Transaksi tidak ditemukan.');
        return;
    }
    
    const confirmation = confirm(`Apakah Anda yakin ingin menghapus transaksi "${transaction.category}" sebesar ${formatCurrency(transaction.amount)}?`);
    if (!confirmation) return;
    
    try {
        const db = firebase.firestore();
        await db.collection('transactions').doc(transactionId).delete();
        
        // Remove from local array
        transactions = transactions.filter(t => t.id !== transactionId);
        
        showNotification('success', 'Transaksi berhasil dihapus!');
        updateDashboardStats();
        loadRecentTransactions();
        
        // Refresh current page if viewing specific transaction type
        if (currentPage !== 'dashboard' && currentPage !== 'entry') {
            loadTransactionsByType(currentPage);
        }
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification('error', 'Gagal menghapus transaksi.');
    }
}

// System settings functions
function showPreferencesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Preferensi</h2>
                <button class="close-modal" onclick="closeModal(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="preferences-content">
                <div class="preference-section">
                    <h3>Tampilan</h3>
                    <div class="preference-item">
                        <label>
                            <input type="checkbox" id="darkMode">
                            Mode Gelap
                        </label>
                    </div>
                    <div class="preference-item">
                        <label>
                            <input type="checkbox" id="compactMode">
                            Mode Kompak
                        </label>
                    </div>
                </div>
                <div class="preference-section">
                    <h3>Notifikasi</h3>
                    <div class="preference-item">
                        <label>
                            <input type="checkbox" id="emailNotifications" checked>
                            Notifikasi Email
                        </label>
                    </div>
                    <div class="preference-item">
                        <label>
                            <input type="checkbox" id="pushNotifications" checked>
                            Notifikasi Push
                        </label>
                    </div>
                </div>
                <div class="preference-section">
                    <h3>Mata Uang</h3>
                    <div class="preference-item">
                        <label for="currency">Mata Uang Default</label>
                        <select id="currency">
                            <option value="IDR" selected>Rupiah (IDR)</option>
                            <option value="USD">US Dollar (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Batal</button>
                <button type="button" class="btn btn-primary" onclick="savePreferences()">Simpan</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load current preferences
    loadPreferences();
}

function loadPreferences() {
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    
    const darkMode = document.getElementById('darkMode');
    const compactMode = document.getElementById('compactMode');
    const emailNotifications = document.getElementById('emailNotifications');
    const pushNotifications = document.getElementById('pushNotifications');
    const currency = document.getElementById('currency');
    
    if (darkMode) darkMode.checked = preferences.darkMode || false;
    if (compactMode) compactMode.checked = preferences.compactMode || false;
    if (emailNotifications) emailNotifications.checked = preferences.emailNotifications !== false;
    if (pushNotifications) pushNotifications.checked = preferences.pushNotifications !== false;
    if (currency) currency.value = preferences.currency || 'IDR';
}

function savePreferences() {
    const preferences = {
        darkMode: document.getElementById('darkMode')?.checked || false,
        compactMode: document.getElementById('compactMode')?.checked || false,
        emailNotifications: document.getElementById('emailNotifications')?.checked || false,
        pushNotifications: document.getElementById('pushNotifications')?.checked || false,
        currency: document.getElementById('currency')?.value || 'IDR'
    };
    
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    
    // Apply preferences
    applyPreferences(preferences);
    
    showNotification('success', 'Preferensi berhasil disimpan!');
    closeModal(document.querySelector('.modal .close-modal'));
}

function applyPreferences(preferences) {
    // Apply dark mode
    if (preferences.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Apply compact mode
    if (preferences.compactMode) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }
}

// Initialize preferences on load
document.addEventListener('DOMContentLoaded', function() {
    const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    applyPreferences(preferences);
});

// Update global functions
window.createUser = createUser;
window.updateUserRole = updateUserRole;
window.deleteUserAccount = deleteUserAccount;
window.exportUserData = exportUserData;
window.resetAllData = resetAllData;
window.closeModal = closeModal;
window.savePreferences = savePreferences;

