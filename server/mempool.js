class Mempool {
    constructor() {
        this.transactions = [];
    }
    
    addTransaction(transaction) {
        this.transactions.push(transaction);
    }
    
    getTransactions() {
        return this.transactions;
    }
    
    clearTransactions() {
        this.transactions = [];
    }
}

module.exports = Mempool;