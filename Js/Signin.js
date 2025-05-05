// Close button functionality
document.querySelector('.close-btn').addEventListener('click', () => {
    window.location.href = '../index.html';
});

// Theme sync functionality
function applyTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

// Apply theme on page load
document.addEventListener('DOMContentLoaded', applyTheme);

// Listen for theme changes in localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
        applyTheme();
    }
});
