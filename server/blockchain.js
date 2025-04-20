const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Use data directory from environment variable or default to current directory
const DATA_DIR = process.env.DATA_DIR || '.';

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
        this.difficulty = 2;
        this.blockReward = 50;
        this.blockInterval = 60000;
        this.blocksDir = path.join(DATA_DIR, 'blocks');
        
        // Initialize wallets first
        this.wallets = this.loadWallets();
        this.sessions = this.loadSessions();

        if (!fs.existsSync(this.blocksDir)) fs.mkdirSync(this.blocksDir, { recursive: true });
        if (this.chain.length === 0) this.createGenesisBlock();
        else this.loadChainFromFiles();

        // Final owner wallet check
        if (!this.wallets.some(w => w.isOwner)) {
            this.createOwnerWallet();
        }
    }

    loadWallets() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'wallets.json')));
        } catch (error) {
            // Create new wallet file with owner
            const ownerWallet = this.createOwnerWallet(true);
            return [ownerWallet];
        }
    }

    loadSessions() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sessions.json')));
        } catch {
            return {};
        }
    }

    saveWallets() {
        fs.writeFileSync(path.join(DATA_DIR, 'wallets.json'), JSON.stringify(this.wallets, null, 2));
    }

    saveSessions() {
        fs.writeFileSync(path.join(DATA_DIR, 'sessions.json'), JSON.stringify(this.sessions, null, 2));
    }

    createOwnerWallet(initialCreation = false) {
        const keyPair = ec.genKeyPair();
        const ownerWallet = {
            address: keyPair.getPublic('hex'),
            privateKey: keyPair.getPrivate('hex'),
            balance: 100000,
            isOwner: true
        };
        
        if (!initialCreation) {
            this.wallets.push(ownerWallet);
        }
        
        fs.writeFileSync(path.join(DATA_DIR, 'wallets.json'), JSON.stringify([ownerWallet], null, 2));
        return ownerWallet;
    }


    createWallet() {
        const keyPair = ec.genKeyPair();
        const wallet = {
            address: keyPair.getPublic('hex'),
            privateKey: keyPair.getPrivate('hex'),
            balance: 0,
            isOwner: false
        };
        this.wallets.push(wallet);
        this.saveWallets();
        console.log('New wallet created:', wallet.address); // Add logging
        return wallet;
    }

    getWallet(address) {
        return this.wallets.find(w => w.address === address);
    }

    createSession(address) {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        this.sessions[sessionToken] = {
            address,
            expires: Date.now() + 3600000 // 1 hour
        };
        this.saveSessions();
        return sessionToken;
    }

    validateSession(token) {
        const session = this.sessions[token];
        if (!session || session.expires < Date.now()) return null;
        
        // Renew session
        session.expires = Date.now() + 3600000;
        this.saveSessions();
        return session.address;
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
        
        // Update wallet balances after mining
        this.updateWalletBalances(blockTransactions);
        
        return newBlock;
    }
    
    updateWalletBalances(transactions) {
        // Update wallets with transaction amounts
        transactions.forEach(tx => {
            // Deduct from sender wallet if not a coinbase transaction
            if (tx.from) {
                const senderWallet = this.getWallet(tx.from);
                if (senderWallet) {
                    senderWallet.balance -= tx.amount;
                }
            }
            
            // Add to recipient wallet
            const recipientWallet = this.getWallet(tx.to);
            if (recipientWallet) {
                recipientWallet.balance += tx.amount;
            } else {
                // Create wallet for recipient if it doesn't exist
                const newWallet = {
                    address: tx.to,
                    balance: tx.amount,
                    isOwner: false
                };
                this.wallets.push(newWallet);
            }
        });
        
        // Save updated wallets
        this.saveWallets();
        console.log('Wallet balances updated after mining block');
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
        
        // Recalculate wallet balances after loading blockchain
        this.recalculateAllWalletBalances();
    }
    
    recalculateAllWalletBalances() {
        // Reset all wallet balances except owner
        this.wallets.forEach(wallet => {
            if (!wallet.isOwner) {
                wallet.balance = 0;
            }
        });
        
        // Recalculate from blockchain history
        this.chain.forEach(block => {
            this.updateWalletBalances(block.transactions);
        });
        
        console.log('All wallet balances recalculated from blockchain');
    }
    
    getBalanceOfAddress(address) {
        // Get wallet balance directly from wallet object
        const wallet = this.wallets.find(w => w.address === address);
        return wallet ? wallet.balance : 0;
    }
    
    isValidTransaction(tx) {
        // Verify signature
        const key = ec.keyFromPublic(tx.from, 'hex');
        const txHash = this.hash(JSON.stringify({
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          timestamp: tx.timestamp
        }));
        
        return key.verify(txHash, {
          r: tx.signature.r,
          s: tx.signature.s,
          recoveryParam: tx.signature.recoveryParam
        });
    }
    
    addTransaction(transaction) {
        const wallet = this.getWallet(transaction.from);
        if (!wallet) throw new Error('Wallet not found');
        
        // Verify signature if provided
        if (transaction.signature) {
            const key = ec.keyFromPrivate(wallet.privateKey);
            const msgHash = crypto.createHash('sha256')
                .update(transaction.to + transaction.amount)
                .digest('hex');
            
            if (!key.verify(msgHash, transaction.signature)) {
                throw new Error('Invalid signature');
            }
        }

        // Check balance
        const balance = wallet.balance;
        if (balance < transaction.amount) {
            throw new Error('Insufficient balance');
        }

        // Add transaction to pending transactions
        this.pendingTransactions.push(transaction);
        
        // Update the sender's balance immediately to prevent double-spending
        wallet.balance -= transaction.amount;
        this.saveWallets();
        
        console.log(`Transaction added: ${transaction.from} -> ${transaction.to} (${transaction.amount} AbbuCoin)`);
        console.log(`Updated sender balance: ${wallet.balance} AbbuCoin`);
        
        return true;
    }
}

module.exports = Blockchain;