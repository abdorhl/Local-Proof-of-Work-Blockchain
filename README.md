# uemfCoin Blockchain - Simplified Local Proof-of-Work Implementation

A simplified blockchain implementation with Proof-of-Work consensus, designed for educational purposes. This version removes wallet cryptography complexity while maintaining core blockchain functionality.

## Features

- **Simplified Blockchain Core**: Implements blocks, transactions, and proof-of-work mining
- **No Wallet Complexity**: Uses simple string addresses instead of cryptographic wallets
- **Web Interface**: Visualize blocks, transactions, and balances
- **Mining Simulation**: Miner clients can participate in block creation
- **Balance Tracking**: Tracks coin balances for all addresses

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/uemfcoin-blockchain.git
cd uemfcoin-blockchain
```

2. Install dependencies:
```bash
npm install
```

## Project Structure

```
uemfcoin-blockchain/
├── server/               # Blockchain node server
│   ├── blockchain.js     # Blockchain core logic
│   ├── mempool.js        # Transaction mempool
│   ├── server.js         # Express server
│   └── blocks/           # Directory for block storage
├── client/               # Miner client
│   └── miner.js          # Mining script
├── web-ui/               # Web interface
│   └── public/           # Static files for UI
│       ├── index.html
│       ├── style.css
│       └── app.js
└── package.json
```

## Running the Project

### 1. Start the Blockchain Server

```bash
node server/server.js
```

The server will start on port 3000 and initialize with a genesis block.

### 2. Start a Miner Client

In a new terminal:
```bash
node client/miner.js
```

The miner will automatically try to mine new blocks every 30 seconds.

### 3. Access the Web Interface

Open `web-ui/public/index.html` in your browser. You can either:
- Use a simple HTTP server like `http-server` or `live-server`
- Open directly in your browser (some features may be limited due to CORS)

## How to Use

### Creating Transactions

1. In the web interface, you'll be assigned a random address
2. To send coins:
   - Enter a recipient address (can be any string)
   - Enter an amount
   - Click "Send Transaction"

### Mining Blocks

- The miner client will automatically attempt to mine blocks
- Successful mining awards 50 coins to the miner's address
- Transactions are bundled into blocks during mining

### Viewing Blockchain Data

The web interface shows:
- All blocks in the blockchain
- Pending transactions in the mempool
- Current balances for all addresses

## Configuration Options

You can modify these parameters in `server/blockchain.js`:

- `difficulty`: Number of leading zeros required in block hashes (default: 2)
- `blockReward`: Mining reward amount (default: 50)
- `blockInterval`: Time between mining attempts in ms (default: 60000 - 1 minute)

## Educational Concepts Demonstrated

- Blockchain structure and block creation
- Proof-of-Work consensus mechanism
- Transaction validation and processing
- Mempool for pending transactions
- Coinbase transactions and mining rewards
- Balance calculation from transaction history

## Limitations (Simplifications)

This is a simplified implementation for educational purposes:

1. No cryptographic wallets or transaction signatures
2. No peer-to-peer network (single server)
3. Simplified address system (random strings)
4. File-based storage (not suitable for production)
5. No persistence between server restarts (except for block files)

## Future Enhancements

To make this more realistic, you could add:

1. Proper cryptographic wallets with signatures
2. Peer-to-peer network communication
3. Database storage instead of files
4. Transaction fee prioritization
5. More sophisticated consensus mechanism

## License

This project is open-source and available under the MIT License.