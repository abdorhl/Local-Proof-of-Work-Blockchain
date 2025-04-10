const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const Mempool = require('./mempool');

const app = express();
app.use(bodyParser.json());

const blockchain = new Blockchain();
const mempool = new Mempool();

// Start block generation interval
setInterval(() => {
    if (mempool.getTransactions().length > 0) {
        console.log('Time to mine a new block!');
        // In a real implementation, this would trigger mining
    }
}, blockchain.blockInterval);

// API Endpoints
app.get('/blocks', (req, res) => {
    res.json(blockchain.chain);
});

app.post('/transaction', (req, res) => {
    try {
        const transaction = req.body;
        blockchain.addTransaction(transaction);
        mempool.addTransaction(transaction);
        res.json({ message: 'Transaction added to mempool' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/mempool', (req, res) => {
    res.json(mempool.getTransactions());
});
app.get('/geneate', (req, res) => {
    //boutin aaa sawbi hadi 

});
app.get('/balance/:address', (req, res) => {
    const balance = blockchain.getBalanceOfAddress(req.params.address);
    res.json({ address: req.params.address, balance });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Blockchain server running on port ${PORT}`);
});