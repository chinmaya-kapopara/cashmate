// UI Interactions (No functionality - just UI behavior)

// DOM Elements
const addExpenseBtn = document.getElementById('addExpenseBtn');
const addExpenseModal = document.getElementById('addExpenseModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const filterTabs = document.querySelectorAll('.filter-tab');
const categoryOptions = document.querySelectorAll('.category-option');
const expenseDate = document.getElementById('expenseDate');

// Set today's date as default
if (expenseDate) {
    const today = new Date().toISOString().split('T')[0];
    expenseDate.value = today;
}

// Modal Functions
function openModal() {
    addExpenseModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    addExpenseModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Side Menu Functions
function openSideMenu() {
    sideMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSideMenu() {
    sideMenu.classList.remove('active');
    document.body.style.overflow = '';
}

// Event Listeners
if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', openModal);
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
}

if (saveExpenseBtn) {
    saveExpenseBtn.addEventListener('click', () => {
        // UI feedback only - no actual save functionality
        saveExpenseBtn.textContent = 'Saving...';
        saveExpenseBtn.disabled = true;
        
        setTimeout(() => {
            saveExpenseBtn.textContent = 'Add Expense';
            saveExpenseBtn.disabled = false;
            closeModal();
        }, 500);
    });
}

// Close modal when clicking overlay
if (addExpenseModal) {
    addExpenseModal.addEventListener('click', (e) => {
        if (e.target === addExpenseModal) {
            closeModal();
        }
    });
}

// Menu Button
if (menuBtn) {
    menuBtn.addEventListener('click', openSideMenu);
}

if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeSideMenu);
}

// Close side menu when clicking overlay
if (sideMenu) {
    sideMenu.addEventListener('click', (e) => {
        if (e.target === sideMenu) {
            closeSideMenu();
        }
    });
}

// Filter Tabs
filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        filterTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
    });
});

// Category Selection
categoryOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove active class from all options
        categoryOptions.forEach(o => o.classList.remove('active'));
        // Add active class to clicked option
        option.classList.add('active');
    });
});

// Prevent form submission (since we're not implementing functionality)
const form = document.querySelector('.modal-content');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        if (addExpenseModal.classList.contains('active')) {
            closeModal();
        }
        if (sideMenu.classList.contains('active')) {
            closeSideMenu();
        }
    }
});

// Touch feedback for better mobile UX
const touchElements = document.querySelectorAll('button, .expense-item, .menu-item, .category-option, .filter-tab');
touchElements.forEach(element => {
    element.addEventListener('touchstart', function() {
        this.style.opacity = '0.7';
    });
    
    element.addEventListener('touchend', function() {
        setTimeout(() => {
            this.style.opacity = '';
        }, 150);
    });
});
