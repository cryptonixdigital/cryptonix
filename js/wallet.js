import { auth, db, ref, get, update, set, onValue } from './firebase.js';
import { setupTransactionDetails } from './transactionWindow.js';

// Money transfer function
document.getElementById('transferForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const recipientUid = document.getElementById('recipientUid').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const mpin = document.getElementById('mpin').value;
  
  const transferBtn = document.getElementById('transferBtn');
  transferBtn.disabled = true;
  transferBtn.textContent = 'Processing...';
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    
    const userSnapshot = await get(ref(db, `users/${user.uid}`));
    const userData = userSnapshot.val();
    
    if (userData.mpin !== mpin) throw new Error('Wrong MPIN');
    if (userData.balance < amount) throw new Error('Insufficient balance');
    if (!recipientUid || recipientUid.length !== 38 || !recipientUid.startsWith('CRX')) {
      throw new Error('Invalid wallet address! Must start with CRX and be 38 characters');
    }
    
    const allUsers = await get(ref(db, 'users'));
    let recipientId = null;
    
    allUsers.forEach((child) => {
      if (child.val().uid === recipientUid) {
        recipientId = child.key;
      }
    });
    
    if (!recipientId) throw new Error('Recipient not found');
    
    const transactionId = Date.now().toString();
    
    await update(ref(db, 'users'), {
      [`${user.uid}/balance`]: userData.balance - amount,
      [`${recipientId}/balance`]: (allUsers.val()[recipientId].balance || 0) + amount
    });
    
    await set(ref(db, `transactions/${transactionId}`), {
      senderId: user.uid,
      recipientId,
      amount,
      timestamp: Date.now(),
      status: 'completed'
    });
    
    alert(`Successfully sent CRX ${amount.toFixed(2)}`);
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Transfer error:', error);
    alert(`Transfer failed: ${error.message}`);
    transferBtn.disabled = false;
    transferBtn.textContent = 'Send Now';
  }
});

// Load balance and user info
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  
  const userSnapshot = await get(ref(db, `users/${user.uid}`));
  if (userSnapshot.exists()) {
    const userData = userSnapshot.val();
    
    if (document.getElementById('userName')) {
      document.getElementById('userName').textContent = userData.name;
    }
    
    if (document.getElementById('userUid')) {
      document.getElementById('userUid').textContent = `Wallet Address: ${userData.uid}`;
    }
    
    if (document.getElementById('balanceAmount')) {
      document.getElementById('balanceAmount').textContent = `CRX ${userData.balance.toFixed(2)}`;
    }
  }
  
  if (document.getElementById('transactionsList')) {
    loadRecentTransactions(user.uid);
  }
});

// Load recent transactions
async function loadRecentTransactions(userId) {
  const transactionsRef = ref(db, 'transactions');
  const snapshot = await get(transactionsRef);
  
  const transactions = [];
  snapshot.forEach((child) => {
    const tx = child.val();
    if (tx.senderId === userId || tx.recipientId === userId) {
      transactions.push({
        id: child.key,
        ...tx
      });
    }
  });

  transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  const container = document.getElementById('transactionsList');
  if (container) {
    if (transactions.length === 0) {
      container.innerHTML = '<div class="no-transactions">0 transactions</div>';
      return;
    }

    container.innerHTML = transactions.slice(0, 5).map(tx => {
      const isSender = tx.senderId === userId;
      const shortTxId = tx.id.length > 13 ? tx.id.substring(0, 13) : tx.id;
      
      return `
        <div class="transaction-item"
             data-txid="${tx.id}"
             data-sender="${tx.senderId}"
             data-recipient="${tx.recipientId}"
             data-amount="${tx.amount}"
             data-timestamp="${tx.timestamp}">
          <div class="tx-id">TX: ${shortTxId}</div>
          <div class="tx-amount ${isSender ? 'sent' : 'received'}">
            ${isSender ? '-' : '+'} CRX ${tx.amount.toFixed(2)}
          </div>
        </div>
      `;
    }).join('');

    await setupTransactionDetails();
  }
}