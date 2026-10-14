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
 */
function navigate(sectionId) {
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
    const navLinks = document.querySelectorAll('.nav-link');
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
}
