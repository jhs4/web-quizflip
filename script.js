class WordSwapQuiz {
    constructor() {
        this.points = 3;
        this.currentWordIndex = 0;
        this.selectedLetters = [];
        this.foundSolutions = new Set();
        this.timer = null;
        this.timeLeft = 30.0;
        this.wordData = [];  // Will be populated from file

        this.initializeElements();
        this.attachEventListeners();
        this.endScreen = document.getElementById('end-screen');
        
        // Load words from file before starting
        this.loadWordsFromFile();
        
        document.getElementById('restart-game').addEventListener('click', () => this.showWelcomeScreen());
    }

    async loadWordsFromFile() {
        try {
            const response = await fetch('wordsforswapping.txt');
            if (!response.ok) {
                throw new Error('Failed to load words file');
            }
            
            const text = await response.text();
            const lines = text.trim().split('\n');
            
            this.wordData = lines.map(line => {
                const [word, solutions] = line.split(';');
                return {
                    word: word.trim(),
                    solutions: solutions.split(',').map(s => s.trim())
                };
            });

        } catch (error) {
            console.error('Error loading words:', error);
            // Fallback to sample data if file loading fails
            this.wordData = [
                {
                    word: "LATENT",
                    solutions: ["TALENT"]
                }
            ];
        }
    }

    initializeElements() {
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.currentWordElement = document.getElementById('current-word');
        this.timerElement = document.getElementById('timer');
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
        this.endScreen.classList.add('hidden');  // Hide end screen
        this.welcomeScreen.classList.remove('hidden');
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
    }

    resetGame() {
        this.points = 3;
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
        const currentWord = this.wordData[this.currentWordIndex].word;
        this.currentWordElement.innerHTML = '';
        
        // Create letter elements
        [...currentWord].forEach((letter, index) => {
            const letterSpan = document.createElement('span');
            letterSpan.classList.add('letter');
            letterSpan.textContent = letter;
            letterSpan.addEventListener('click', () => this.handleLetterClick(index));
            this.currentWordElement.appendChild(letterSpan);
        });

        // Create solution boxes based on number of solutions
        const solutionsArea = document.querySelector('.solutions-area');
        solutionsArea.innerHTML = '';  // Clear existing boxes
        const numSolutions = this.wordData[this.currentWordIndex].solutions.length;
        
        for (let i = 0; i < numSolutions; i++) {
            const solutionBox = document.createElement('div');
            solutionBox.classList.add('solution-box');
            solutionsArea.appendChild(solutionBox);
        }

        this.startTimer();
        this.updateProgress();
    }

    handleLetterClick(index) {
        const letterElements = document.querySelectorAll('.letter');
        
        if (this.selectedLetters.includes(index)) {
            // Deselect letter
            this.selectedLetters = this.selectedLetters.filter(i => i !== index);
            letterElements[index].classList.remove('selected');
        } else if (this.selectedLetters.length < 2) {
            // Select letter
            this.selectedLetters.push(index);
            letterElements[index].classList.add('selected');

            if (this.selectedLetters.length === 2) {
                this.checkSolution();
            }
        }
    }

    checkSolution() {
        const currentWord = this.wordData[this.currentWordIndex].word;
        const letters = [...currentWord];
        const [i, j] = this.selectedLetters;
        
        // Swap letters
        [letters[i], letters[j]] = [letters[j], letters[i]];
        const swappedWord = letters.join('');
        
        const letterElements = document.querySelectorAll('.letter');
        const isCorrect = this.wordData[this.currentWordIndex].solutions.includes(swappedWord);
        
        // Remove 'selected' and add correct/incorrect to both letters
        letterElements[i].classList.remove('selected');
        letterElements[j].classList.remove('selected');
        letterElements[i].classList.add(isCorrect ? 'correct' : 'incorrect');
        letterElements[j].classList.add(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            this.foundSolutions.add(swappedWord);
            this.updateSolutionsDisplay();
            
            if (this.foundSolutions.size === this.wordData[this.currentWordIndex].solutions.length) {
                this.nextButton.disabled = false;
                this.stopTimer();
            }
        } else {
            this.losePoint();
        }

        setTimeout(() => {
            this.selectedLetters = [];
            letterElements.forEach(el => {
                el.classList.remove('selected', 'correct', 'incorrect');
            });
        }, 1000);
    }

    startTimer() {
        this.timeLeft = 30.0;
        this.stopTimer();
        
        this.timer = setInterval(() => {
            this.timeLeft = Math.max(0, this.timeLeft - 0.1);
            this.timerElement.textContent = this.timeLeft.toFixed(1);
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.losePoint();
                this.showEndScreen();  // Show end screen when timer runs out
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
        if (this.points > 0) {
            this.points--;
            this.updatePoints();
            
            // Check if all points are lost
            if (this.points === 0) {
                this.showEndScreen();
            }
        }
    }

    updatePoints() {
        const pointElements = document.querySelectorAll('.point');
        pointElements.forEach((el, index) => {
            el.classList.toggle('active', index < this.points);
        });
    }

    updateProgress() {
        this.progressElement.textContent = 
            `${this.currentWordIndex}/${this.wordData.length}`;
    }

    updateSolutionsDisplay() {
        const solutionBoxes = document.querySelectorAll('.solution-box');
        [...this.foundSolutions].forEach((solution, index) => {
            if (solutionBoxes[index]) {
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
            // Game complete
            alert('Quiz completed!');
            this.showWelcomeScreen();
        }
    }

    showEndScreen() {
        this.gameScreen.classList.add('hidden');
        this.welcomeScreen.classList.add('hidden');
        this.endScreen.classList.remove('hidden');
        this.stopTimer();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new WordSwapQuiz();
});
