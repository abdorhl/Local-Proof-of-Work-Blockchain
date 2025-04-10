document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    
    // DOM Elements
    const blocksContainer = document.getElementById('blocks');
    const mempoolContainer = document.getElementById('mempool');
    const balancesContainer = document.getElementById('balances');
    const transactionForm = document.getElementById('transactionForm');
    
    // Generate a random address for this session
    const myAddress = 'user-' + Math.random().toString(36).substring(2, 8);
    document.getElementById('fromAddress').value = myAddress;
    
    // Display the user's address
    const addressDisplay = document.createElement('div');
    addressDisplay.innerHTML = `<p>Your address: <strong>${myAddress}</strong></p>`;
    document.querySelector('.transaction-section').prepend(addressDisplay);
    
    // Fetch and display blockchain
    async function loadBlockchain() {
        try {
            const response = await fetch(`${API_URL}/blocks`);
            const blocks = await response.json();
            
            blocksContainer.innerHTML = '';
            blocks.forEach(block => {
                const blockElement = document.createElement('div');
                blockElement.className = 'block';
                blockElement.innerHTML = `
                    <h3>Block #${block.index}</h3>
                    <p>Hash: ${block.hash.substring(0, 15)}...</p>
                    <p>Prev: ${block.previousHash.substring(0, 15)}...</p>
                    <p>Transactions: ${block.transactions.length}</p>
                    <button onclick="showBlockDetails(${block.index})">Details</button>
                `;
                blocksContainer.appendChild(blockElement);
            });
        } catch (error) {
            console.error('Error loading blockchain:', error);
        }
    }
    
    // Fetch and display mempool
    async function loadMempool() {
        try {
            const response = await fetch(`${API_URL}/mempool`);
            const transactions = await response.json();
            
            mempoolContainer.innerHTML = '';
            transactions.forEach(tx => {
                const txElement = document.createElement('div');
                txElement.className = 'transaction';
                txElement.innerHTML = `
                    <p>From: ${tx.from || 'Coinbase'}</p>
                    <p>To: ${tx.to}</p>
                    <p>Amount: ${tx.amount}</p>
                `;
                mempoolContainer.appendChild(txElement);
            });
        } catch (error) {
            console.error('Error loading mempool:', error);
        }
    }
    
    // Fetch and display wallet balances
    async function loadBalances() {
        try {
            const response = await fetch(`${API_URL}/blocks`);
            const blocks = await response.json();
            
            // Extract all unique addresses
            const addresses = new Set();
            blocks.forEach(block => {
                block.transactions.forEach(tx => {
                    if (tx.from) addresses.add(tx.from);
                    if (tx.to) addresses.add(tx.to);
                });
            });
            
            // Add our address if it's new
            addresses.add(myAddress);
            
            balancesContainer.innerHTML = '<h3>Wallet Balances</h3>';
            for (const address of addresses) {
                const balanceResponse = await fetch(`${API_URL}/balance/${address}`);
                const balanceData = await balanceResponse.json();
                
                const balanceElement = document.createElement('div');
                balanceElement.innerHTML = `
                    <p>Address: ${address}</p>
                    <p>Balance: ${balanceData.balance} coins</p>
                    <hr>
                `;
                balancesContainer.appendChild(balanceElement);
            }
        } catch (error) {
            console.error('Error loading balances:', error);
        }
    }
    
    // Handle transaction submission
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fromAddress = document.getElementById('fromAddress').value;
        const toAddress = document.getElementById('toAddress').value;
        const amount = parseFloat(document.getElementById('amount').value);
        
        try {
            const response = await fetch(`${API_URL}/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: fromAddress,
                    to: toAddress,
                    amount: amount
                })
            });
            
            const result = await response.json();
            alert(result.message || 'Transaction submitted');
            loadMempool();
            loadBalances();
        } catch (error) {
            console.error('Transaction error:', error);
            alert('Error submitting transaction: ' + error.message);
        }
    });
    
    // Global function to show block details
    window.showBlockDetails = async (blockIndex) => {
        try {
            const response = await fetch(`${API_URL}/blocks`);
            const blocks = await response.json();
            const block = blocks[blockIndex];
            
            let transactionsHTML = '';
            block.transactions.forEach(tx => {
                transactionsHTML += `
                    <div class="transaction">
                        <p>From: ${tx.from || 'Coinbase'}</p>
                        <p>To: ${tx.to}</p>
                        <p>Amount: ${tx.amount}</p>
                    </div>
                `;
            });
            
            alert(`
                Block #${block.index}
                Hash: ${block.hash}
                Previous Hash: ${block.previousHash}
                Timestamp: ${new Date(block.timestamp).toLocaleString()}
                Nonce: ${block.nonce}
                
                Transactions:
                ${transactionsHTML}
            `);
        } catch (error) {
            console.error('Error showing block details:', error);
        }
    };
    
    // Initial load
    loadBlockchain();
    loadMempool();
    loadBalances();
    
    // Refresh every 15 seconds
    setInterval(() => {
        loadBlockchain();
        loadMempool();
        loadBalances();
    }, 15000);
});