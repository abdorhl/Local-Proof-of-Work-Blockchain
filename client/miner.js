const axios = require('axios');

const API_URL = 'http://localhost:3000';
const MINER_ADDRESS = 'miner-address-1'; // Just a string identifier

async function mineBlock() {
    try {
        // Get pending transactions
        const response = await axios.get(`${API_URL}/mempool`);
        const transactions = response.data;
        
        if (transactions.length === 0) {
            console.log('No transactions to mine');
            return;
        }
        
        console.log(`Mining block with ${transactions.length} transactions...`);
        
        // In this simplified version, we'll just tell the server to mine
        const mineResponse = await axios.post(`${API_URL}/mine`, {
            minerAddress: MINER_ADDRESS
        });
        
        console.log('Block mined:', mineResponse.data);
    } catch (error) {
        console.error('Mining error:', error.message);
    }
}

// Mine every 30 seconds
setInterval(mineBlock, 30000);

console.log(`Miner started with address: ${MINER_ADDRESS}`);