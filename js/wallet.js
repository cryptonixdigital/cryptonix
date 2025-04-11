import { auth, db, ref, get, update, set, onValue } from './firebase.js';

// Transfer Money
document.getElementById('transferForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const recipientUid = document.getElementById('recipientUid').value.toUpperCase();
  const amount = parseFloat(document.getElementById('amount').value);
  const mpin = document.getElementById('mpin').value;
  
  const transferBtn = document.getElementById('transferBtn');
  transferBtn.disabled = true;
  transferBtn.textContent = 'Processing...';
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Verify MPIN
    const userSnapshot = await get(ref(db, `users/${user.uid}`));
    const userData = userSnapshot.val();
    
    if (userData.mpin !== mpin) {
      throw new Error('Invalid MPIN');
    }
    
    if (userData.balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Find recipient by UID
    const allUsers = await get(ref(db, 'users'));
    let recipientId = null;
    allUsers.forEach((child) => {
      if ((child.val().uid || '').toUpperCase() === recipientUid) {
        recipientId = child.key;
      }
    });
    
    if (!recipientId) {
      throw new Error('Recipient not found');
    }
    
    // Perform transaction
    const transactionId = Date.now().toString();
    
    await update(ref(db, 'users'), {
      [`${user.uid}/balance`]: userData.balance - amount,
      [`${recipientId}/balance`]: parseFloat((allUsers.val()[recipientId].balance || 0)) + amount
    });
    
    await set(ref(db, `transactions/${transactionId}`), {
      senderId: user.uid,
      recipientId,
      amount,
      timestamp: Date.now(),
      status: 'completed'
    });
    
    alert(`Successfully transferred CRX${amount.toFixed(2)}`);
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Transfer error:', error);
    alert(`Transfer failed: ${error.message}`);
    transferBtn.disabled = false;
    transferBtn.textContent = 'Transfer Now';
  }
});

// Load balance and user info
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  
  // Load user data
  const userSnapshot = await get(ref(db, `users/${user.uid}`));
  if (userSnapshot.exists()) {
    const userData = userSnapshot.val();
    
    if (document.getElementById('userName')) {
      document.getElementById('userName').textContent = userData.name;
    }
    
    if (document.getElementById('userUid')) {
      document.getElementById('userUid').textContent = `UID: ${userData.uid}`;
    }
    
    if (document.getElementById('balanceAmount')) {
  const balance = parseFloat(userData.balance || 0).toFixed(2);
  document.getElementById('balanceAmount').textContent = `CRX,${balance}`;
}
  }
  
  // Load transactions for dashboard
  if (document.getElementById('transactionsList')) {
    loadRecentTransactions(user.uid);
  }
});

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
  
  // Sort by timestamp (newest first)
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Display 5 most recent
  const container = document.getElementById('transactionsList');
  if (container) {
    container.innerHTML = transactions.slice(0, 5).map(tx => `
      <div class="transaction-item">
        <div>
          ${tx.senderId === userId ? 'Sent to' : 'Received from'} 
          ${tx.senderId === userId ? '...' + tx.recipientId.slice(-4) : '...' + tx.senderId.slice(-4)}
        </div>
        <div>CRX,${tx.amount.toFixed(2)}</div>
      </div>
    `).join('');
  }
}