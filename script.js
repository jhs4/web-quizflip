import SeededRandom from './seededRandom.js';
import { GAME_CONFIG } from './config.js';

class WordSwapQuiz {
    constructor() {
        // Get and validate seed
        const urlParams = new URLSearchParams(window.location.search);
        const rawSeed = urlParams.get('seed');
        
        // Validate seed and set isManualSeed flag
        const [validatedSeed, isValid] = this.validateSeed(rawSeed);
        this.seed = validatedSeed;
        this.isManualSeed = isValid;  // Only true if seed was valid
        
        this.rng = new SeededRandom(this.seed);
        
        this.maxLives = GAME_CONFIG.gameplay.maxLives;
        this.points = this.maxLives;
        this.currentWordIndex = 0;
        this.selectedLetters = [];
        this.foundSolutions = new Set();
        this.timeLeft_initial = GAME_CONFIG.gameplay.timeLimit;
        this.timeLeft = this.timeLeft_initial;
        this.timer = null;
        this.timerBarContainer = document.querySelector('.timer-bar-container');
        this.wordData = [];
        this.wordFile = GAME_CONFIG.gameplay.wordsFile;

        this.initializeElements();
        this.attachEventListeners();
        this.endScreen = document.getElementById('end-screen');
        
        // Display seed in UI
        this.displaySeed();
        
        // Load words from file before starting
        this.loadWordsFromFile();
        
        document.getElementById('restart-game').addEventListener('click', () => this.showWelcomeScreen());

        // Get toggle elements
        this.timerToggle = document.getElementById('timer-toggle');
        this.livesToggle = document.getElementById('lives-toggle');
        
        // Initialize settings based on toggle states
        this.hasTimeLimit = this.timerToggle.checked;
        this.hasLives = this.livesToggle.checked;
        
        // Initialize points display visibility
        const pointsDisplay = document.getElementById('points');
        if (pointsDisplay) {
            pointsDisplay.style.visibility = this.hasLives ? 'visible' : 'hidden';
        }
        
        // Add toggle listeners
        this.timerToggle.addEventListener('change', (e) => {
            this.hasTimeLimit = e.target.checked;
        });
        
        this.livesToggle.addEventListener('change', (e) => {
            this.hasLives = e.target.checked;
            const pointsDisplay = document.getElementById('points');
            if (pointsDisplay) {
                pointsDisplay.style.visibility = e.target.checked ? 'visible' : 'hidden';
            }
        });

        // Get lives selector elements
        this.livesSelect = document.getElementById('lives-count');
        this.livesToggle = document.getElementById('lives-toggle');
        
        // Add toggle listener to enable/disable lives selector
        this.livesToggle.addEventListener('change', (e) => {
            this.hasLives = e.target.checked;
            this.livesSelect.disabled = !e.target.checked;
            const pointsDisplay = document.getElementById('points');
            if (pointsDisplay) {
                pointsDisplay.style.visibility = e.target.checked ? 'visible' : 'hidden';
            }
        });
    }

    validateSeed(rawSeed) {
        // Check if we have a seed and it contains only digits
        if (rawSeed !== null && /^\d+$/.test(rawSeed)) {
            // Convert to number and validate range
            const numSeed = parseInt(rawSeed, 10);
            if (numSeed >= GAME_CONFIG.seed.min && numSeed <= GAME_CONFIG.seed.max) {
                return [numSeed, true];  // Return valid seed and true flag
            } else {
                console.warn(`Invalid seed: ${rawSeed} (must be between ${GAME_CONFIG.seed.min} and ${GAME_CONFIG.seed.max}). Using random seed instead.`);
            }
        } else if (rawSeed !== null) {
            console.warn(`Invalid seed: ${rawSeed} (must contain only digits). Using random seed instead.`);
        }
        return [Math.floor(Math.random() * GAME_CONFIG.seed.max), false];  // Return random seed and false flag
    }

    displaySeed() {
        // Add this element to your HTML
        const seedDisplay = document.getElementById('seed-display');
        if (seedDisplay) {
            seedDisplay.textContent = `Seed: ${this.seed}`;
            seedDisplay.title = 'Share this seed to play the same sequence';
        }
    }

    async loadWordsFromFile() {
        try {
            const response = await fetch(this.wordFile);
            if (!response.ok) throw new Error('Failed to load words file');
            
            const text = await response.text();
            const lines = text.trim().split('\n');
            
            this.wordData = this.rng.shuffle(lines.map(line => {
                const [word, solutions] = line.split(';');
                return {
                    word: word.trim(),
                    solutions: solutions.split(',').map(s => s.trim())
                };
            }));
        } catch (error) {
            console.error('Error loading words:', error);
            this.wordData = [{
                word: "LATENT",
                solutions: ["TALENT"]
            }];
        }
    }

    initializeElements() {
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.currentWordElement = document.getElementById('current-word');
        this.progressElement = document.getElementById('progress');
        this.nextButton = document.getElementById('next');
    }

    attachEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('start-over').addEventListener('click', () => this.showWelcomeScreen());
        this.nextButton.addEventListener('click', () => this.nextWord());
    }

    showWelcomeScreen() {
        this.gameScreen.classList.add('hidden');
        this.endScreen.classList.add('hidden');
        this.welcomeScreen.classList.remove('hidden');
        
        // If no manual seed was provided, generate a new random seed
        if (!this.isManualSeed) {
            this.seed = Math.floor(Math.random() * GAME_CONFIG.seed.max);
            this.rng = new SeededRandom(this.seed);
            // Reshuffle the word list with new seed
            this.wordData = this.rng.shuffle([...this.wordData]);
            // Update seed display
            this.displaySeed();
        }
        
        this.resetGame();
    }

    async startGame() {
        // Ensure words are loaded before starting
        if (this.wordData.length === 0) {
            await this.loadWordsFromFile();
        }
        
        this.welcomeScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.resetGame();
        this.displayWord();
        this.updateTimerVisibility();
    }

    resetGame() {
        // Update maxLives based on selector
        this.maxLives = this.hasLives ? parseInt(this.livesSelect.value) : GAME_CONFIG.gameplay.maxLives;
        this.points = this.hasLives ? this.maxLives : Infinity;
        this.currentWordIndex = 0;
        this.selectedLetters = [];
        this.foundSolutions = new Set();
        this.stopTimer();
        this.updatePoints();
        
        // Clear all solution boxes
        const solutionBoxes = document.querySelectorAll('.solution-box');
        solutionBoxes.forEach(box => {
            box.textContent = '';
        });
    }

    displayWord() {
        // Get the current word
        const currentWord = this.wordData[this.currentWordIndex].word;

        console.log(this.wordData[this.currentWordIndex].solutions);
        
        // Clear the current word display area
        this.currentWordElement.innerHTML = '';
        
        // Create letter elements
        [...currentWord].forEach((letter, index) => {
            // Create a new span for each letter
            const letterSpan = document.createElement('span');
            // Add the 'letter' class for styling
            letterSpan.classList.add('letter');
            // Put the letter in the span
            letterSpan.textContent = letter;
            // Add click handler for this letter
            letterSpan.addEventListener('click', () => this.handleLetterClick(index));
            // Add the letter span to the word display
            this.currentWordElement.appendChild(letterSpan);
        });

        // Create solution boxes based on the number of solutions
        const solutionsArea = document.querySelector('.solutions-area');
        solutionsArea.innerHTML = '';  // Clear existing boxes
        const numSolutions = this.wordData[this.currentWordIndex].solutions.length;
        const currentWordLength = this.wordData[this.currentWordIndex].word.length;
        
        // Create empty solution boxes
        for (let i = 0; i < numSolutions; i++) {
            const solutionBox = document.createElement('div');
            solutionBox.classList.add('solution-box');
            // Use config for letter width
            solutionBox.style.minWidth = `${currentWordLength * GAME_CONFIG.display.letterWidth}px`;
            solutionsArea.appendChild(solutionBox);
        }

        this.startTimer();
        this.updateProgress();
    }

    handleLetterClick(index) {
        // Get all letter elements from the DOM
        const letterElements = document.querySelectorAll('.letter');
        
        // Case 1: Clicking an already selected letter
        if (this.selectedLetters.includes(index)) {
            // Remove this index from selected letters
            this.selectedLetters = this.selectedLetters.filter(i => i !== index);
            // Remove visual selection
            letterElements[index].classList.remove('selected');
        } 
        // Case 2: Clicking a new letter (when less than 2 are selected)
        else if (this.selectedLetters.length < 2) {
            // Add this index to selected letters
            this.selectedLetters.push(index);
            // Add visual selection
            letterElements[index].classList.add('selected');

            // If we now have 2 letters selected, check if they make a valid solution
            if (this.selectedLetters.length === 2) {
                this.checkSolution();
            }
        }
    }

    checkSolution() {
        // Get the current word
        const currentWord = this.wordData[this.currentWordIndex].word;
        
        // Convert word to array of letters
        const letters = [...currentWord];
        
        // Get the two indices of letters user clicked
        const [i, j] = this.selectedLetters;
        
        // Swap the letters at those indices
        [letters[i], letters[j]] = [letters[j], letters[i]];
        
        // Join letters back into a word
        const swappedWord = letters.join('');
        
        // Get references to letter elements in UI
        const letterElements = document.querySelectorAll('.letter');
        
        // Check if swapped word is a valid solution
        const isCorrect = this.wordData[this.currentWordIndex].solutions.includes(swappedWord);
        
        // Remove 'selected' class from both letters
        letterElements[i].classList.remove('selected');
        letterElements[j].classList.remove('selected');

        // Add either 'correct' or 'incorrect' class to both letters, so now the CSS will style them differently
        letterElements[i].classList.add(isCorrect ? 'correct' : 'incorrect');
        letterElements[j].classList.add(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            // Add to found solutions and update display
            this.foundSolutions.add(swappedWord);
            this.updateSolutionsDisplay();
            
            // If all solutions found for current word
            if (this.foundSolutions.size === this.wordData[this.currentWordIndex].solutions.length) {
                this.nextButton.disabled = false;
                this.stopTimer();
                
                // If this was the last word, show end screen immediately
                if (this.currentWordIndex === this.wordData.length - 1) {
                    this.currentWordIndex++;
                    this.showEndScreen();
                }
            }
        } else {
            // Wrong swap, lose a point
            this.losePoint();
        }

        // Reset after configured delay
        setTimeout(() => {
            this.selectedLetters = [];
            letterElements.forEach(el => {
                el.classList.remove('selected', 'correct', 'incorrect');
            });
        }, GAME_CONFIG.display.animationDelay);
    }

    startTimer() {
        if (!this.hasTimeLimit) {
            return;
        }

        this.timeLeft = this.timeLeft_initial;
        this.stopTimer();
        
        const timerBar = document.getElementById('timer-bar');
        timerBar.style.width = '100%';
        
        this.timer = setInterval(() => {
            this.timeLeft = Math.max(0, this.timeLeft - 0.1);
            
            const percentageElapsed = ((this.timeLeft_initial - this.timeLeft) / this.timeLeft_initial) * 100;
            timerBar.style.width = `${100 - percentageElapsed}%`;
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
                if (this.hasLives) {
                    this.losePoint();
                }
                this.showEndScreen();
            }
        }, 100);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    losePoint() {
        if (!this.hasLives) return;
        
        if (this.points > 0) {
            this.points--;
            this.updatePoints();
            
            if (this.points === 0) {
                this.showEndScreen();
            }
        }
    }

    updatePoints() {
        const pointsContainer = document.getElementById('points');
        pointsContainer.innerHTML = ''; // Clear existing points
        
        // Only create points if we're using lives
        if (this.hasLives) {
            for (let i = 0; i < this.maxLives; i++) {
                const point = document.createElement('span');
                point.classList.add('point');
                if (i < this.points) {
                    point.classList.add('active');
                }
                pointsContainer.appendChild(point);
            }
        }
    }

    updateProgress() {
        this.progressElement.textContent = `${this.currentWordIndex}/${this.wordData.length}`;
    }

    updateSolutionsDisplay() {
        // Get all solution box elements from the DOM
        const solutionBoxes = document.querySelectorAll('.solution-box');
        
        // Convert foundSolutions Set to array with [...] spread operator
        // and iterate through each solution with its index
        [...this.foundSolutions].forEach((solution, index) => {
            // Check if there's a box for this solution
            if (solutionBoxes[index]) {
                // Set the text content of the box to the solution
                solutionBoxes[index].textContent = solution;
            }
        });
    }

    nextWord() {
        this.currentWordIndex++;
        this.foundSolutions.clear();
        this.nextButton.disabled = true;
        
        // Clear all solution boxes
        const solutionBoxes = document.querySelectorAll('.solution-box');
        solutionBoxes.forEach(box => {
            box.textContent = '';
        });
        
        if (this.currentWordIndex < this.wordData.length) {
            this.displayWord();
        } else {
            // Game complete - show end screen instead of welcome screen
            this.showEndScreen();
        }
    }

    showEndScreen() {
        this.gameScreen.classList.add('hidden');
        this.welcomeScreen.classList.add('hidden');
        this.endScreen.classList.remove('hidden');
        this.stopTimer();

        // Update summary information
        const wordsCompleted = document.getElementById('words-completed');
        const lastWordSummary = document.getElementById('last-word-summary');
        const lastWord = document.getElementById('last-word');
        const lastWordSolutions = document.getElementById('last-word-solutions');
        const gameOverTitle = document.getElementById('game-over-title');
        
        // We've completed the quiz if currentWordIndex equals wordData.length
        const isCompleted = this.currentWordIndex === this.wordData.length;
        
        gameOverTitle.textContent = isCompleted ? 'Quiz Completed!' : 'Game Over';
        wordsCompleted.textContent = this.currentWordIndex;
        
        // Always show last word summary if we have words
        if (this.wordData.length > 0) {
            lastWordSummary.classList.remove('hidden');
            
            // If completed, show last word (currentWordIndex - 1)
            // If failed, show current word (currentWordIndex)
            const lastWordIndex = isCompleted ? this.currentWordIndex - 1 : this.currentWordIndex;
            const lastWordData = this.wordData[lastWordIndex];
            lastWord.textContent = lastWordData.word;
            
            // Clear and populate solutions
            lastWordSolutions.innerHTML = '';
            lastWordData.solutions.forEach(solution => {
                const solutionSpan = document.createElement('span');
                solutionSpan.className = 'solution';
                solutionSpan.textContent = solution;
                lastWordSolutions.appendChild(solutionSpan);
            });
        } else {
            lastWordSummary.classList.add('hidden');
        }
    }


    updateTimerVisibility() {
        // Show/hide timer bar based on timer toggle
        if (this.timerBarContainer) {
            this.timerBarContainer.style.display = this.hasTimeLimit ? 'block' : 'none';
        }
    }


}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new WordSwapQuiz();
});
