// wallet.js
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const crypto = require('crypto');

class Wallet {
  constructor() {
    this.keyPair = ec.genKeyPair();
    this.address = this.generateAddress();
    this.balance = 0;
  }

  generateAddress() {
    return this.keyPair.getPublic('hex');
  }

  signTransaction(transaction) {
    // Create the EXACT same hash as the server verifies
    const msgHash = crypto.createHash('sha256')
      .update(transaction.to + transaction.amount)
      .digest('hex');

    const key = ec.keyFromPrivate(this.keyPair.getPrivate('hex'), 'hex');
    const signature = key.sign(msgHash);
    
    // Convert to DER format and then to hex
    return signature.toDER('hex');
  }

  static createFromPrivateKey(privateKey) {
    const wallet = new Wallet();
    wallet.keyPair = ec.keyFromPrivate(privateKey, 'hex');
    wallet.address = wallet.generateAddress();
    return wallet;
  }
}

function createTransaction(from, to, amount, fee, privateKey) {
  const wallet = Wallet.createFromPrivateKey(privateKey);
  
  if (wallet.address !== from) {
    throw new Error('Private key does not match sender address');
  }

  const transaction = {
    from,
    to,
    amount,
    fee,
    timestamp: Date.now()
  };

  transaction.signature = wallet.signTransaction(transaction);
  return transaction;
}

module.exports = { Wallet, createTransaction };