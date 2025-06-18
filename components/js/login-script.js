// Firebase Authentication Login System

// Security Configuration
const SECURITY_CONFIG = {
    maxLoginAttempts: 3,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    passwordMinLength: 6,
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
        dashboardUrl: './index.html'
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
        dashboardUrl: './index.html'
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
    console.log('Firebase Login System initialized');
    
    // Setup form validation
    setupFormValidation();
    
    // Load saved preferences
    loadUserPreferences();
    
    // Setup role information
    populateRoleInfo();
    
    // Check Firebase Auth state
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user);
            // User is signed in, redirect to dashboard if not already there
            if (window.location.pathname.includes('login.html')) {
                const savedRole = localStorage.getItem('userRole') || 'user';
                redirectToDashboard(savedRole);
            }
        } else {
            console.log('User is signed out');
            // User is signed out, clear any stored data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');
        }
    });
}

function setupEventListeners() {
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Password toggle
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }
    
    // Role selection change
    if (roleSelect) {
        roleSelect.addEventListener('change', handleRoleChange);
    }
    
    // Close role info panel
    if (closePanelBtn) {
        closePanelBtn.addEventListener('click', closeRoleInfoPanel);
    }
    
    // Input validation
    if (usernameInput) {
        usernameInput.addEventListener('input', validateUsername);
    }
    if (passwordInput) {
        passwordInput.addEventListener('input', validatePassword);
    }
    
    // Forgot password link
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
    // Register link
    const registerLink = document.querySelector('.register-link');
    if (registerLink) {
        registerLink.addEventListener('click', handleRegister);
    }
    
    // Remember me checkbox
    const rememberMeCheckbox = document.getElementById('rememberMe');
    if (rememberMeCheckbox) {
        rememberMeCheckbox.addEventListener('change', handleRememberMe);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = usernameInput.value.trim();
    const password = passwordInput.value;
    const selectedRole = roleSelect.value;
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Validate inputs
        if (!validateInputs(email, password, selectedRole)) {
            return;
        }
        
        // Check for too many attempts
        if (loginAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
            throw new Error('Terlalu banyak percobaan login. Silakan tunggu beberapa menit.');
        }
        
        // Use Firebase Authentication to sign in
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('User logged in:', user);
        
        // Reset login attempts on successful login
        loginAttempts = 0;
        
        // Save user information and role to localStorage
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || email.split('@')[0],
            role: selectedRole,
            loginTime: new Date().toISOString()
        };
        
        // Simpan data dengan format yang diharapkan oleh kedua sistem
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('userRole', selectedRole);
        
        // Format untuk script.js di halaman utama
        const sessionData = {
            username: userData.displayName,
            email: userData.email,
            role: selectedRole,
            loginTime: new Date().toISOString(),
            uid: user.uid
        };
        
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        localStorage.setItem('currentRole', selectedRole);
        
        // Show success message
        showSuccessMessage(`Login berhasil! Selamat datang, ${userData.displayName}!`);
        
        // Start session timer
        startSessionTimer();
        
        // Redirect to dashboard after delay
        setTimeout(() => {
            redirectToDashboard(selectedRole);
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Increment login attempts
        loginAttempts++;
        
        // Handle different error types
        let displayMessage = 'Login gagal. Silakan coba lagi.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                displayMessage = 'Email tidak terdaftar. Silakan daftar terlebih dahulu.';
                break;
            case 'auth/wrong-password':
                displayMessage = 'Password salah. Silakan coba lagi.';
                break;
            case 'auth/invalid-email':
                displayMessage = 'Format email tidak valid.';
                break;
            case 'auth/user-disabled':
                displayMessage = 'Akun Anda telah dinonaktifkan. Hubungi administrator.';
                break;
            case 'auth/too-many-requests':
                displayMessage = 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit.';
                break;
            default:
                displayMessage = error.message || 'Terjadi kesalahan. Silakan coba lagi.';
        }
        
        const remainingAttempts = SECURITY_CONFIG.maxLoginAttempts - loginAttempts;
        if (remainingAttempts > 0) {
            displayMessage += ` Sisa percobaan: ${remainingAttempts}`;
        }
        
        showErrorMessage(displayMessage);
        
        // Add progressive delay for repeated attempts
        if (loginAttempts > 1) {
            const delay = Math.min(loginAttempts * 1000, 5000);
            loginBtn.disabled = true;
            
            setTimeout(() => {
                loginBtn.disabled = false;
            }, delay);
        }
        
    } finally {
        setLoadingState(false);
    }
}

// Sign Up Function (for new user registration)
async function handleSignUp(email, password, displayName, role) {
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile with display name
        await user.updateProfile({
            displayName: displayName
        });
        
        console.log('User registered:', user);
        
        // Save user information
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            role: role,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('userRole', role);
        
        showSuccessMessage(`Registrasi berhasil! Selamat datang, ${displayName}!`);
        
        // Redirect to dashboard
        setTimeout(() => {
            redirectToDashboard(role);
        }, 2000);
        
        return { success: true, user: userData };
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let displayMessage = 'Registrasi gagal. Silakan coba lagi.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                displayMessage = 'Email sudah terdaftar. Silakan gunakan email lain atau login.';
                break;
            case 'auth/invalid-email':
                displayMessage = 'Format email tidak valid.';
                break;
            case 'auth/weak-password':
                displayMessage = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
                break;
            default:
                displayMessage = error.message || 'Terjadi kesalahan saat registrasi.';
        }
        
        showErrorMessage(displayMessage);
        return { success: false, error: displayMessage };
    }
}

// Logout Function
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        
        // Clear semua data session
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userSession');       // Data untuk script.js
        localStorage.removeItem('currentRole');       // Data untuk script.js
        localStorage.removeItem('rememberedUsername');
        sessionStorage.clear();
        
        // Clear session timer
        if (sessionTimer) {
            clearTimeout(sessionTimer);
        }
        
        console.log('User logged out');
        
        // Redirect to login page
        window.location.href = './login.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        showErrorMessage('Terjadi kesalahan saat logout.');
    }
}

// Password Reset Function
async function handleForgotPassword(event) {
    if (event) event.preventDefault();
    
    const email = prompt('Masukkan email Anda untuk reset password:');
    
    if (!email) {
        return;
    }
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showSuccessMessage('Email reset password telah dikirim. Silakan cek inbox Anda.');
    } catch (error) {
        console.error('Password reset error:', error);
        
        let displayMessage = 'Gagal mengirim email reset password.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                displayMessage = 'Email tidak terdaftar.';
                break;
            case 'auth/invalid-email':
                displayMessage = 'Format email tidak valid.';
                break;
            default:
                displayMessage = error.message || 'Terjadi kesalahan.';
        }
        
        showErrorMessage(displayMessage);
    }
}

function validateInputs(email, password, role) {
    if (!email) {
        showErrorMessage('Email harus diisi');
        usernameInput.focus();
        return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showErrorMessage('Format email tidak valid');
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
    const email = usernameInput.value.trim();
    const inputWrapper = usernameInput.parentElement;
    
    if (email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            inputWrapper.classList.add('error');
            showFieldError(usernameInput, 'Format email tidak valid');
        } else {
            inputWrapper.classList.remove('error');
            hideFieldError(usernameInput);
        }
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
    if (icon) {
        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
    
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
    if (!roleInfoPanel) return;
    
    const roleInfo = ROLE_PERMISSIONS[role];
    const roleDetails = document.getElementById('roleDetails');
    
    if (roleDetails) {
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
    }
    
    roleInfoPanel.classList.add('show');
}

function closeRoleInfoPanel() {
    if (roleInfoPanel) {
        roleInfoPanel.classList.remove('show');
    }
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
    if (!roleSelect) return;
    
    // Add role information to select options
    const adminOption = roleSelect.querySelector('option[value="admin"]');
    const userOption = roleSelect.querySelector('option[value="user"]');
    
    if (adminOption) {
        adminOption.textContent = `Administrator`;
    }
    
    if (userOption) {
        userOption.textContent = `User`;
    }
}

function setLoadingState(isLoading) {
    if (!loginBtn) return;
    
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'flex';
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        if (btnText) btnText.style.display = 'block';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function showErrorMessage(message) {
    hideMessages();
    if (errorMessage) {
        const errorText = document.getElementById('errorText');
        if (errorText) {
            errorText.textContent = message;
        }
        errorMessage.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if error message element not found
        alert('Error: ' + message);
    }
}

function showSuccessMessage(message) {
    hideMessages();
    if (successMessage) {
        const successText = document.getElementById('successText');
        if (successText) {
            successText.textContent = message;
        }
        successMessage.style.display = 'flex';
    } else {
        // Fallback to alert if success message element not found
        alert('Success: ' + message);
    }
}

function hideMessages() {
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
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
    handleLogout();
}

function checkExistingSession() {
    // Firebase Auth state will be handled by onAuthStateChanged
    // Also check if we have valid session data
    const sessionData = localStorage.getItem('userSession');
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser && !sessionData) {
        // Ada data Firebase tapi tidak ada session data, buat session data
        try {
            const userData = JSON.parse(currentUser);
            const sessionInfo = {
                username: userData.displayName,
                email: userData.email,
                role: userData.role,
                loginTime: userData.loginTime,
                uid: userData.uid
            };
            localStorage.setItem('userSession', JSON.stringify(sessionInfo));
            localStorage.setItem('currentRole', userData.role);
        } catch (error) {
            console.error('Error creating session data:', error);
        }
    }
}

function setupFormValidation() {
    // Additional form validation setup if needed
}

function loadUserPreferences() {
    // Load user preferences from localStorage
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const savedUsername = localStorage.getItem('rememberedUsername');
    
    if (savedUsername && usernameInput) {
        usernameInput.value = savedUsername;
    }
    
    if (rememberMeCheckbox && savedUsername) {
        rememberMeCheckbox.checked = true;
    }
}

function setupSecurityFeatures() {
    // Additional security features setup
    console.log('Security features initialized');
}

function handleRememberMe() {
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const username = usernameInput.value.trim();
    
    if (rememberMeCheckbox && rememberMeCheckbox.checked && username) {
        localStorage.setItem('rememberedUsername', username);
    } else {
        localStorage.removeItem('rememberedUsername');
    }
}

function handleRegister(event) {
    if (event) event.preventDefault();
    
    // Simple registration form (you can enhance this)
    const email = prompt('Masukkan email untuk registrasi:');
    const password = prompt('Masukkan password (minimal 6 karakter):');
    const displayName = prompt('Masukkan nama lengkap:');
    const role = prompt('Pilih role (admin/user):') || 'user';
    
    if (email && password && displayName) {
        handleSignUp(email, password, displayName, role);
    }
}

function handleKeyboardShortcuts(event) {
    // Enter key to submit form
    if (event.key === 'Enter' && (event.target === usernameInput || event.target === passwordInput)) {
        event.preventDefault();
        loginForm.dispatchEvent(new Event('submit'));
    }
}

// Export functions for global access
window.handleLogout = handleLogout;
window.handleSignUp = handleSignUp;
window.handleForgotPassword = handleForgotPassword;

