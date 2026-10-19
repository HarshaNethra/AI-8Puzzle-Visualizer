// app.js - Main Application Logic (UI Navigation & Setup)

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup if needed
    console.log("8-Puzzle Visualizer App Loaded.");
    
    // Check hash on load to navigate to correct section if linked directly
    const hash = window.location.hash.substring(1);
    if (hash && ['home', 'solver', 'comparison', 'info'].includes(hash)) {
        navigate(hash);
    }

    // Initialize Solver Controller
    if (typeof AppController !== 'undefined' && AppController.init) {
        AppController.init();
    }
});

/**
 * Navigates between different sections in the Single Page Application
 * @param {string} sectionId - The ID of the section to show
 * @param {Event} [event] - Optional click event to prevent browser default anchor jumping
 */
function navigate(sectionId, event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    // 1. Hide all sections
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        section.classList.add('d-none');
    });

    // 2. Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }

    // 3. Update navbar active state
    const navLinks = document.querySelectorAll('#navbarNav .nav-link, .navbar-nav .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.getElementById(`nav-${sectionId}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // 4. Close mobile navbar if open
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        // Use Bootstrap's collapse API if available, or just remove class
        if (typeof bootstrap !== 'undefined') {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if (bsCollapse) {
                bsCollapse.hide();
            }
        } else {
            navbarCollapse.classList.remove('show');
        }
    }

    // 5. Scroll behavior: If already at the top, do nothing. Else, take user to the top.
    const currentScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (currentScroll > 0) {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant'
        });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }

    // 6. Keep URL hash synchronized without unwanted anchor scrolling offset
    if (window.location.hash !== `#${sectionId}`) {
        if (history.pushState) {
            history.pushState(null, '', `#${sectionId}`);
        } else {
            window.location.hash = sectionId;
        }
    }
}

