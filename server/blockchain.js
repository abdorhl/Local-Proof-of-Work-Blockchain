const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class Block {
    constructor(index, timestamp, transactions, previousHash, nonce, hash) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = nonce;
        this.hash = hash;
    }
}

class Blockchain {
    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        this.difficulty = 2; // Lower difficulty for demo purposes
        this.blockReward = 50;
        this.blockInterval = 60000; // 1 minute for demo
        this.blocksDir = path.join(__dirname, 'blocks');
        
        if (!fs.existsSync(this.blocksDir)) {
            fs.mkdirSync(this.blocksDir);
        }
        
        if (this.chain.length === 0) {
            this.createGenesisBlock();
        } else {
            this.loadChainFromFiles();
        }
    }
    
    createGenesisBlock() {
        const genesisBlock = new Block(
            0,
            Date.now(),
            [{ from: null, to: 'genesis', amount: 0 }],
            '0',
            0,
            this.calculateHash(0, Date.now(), [], '0', 0)
        );
        this.chain.push(genesisBlock);
        this.saveBlockToFile(genesisBlock);
    }
    
    calculateHash(index, timestamp, transactions, previousHash, nonce) {
        return crypto
            .createHash('sha256')
            .update(index + timestamp + JSON.stringify(transactions) + previousHash + nonce)
            .digest('hex');
    }
    
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    
    minePendingTransactions(miningRewardAddress) {
        const coinbaseTx = {
            from: null,
            to: miningRewardAddress,
            amount: this.blockReward
        };
        
        const blockTransactions = [coinbaseTx, ...this.pendingTransactions];
        const previousHash = this.getLatestBlock().hash;
        const index = this.chain.length;
        const timestamp = Date.now();
        
        let nonce = 0;
        let hash = this.calculateHash(index, timestamp, blockTransactions, previousHash, nonce);
        
        while (!hash.startsWith('0'.repeat(this.difficulty))) {
            nonce++;
            hash = this.calculateHash(index, timestamp, blockTransactions, previousHash, nonce);
        }
        
        const newBlock = new Block(
            index,
            timestamp,
            blockTransactions,
            previousHash,
            nonce,
            hash
        );
        
        this.chain.push(newBlock);
        this.saveBlockToFile(newBlock);
        this.pendingTransactions = [];
        
        return newBlock;
    }
    
    saveBlockToFile(block) {
        const filename = path.join(this.blocksDir, `block_${block.index}.json`);
        fs.writeFileSync(filename, JSON.stringify(block, null, 2));
    }
    
    loadChainFromFiles() {
        const files = fs.readdirSync(this.blocksDir)
            .filter(file => file.startsWith('block_') && file.endsWith('.json'))
            .sort((a, b) => {
                const aIndex = parseInt(a.split('_')[1].split('.')[0]);
                const bIndex = parseInt(b.split('_')[1].split('.')[0]);
                return aIndex - bIndex;
            });
        
        this.chain = files.map(file => {
            const data = fs.readFileSync(path.join(this.blocksDir, file));
            return JSON.parse(data);
        });
    }
    
    getBalanceOfAddress(address) {
        let balance = 0;
        
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.from === address) {
                    balance -= tx.amount;
                }
                if (tx.to === address) {
                    balance += tx.amount;
                }
            }
        }
        
        return balance;
    }
    
    addTransaction(transaction) {
        if (!transaction.from || !transaction.to || !transaction.amount) {
            throw new Error('Transaction must include from, to, and amount');
        }
        
        // Skip signature verification in this simplified version
        // Just check the balance
        if (transaction.from !== null) {
            const balance = this.getBalanceOfAddress(transaction.from);
            if (balance < transaction.amount) {
                throw new Error('Insufficient balance');
            }
        }
        
        this.pendingTransactions.push(transaction);
    }
}

module.exports = Blockchain;