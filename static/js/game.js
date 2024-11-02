class PlinkoGame {
    constructor() {
        console.log('PlinkoGame constructor starting...');

        this.svg = document.querySelector('svg');
        console.log('Found SVG:', this.svg);

        this.pegGroup = document.getElementById('pegs');
        this.slotsGroup = document.getElementById('slots');
        this.multipliersGroup = document.getElementById('multipliers');
        this.chip = document.getElementById('chip');

        console.log('Found game elements:', {
            pegs: this.pegGroup,
            slots: this.slotsGroup,
            multipliers: this.multipliersGroup,
            chip: this.chip
        });

        this.multipliers = [0.2, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0.2];
        this.dropZones = [];

        // Initialize Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this.dropChip = this.dropChip.bind(this);

        this.initializeBoard();
        console.log('Board initialized with drop zones:', this.dropZones.length);

        this.loadSounds();
        this.setupEventListeners();

        // Add visual debug for drop zones
        this.dropZones.forEach((zone, index) => {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", zone.getAttribute("cx"));
            text.setAttribute("y", "30");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "12");
            text.textContent = index;
            this.svg.appendChild(text);
        });

        console.log('PlinkoGame constructor completed');
    }

    setupEventListeners() {
        this.dropZones.forEach((zone, index) => {
            zone.addEventListener('click', () => {
                console.log('Drop zone clicked:', index);
                this.dropChip(index);
            });
        });
    }

    initializeBoard() {
        // Create drop zones at the top
        for (let i = 0; i < 9; i++) {
            const x = 300 + (i - 4) * 40;
            const dropZone = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dropZone.setAttribute("cx", x);
            dropZone.setAttribute("cy", 50);
            dropZone.setAttribute("r", 8);
            dropZone.setAttribute("fill", "#444");
            dropZone.setAttribute("class", "drop-zone");
            dropZone.style.cursor = "pointer";
            dropZone.addEventListener("mouseover", () => dropZone.setAttribute("fill", "#666"));
            dropZone.addEventListener("mouseout", () => dropZone.setAttribute("fill", "#444"));
            this.svg.appendChild(dropZone);
            this.dropZones.push(dropZone);
        }

        // Draw pegs
        for (let row = 0; row < 12; row++) {
            for (let col = 0; col <= row; col++) {
                const x = 300 + (col - row/2) * 40;
                const y = 100 + row * 50;
                const peg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                peg.setAttribute("cx", x);
                peg.setAttribute("cy", y);
                peg.setAttribute("r", 5);
                peg.setAttribute("fill", "#666");
                this.pegGroup.appendChild(peg);
            }
        }

        // Draw slots
        this.multipliers.forEach((multiplier, i) => {
            const x = 300 + (i - 4) * 40;

            const slot = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            slot.setAttribute("x", x - 15);
            slot.setAttribute("y", 700);
            slot.setAttribute("width", 30);
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

        try {
            console.log('Fetching path from server...');
            const response = await fetch(`/drop/${startPosition}`);
            const result = await response.json();
            console.log('Received path:', result.path);

            for (let i = 0; i < result.path.length; i++) {
                const [col, row] = result.path[i];
                const x = 300 + (col - row/2) * 40;
                const y = 100 + row * 50;

                console.log(`Animating to position ${i}:`, { x, y });

                await new Promise(resolve => {
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
                });

                this.chip.setAttribute('cx', x);
                this.chip.setAttribute('cy', y);

                if (i > 0 && i < result.path.length - 1) {
                    const pitch = 0.8 + Math.random() * 0.4;
                    this.playPing(pitch);
                } else if (i === result.path.length - 1) {
                    this.playLanding();
                }
            }

            document.getElementById('result').textContent = `Won ${result.multiplier}x!`;
        } catch (error) {
            console.error('Error dropping chip:', error);
            document.getElementById('result').textContent = 'Error dropping chip!';
        } finally {
            this.dropZones.forEach(zone => zone.style.pointerEvents = 'auto');
        }
    }

    async loadSounds() {
        try {
            // Load sound files
            const [pingBuffer, landingBuffer] = await Promise.all([
                this.loadSound('static/sounds/ping.wav'),
                this.loadSound('static/sounds/landing.wav')
            ]);

            this.sounds = {}
            this.sounds.ping = pingBuffer;
            this.sounds.landing = landingBuffer;
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }

    async loadSound(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    playPing(pitch = 1) {
        if (!this.sounds.ping) return;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = this.sounds.ping;
        source.playbackRate.value = pitch;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.value = 0.3 + Math.random() * 0.2;

        source.start();
    }

    playLanding() {
        if (!this.sounds.landing) return;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = this.sounds.landing;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = 0.5;

        source.start();
    }
}

// Make sure the script is loading
console.log('Plinko script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    window.game = new PlinkoGame();
    console.log('Game initialized');
});