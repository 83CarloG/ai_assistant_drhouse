// Solution for showing Dr. House AI responses in a modal

// Create modal once
const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `
  <div class="modal-content">
    <span class="close-modal">&times;</span>
    <div id="modal-text"></div>
  </div>
`;
document.body.appendChild(modal);

// Add modal styles
const modalStyles = document.createElement('style');
modalStyles.textContent = `
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.85);
    display: none;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    background-color: #051B2B;
    color: #ADD8E6;
    padding: 30px;
    border: 2px solid #FF5733;
    border-radius: 5px;
    width: 60vmin;
    height: 60vmin;
    max-width: 90vw;
    max-height: 90vh;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  .close-modal {
    color: #FF5733;
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 32px;
    font-weight: bold;
    cursor: pointer;
  }
  
  #modal-text {
    font-size: 1.6rem;
    line-height: 1.5;
    overflow: auto;
    margin-top: 20px;
    flex: 1;
    font-family: Arial, sans-serif;
  }
  
  .expand-icon {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background-color: #FF5733;
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }
  
  .output-box {
    position: relative;
  }
`;
document.head.appendChild(modalStyles);

// Close when clicking X
modal.querySelector('.close-modal').onclick = function() {
    modal.style.display = 'none';
};

// Close when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Handle escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
    }
});

// Add expand buttons to all output boxes
function setupOutputBoxes() {
    // Wait a moment for content to render
    setTimeout(() => {
        const outputBoxes = document.querySelectorAll('.output-box:not(#slideSpeech .output-box)');

        outputBoxes.forEach(box => {
            // Skip if already processed
            if (box.querySelector('.expand-icon')) return;

            // Add expand button to ALL boxes, regardless of overflow
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-icon';
            expandBtn.innerHTML = '&plus;';  // Plus sign
            expandBtn.title = 'Visualizza in pop-up';

            // Show full text in modal when clicked
            expandBtn.onclick = function(e) {
                e.stopPropagation();  // Prevent event bubbling
                document.getElementById('modal-text').textContent = box.textContent.replace(/\+$/, '').trim();
                modal.style.display = 'flex';  // Using flex to center the content
            };

            box.appendChild(expandBtn);
        });
    }, 300);
}

// Set up initial boxes
document.addEventListener('DOMContentLoaded', setupOutputBoxes);

// Hook into the existing processPrompt function
const originalProcessPrompt = window.processPrompt || function(){};
window.processPrompt = function() {
    const result = originalProcessPrompt.apply(this, arguments);

    // Check for new content after response
    if (result && typeof result.then === 'function') {
        result.then(setupOutputBoxes);
    } else {
        setTimeout(setupOutputBoxes, 500);
    }

    return result;
};

// Run setupOutputBoxes every time a slide changes
function monitorSlideChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style' &&
                mutation.target.classList.contains('slide') &&
                mutation.target.style.display === 'block') {
                setupOutputBoxes();
            }
        });
    });

    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
        observer.observe(slide, { attributes: true });
    });
}

document.addEventListener('DOMContentLoaded', monitorSlideChanges);

// Initial setup
setupOutputBoxes();