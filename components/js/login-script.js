// Login System JavaScript with Security and Role Management

// User Database (In production, this would be server-side)
const USER_DATABASE = {
    'anto': {
        password: 'anto', // In production, this would be hashed
        roles: ['admin', 'user'],
        profile: {
            name: 'Anto',
            email: 'anto@kelasguru.com',
            lastLogin: null,
            loginAttempts: 0,
            isLocked: false,
            lockUntil: null
        }
    }
};

// Security Configuration
const SECURITY_CONFIG = {
    maxLoginAttempts: 3,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    passwordMinLength: 4,
    enableBruteForceProtection: true
};

// Role Permissions
const ROLE_PERMISSIONS = {
    admin: {
        name: 'Administrator',
        description: 'Akses penuh ke semua fitur sistem',
        permissions: [
            'manage_users',
            'manage_classes',
            'view_reports',
            'system_settings',
            'manage_content',
            'view_analytics'
        ],
        dashboardUrl: '..//pages/index.html'
    },
    user: {
        name: 'User',
        description: 'Akses terbatas untuk pengguna standar',
        permissions: [
            'view_classes',
            'submit_assignments',
            'view_grades',
            'update_profile'
        ],
        dashboardUrl: '..//pages/index.html'
    }
};

// Application State
let currentUser = null;
let sessionTimer = null;
let loginAttempts = 0;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const roleSelect = document.getElementById('role');
const togglePasswordBtn = document.getElementById('togglePassword');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const roleInfoPanel = document.getElementById('roleInfoPanel');
const closePanelBtn = document.getElementById('closePanelBtn');

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkExistingSession();
    setupSecurityFeatures();
});

function initializeApp() {
    console.log('Login System initialized');
    
    // Check for locked accounts
    checkAccountLockStatus();
    
    // Setup form validation
    setupFormValidation();
    
    // Load saved preferences
    loadUserPreferences();
    
    // Setup role information
    populateRoleInfo();
}

function setupEventListeners() {
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Password toggle
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    
    // Role selection change
    roleSelect.addEventListener('change', handleRoleChange);
    
    // Close role info panel
    closePanelBtn.addEventListener('click', closeRoleInfoPanel);
    
    // Input validation
    usernameInput.addEventListener('input', validateUsername);
    passwordInput.addEventListener('input', validatePassword);
    
    // Forgot password link
    const forgotPasswordLink = document.querySelector('.forgot-password');
    forgotPasswordLink.addEventListener('click', handleForgotPassword);
    
    // Register link
    const registerLink = document.querySelector('.register-link');
    registerLink.addEventListener('click', handleRegister);
    
    // Remember me checkbox
    const rememberMeCheckbox = document.getElementById('rememberMe');
    rememberMeCheckbox.addEventListener('change', handleRememberMe);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const selectedRole = roleSelect.value;
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Validate inputs
        if (!validateInputs(username, password, selectedRole)) {
            return;
        }
        
        // Check account lock status
        if (isAccountLocked(username)) {
            throw new Error('Akun terkunci karena terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti.');
        }
        
        // Simulate network delay for realistic experience
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Authenticate user
        const authResult = authenticateUser(username, password, selectedRole);
        
        if (authResult.success) {
            // Reset login attempts
            resetLoginAttempts(username);
            
            // Create session
            createUserSession(authResult.user, selectedRole);
            
            // Show success message
            showSuccessMessage(`Login berhasil! Selamat datang, ${authResult.user.profile.name}`);
            
            // Redirect after delay
            setTimeout(() => {
                redirectToDashboard(selectedRole);
            }, 2000);
            
        } else {
            // Handle failed login
            handleFailedLogin(username, authResult.error);
        }
        
    } catch (error) {
        showErrorMessage(error.message);
    } finally {
        setLoadingState(false);
    }
}

function authenticateUser(username, password, role) {
    const user = USER_DATABASE[username.toLowerCase()];
    
    if (!user) {
        return { success: false, error: 'Username tidak ditemukan' };
    }
    
    if (user.password !== password) {
        return { success: false, error: 'Password salah' };
    }
    
    if (!user.roles.includes(role)) {
        return { success: false, error: 'Anda tidak memiliki akses untuk peran ini' };
    }
    
    // Update last login
    user.profile.lastLogin = new Date().toISOString();
    
    return { success: true, user: user };
}

function createUserSession(user, role) {
    const sessionData = {
        username: Object.keys(USER_DATABASE).find(key => USER_DATABASE[key] === user),
        role: role,
        loginTime: new Date().toISOString(),
        permissions: ROLE_PERMISSIONS[role].permissions
    };
    
    // Store session data
    localStorage.setItem('userSession', JSON.stringify(sessionData));
    sessionStorage.setItem('currentRole', role);
    
    // Set session timeout
    startSessionTimer();
    
    currentUser = sessionData;
    
    console.log('User session created:', sessionData);
}

function handleFailedLogin(username, error) {
    if (SECURITY_CONFIG.enableBruteForceProtection) {
        incrementLoginAttempts(username);
        
        const user = USER_DATABASE[username];
        if (user) {
            user.profile.loginAttempts++;
            
            if (user.profile.loginAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
                lockAccount(username);
                showErrorMessage('Akun terkunci karena terlalu banyak percobaan login yang gagal.');
                return;
            }
        }
    }
    
    const remainingAttempts = SECURITY_CONFIG.maxLoginAttempts - (USER_DATABASE[username]?.profile.loginAttempts || 0);
    showErrorMessage(`${error}. Sisa percobaan: ${remainingAttempts}`);
}

function lockAccount(username) {
    const user = USER_DATABASE[username];
    if (user) {
        user.profile.isLocked = true;
        user.profile.lockUntil = new Date(Date.now() + SECURITY_CONFIG.lockoutDuration).toISOString();
    }
}

function isAccountLocked(username) {
    const user = USER_DATABASE[username];
    if (!user || !user.profile.isLocked) return false;
    
    const lockUntil = new Date(user.profile.lockUntil);
    const now = new Date();
    
    if (now > lockUntil) {
        // Unlock account
        user.profile.isLocked = false;
        user.profile.lockUntil = null;
        user.profile.loginAttempts = 0;
        return false;
    }
    
    return true;
}

function resetLoginAttempts(username) {
    const user = USER_DATABASE[username];
    if (user) {
        user.profile.loginAttempts = 0;
        user.profile.isLocked = false;
        user.profile.lockUntil = null;
    }
}

function incrementLoginAttempts(username) {
    loginAttempts++;
    
    // Add progressive delay for repeated attempts
    if (loginAttempts > 1) {
        const delay = Math.min(loginAttempts * 1000, 5000);
        loginBtn.disabled = true;
        
        setTimeout(() => {
            loginBtn.disabled = false;
        }, delay);
    }
}

function validateInputs(username, password, role) {
    if (!username) {
        showErrorMessage('Username harus diisi');
        usernameInput.focus();
        return false;
    }
    
    if (!password) {
        showErrorMessage('Password harus diisi');
        passwordInput.focus();
        return false;
    }
    
    if (password.length < SECURITY_CONFIG.passwordMinLength) {
        showErrorMessage(`Password minimal ${SECURITY_CONFIG.passwordMinLength} karakter`);
        passwordInput.focus();
        return false;
    }
    
    if (!role) {
        showErrorMessage('Silakan pilih peran Anda');
        roleSelect.focus();
        return false;
    }
    
    return true;
}

function validateUsername() {
    const username = usernameInput.value.trim();
    const inputWrapper = usernameInput.parentElement;
    
    if (username.length > 0 && username.length < 3) {
        inputWrapper.classList.add('error');
        showFieldError(usernameInput, 'Username minimal 3 karakter');
    } else {
        inputWrapper.classList.remove('error');
        hideFieldError(usernameInput);
    }
}

function validatePassword() {
    const password = passwordInput.value;
    const inputWrapper = passwordInput.parentElement;
    
    if (password.length > 0 && password.length < SECURITY_CONFIG.passwordMinLength) {
        inputWrapper.classList.add('error');
        showFieldError(passwordInput, `Password minimal ${SECURITY_CONFIG.passwordMinLength} karakter`);
    } else {
        inputWrapper.classList.remove('error');
        hideFieldError(passwordInput);
    }
}

function showFieldError(input, message) {
    let errorElement = input.parentElement.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.cssText = `
            color: #dc2626;
            font-size: 0.75rem;
            margin-top: 0.25rem;
            display: block;
        `;
        input.parentElement.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

function hideFieldError(input) {
    const errorElement = input.parentElement.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

function togglePasswordVisibility() {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    const icon = togglePasswordBtn.querySelector('i');
    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    
    // Add animation
    togglePasswordBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
        togglePasswordBtn.style.transform = 'scale(1)';
    }, 150);
}

function handleRoleChange() {
    const selectedRole = roleSelect.value;
    
    if (selectedRole && ROLE_PERMISSIONS[selectedRole]) {
        showRoleInfoPanel(selectedRole);
    } else {
        closeRoleInfoPanel();
    }
}

function showRoleInfoPanel(role) {
    const roleInfo = ROLE_PERMISSIONS[role];
    const roleDetails = document.getElementById('roleDetails');
    
    roleDetails.innerHTML = `
        <div class="role-header">
            <h4>${roleInfo.name}</h4>
            <p>${roleInfo.description}</p>
        </div>
        <div class="role-permissions">
            <h5>Hak Akses:</h5>
            <ul>
                ${roleInfo.permissions.map(permission => `
                    <li><i class="fas fa-check"></i> ${formatPermission(permission)}</li>
                `).join('')}
            </ul>
        </div>
    `;
    
    roleInfoPanel.classList.add('show');
}

function closeRoleInfoPanel() {
    roleInfoPanel.classList.remove('show');
}

function formatPermission(permission) {
    const permissionMap = {
        'manage_users': 'Kelola Pengguna',
        'manage_classes': 'Kelola Kelas',
        'view_reports': 'Lihat Laporan',
        'system_settings': 'Pengaturan Sistem',
        'manage_content': 'Kelola Konten',
        'view_analytics': 'Lihat Analitik',
        'view_classes': 'Lihat Kelas',
        'submit_assignments': 'Kirim Tugas',
        'view_grades': 'Lihat Nilai',
        'update_profile': 'Update Profil'
    };
    
    return permissionMap[permission] || permission;
}

function populateRoleInfo() {
    // Add role information to select options
    const adminOption = roleSelect.querySelector('option[value="admin"]');
    const userOption = roleSelect.querySelector('option[value="user"]');
    
    if (adminOption) {
        adminOption.textContent = `${ROLE_PERMISSIONS.admin.name} - ${ROLE_PERMISSIONS.admin.description}`;
    }
    
    if (userOption) {
        userOption.textContent = `${ROLE_PERMISSIONS.user.name} - ${ROLE_PERMISSIONS.user.description}`;
    }
}

function setLoadingState(isLoading) {
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

function showErrorMessage(message) {
    hideMessages();
    document.getElementById('errorText').textContent = message;
    errorMessage.style.display = 'flex';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccessMessage(message) {
    hideMessages();
    document.getElementById('successText').textContent = message;
    successMessage.style.display = 'flex';
}

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function redirectToDashboard(role) {
    const dashboardUrl = ROLE_PERMISSIONS[role].dashboardUrl;
    window.location.href = dashboardUrl;
}

function startSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
    }
    
    sessionTimer = setTimeout(() => {
        handleSessionTimeout();
    }, SECURITY_CONFIG.sessionTimeout);
}

function handleSessionTimeout() {
    alert('Sesi Anda telah berakhir. Silakan login kembali.');
    logout();
}

function logout() {
    // Clear session data
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('currentRole');
    
    // Clear timer
    if (sessionTimer) {
        clearTimeout(sessionTimer);
    }
    
    // Reset form
    loginForm.reset();
    hideMessages();
    
    currentUser = null;
    
    console.log('User logged out');
}

function checkExistingSession() {
    const sessionData = localStorage.getItem('userSession');
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            
            // Check if session is still valid
            if (now - loginTime < SECURITY_CONFIG.sessionTimeout) {
                // Session is valid, redirect to dashboard
                redirectToDashboard(session.role);
                return;
            }
        } catch (error) {
            console.error('Error parsing session data:', error);
        }
        
        // Clear invalid session
        localStorage.removeItem('userSession');
    }
}

function checkAccountLockStatus() {
    // Check all users for expired locks
    Object.keys(USER_DATABASE).forEach(username => {
        if (isAccountLocked(username)) {
            // Account is still locked, don't do anything
        }
    });
}

function setupFormValidation() {
    // Add real-time validation styles
    const style = document.createElement('style');
    style.textContent = `
        .input-wrapper.error input,
        .input-wrapper.error select {
            border-color: #dc2626 !important;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
        }
        
        .field-error {
            animation: slideIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

function loadUserPreferences() {
    // Load remember me preference
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    document.getElementById('rememberMe').checked = rememberMe;
    
    if (rememberMe) {
        const savedUsername = localStorage.getItem('savedUsername');
        if (savedUsername) {
            usernameInput.value = savedUsername;
        }
    }
}

function handleRememberMe() {
    const rememberMe = document.getElementById('rememberMe').checked;
    localStorage.setItem('rememberMe', rememberMe);
    
    if (rememberMe) {
        localStorage.setItem('savedUsername', usernameInput.value);
    } else {
        localStorage.removeItem('savedUsername');
    }
}

function setupSecurityFeatures() {
    // Disable right-click context menu on sensitive elements
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    
    // Clear clipboard after password input
    passwordInput.addEventListener('paste', () => {
        setTimeout(() => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText('');
            }
        }, 1000);
    });
    
    // Detect developer tools (basic detection)
    let devtools = {open: false, orientation: null};
    setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
            if (!devtools.open) {
                devtools.open = true;
                console.warn('Developer tools detected. Please close for security.');
            }
        } else {
            devtools.open = false;
        }
    }, 500);
}

function handleForgotPassword(event) {
    event.preventDefault();
    alert('Fitur lupa password akan segera tersedia. Silakan hubungi administrator.');
}

function handleRegister(event) {
    event.preventDefault();
    alert('Fitur registrasi akan segera tersedia. Silakan hubungi administrator untuk membuat akun baru.');
}

function handleKeyboardShortcuts(event) {
    // Enter key to submit form
    if (event.key === 'Enter' && !event.shiftKey) {
        if (document.activeElement === usernameInput || 
            document.activeElement === passwordInput || 
            document.activeElement === roleSelect) {
            event.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape key to close role panel
    if (event.key === 'Escape') {
        closeRoleInfoPanel();
    }
}

// Export functions for testing or external use
window.LoginSystem = {
    authenticateUser,
    validateInputs,
    createUserSession,
    logout,
    ROLE_PERMISSIONS,
    USER_DATABASE
};

