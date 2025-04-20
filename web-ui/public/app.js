document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    const REFRESH_INTERVAL = 15000; // 15 seconds
    let currentSession = localStorage.getItem('walletSession');
    let currentWallet = null;
    // Add UI event listeners here
    document.getElementById('mineButton').addEventListener('click', mineBlock);


    // DOM Elements
    const elements = {
        modal: createModal(),
        blocksContainer: document.getElementById('blocks'),
        mempoolContainer: document.getElementById('mempool'),
        balancesContainer: document.getElementById('balances'),
        transactionForm: document.getElementById('transactionForm')
    };

    // Initialization
    initializeApplication();

    // --------------------------
    // Core Functions
    // --------------------------

    function initializeApplication() {
        document.body.appendChild(elements.modal);
        setupEventListeners();
        checkExistingSession();
        loadInitialData();
        setupDataRefresh();
    }

    async function checkExistingSession() {
        if (!currentSession) {
            elements.modal.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/validate-session`, {
                headers: { 'Authorization': currentSession }
            });
            
            if (response.ok) {
                currentWallet = await response.json();
                showWalletInfo();
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            elements.modal.style.display = 'block';
        }
    }

    // --------------------------
    // Wallet Management
    // --------------------------

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'walletModal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Connect Wallet</h2>
                <div id="walletOptions">
                    <button id="connectOwner">Connect Owner Wallet</button>
                    <button id="createWallet">Create New Wallet</button>
                </div>
                <div id="loginForm" style="display:none;">
                    <input type="text" id="privateKey" placeholder="Private Key">
                    <button id="submitLogin">Connect</button>
                </div>
            </div>
        `;
        return modal;
    }

    async function handleWalletCreation() {
        try {
            const response = await fetch(`${API_URL}/create-wallet`);
            const wallet = await response.json();
            
            // Show private key to user
            const shouldSave = confirm(`New wallet created!\n\nAddress: ${wallet.address}\nPrivate Key: ${wallet.privateKey}\n\nSAVE THIS PRIVATE KEY NOW. Click OK to continue.`);
            
            if (shouldSave) {
                currentSession = wallet.sessionToken;
                currentWallet = wallet;
                
                localStorage.setItem('walletSession', currentSession);
                elements.modal.style.display = 'none';
                
                showWalletInfo();
                loadData();
            } else {
                await fetch(`${API_URL}/delete-wallet`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': wallet.sessionToken
                    }
                });
                alert('Wallet creation canceled');
            }
        } catch (error) {
            console.error('Wallet creation failed:', error);
            alert('Wallet creation failed: ' + error.message);
        }
    }

    async function handleOwnerLogin(privateKey) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ privateKey })
            });

            if (!response.ok) throw new Error('Login failed');

            const { sessionToken, wallet } = await response.json();
            
            currentSession = sessionToken;
            currentWallet = wallet;
            
            localStorage.setItem('walletSession', currentSession);
            elements.modal.style.display = 'none';
            
            showWalletInfo();
            loadData();
        } catch (error) {
            console.error('Login error:', error);
            alert('Invalid private key or connection error');
        }
    }

    function showWalletInfo() {
        const walletInfo = document.createElement('div');
        walletInfo.id = 'walletInfo';
        walletInfo.innerHTML = `
            <p>Connected Wallet: ${currentWallet.address.substring(0, 20)}...</p>
            <p>Balance: <span id="walletBalance">Loading...</span></p>
            <button id="disconnect">Disconnect</button>
        `;
        
        document.querySelector('.container').prepend(walletInfo);
        updateWalletBalance();
    }

    async function updateWalletBalance() {
        try {
            const balance = await getBalance(currentWallet.address);
            document.getElementById('walletBalance').textContent = 
                `${balance} AbbuCoin`;
        } catch (error) {
            console.error('Balance update failed:', error);
        }
    }

    // --------------------------
    // Data Management
    // --------------------------

    async function loadInitialData() {
        await Promise.all([
            loadBlockchain(),
            loadMempool(),
            loadBalances()
        ]);
    }

    function setupDataRefresh() {
        setInterval(() => {
            loadData();
            if (currentWallet) updateWalletBalance();
        }, REFRESH_INTERVAL);
    }

    async function loadData() {
        await Promise.all([
            loadBlockchain(),
            loadMempool(),
            loadBalances()
        ]);
    }

    async function loadBlockchain() {
        try {
            const response = await fetch(`${API_URL}/blocks`);
            const blocks = await response.json();
            renderBlocks(blocks);
        } catch (error) {
            console.error('Blockchain load error:', error);
        }
    }

    async function loadMempool() {
        try {
            const response = await fetch(`${API_URL}/mempool`);
            const transactions = await response.json();
            renderMempool(transactions);
        } catch (error) {
            console.error('Mempool load error:', error);
        }
    }

    async function loadBalances() {
        try {
            const response = await fetch(`${API_URL}/blocks`);
            const blocks = await response.json();
            const addresses = extractAddresses(blocks);
            renderBalances(addresses);
        } catch (error) {
            console.error('Balances load error:', error);
        }
    }

    // --------------------------
    // Render Functions
    // --------------------------

    function renderBlocks(blocks) {
        elements.blocksContainer.innerHTML = blocks.map(block => `
            <div class="block">
                <h3>Block #${block.index}</h3>
                <p>Hash: ${block.hash.substring(0, 15)}...</p>
                <p>Prev: ${block.previousHash.substring(0, 15)}...</p>
                <p>Transactions: ${block.transactions.length}</p>
                <button onclick="showBlockDetails(${block.index})">Details</button>
            </div>
        `).join('');
    }

    function renderMempool(transactions) {
        elements.mempoolContainer.innerHTML = transactions.map(tx => `
            <div class="transaction">
                <p>From: ${tx.from || 'Coinbase'}</p>
                <p>To: ${tx.to}</p>
                <p>Amount: ${tx.amount}</p>
            </div>
        `).join('');
    }

    async function renderBalances(addresses) {
        try {
            // Always include current wallet if exists
            if (currentWallet) {
                addresses.add(currentWallet.address);
            }
            
            const balancePromises = Array.from(addresses).map(async address => {
                const response = await fetch(`${API_URL}/balance/${address}`);
                return response.json();
            });
            
            const balances = await Promise.all(balancePromises);
            
            elements.balancesContainer.innerHTML = `
                <h3>Wallet Balances</h3>
                ${balances.map(({ address, balance }) => `
                    <div class="balance-item ${address === currentWallet?.address ? 'current-wallet' : ''}">
                        <p>Address: ${address.substring(0, 12)}...</p>
                        <p>Balance: ${balance} AbbuCoin</p>
                    </div>
                `).join('')}
            `;
        } catch (error) {
            console.error('Balance render error:', error);
            elements.balancesContainer.innerHTML = '<div class="error">Error loading balances</div>';
        }
    }

    // --------------------------
    // Utility Functions
    // --------------------------

    function extractAddresses(blocks) {
        const addresses = new Set();
        blocks.forEach(block => {
            block.transactions.forEach(tx => {
                if (tx.from) addresses.add(tx.from);
                if (tx.to) addresses.add(tx.to);
            });
        });
        return Array.from(addresses);
    }

    async function getBalance(address) {
        const response = await fetch(`${API_URL}/balance/${address}`);
        const data = await response.json();
        return data.balance;
    }

    // --------------------------
    // Event Handlers
    // --------------------------

    function setupEventListeners() {
        // Wallet Management
        document.getElementById('connectOwner').addEventListener('click', () => {
            document.getElementById('walletOptions').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        });

        document.getElementById('createWallet').addEventListener('click', handleWalletCreation);
        document.getElementById('submitLogin').addEventListener('click', () => {
            const privateKey = document.getElementById('privateKey').value;
            handleOwnerLogin(privateKey);
        });

        // Transaction Handling
        elements.transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const to = document.getElementById('toAddress').value;
            const amount = parseFloat(document.getElementById('amount').value);

            try {
                const response = await fetch(`${API_URL}/transaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': currentSession
                    },
                    body: JSON.stringify({ to, amount })
                });

                if (response.ok) {
                    alert('Transaction submitted!');
                    loadData();
                }
            } catch (error) {
                alert('Transaction failed: ' + error.message);
            }
        });

        // Disconnect Handler
        document.addEventListener('click', (e) => {
            if (e.target.id === 'disconnect') {
                localStorage.removeItem('walletSession');
                window.location.reload();
            }
        });
    }

    async function mineBlock() {
        const minerAddress = document.getElementById('minerAddress').value;
        try {
          const response = await fetch('http://localhost:3000/mine', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ minerAddress })
          });
          const result = await response.json();
          updateStatus(result.message);
        } catch (error) {
          updateStatus(`Mining error: ${error.message}`);
        }
      }
      
      function updateStatus(message) {
        document.getElementById('status').textContent = message;
      }

    // Global Function
    window.showBlockDetails = async (blockIndex) => {
        try {
            const response = await fetch(`${API_URL}/blocks`);
            const blocks = await response.json();
            const block = blocks[blockIndex];
            
            const transactionsHTML = block.transactions.map(tx => `
                <div class="transaction">
                    <p>From: ${tx.from || 'Coinbase'}</p>
                    <p>To: ${tx.to}</p>
                    <p>Amount: ${tx.amount}</p>
                </div>
            `).join('');

            alert(`
                Block #${block.index}
                Hash: ${block.hash}
                Previous Hash: ${block.previousHash}
                Timestamp: ${new Date(block.timestamp).toLocaleString()}
                Nonce: ${block.nonce}
                Transactions: ${transactionsHTML}
            `);
        } catch (error) {
            console.error('Block details error:', error);
        }
    };
});