/**
 * Dr. House AI Assistant - Presentation Navigation
 *
 * This script manages the slide navigation for the presentation.
 * It controls transitions between slides, keyboard navigation,
 * and provides simulation of AI interactions.
 */

// Global variables
let currentSlide = 1;
const totalSlides = 8; // Updated to include the Speech slide

// Slide ID mapping (for better code readability)
const SLIDE_IDS = {
    HOME: 'slideHome',
    BASIC_PROMPT: 'slideBasicPrompt',
    PERSONALITY: 'slidePersonality',
    VECTOR_DB: 'slideVectorDB',
    RAG: 'slideRAG',
    COMPLETE_AI: 'slideCompleteAI',
    SPEECH: 'slideSpeech',
    LAST_SLIDE: 'slideLast'
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

    // Initialize speech interface if we're on that slide
    if (targetSlideId === SLIDE_IDS.SPEECH) {
        setTimeout(initSpeechInterface, 100); // Piccolo ritardo per assicurarsi che il DOM sia pronto
    }
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
        case 7: return SLIDE_IDS.SPEECH;
        case 8: return SLIDE_IDS.LAST_SLIDE;
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

// ===== SPEECH INTERFACE CODE =====

// Speech recognition variables
let recognition = null;
let isListening = false;
let finalTranscript = '';

/**
 * Initialize the speech interface
 */
function initSpeechInterface() {
    console.log("Initializing speech interface...");

    // Speech recognition elements
    const speechChatContainer = document.getElementById('speechChatContainer');
    const startSpeechButton = document.getElementById('startSpeechButton');
    const stopSpeechButton = document.getElementById('stopSpeechButton');
    const clearSpeechButton = document.getElementById('clearSpeechButton');
    const speechStatusElement = document.getElementById('speechStatus');

    // Check if all elements exist
    if (!speechChatContainer) {
        console.error("Speech chat container not found!");
        return;
    }

    if (!startSpeechButton || !stopSpeechButton || !clearSpeechButton) {
        console.error("One or more speech buttons not found!");
        return;
    }

    if (!speechStatusElement) {
        console.error("Speech status element not found!");
        return;
    }

    // Remove any existing event listeners to prevent duplicates
    startSpeechButton.removeEventListener('click', startListening);
    stopSpeechButton.removeEventListener('click', stopListening);
    clearSpeechButton.removeEventListener('click', clearSpeechChat);

    // Add event listeners
    startSpeechButton.addEventListener('click', startListening);
    stopSpeechButton.addEventListener('click', stopListening);
    clearSpeechButton.addEventListener('click', clearSpeechChat);

    // Check browser support for speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Il riconoscimento vocale non è supportato in questo browser. Prova Chrome o Edge.");
        speechStatusElement.textContent = "Riconoscimento vocale non supportato";
        return;
    }

    // Initialize speech recognition if it hasn't been already
    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'it-IT'; // Set to Italian for Dr. House Italian version

        // Speech recognition events
        recognition.onstart = function() {
            isListening = true;
            speechStatusElement.textContent = "In ascolto...";
            startSpeechButton.disabled = true;
            stopSpeechButton.disabled = false;
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update status with interim results
            if (interimTranscript) {
                speechStatusElement.textContent = "Sto ascoltando: " + interimTranscript;
            }
        };

        recognition.onend = function() {
            if (isListening) {
                // If we're still supposed to be listening, restart
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Error restarting recognition:", err);
                    isListening = false;
                    startSpeechButton.disabled = false;
                    stopSpeechButton.disabled = true;
                }
            } else {
                startSpeechButton.disabled = false;
                stopSpeechButton.disabled = true;

                if (finalTranscript) {
                    // Process the final transcript
                    addSpeechMessage(finalTranscript, 'user');
                    sendToSpeechAI(finalTranscript);
                }

                finalTranscript = '';
                speechStatusElement.textContent = "Pronto";
            }
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            speechStatusElement.textContent = "Errore: " + event.error;
            isListening = false;
            startSpeechButton.disabled = false;
            stopSpeechButton.disabled = true;
        };
    }

    // Check if we need to add the initial message
    if (speechChatContainer.children.length === 0) {
        addSpeechMessage("Sono il Dottor House. Dimmi cosa ti affligge, e cercherò di non annoiarmi troppo.", 'house');
    }

    // Make sure button states are correct
    startSpeechButton.disabled = false;
    stopSpeechButton.disabled = true;

    console.log("Speech interface initialized successfully");
}

/**
 * Start speech recognition
 */
function startListening() {
    console.log("Starting speech recognition...");

    if (!recognition) {
        initSpeechInterface();
        if (!recognition) {
            console.error("Recognition not initialized!");
            return;
        }
    }

    const startSpeechButton = document.getElementById('startSpeechButton');
    const stopSpeechButton = document.getElementById('stopSpeechButton');
    const speechStatusElement = document.getElementById('speechStatus');

    if (!startSpeechButton || !stopSpeechButton || !speechStatusElement) {
        console.error("Speech elements not found!");
        return;
    }

    finalTranscript = '';
    isListening = true;

    try {
        recognition.start();
        // Button state will be updated in the onstart event handler
    } catch (err) {
        console.error("Recognition start error:", err);
        isListening = false;
        startSpeechButton.disabled = false;
        stopSpeechButton.disabled = true;
        speechStatusElement.textContent = "Errore nell'avvio del riconoscimento vocale";
    }
}

/**
 * Stop speech recognition
 */
function stopListening() {
    console.log("Stopping speech recognition...");

    if (!recognition) {
        console.error("Recognition not initialized!");
        return;
    }

    isListening = false;

    try {
        recognition.stop();
        // Button state will be updated in the onend event handler
    } catch (err) {
        console.error("Recognition stop error:", err);
    }
}

/**
 * Clear the speech chat interface
 */
function clearSpeechChat() {
    console.log("Clearing speech chat...");

    const speechChatContainer = document.getElementById('speechChatContainer');
    if (!speechChatContainer) {
        console.error("Speech chat container not found!");
        return;
    }

    speechChatContainer.innerHTML = '';

    // Add initial message
    addSpeechMessage("Sono il Dottor House. Dimmi cosa ti affligge, e cercherò di non annoiarmi troppo.", 'house');
}

/**
 * Add a message to the speech chat
 * @param {string} text - Message text
 * @param {string} sender - 'user' or 'house'
 */
function addSpeechMessage(text, sender) {
    const speechChatContainer = document.getElementById('speechChatContainer');
    if (!speechChatContainer) {
        console.error("Speech chat container not found!");
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;

    // Add audio control for House messages
    if (sender === 'house') {
        const audioControl = document.createElement('span');
        audioControl.className = 'audio-control';
        audioControl.innerHTML = '🔊';
        audioControl.title = 'Riproduci audio';
        audioControl.onclick = function() {
            playSpeechAudio(text);
        };
        messageDiv.appendChild(audioControl);
    }

    speechChatContainer.appendChild(messageDiv);
    speechChatContainer.scrollTop = speechChatContainer.scrollHeight;
}

/**
 * Send a prompt to the AI for speech processing
 * @param {string} prompt - User's prompt
 */
function sendToSpeechAI(prompt) {
    console.log("Sending prompt to speech AI:", prompt);

    const speechStatusElement = document.getElementById('speechStatus');
    if (!speechStatusElement) {
        console.error("Speech status element not found!");
        return;
    }

    speechStatusElement.textContent = "In attesa della risposta del Dr. House...";

    fetch('/speech/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("Received response from speech AI:", data);
            addSpeechMessage(data.text, 'house');
            playAudioFromUrl(data.audio_url);
            speechStatusElement.textContent = "Pronto";
        })
        .catch(error => {
            console.error('Error sending to speech AI:', error);
            speechStatusElement.textContent = "Errore nella comunicazione con Dr. House";

            // Fallback - simulate a response
            const fallbackResponse = "Mi dispiace, sembra che io abbia un problema di comunicazione con il server. Potresti riprovare?";
            addSpeechMessage(fallbackResponse, 'house');
        });
}

/**
 * Play speech audio from text
 * @param {string} text - Text to convert to speech
 */
function playSpeechAudio(text) {
    console.log("Playing speech audio for text:", text.substring(0, 30) + "...");

    fetch('/speech/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        })
        .catch(error => {
            console.error('Error playing audio:', error);
        });
}

/**
 * Play audio from a URL
 * @param {string} url - Audio URL
 */
function playAudioFromUrl(url) {
    console.log("Playing audio from URL:", url);

    const audio = new Audio(url);
    audio.play().catch(err => {
        console.error("Error playing audio from URL:", err);
    });
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
    console.log("DOM content loaded");

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

    // Add speech interface initialization to direct button clicks in case navigation doesn't trigger it
    const directSpeechInit = document.querySelector('#slideSpeech');
    if (directSpeechInit) {
        directSpeechInit.addEventListener('click', function() {
            if (currentSlide === 7) {
                initSpeechInterface();
            }
        });
    }
});