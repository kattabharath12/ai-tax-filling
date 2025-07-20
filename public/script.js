// Global variables
let authToken = localStorage.getItem('authToken');
let currentStep = 1;
let stripe;
let cardElement;
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Initialize Stripe
    if (window.Stripe) {
        stripe = Stripe('pk_test_51234567890abcdef'); // Replace with real key
    }
    
    if (authToken) {
        showDashboard();
        loadUserData();
    } else {
        showAuth();
    }

    initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth form toggles
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (showSignup) {
        showSignup.addEventListener('click', () => toggleAuthForms('signup'));
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', () => toggleAuthForms('login'));
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Auth forms
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Tax info form
    const taxInfoForm = document.getElementById('taxInfoForm');
    const addDependentBtn = document.getElementById('addDependent');
    
    if (taxInfoForm) {
        taxInfoForm.addEventListener('submit', handleTaxInfoSubmit);
    }
    
    if (addDependentBtn) {
        addDependentBtn.addEventListener('click', addDependentFields);
    }

    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const w2Upload = document.getElementById('w2Upload');
    const continueToReview = document.getElementById('continueToReview');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => document.getElementById('w2Upload').click());
    }
    
    if (w2Upload) {
        w2Upload.addEventListener('change', handleFileUpload);
    }
    
    if (continueToReview) {
        continueToReview.addEventListener('click', generateForm1098);
    }

    // Review and payment
    const editForm = document.getElementById('editForm');
    const proceedToPayment = document.getElementById('proceedToPayment');
    const submitPayment = document.getElementById('submitPayment');
    const finalSubmit = document.getElementById('finalSubmit');
    
    if (editForm) {
        editForm.addEventListener('click', enableFormEditing);
    }
    
    if (proceedToPayment) {
        proceedToPayment.addEventListener('click', () => showStep(4));
    }
    
    if (submitPayment) {
        submitPayment.addEventListener('click', handlePayment);
    }
    
    if (finalSubmit) {
        finalSubmit.addEventListener('click', handleFinalSubmission);
    }
}

// UI Functions
function showAuth() {
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authSection) authSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (userEmail) userEmail.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
}

function showDashboard() {
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (authSection) authSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    if (userEmail) userEmail.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('userEmail').textContent = currentUser.email;
    }
}

function toggleAuthForms(form) {
    console.log('Toggling to:', form);
    
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (form === 'signup') {
        if (loginForm) loginForm.classList.add('hidden');
        if (signupForm) signupForm.classList.remove('hidden');
    } else {
        if (signupForm) signupForm.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
    }
}

function showStep(step) {
    console.log('Showing step:', step);
    
    // Hide all steps
    document.querySelectorAll('[id$="Step"]').forEach(el => el.classList.add('hidden'));
    
    // Show current step
    const stepElements = {
        1: 'taxInfoStep',
        2: 'uploadStep',
        3: 'reviewStep',
        4: 'paymentStep',
        5: 'submissionStep'
    };
    
    const stepElement = document.getElementById(stepElements[step]);
    if (stepElement) {
        stepElement.classList.remove('hidden');
    }
    
    // Update step indicators
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`step${i}`);
        if (stepEl) {
            stepEl.className = `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step ? 'step-completed' : 
                i === step ? 'step-active' : 'step-inactive'
            }`;
        }
    }
    
    currentStep = step;
    
    // Initialize payment form when reaching payment step
    if (step === 4 && !cardElement) {
        initializePaymentForm();
    }
}

// Tax Information Functions
async function handleTaxInfoSubmit(e) {
    e.preventDefault();
    console.log('Tax info form submitted');
    showLoading(true);

    const filingStatus = document.getElementById('filingStatus').value;
    const dependents = collectDependents();
    const address = {
        street: document.getElementById('addressStreet').value,
        city: document.getElementById('addressCity').value,
        state: document.getElementById('addressState').value,
        zipCode: document.getElementById('addressZip').value
    };

    try {
        const response = await fetch('/api/tax/info', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ filingStatus, dependents, address })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Tax information saved successfully!', 'success');
            showStep(2);
        } else {
            showAlert(data.message || 'Failed to save tax information', 'error');
        }
    } catch (error) {
        console.error('Tax info error:', error);
        showAlert('Failed to save tax information', 'error');
    } finally {
        showLoading(false);
    }
}

function addDependentFields() {
    console.log('Adding dependent fields');
    const container = document.getElementById('dependentsContainer');
    const dependentIndex = container.children.length;
    
    const dependentDiv = document.createElement('div');
    dependentDiv.className = 'p-4 border rounded-lg space-y-3';
    dependentDiv.innerHTML = `
        <h5 class="font-medium text-gray-900">Dependent ${dependentIndex + 1}</h5>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Full Name" class="dependent-name rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
            <input type="text" placeholder="SSN (xxx-xx-xxxx)" class="dependent-ssn rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
            <input type="text" placeholder="Relationship" class="dependent-relationship rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
            <input type="date" placeholder="Date of Birth" class="dependent-dob rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 text-sm">Remove Dependent</button>
    `;
    
    container.appendChild(dependentDiv);
}

function collectDependents() {
    const dependents = [];
    const container = document.getElementById('dependentsContainer');
    
    container.querySelectorAll('div').forEach(div => {
        const name = div.querySelector('.dependent-name')?.value;
        const ssn = div.querySelector('.dependent-ssn')?.value;
        const relationship = div.querySelector('.dependent-relationship')?.value;
        const dateOfBirth = div.querySelector('.dependent-dob')?.value;
        
        if (name) {
            dependents.push({ name, ssn, relationship, dateOfBirth });
        }
    });
    return dependents;
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempted');
    showLoading(true);
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showDashboard();
            loadUserData();
            showAlert('Login successful!', 'success');
        } else {
            showAlert(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    console.log('Signup attempted');
    showLoading(true);

    const userData = {
        firstName: document.getElementById('signupFirstName').value,
        lastName: document.getElementById('signupLastName').value,
        email: document.getElementById('signupEmail').value,
        phone: document.getElementById('signupPhone').value || '',
        password: document.getElementById('signupPassword').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showDashboard();
            showAlert('Account created successfully!', 'success');
        } else {
            showAlert(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('Signup failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showAuth();
    showAlert('Logged out successfully', 'success');
}

// Load user data
async function loadUserData() {
    if (!authToken) return;
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            
            // Pre-fill forms with existing data
            if (userData.taxInfo) {
                populateTaxInfoForm(userData.taxInfo);
            }
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

function populateTaxInfoForm(taxInfo) {
    if (taxInfo.filingStatus) {
        const filingStatusEl = document.getElementById('filingStatus');
        if (filingStatusEl) filingStatusEl.value = taxInfo.filingStatus;
    }
    
    if (taxInfo.address) {
        const addressFields = ['addressStreet', 'addressCity', 'addressState', 'addressZip'];
        const addressKeys = ['street', 'city', 'state', 'zipCode'];
        
        addressFields.forEach((fieldId, index) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = taxInfo.address[addressKeys[index]] || '';
        });
    }
}

// Utility Functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.toggle('hidden', !show);
    }
}

function showAlert(message, type = 'info') {
    console.log(`Alert (${type}):`, message);
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Placeholder functions for features not yet implemented
function handleFileUpload(e) { console.log('File upload not yet implemented'); }
function generateForm1098() { console.log('Form 1098 generation not yet implemented'); }
function enableFormEditing() { console.log('Form editing not yet implemented'); }
function handlePayment() { console.log('Payment not yet implemented'); }
function handleFinalSubmission() { console.log('Final submission not yet implemented'); }
function initializePaymentForm() { console.log('Payment form initialization not yet implemented'); }
