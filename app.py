from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)


class PlinkoGame:
    def __init__(self):
        self.score = 0
        self.multipliers = [100, 50, 10, 1, 0.8, 0.5, 0.8, 1, 10, 50, 100]

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

def read_balance():
    try:
        with open('balance.txt', 'r') as f:
            return float(f.read().strip())
    except FileNotFoundError:
        return 0.0

def write_balance(new_balance):
    with open("balance.txt", "w") as file:
        file.write(f"{new_balance:.2f}")

@app.route('/get_balance')
def get_balance():
    balance = read_balance()  # Read the balance from the file
    return {'balance': balance}

@app.route('/sync_balance', methods=['POST'])
def sync_balance():
    data = request.get_json()
    balance = data.get('balance')
    if balance is not None:
        print(f"Received balance: {balance}")
        return jsonify({"status": "success", "balance": balance}), 200
    else:
        return jsonify({"status": "error", "message": "Balance not provided"}), 400

@app.route('/')
def index():
    balance = read_balance()  # Read the balance from the file
    return render_template("index.html", balance=balance)

if __name__ == '__main__':
    app.run(debug=True)