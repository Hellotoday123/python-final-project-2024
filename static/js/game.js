class PlinkoGame {
    constructor() {
        console.log('PlinkoGame constructor starting...');

        this.svg = document.querySelector('svg');
        this.pegGroup = document.getElementById('pegs');
        this.slotsGroup = document.getElementById('slots');
        this.multipliersGroup = document.getElementById('multipliers');
        this.chip = document.getElementById('chip');
        this.displayResult = document.getElementById('result')
        this.displayBalance = document.getElementById('balance')

        this.balance = parseFloat(this.displayBalance.textContent) || 0;
        this.betAmount = 0;
        this.getBalance();


        this.multipliers = [50, 10, 5, 1.2, 0.9, 0.5, 0.9, 1.2, 5, 10, 50];
        this.dropZones = [];
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this.dropChip = this.dropChip.bind(this);

        this.initializeBoard();
        this.loadSounds();
        this.setupEventListeners();

        console.log('PlinkoGame constructor completed');
    }


    async loadSounds() {
        try {
            const [pingBuffer, landingBuffer] = await Promise.all([
                this.loadSound('static/sounds/ping.wav'),
                this.loadSound('static/sounds/landing.wav')
            ]);
            this.sounds = { ping: pingBuffer, landing: landingBuffer };
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }

    async loadSound(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    async animateChipTo(x, y) {
        console.log(`Animating chip to (${x}, ${y})`);
        return new Promise(resolve => {
            const animation = this.chip.animate(
                [
                    {
                        cx: this.chip.getAttribute('cx'),
                        cy: this.chip.getAttribute('cy')
                    },
                    { cx: x, cy: y }
                ],
                {
                    duration: 150,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                }
            );
            animation.onfinish = resolve;
            this.chip.setAttribute('cx', x);
            this.chip.setAttribute('cy', y);
        });
    }

    playPing() {
        if (!this.sounds.ping) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds.ping;
        source.connect(this.audioContext.destination);
        source.start();
    }

    playLanding() {
        if (!this.sounds.landing) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds.landing;
        source.connect(this.audioContext.destination);
        source.start();
    }

    async dropChip(startPosition) {
        console.log('Starting drop from position:', startPosition);

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Disable all drop zones during animation
        this.dropZones.forEach(zone => zone.style.pointerEvents = 'none');

        this.chip.style.display = 'block';
        const startX = 300 + (startPosition - 4) * 40;
        this.chip.setAttribute('cx', startX);
        this.chip.setAttribute('cy', '50');

        let currentX = startX;
        let currentY = 50;

        for (let row = 0; row < 12; row++) {
            // Calculate boundaries for each row
            const maxX = 300 + (row / 2) * 40;
            const minX = 300 - (row / 2) * 40;

            console.log(`Row ${row}: maxX=${maxX}, minX=${minX}`);

            // Randomly choose a direction but ensure we stay within boundaries
            let direction = Math.random() < 0.5 ? -20 : 20;
            currentX += direction;

            // Apply boundary checks
            if (currentX > maxX) {
                currentX = maxX;
            } else if (currentX < minX) {
                currentX = minX;
            }

            currentY += 50;
            await this.animateChipTo(currentX, currentY);

            if (row > 0 && row < 11) {
                this.playPing();
            }

        }

        this.playLanding();
        // Determine final slot based on chip's ending position
        const slotWidth = 50;
        const boardStartX = 300 - ((this.multipliers.length - 1) / 2) * slotWidth;
        const finalSlotIndex = Math.round((currentX - boardStartX) / slotWidth);

        const clampedIndex = Math.max(0, Math.min(finalSlotIndex, this.multipliers.length - 1));
        const finalMultiplier = this.multipliers[clampedIndex];

        this.displayResult.textContent = `You won ${finalMultiplier}x!`;

        const winnings = this.betAmount * finalMultiplier;

        this.handleBet(winnings);
        // Re-enable drop zones
        this.dropZones.forEach(zone => zone.style.pointerEvents = 'auto');
    }


    setupEventListeners() {
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', async () => {
                console.log('Start button clicked');

                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }


                const betInput = document.getElementById('betAmount');
                const ballAmountInput = document.getElementById('ballAmount');
                this.betAmount = parseFloat(betInput.value) || 0;
                const ballAmount = parseInt(ballAmountInput.value) || 0;
                            this.dropChip(4); //temp
                if (this.validateBet(this.betAmount, ballAmount)) {
                    this.handleBet(-this.betAmount * ballAmount);
                    for (let i = 0; i < ballAmount; i++) {
                        this.dropChip(4);
                    }
                }else {
                    alert('invalid bet amount or insufficient balance')}
            });
        }
    }

    validateBet(bet, ballAmount) {
        const isValid = bet >0 && bet * ballAmount <= this.balance;
        console.log(`Validating bet: ${bet} * ${ballAmount} <= ${this.balance} -> ${isValid}`);
        return isValid;
    }

    async getBalance() {
        try {
            const response = await fetch('/get_balance');
            if (response.ok) {
                const data = await response.json();
                this.balance = data.balance || 0;
                this.updateBalanceDisplay();
            } else {
                console.error('Error getting balance');
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }

    async syncBalance() {
    try {
        const response = await fetch('/sync_balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ balance: this.balance })
        });
        if (!response.ok) {
            throw new Error('Failed to sync balance');
        }
        console.log('Balance synced successfully');
        } catch (error) {
            console.error('Error syncing balance:', error);
        }
    }

    handleBet(amount) {
        console.log(`Handling bet: ${amount}`);
        this.balance += amount;
        console.log(`New balance: ${this.balance}`);
        this.updateBalanceDisplay();
        this.syncBalance();
    }

    updateBalanceDisplay() {
        this.displayBalance.textContent = `Balance: $${this.balance.toFixed(2)}`;

    }

    initializeBoard() {
        const boardwidth = 300;
        const slotspacing = 50;
        const slotwidth = 40;
        const totalSlots = 11; // Set the number of slots to fill the width as desired

        // Draw pegs
        for (let row = 1; row < 12; row++) {
            for (let col = 0; col <= row; col++) {
                const x = boardwidth + (col - row / 2) * slotspacing;
                const y = 100 + row * 50;
                const peg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                peg.setAttribute("cx", x);
                peg.setAttribute("cy", y);
                peg.setAttribute("r", 5);
                peg.setAttribute("fill", "#666");
                this.pegGroup.appendChild(peg);
            }
        }

        // Calculate the starting position to center the slots
        const startX = boardwidth - ((totalSlots - 1) * slotspacing) / 2;

        // Adjust multipliers to match totalSlots
        const baseMultipliers = [50, 10, 5, 1.2, 0.9, 0.5, 0.9, 1.2, 5, 10, 50];
        if (totalSlots !== baseMultipliers.length) {
            const scalingFactor = baseMultipliers.length / totalSlots;
            this.multipliers = Array.from({ length: totalSlots }, (_, i) =>
                baseMultipliers[Math.min(baseMultipliers.length - 1, Math.floor(i * scalingFactor))]
            );
        } else {
            this.multipliers = [...baseMultipliers];
        }


        // Draw slots and multipliers
        this.multipliers.forEach((multiplier, i) => {
            const x = startX + i * slotspacing;
            const slot = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            slot.setAttribute("x", x - slotwidth / 2);
            slot.setAttribute("y", 700);
            slot.setAttribute("width", slotwidth);
            slot.setAttribute("height", 60);
            slot.setAttribute("fill", "#444");
            this.slotsGroup.appendChild(slot);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", 780);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "white");
            text.textContent = `${multiplier}x`;
            this.multipliersGroup.appendChild(text);
        });
    }

}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    window.game = new PlinkoGame();
    console.log('Game initialized');
});