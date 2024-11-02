from flask import Flask, render_template, jsonify
import random

app = Flask(__name__)


class PlinkoGame:
    def __init__(self):
        self.score = 0
        self.multipliers = [0.2, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0.2]

    def drop_chip(self, start_position):
        """Simulate chip drop and return path and final position"""
        # Convert start_position (0-8) to initial position
        current_pos = start_position
        path = [(current_pos, 0)]  # Starting position

        # Simulate bounces through 12 rows
        for row in range(12):
            # Each bounce has a 50/50 chance left or right
            current_pos += random.choice([-1, 1])

            # Keep within bounds for this row
            # The maximum valid position increases with each row
            max_pos = row + 1
            current_pos = max(0, min(current_pos, max_pos))

            # Add position to path
            path.append((current_pos, row + 1))

        # Calculate which slot we landed in (0-8)
        final_slot = min(8, max(0, int(current_pos // 1.5)))

        return {
            'path': path,
            'multiplier': self.multipliers[final_slot],
            'slot': final_slot
        }


game = PlinkoGame()


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/drop/<int:position>')
def drop(position):
    # Ensure position is within valid range
    position = min(8, max(0, position))
    result = game.drop_chip(position)
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)