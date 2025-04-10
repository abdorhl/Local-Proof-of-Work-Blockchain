const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Blockchain = require('./blockchain');
const { ec } = require('elliptic');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const blockchain = new Blockchain();
const EC = new ec('secp256k1');

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

// --------------------------
// Enhanced Wallet Endpoints
// --------------------------

app.post('/create-wallet', (req, res) => {
  try {
    const keyPair = EC.genKeyPair();
    const wallet = {
      address: keyPair.getPublic('hex'),
      privateKey: keyPair.getPrivate('hex'),
      balance: 0,
      isOwner: false
    };
    
    // Add to blockchain's wallets
    blockchain.wallets.push(wallet);
    blockchain.saveWallets();
    
    // Create session with expiration
    const sessionToken = crypto.randomBytes(32).toString('hex');
    blockchain.sessions[sessionToken] = {
      address: wallet.address,
      expires: Date.now() + 3600000 // 1 hour
    };
    blockchain.saveSessions();

    res.json({ 
      ...wallet,
      sessionToken,
      balance: blockchain.getBalanceOfAddress(wallet.address)
    });
    
  } catch (error) {
    console.error('Wallet creation error:', error);
    res.status(500).json({ error: 'Wallet creation failed' });
  }
});

app.post('/delete-wallet', (req, res) => {
    try {
        const token = req.headers.authorization;
        const session = blockchain.sessions[token];
        
        if (!session) return res.status(401).json({ error: 'Invalid session' });
        
        // Remove wallet
        blockchain.wallets = blockchain.wallets.filter(w => 
            w.address !== session.address
        );
        
        // Remove session
        delete blockchain.sessions[token];
        
        blockchain.saveWallets();
        blockchain.saveSessions();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Wallet deletion error:', error);
        res.status(500).json({ error: 'Wallet deletion failed' });
    }
});

app.post('/login', (req, res) => {
    try {
      const { privateKey } = req.body;
      
      // Case-insensitive comparison with trim
      const wallet = blockchain.wallets.find(w => 
        w.privateKey.toLowerCase().trim() === privateKey.toLowerCase().trim()
      );
  
      if (!wallet) {
        return res.status(401).json({ error: 'Invalid private key' });
      }
  
      const sessionToken = crypto.randomBytes(32).toString('hex');
      blockchain.sessions[sessionToken] = {
        address: wallet.address,
        expires: Date.now() + 3600000 // 1 hour
      };
      blockchain.saveSessions();
  
      res.json({ 
        sessionToken,
        wallet: {
          address: wallet.address,
          balance: blockchain.getBalanceOfAddress(wallet.address),
          isOwner: wallet.isOwner
        }
      });
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

app.get('/validate-session', (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token || !blockchain.sessions[token]) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const session = blockchain.sessions[token];
    
    // Check expiration
    if (session.expires < Date.now()) {
      delete blockchain.sessions[token];
      blockchain.saveSessions();
      return res.status(401).json({ error: 'Session expired' });
    }

    // Renew session
    session.expires = Date.now() + 3600000;
    blockchain.saveSessions();

    const wallet = blockchain.getWallet(session.address);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      address: wallet.address,
      balance: blockchain.getBalanceOfAddress(wallet.address),
      isOwner: wallet.isOwner
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
});

app.get('/balance/:address', (req, res) => {
    try {
      const balance = blockchain.getBalanceOfAddress(req.params.address);
      res.json({ 
        address: req.params.address,
        balance,
        lastUpdated: Date.now()
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

// --------------------------
// Enhanced Blockchain Endpoints
// --------------------------

app.post('/transaction', (req, res) => {
  try {
    const transaction = req.body;
    
    // Validate sender wallet
    const wallet = blockchain.getWallet(transaction.from);
    if (!wallet) {
      throw new Error('Sender wallet not found');
    }

    // Verify signature
    const msgHash = crypto.createHash('sha256')
      .update(`${transaction.to}${transaction.amount}`)
      .digest('hex');
      
    const key = EC.keyFromPrivate(wallet.privateKey);
    if (!key.verify(msgHash, transaction.signature)) {
      throw new Error('Invalid signature');
    }

    // Check balance
    if (wallet.balance < transaction.amount) {
      throw new Error('Insufficient balance');
    }

    blockchain.addTransaction(transaction);
    res.json({ message: 'Transaction added to mempool' });

  } catch (error) {
    console.error('Transaction error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/blocks', (req, res) => {
    res.set('Cache-Control', 'public, max-age=30');
    res.json(blockchain.chain);
  });

// --------------------------
// Server Initialization
// --------------------------

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Initial wallets:', blockchain.wallets);
    console.log('Owner address:', blockchain.wallets.find(w => w.isOwner)?.address);
    console.log('Owner private key:', blockchain.wallets.find(w => w.isOwner)?.privateKey);
});

// Enhanced mining interval
setInterval(() => {
  try {
    if (blockchain.pendingTransactions.length > 0) {
      const minerAddress = blockchain.wallets.find(w => w.isOwner)?.address;
      if (minerAddress) {
        console.log('Auto-mining block...');
        blockchain.minePendingTransactions(minerAddress);
      }
    }
  } catch (error) {
    console.error('Auto-mining error:', error);
  }
}, blockchain.blockInterval);