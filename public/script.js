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
        stripe = Stripe('pk_test_51234567890abcdef'); // Replace with your real Stripe publishable key
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
    
    // Only go to step 1 if we're not already showing the dashboard
    if (currentStep === 1) {
        showStep(1);
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
    if (step === 4 && !cardElement && stripe) {
        initializePaymentForm();
    }
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
    currentStep = 1; // Reset to step 1
    localStorage.removeItem('authToken');
    showAuth();
    showAlert('Logged out successfully', 'success');
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

// File Upload Functions
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name);
    showLoading(true);

    const formData = new FormData();
    formData.append('w2Document', file);

    try {
        const response = await fetch('/api/upload/w2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('W-2 uploaded and processed successfully!', 'success');
            displayUploadedDocument(file.name, data.extractedData);
            
            // Enable the continue button
            const continueBtn = document.getElementById('continueToReview');
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.classList.remove('bg-gray-400');
                continueBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
        } else {
            showAlert(data.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Upload failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayUploadedDocument(filename, extractedData) {
    const container = document.getElementById('uploadedDocs');
    if (!container) return;
    
    const docDiv = document.createElement('div');
    docDiv.className = 'p-4 bg-green-50 border border-green-200 rounded-lg';
    docDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <h4 class="font-medium text-green-900">${filename}</h4>
                <p class="text-sm text-green-700">Processed successfully</p>
                ${extractedData.wages ? `<p class="text-xs text-green-600">Wages: $${extractedData.wages}</p>` : ''}
            </div>
            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
    `;
    container.appendChild(docDiv);
}

// Form 1098 Generation
async function generateForm1098() {
    console.log('Generating Form 1098...');
    showLoading(true);

    try {
        const response = await fetch('/api/tax/generate-1098', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayForm1098(data.form1098);
            showStep(3);
            showAlert('Form 1098 generated successfully!', 'success');
        } else {
            showAlert(data.message || 'Failed to generate form', 'error');
        }
    } catch (error) {
        console.error('Form generation error:', error);
        showAlert('Failed to generate form. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function displayForm1098(formData) {
    const container = document.getElementById('form1098Content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <h4 class="font-medium text-gray-900">Taxpayer Information</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-medium">Name:</span> ${formData.taxpayer.name}</p>
                    <p><span class="font-medium">SSN:</span> ${formData.taxpayer.ssn}</p>
                    <p><span class="font-medium">Filing Status:</span> ${formData.filingStatus}</p>
                </div>
            </div>
            
            <div class="space-y-4">
                <h4 class="font-medium text-gray-900">Income Information</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-medium">Total Wages:</span> $${formData.income.wages.toLocaleString()}</p>
                    <p><span class="font-medium">Federal Tax Withheld:</span> $${formData.income.federalTaxWithheld.toLocaleString()}</p>
                    <p><span class="font-medium">Social Security Wages:</span> $${formData.income.socialSecurityWages.toLocaleString()}</p>
                    <p><span class="font-medium">Medicare Wages:</span> $${formData.income.medicareWages.toLocaleString()}</p>
                </div>
            </div>
            
            <div class="space-y-4">
                <h4 class="font-medium text-gray-900">Deductions</h4>
                <div class="space-y-2 text-sm">
                    <p><span class="font-medium">Standard Deduction:</span> $${formData.deductions.standardDeduction.toLocaleString()}</p>
                    <p><span class="font-medium">Itemized Deductions:</span> $${formData.deductions.itemizedDeductions.toLocaleString()}</p>
                </div>
            </div>
            
            <div class="space-y-4">
                <h4 class="font-medium text-gray-900">Dependents</h4>
                <div class="space-y-2 text-sm">
                    ${formData.dependents.length > 0 ? 
                        formData.dependents.map(dep => `<p>${dep.name} (${dep.relationship})</p>`).join('') :
                        '<p>No dependents claimed</p>'
                    }
                </div>
            </div>
        </div>
        
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-2">Tax Calculation Summary</h4>
            <div class="space-y-1 text-sm text-blue-800">
                <p>Adjusted Gross Income: $${formData.income.wages.toLocaleString()}</p>
                <p>Taxable Income: $${Math.max(0, formData.income.wages - formData.deductions.standardDeduction).toLocaleString()}</p>
                <p>Tax Liability: $${calculateTaxLiability(formData).toLocaleString()}</p>
                <p class="font-medium">Refund/Amount Owed: $${(formData.income.federalTaxWithheld - calculateTaxLiability(formData)).toLocaleString()}</p>
            </div>
        </div>
    `;
}

function calculateTaxLiability(formData) {
    const taxableIncome = Math.max(0, formData.income.wages - formData.deductions.standardDeduction);
    // Simplified tax calculation for demo purposes
    if (taxableIncome <= 10275) return Math.round(taxableIncome * 0.10);
    if (taxableIncome <= 41775) return Math.round(1027.50 + (taxableIncome - 10275) * 0.12);
    if (taxableIncome <= 89450) return Math.round(4807.50 + (taxableIncome - 41775) * 0.22);
    return Math.round(taxableIncome * 0.22);
}

// Payment Functions
function initializePaymentForm() {
    if (!stripe) {
        console.log('Stripe not loaded');
        return;
    }
    
    const elements = stripe.elements();
    cardElement = elements.create('card');
    cardElement.mount('#card-element');

    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (displayError) {
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        }
    });
}

async function handlePayment() {
    if (!stripe || !cardElement) {
        showAlert('Payment system not properly initialized. Please refresh the page.', 'error');
        return;
    }

    showLoading(true);

    try {
        // Create payment intent
        const intentResponse = await fetch('/api/payment/create-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ amount: 4999 }) // $49.99 in cents
        });

        const intentData = await intentResponse.json();

        if (!intentResponse.ok) {
            throw new Error(intentData.message);
        }

        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: `${currentUser.firstName} ${currentUser.lastName}`,
                    email: currentUser.email
                }
            }
        });

        if (error) {
            showAlert(error.message, 'error');
        } else {
            // Confirm payment on backend
            const confirmResponse = await fetch('/api/payment/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    paymentIntentId: paymentIntent.id,
                    amount: 4999
                })
            });

            const confirmData = await confirmResponse.json();

            if (confirmResponse.ok) {
                showAlert('Payment successful!', 'success');
                showStep(5);
            } else {
                showAlert(confirmData.message || 'Payment confirmation failed', 'error');
            }
        }
    } catch (error) {
        console.error('Payment error:', error);
        showAlert('Payment failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Final Submission
async function handleFinalSubmission() {
    showLoading(true);

    try {
        const response = await fetch('/api/tax/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('submissionStep').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
            document.getElementById('submissionId').textContent = generateSubmissionId();
            showAlert('Tax return submitted successfully!', 'success');
        } else {
            showAlert(data.message || 'Submission failed', 'error');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showAlert('Submission failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Utility Functions
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
            
            // Don't automatically change steps - let user navigate manually
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
    
    if (taxInfo.dependents && taxInfo.dependents.length > 0) {
        taxInfo.dependents.forEach(() => addDependentFields());
        // Populate dependent fields
        const dependentDivs = document.getElementById('dependentsContainer').children;
        taxInfo.dependents.forEach((dependent, index) => {
            if (dependentDivs[index]) {
                const div = dependentDivs[index];
                const nameField = div.querySelector('.dependent-name');
                const ssnField = div.querySelector('.dependent-ssn');
                const relationshipField = div.querySelector('.dependent-relationship');
                const dobField = div.querySelector('.dependent-dob');
                
                if (nameField) nameField.value = dependent.name || '';
                if (ssnField) ssnField.value = dependent.ssn || '';
                if (relationshipField) relationshipField.value = dependent.relationship || '';
                if (dobField) dobField.value = dependent.dateOfBirth || '';
            }
        });
    }
}

function determineCurrentStep(userData) {
    // Determine which step to show based on user's progress
    if (!userData.taxInfo || !userData.taxInfo.filingStatus) {
        showStep(1);
    } else if (!userData.documents || userData.documents.filter(doc => doc.type === 'w2').length === 0) {
        showStep(2);
    } else if (!userData.taxReturn || !userData.taxReturn.form1040) {
        showStep(2);
    } else if (!userData.payments || userData.payments.length === 0) {
        showStep(3);
    } else if (userData.taxReturn.status === 'draft' || userData.taxReturn.status === 'review') {
        showStep(5);
    } else {
        showStep(1); // Default to step 1
    }
}

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
        type === 'warning' ? 'bg-yellow-500 text-black' :
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

function enableFormEditing() {
    showAlert('Form editing enabled. You can modify the values above.', 'info');
}

function generateSubmissionId() {
    return 'TX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}
