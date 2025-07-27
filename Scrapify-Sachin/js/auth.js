document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and update header
    updateHeaderForLoggedInUser();

    // DOM Elements
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginSubmit = document.querySelector('#login');
    const registerSubmit = document.querySelector('#register');

    // Tab switching
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Login form submission
    loginSubmit.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value;
        
        // Basic validation
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        // In a real app, this would be an API call to authenticate the user
        // For demo purposes, we're using local storage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password && u.role === role);
        
        if (user) {
            // Store login state
            localStorage.setItem('currentUser', JSON.stringify(user));
            showNotification('Login successful!', 'success');
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
                if (role === 'seller') {
                    window.location.href = 'dashboard/seller-dashboard.html';
                } else {
                    window.location.href = 'dashboard/buyer-dashboard.html';
                }
            }, 1000);
        } else {
            showNotification('Invalid credentials or user not found', 'error');
        }
    });

    // Register form submission
    registerSubmit.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const role = document.getElementById('register-role').value;
        
        // Basic validation
        if (!name || !email || !password || !confirmPassword) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        // In a real app, this would be an API call to register the user
        // For demo purposes, we're using local storage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        // Check if user already exists
        if (users.some(user => user.email === email)) {
            showNotification('User with this email already exists', 'error');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password, // In a real app, this would be hashed
            role,
            createdAt: new Date().toISOString(),
            // Add default profile image
            profileImage: role === 'seller' ? 'img/default-seller.jpg' : 'img/default-buyer.jpg',
            // Add empty arrays for listings, bids, reviews
            listings: [],
            bids: [],
            reviews: []
        };
        
        // Add user to local storage
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Show success message
        showNotification('Registration successful! You can now login.', 'success');
        
        // Reset form and switch to login tab
        registerSubmit.reset();
        loginTab.click();
    });
});

// Function to update header for logged in users
function updateHeaderForLoggedInUser() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const loginBtn = document.querySelector('.btn-login');
    
    if (!loginBtn) return;
    
    if (currentUser) {
        // Create dropdown for user
        loginBtn.innerHTML = `${currentUser.name} <span>▼</span>`;
        loginBtn.href = '#';
        loginBtn.classList.add('user-menu');
        
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        
        const dashboardLink = document.createElement('a');
        dashboardLink.href = currentUser.role === 'seller' ? 'dashboard/seller-dashboard.html' : 'dashboard/buyer-dashboard.html';
        dashboardLink.textContent = 'Dashboard';
        
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.reload();
        });
        
        dropdown.appendChild(dashboardLink);
        dropdown.appendChild(logoutLink);
        
        // Add dropdown to login button parent
        loginBtn.parentNode.style.position = 'relative';
        loginBtn.parentNode.appendChild(dropdown);
        
        // Toggle dropdown on click
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!loginBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }
}

// Notification function
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add notification content
    const iconType = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${iconType}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
} 