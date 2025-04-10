const Wallet = require('./wallet');

function createTransaction(from, to, amount, fee, privateKey) {
    const transaction = {
        from,
        to,
        amount,
        fee,
        timestamp: Date.now()
    };
    
    // Sign the transaction
    const wallet = new Wallet();
    wallet.privateKey = privateKey; // Override with provided key
    transaction.signature = wallet.signTransaction(transaction);
    
    return transaction;
}

module.exports = { createTransaction };