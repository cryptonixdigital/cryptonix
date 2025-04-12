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
      if (child.val().uid === recipientUid) {
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
      [`${recipientId}/balance`]: (allUsers.val()[recipientId].balance || 0) + amount
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
      document.getElementById('balanceAmount').textContent = `CRX${userData.balance.toFixed(2)}`;
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
  
  // Display transactions
  const container = document.getElementById('transactionsList');
  if (container) {
    container.innerHTML = transactions.slice(0, 5).map(tx => `
      <div class="transaction-item" data-txid="${tx.id}" 
           data-sender="${tx.senderId}" 
           data-recipient="${tx.recipientId}"
           data-amount="${tx.amount}"
           data-timestamp="${tx.timestamp}">
        <div>
          ${tx.senderId === userId ? 'Sent to' : 'Received from'} 
          ${tx.senderId === userId ? '...' + tx.recipientId.slice(-4) : '...' + tx.senderId.slice(-4)}
        </div>
        <div>CRX${tx.amount.toFixed(2)}</div>
      </div>
    `).join('');
    
    // Add click event listeners to transaction items
    document.querySelectorAll('.transaction-item').forEach(item => {
      item.addEventListener('click', () => {
        showTransactionDetails({
          id: item.dataset.txid,
          senderId: item.dataset.sender,
          recipientId: item.dataset.recipient,
          amount: item.dataset.amount,
          timestamp: item.dataset.timestamp
        });
      });
    });
  }
}

function showTransactionDetails(tx) {
  // Create popup container
  const popup = document.createElement('div');
  popup.className = 'transaction-popup';
  
  // Format date
  const date = new Date(parseInt(tx.timestamp));
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString();
  
  // Get user data for sender and recipient
  Promise.all([
    get(ref(db, `users/${tx.senderId}`)),
    get(ref(db, `users/${tx.recipientId}`))
  ]).then(([senderSnapshot, recipientSnapshot]) => {
    const sender = senderSnapshot.val();
    const recipient = recipientSnapshot.val();
    
    // Format IDs to show first 6 and last 4 characters
    const formatId = (id) => {
      return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
    };
    
    const fullSenderId = sender.uid; // সম্পূর্ণ সেন্ডার আইডি সংরক্ষণ
    const displaySenderId = formatId(sender.uid); // প্রদর্শনের জন্য ফরম্যাটেড আইডি
    
    popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-header">
          <h3>Transaction Details</h3>
          <button class="close-popup">&times;</button>
        </div>
        <div class="popup-body">
          <div class="detail-row">
            <span class="detail-label">Transaction ID:</span>
            <span class="detail-value">${formatId(tx.id)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date & Time:</span>
            <span class="detail-value">${formattedDate} at ${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">CRX${parseFloat(tx.amount).toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Sender:</span>
            <div class="id-with-copy">
              <span class="detail-value">${sender.name} (${displaySenderId})</span>
              <button class="copy-id-btn" title="Copy Sender ID">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-label">Recipient:</span>
            <span class="detail-value">${recipient.name} (${formatId(recipient.uid)})</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">Completed</span>
          </div>
        </div>
        <div class="popup-footer">
          <button class="screenshot-btn">Take Screenshot</button>
          <button class="close-btn">Close</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const closePopup = () => document.body.removeChild(popup);
    
    popup.querySelector('.close-popup').addEventListener('click', closePopup);
    popup.querySelector('.close-btn').addEventListener('click', closePopup);
    
    // কপি বাটনে ইভেন্ট লিসেনার যোগ করুন
    popup.querySelector('.copy-id-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(fullSenderId)
        .then(() => {
          const btn = popup.querySelector('.copy-id-btn');
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
          btn.setAttribute('title', 'Copied!');
          setTimeout(() => {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>';
            btn.setAttribute('title', 'Copy Sender ID');
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          alert('কপি করতে ব্যর্থ হয়েছে, ম্যানুয়ালি কপি করুন');
        });
    });
    
    popup.querySelector('.screenshot-btn').addEventListener('click', () => {
      // Implement screenshot functionality here
      alert('Screenshot functionality would be implemented here');
    });
    
    document.body.appendChild(popup);
  });
}