import { auth, db, ref, get, update } from './firebase.js';

// Change MPIN
document.getElementById('mpinForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentMpin = document.getElementById('currentMpin').value;
  const newMpin = document.getElementById('newMpin').value;
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Verify current MPIN
    const userSnapshot = await get(ref(db, `users/${user.uid}`));
    if (userSnapshot.val().mpin !== currentMpin) {
      throw new Error('Current MPIN is incorrect');
    }
    
    // Update MPIN
    await update(ref(db, `users/${user.uid}`), { mpin: newMpin });
    alert('MPIN changed successfully');
    document.getElementById('mpinChangeForm').classList.add('hidden');
  } catch (error) {
    console.error('MPIN change error:', error);
    alert(`MPIN change failed: ${error.message}`);
  }
});

// Toggle MPIN change form
document.getElementById('changeMpinBtn')?.addEventListener('click', () => {
  document.getElementById('mpinChangeForm').classList.toggle('hidden');
});

// Load profile info
auth.onAuthStateChanged(async (user) => {
  if (!user || !document.getElementById('profileInfo')) return;
  
  const snapshot = await get(ref(db, `users/${user.uid}`));
  if (snapshot.exists()) {
    const userData = snapshot.val();
    
    document.getElementById('profileInfo').innerHTML = `
      <div class="profile-field">
        <span class="field-label">Name:</span>
        <span>${userData.name}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Email:</span>
        <span>${userData.email}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Wallet UID:</span>
        <span>${userData.uid}</span>
      </div>
      <div class="profile-field">
        <span class="field-label">Balance:</span>
        <span>৳${userData.balance.toFixed(2)}</span>
      </div>
    `;
  }
});

// Load full transaction history
auth.onAuthStateChanged(async (user) => {
  if (!user || !document.getElementById('transactionsList')) return;
  
  const transactionsRef = ref(db, 'transactions');
  const snapshot = await get(transactionsRef);
  
  const transactions = [];
  snapshot.forEach((child) => {
    const tx = child.val();
    if (tx.senderId === user.uid || tx.recipientId === user.uid) {
      transactions.push({
        id: child.key,
        ...tx
      });
    }
  });
  
  // Sort by timestamp (newest first)
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Display all transactions
  const container = document.getElementById('transactionsList');
  if (container) {
    container.innerHTML = transactions.map(tx => `
      <div class="transaction-item">
        <div>
          <strong>${new Date(tx.timestamp).toLocaleString()}</strong><br>
          ${tx.senderId === user.uid ? 'Sent to' : 'Received from'} 
          ${tx.senderId === user.uid ? '...' + tx.recipientId.slice(-4) : '...' + tx.senderId.slice(-4)}
        </div>
        <div class="${tx.senderId === user.uid ? 'debit' : 'credit'}">
          ৳${tx.amount.toFixed(2)}
        </div>
      </div>
    `).join('');
  }
});