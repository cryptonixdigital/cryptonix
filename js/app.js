// Firebase configuration
const firebaseConfig = {
    databaseURL: "https://veta-a21a4-default-etdb.firebaseio.com/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const transactionList = document.getElementById('transactionList');
const loadingElement = document.getElementById('loading');
const noTransactionsElement = document.getElementById('noTransactions');
const logoutBtn = document.getElementById('logoutBtn');

// Modal elements
const transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
const detailId = document.getElementById('detail-id');
const detailDate = document.getElementById('detail-date');
const detailStatus = document.getElementById('detail-status');
const detailAmount = document.getElementById('detail-amount');
const detailType = document.getElementById('detail-type');
const detailSender = document.getElementById('detail-sender');
const detailRecipient = document.getElementById('detail-recipient');

// User data
let currentUser = null;
let userTransactions = [];

// Initialize the app
function init() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserTransactions();
        } else {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
        }
    });
}

// Load user transactions
function loadUserTransactions() {
    database.ref('transactions').orderByChild('timestamp').once('value')
        .then(snapshot => {
            const transactions = [];
            snapshot.forEach(childSnapshot => {
                const transaction = childSnapshot.val();
                transaction.id = childSnapshot.key;
                
                // Check if the current user is involved in this transaction
                if (transaction.senderId === currentUser.uid || transaction.recipientId === currentUser.uid) {
                    transactions.push(transaction);
                }
            });
            
            // Sort by timestamp (newest first)
            transactions.sort((a, b) => b.timestamp - a.timestamp);
            userTransactions = transactions;
            
            displayTransactions(transactions);
        })
        .catch(error => {
            console.error("Error loading transactions:", error);
            loadingElement.innerHTML = '<p class="text-danger">Error loading transactions. Please try again.</p>';
        });
}

// Display transactions in the list
function displayTransactions(transactions) {
    loadingElement.classList.add('d-none');
    
    if (transactions.length === 0) {
        noTransactionsElement.classList.remove('d-none');
        return;
    }
    
    transactionList.innerHTML = '';
    transactionList.classList.remove('d-none');
    
    transactions.forEach(transaction => {
        const isSender = transaction.senderId === currentUser.uid;
        const transactionType = isSender ? 'expense' : 'income';
        const oppositeUser = isSender ? transaction.recipientId : transaction.senderId;
        
        const li = document.createElement('li');
        li.className = `list-group-item transaction-item ${transactionType}`;
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${formatDate(transaction.timestamp)}</h6>
                    <small class="text-muted">${isSender ? 'To: ' : 'From: '}${oppositeUser.substring(0, 8)}...</small>
                </div>
                <div class="text-end">
                    <span class="fw-bold ${transactionType}">${isSender ? '-' : '+'}${transaction.amount}</span>
                    <div>
                        <small class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">
                            ${transaction.status}
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        li.addEventListener('click', () => showTransactionDetails(transaction));
        transactionList.appendChild(li);
    });
}

// Show transaction details in modal
function showTransactionDetails(transaction) {
    const isSender = transaction.senderId === currentUser.uid;
    
    // Format date
    const date = new Date(transaction.timestamp);
    const formattedDate = date.toLocaleString();
    
    // Set modal content
    detailId.textContent = transaction.id;
    detailDate.textContent = formattedDate;
    detailStatus.textContent = transaction.status;
    detailAmount.textContent = transaction.amount;
    detailType.textContent = isSender ? 'Sent' : 'Received';
    
    // Get sender and recipient details
    Promise.all([
        getUserDetails(transaction.senderId),
        getUserDetails(transaction.recipientId)
    ]).then(([sender, recipient]) => {
        detailSender.textContent = `${sender.name} (${sender.email})`;
        detailRecipient.textContent = `${recipient.name} (${recipient.email})`;
        
        // Show the modal
        transactionModal.show();
    });
}

// Get user details from Firebase
function getUserDetails(userId) {
    return database.ref('users/' + userId).once('value')
        .then(snapshot => snapshot.val());
}

// Format timestamp to readable date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Event listeners
logoutBtn.addEventListener('click', logout);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);