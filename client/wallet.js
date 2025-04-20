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
    
    signTransaction(txHash) {
        const signature = this.key.sign(txHash);
        return {
          r: signature.r.toString('hex'),
          s: signature.s.toString('hex'),
          recoveryParam: signature.recoveryParam
        };
      }
    getAddress() {
        return this.key.getPublic('hex');
    }
}

module.exports = Wallet;