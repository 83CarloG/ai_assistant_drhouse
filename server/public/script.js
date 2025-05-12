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
    if (prevButton) prevButton.style.display = currentSlide === 1 ? 'none' : 'inline-block';

    // Update Next button
    if (nextButton) nextButton.style.display = currentSlide === totalSlides ? 'none' : 'inline-block';

    // Update Home button
    if (homeButton) homeButton.style.display = currentSlide === 1 ? 'none' : 'inline-block';
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
 * Get the input and output elements for the current active slide
 * @returns {Object} Object containing input and output elements
 */
function getActiveElements() {
    let inputElement, outputElement, submitButton;

    switch (currentSlide) {
        case 2: // Basic Prompt
            inputElement = document.getElementById('promptBaseInput');
            outputElement = document.getElementById('promptBaseOutput');
            submitButton = document.querySelector('#slideBasicPrompt .submit-button');
            break;
        case 3: // Personality
            inputElement = document.querySelector('#slidePersonality .input-box');
            outputElement = document.querySelector('#slidePersonality .output-box');
            submitButton = document.querySelector('#slidePersonality .submit-button');
            break;
        case 5: // RAG
            inputElement = document.querySelector('#slideRAG .input-box');
            outputElement = document.querySelector('#slideRAG .output-box');
            submitButton = document.querySelector('#slideRAG .submit-button');
            break;
        default:
            return null;
    }

    return { inputElement, outputElement, submitButton };
}

/**
 * Process a prompt by sending it to the backend and displaying the response
 */
async function processPrompt() {
    const elements = getActiveElements();
    if (!elements) return;

    const { inputElement, outputElement, submitButton } = elements;

    // Get prompt text
    const prompt = inputElement.textContent || inputElement.value;
    if (!prompt.trim()) {
        alert("Per favore, inserisci un prompt prima di inviare.");
        return;
    }

    // Get configuration based on current slide
    let enableDrHouse = false;
    let ragEnabledHistoryChat = false;
    let ragEnabledMedicalContext = false;

    switch (currentSlide) {
        case 2: // Basic Prompt
            // No special flags needed
            break;
        case 3: // Personality
            enableDrHouse = true;
            break;
        case 5: // RAG
            enableDrHouse = true;
            ragEnabledHistoryChat = true;
            ragEnabledMedicalContext = true;
            break;
        default:
            break;
    }

    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = "Elaborazione...";
    outputElement.textContent = "Dr. House sta pensando...";

    try {
        // Send request to backend
        const response = await fetch('/prompt-simple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                enableDrHouse,
                ragEnabledHistoryChat,
                ragEnabledMedicalContext
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse and display response
        const result = await response.json();
        outputElement.textContent = result.data || 'Nessuna risposta ricevuta.';

    } catch (error) {
        console.error('Error processing prompt:', error);
        outputElement.textContent = "Si è verificato un errore durante l'elaborazione della richiesta. Riprova più tardi.";
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = "Invia";
    }
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