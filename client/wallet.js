const crypto = require('crypto');

class Wallet {
    constructor() {
        const keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        
        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;
        this.address = this.generateAddress();
    }
    
    generateAddress() {
        // Simple address generation from public key
        return crypto.createHash('sha256').update(this.publicKey).digest('hex');
    }
    
    signTransaction(transaction) {
        const sign = crypto.createSign('SHA256');
        sign.update(JSON.stringify(transaction));
        return sign.sign(this.privateKey, 'hex');
    }
}

module.exports = Wallet;