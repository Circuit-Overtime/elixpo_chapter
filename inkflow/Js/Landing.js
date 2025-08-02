// Add some simple animations and responsive behavior
document.addEventListener('DOMContentLoaded', function () {
    // Hover effects for buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseover', function () {
            this.style.transform = 'translateY(-2px)';
        });
        btn.addEventListener('mouseout', function () {
            this.style.transform = 'translateY(0)';
        });
    });

    // Subtle floating animation for shapes
    const shapes = document.querySelectorAll('.shape');
    shapes.forEach(shape => {
        let randomDelay = Math.random() * 2;
        shape.style.animation = `float 3s ease-in-out ${randomDelay}s infinite alternate`;
    });

    // Add floating keyframes
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes float {
        0% { transform: translateY(0) rotate(-10deg); }
        100% { transform: translateY(-10px) rotate(-5deg); }
      }
    `;
    document.head.appendChild(style);

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const mainMenu = document.getElementById('mainMenu');

    if (menuToggle && mainMenu) {
        menuToggle.addEventListener('click', function () {
            mainMenu.classList.toggle('active');

            // Change hamburger to X when menu is open
            const lines = this.querySelectorAll('line');
            if (mainMenu.classList.contains('active')) {
                lines[0].setAttribute('y1', '12');
                lines[0].setAttribute('y2', '12');
                lines[0].setAttribute('transform', 'rotate(45 12 12)');

                lines[1].style.opacity = '0';

                lines[2].setAttribute('y1', '12');
                lines[2].setAttribute('y2', '12');
                lines[2].setAttribute('transform', 'rotate(-45 12 12)');
            } else {
                lines[0].setAttribute('y1', '6');
                lines[0].setAttribute('y2', '6');
                lines[0].setAttribute('transform', '');

                lines[1].style.opacity = '1';

                lines[2].setAttribute('y1', '18');
                lines[2].setAttribute('y2', '18');
                lines[2].setAttribute('transform', '');
            }
        });
    }

    // Menu dropdown behavior
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            // For a real application, you'd toggle dropdowns here
            console.log('Menu item clicked:', this.textContent.trim());

            // On mobile, if a menu item is clicked, close the menu
            if (window.innerWidth <= 768) {
                mainMenu.classList.remove('active');
                // Reset the hamburger icon
                const lines = menuToggle.querySelectorAll('line');
                lines[0].setAttribute('y1', '6');
                lines[0].setAttribute('y2', '6');
                lines[0].setAttribute('transform', '');
                lines[1].style.opacity = '1';
                lines[2].setAttribute('y1', '18');
                lines[2].setAttribute('y2', '18');
                lines[2].setAttribute('transform', '');
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            mainMenu.classList.remove('active');
            // Reset the hamburger icon
            if (menuToggle) {
                const lines = menuToggle.querySelectorAll('line');
                lines[0].setAttribute('y1', '6');
                lines[0].setAttribute('y2', '6');
                lines[0].setAttribute('transform', '');
                lines[1].style.opacity = '1';
                lines[2].setAttribute('y1', '18');
                lines[2].setAttribute('y2', '18');
                lines[2].setAttribute('transform', '');
            }
        }
    });

    // For touch devices, add active states
    if ('ontouchstart' in window) {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('touchstart', function () {
                this.style.transform = 'translateY(-5px)';
            });
            card.addEventListener('touchend', function () {
                setTimeout(() => {
                    this.style.transform = 'translateY(0)';
                }, 200);
            });
        });
    }

    // Adjust shapes positioning on smaller screens
    function adjustShapesForScreenSize() {
        const viewportWidth = window.innerWidth;
        const purpleSquare = document.querySelector('.purple-square');
        const yellowCircle = document.querySelector('.yellow-circle');
        const squiggle = document.querySelector('.squiggle');
        const label = document.querySelector('.label');

        if (viewportWidth <= 576) {
            // For mobile screens
            if (purpleSquare) purpleSquare.style.left = '10%';
            if (yellowCircle) yellowCircle.style.right = '10%';
            if (squiggle) {
                squiggle.style.right = '15%';
                squiggle.style.transform = 'scale(0.7)';
            }
            if (label) {
                label.style.left = '15%';
                label.style.bottom = '20%';
            }
        } else if (viewportWidth <= 768) {
            // For tablets
            if (purpleSquare) purpleSquare.style.left = '15%';
            if (yellowCircle) yellowCircle.style.right = '15%';
            if (squiggle) {
                squiggle.style.right = '20%';
                squiggle.style.transform = 'scale(0.85)';
            }
            if (label) {
                label.style.left = '20%';
                label.style.bottom = '22%';
            }
        } else {
            // For desktop
            if (purpleSquare) purpleSquare.style.left = '20%';
            if (yellowCircle) yellowCircle.style.right = '20%';
            if (squiggle) {
                squiggle.style.right = '25%';
                squiggle.style.transform = 'scale(1)';
            }
            if (label) {
                label.style.left = '25%';
                label.style.bottom = '25%';
            }
        }
    }

    // Initial adjustment
    adjustShapesForScreenSize();

    // Re-adjust on window resize
    window.addEventListener('resize', adjustShapesForScreenSize);
});