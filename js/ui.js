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

// Enhanced function to load user details with transaction history
async function loadUserWithTransactions(userId) {
  const userRef = ref(db, `users/${userId}`);
  const userSnapshot = await get(userRef);
  
  if (userSnapshot.exists()) {
    const userData = userSnapshot.val();
    return userData;
  }
  return null;
}

// Load profile info with enhanced transaction display
auth.onAuthStateChanged(async (user) => {
  if (!user || !document.getElementById('profileInfo')) return;

  const userData = await loadUserWithTransactions(user.uid);
  if (!userData) return;

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
      <div id="walletSection">
        <div id="walletQr"></div>
        <div style="display: flex; align-items: center; margin-top: 5px;">
          <span id="walletAddress" style="margin-right: 10px;">${userData.uid}</span>
          <button id="copyButton">Copy</button>
        </div>
      </div>
    </div>
    <div class="profile-field">
      <span class="field-label">Balance:</span>
      <span>CRX${userData.balance.toFixed(2)}</span>
    </div>
  `;

  // Generate QR code
  setTimeout(() => {
    new QRCode(document.getElementById("walletQr"), {
      text: userData.uid,
      width: 100,
      height: 100,
    });

    document.getElementById("copyButton").addEventListener("click", () => {
      const text = document.getElementById("walletAddress").textContent;
      navigator.clipboard.writeText(text).then(() => {
        alert("Wallet UID copied!");
      }).catch(err => {
        alert("Failed to copy: " + err);
      });
    });
  }, 100);
});

// Enhanced transaction history loader
auth.onAuthStateChanged(async (user) => {
  if (!user || !document.getElementById('transactionsList')) return;
  
  const transactionsRef = ref(db, 'transactions');
  const usersRef = ref(db, 'users');
  
  const [transactionsSnapshot, usersSnapshot] = await Promise.all([
    get(transactionsRef),
    get(usersRef)
  ]);
  
  const users = usersSnapshot.val();
  const transactions = [];
  
  transactionsSnapshot.forEach((child) => {
    const tx = child.val();
    if (tx.senderId === user.uid || tx.recipientId === user.uid) {
      const sender = users[tx.senderId] || {};
      const recipient = users[tx.recipientId] || {};
      
      transactions.push({
        id: child.key,
        ...tx,
        senderName: sender.name || 'Unknown',
        recipientName: recipient.name || 'Unknown'
      });
    }
  });
  
  // Sort by timestamp (newest first)
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Display all transactions with enhanced details
  const container = document.getElementById('transactionsList');
  if (container) {
    container.innerHTML = transactions.map(tx => `
      <div class="transaction-item">
        <div>
          <strong>${new Date(tx.timestamp).toLocaleString()}</strong><br>
          ${tx.senderId === user.uid ? 
            `Sent to ${tx.recipientName} (${tx.recipientId.slice(-4)})` : 
            `Received from ${tx.senderName} (${tx.senderId.slice(-4)})`}
          <div class="tx-status">Status: ${tx.status}</div>
        </div>
        <div class="${tx.senderId === user.uid ? 'debit' : 'credit'}">
          ₹${tx.amount.toFixed(2)}
        </div>
      </div>
    `).join('');
  }
});


// js/ui.js এর ভিতরে
document.getElementById("changeMpinBtn").addEventListener("click", () => {
  document.getElementById("mpinChangeForm").classList.toggle("show");
});



// Load profile info with additional fields
auth.onAuthStateChanged(async (user) => {
  if (!user || !document.getElementById('profileInfo')) return;

  const userData = await loadUserWithTransactions(user.uid);
  if (!userData) return;

  // Format date of birth for display
  const dobDisplay = userData.dob ? 
    new Date(userData.dob).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not set';

  document.getElementById('profileInfo').innerHTML = `
    <div class="profile-field">
      <span class="field-label">Name:</span>
      <span>${userData.name || 'Not set'}</span>
    </div>
    <div class="profile-field">
      <span class="field-label">Email:</span>
      <span>${userData.email || 'Not set'}</span>
    </div>
    <div class="profile-field">
      <span class="field-label">Mobile:</span>
      <span>${userData.mobile || 'Not set'}</span>
    </div>
    <div class="profile-field">
      <span class="field-label">Date of Birth:</span>
      <span>${dobDisplay}</span>
    </div>
    <div class="profile-field">
      <span class="field-label">Gender:</span>
      <span class="gender-display">${userData.gender ? formatGender(userData.gender) : 'Not set'}</span>
    </div>
    
  `;

  // Set up edit profile button
  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    document.getElementById('editProfileForm').classList.remove('hidden');
    // Populate form with current data
    document.getElementById('editName').value = userData.name || '';
    document.getElementById('editMobile').value = userData.mobile || '';
    document.getElementById('editDob').value = userData.dob || '';
    document.getElementById('editGender').value = userData.gender || '';
  });

  // Cancel edit button
  document.getElementById('cancelEdit')?.addEventListener('click', () => {
    document.getElementById('editProfileForm').classList.add('hidden');
  });

  // Handle profile form submission
  document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const updatedData = {
        name: document.getElementById('editName').value,
        mobile: document.getElementById('editMobile').value,
        dob: document.getElementById('editDob').value,
        gender: document.getElementById('editGender').value,
        lastUpdated: new Date().toISOString()
      };

      // Update in Firebase
      await update(ref(db, `users/${user.uid}`), updatedData);
      
      // Close the form and refresh profile
      document.getElementById('editProfileForm').classList.add('hidden');
      alert('Profile updated successfully!');
      
      // Reload profile data
      const updatedUserData = await loadUserWithTransactions(user.uid);
      if (updatedUserData) {
        // Re-display the updated profile
        const dobDisplay = updatedUserData.dob ? 
          new Date(updatedUserData.dob).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'Not set';

        document.getElementById('profileInfo').innerHTML = `
          <!-- Same profile display HTML as above with updated data -->
        `;
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert(`Profile update failed: ${error.message}`);
    }
  });
});

// Helper function to format gender display
function formatGender(gender) {
  return gender.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}