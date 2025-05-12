/**
 * Dr. House AI Assistant - Presentation Navigation
 *
 * This script manages the slide navigation for the presentation.
 * It controls transitions between slides, keyboard navigation,
 * and provides simulation of AI interactions.
 */

// Global variables
let currentSlide = 1;
const totalSlides = 7; // Updated to include the Complete AI System slide

// Slide ID mapping (for better code readability)
const SLIDE_IDS = {
    HOME: 'slideHome',
    BASIC_PROMPT: 'slideBasicPrompt',
    PERSONALITY: 'slidePersonality',
    VECTOR_DB: 'slideVectorDB',
    RAG: 'slideRAG',
    COMPLETE_AI: 'slideCompleteAI',  // Added new slide ID
    LAST_SLIDE: 'slideLast'  // Added new slide ID
};

/**
 * Navigate to a specific slide
 * @param {number} slideNumber - The slide number to navigate to (1-based index)
 */
function goToSlide(slideNumber) {
    // Validate slide number
    if (slideNumber < 1 || slideNumber > totalSlides) {
        console.error(`Invalid slide number: ${slideNumber}`);
        return;
    }

    // Hide all slides
    for (let i = 1; i <= totalSlides; i++) {
        const slideId = getSlideIdByNumber(i);
        document.getElementById(slideId).style.display = 'none';
    }

    // Show the requested slide
    const targetSlideId = getSlideIdByNumber(slideNumber);
    document.getElementById(targetSlideId).style.display = 'block';

    // Update current slide tracker
    currentSlide = slideNumber;

    // Update navigation button states
    updateNavigationButtons();
}

/**
 * Get slide ID based on slide number
 * @param {number} number - Slide number
 * @returns {string} - Corresponding slide ID
 */
function getSlideIdByNumber(number) {
    switch (number) {
        case 1: return SLIDE_IDS.HOME;
        case 2: return SLIDE_IDS.BASIC_PROMPT;
        case 3: return SLIDE_IDS.PERSONALITY;
        case 4: return SLIDE_IDS.VECTOR_DB;
        case 5: return SLIDE_IDS.RAG;
        case 6: return SLIDE_IDS.COMPLETE_AI;
        case 7: return SLIDE_IDS.LAST_SLIDE;
        default: return SLIDE_IDS.HOME;
    }
}

/**
 * Update the visibility of navigation buttons based on current slide
 */
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const homeButton = document.getElementById('home-button');

    // Update Previous button
    prevButton.style.display = currentSlide === 1 ? 'none' : 'inline-block';

    // Update Next button
    nextButton.style.display = currentSlide === totalSlides ? 'none' : 'inline-block';

    // Update Home button
    homeButton.style.display = currentSlide === 1 ? 'none' : 'inline-block';
}

/**
 * Navigate to the next slide
 */
function nextSlide() {
    if (currentSlide < totalSlides) {
        goToSlide(currentSlide + 1);
    }
}

/**
 * Navigate to the previous slide
 */
function prevSlide() {
    if (currentSlide > 1) {
        goToSlide(currentSlide - 1);
    }
}

/**
 * Simulate processing a prompt (demo purpose only)
 * This function would normally interact with a backend
 */
function processPrompt() {
    // In a real implementation, this would send the prompt to the backend
    // For this demo, we're just showing that the button works
    console.log("Processing prompt...");
    alert("In una implementazione reale, questo invierebbe il prompt al backend AI.");
}

// Keyboard navigation event handler
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowRight':
            nextSlide();
            break;
        case 'ArrowLeft':
            prevSlide();
            break;
        case 'Home':
            goToSlide(1);
            break;
    }
});

// Initialize the presentation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Start with the first slide
    goToSlide(1);

    // If there's a hash URL (e.g. #slideBasicPrompt), go to that slide
    const hash = window.location.hash;
    if (hash) {
        // Find the slide number from the hash
        for (let i = 1; i <= totalSlides; i++) {
            if (hash === `#${getSlideIdByNumber(i)}`) {
                goToSlide(i);
                break;
            }
        }
    }
});