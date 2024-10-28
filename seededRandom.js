// Simple Linear Congruential Generator for seeded random numbers
class SeededRandom {
    constructor(seed = 1) {
        this.seed = seed;
        // LCG parameters (same as ZX81) https://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use
        this.m = 2**16 + 1;
        this.a = 75;
        this.c = 74;
        this.state = seed;
    }

    // Returns a number between 0 and 1
    random() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state / this.m;
    }

    // Fisher-Yates shuffle with our seeded random
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Export the class
export default SeededRandom;