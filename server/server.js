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

// Enhanced CORS configuration - allow all origins with no restrictions
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '3600');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Keep the existing CORS for compatibility
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
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
      
      console.log('Login attempt received');
      
      if (!privateKey) {
        console.error('No private key provided');
        return res.status(400).json({ error: 'Private key is required' });
      }
      
      console.log('Finding wallet for key:', privateKey.substring(0, 5) + '...');
      
      // Normalize the private key for comparison
      const normalizedInput = privateKey.toLowerCase().trim();
      
      // Get all wallets and their normalized keys for logging
      const walletsWithKeys = blockchain.wallets.map(w => ({
        address: w.address,
        keyPreview: w.privateKey.substring(0, 5) + '...',
        normalizedKey: w.privateKey.toLowerCase().trim()
      }));
      
      console.log('Available wallets:', walletsWithKeys);
      
      // Find the wallet with the matching private key
      const wallet = blockchain.wallets.find(w => 
        w.privateKey.toLowerCase().trim() === normalizedInput
      );
      
      if (!wallet) {
        console.log('No matching wallet found');
        return res.status(401).json({ error: 'Invalid private key - no matching wallet found' });
      }
      
      console.log('Wallet found:', wallet.address);
  
      const sessionToken = crypto.randomBytes(32).toString('hex');
      blockchain.sessions[sessionToken] = {
        address: wallet.address,
        expires: Date.now() + 3600000 // 1 hour
      };
      blockchain.saveSessions();
      
      console.log('Session created with token:', sessionToken.substring(0, 10) + '...');
  
      res.json({ 
        sessionToken,
        wallet: {
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: blockchain.getBalanceOfAddress(wallet.address),
          isOwner: wallet.isOwner
        }
      });
      
      console.log('Login response sent successfully');
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// Add to server.js
app.post('/logout', (req, res) => {
  try {
      const token = req.headers.authorization;
      if (!token || !blockchain.sessions[token]) {
          return res.status(401).json({ error: 'Invalid session' });
      }
      delete blockchain.sessions[token];
      blockchain.saveSessions();
      res.json({ success: true });
  } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
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
    
    // Return updated balance information
    res.json({ 
      message: 'Transaction added to mempool',
      updatedBalance: wallet.balance,
      transactionInfo: {
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Transaction error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/blocks', (req, res) => {
    res.set('Cache-Control', 'public, max-age=30');
    res.json(blockchain.chain);
  });

// Add this mining endpoint
app.post('/mine', (req, res) => {
  const { minerAddress } = req.body;
  if (!minerAddress) {
    return res.status(400).send('Missing miner address');
  }

  try {
    const block = blockchain.minePendingTransactions(minerAddress);
    res.json({
      message: 'New block mined successfully',
      block
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Add the missing mempool endpoint
app.get('/mempool', (req, res) => {
  res.json(blockchain.pendingTransactions || []);
});

// --------------------------
// Server Initialization
// --------------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}`);
  console.log(`In Docker, external access is on port 3001`);
  console.log(`Initial wallets:`, JSON.stringify(blockchain.wallets, null, 2));
  
  const ownerWallet = blockchain.wallets.find(w => w.isOwner);
  if (ownerWallet) {
    console.log(`Owner address: ${ownerWallet.address}`);
    console.log(`Owner private key: ${ownerWallet.privateKey}`);
  }
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


