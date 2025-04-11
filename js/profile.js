// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCi5n-L_ogUif2Bsq7l8qfU9Yoq9h7J6VE",
  authDomain: "cryptonix-67333.firebaseapp.com",
  databaseURL: "https://cryptonix-67333-default-rtdb.firebaseio.com",
  projectId: "cryptonix-67333",
  storageBucket: "cryptonix-67333.firebasestorage.app",
  appId: "1:701360318410:web:050c6ced8857cc0d2b5133"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Profile picture handling
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = document.getElementById('profilePicture');
    img.src = event.target.result;
    
    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      db.ref(`users/${user.uid}`).update({
        profilePicture: event.target.result
      }).then(() => {
        console.log('Profile picture updated');
      }).catch(error => {
        console.error('Error updating profile picture:', error);
      });
    }
  };
  reader.readAsDataURL(file);
});

// Load user profile with picture
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  db.ref(`users/${user.uid}`).once('value').then((snapshot) => {
    const userData = snapshot.val();
    if (!userData) return;
    
    // Display profile picture if available
    if (userData.profilePicture) {
      document.getElementById('profilePicture').src = userData.profilePicture;
    }
    
    // Format date of birth for display
    const dobDisplay = userData.dob ? 
      new Date(userData.dob).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Not set';

    // Display profile info
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
        <span>${userData.gender ? formatGender(userData.gender) : 'Not set'}</span>
      </div>
    `;

    // Set up edit profile form with current data
    document.getElementById('editName').value = userData.name || '';
    document.getElementById('editMobile').value = userData.mobile || '';
    document.getElementById('editDob').value = userData.dob || '';
    document.getElementById('editGender').value = userData.gender || '';
  });
});

// Helper function to format gender display
function formatGender(gender) {
  return gender.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Toggle MPIN change form
document.getElementById('changeMpinBtn').addEventListener('click', () => {
  document.getElementById('mpinChangeForm').classList.toggle('hidden');
});

// Toggle edit profile form
document.getElementById('editProfileBtn').addEventListener('click', () => {
  document.getElementById('editProfileForm').classList.remove('hidden');
});

// Cancel edit button
document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editProfileForm').classList.add('hidden');
});

// Change MPIN
document.getElementById('mpinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const currentMpin = document.getElementById('currentMpin').value;
  const newMpin = document.getElementById('newMpin').value;
  
  const user = auth.currentUser;
  if (!user) {
    alert('Not authenticated');
    return;
  }
  
  db.ref(`users/${user.uid}`).once('value').then((snapshot) => {
    const userData = snapshot.val();
    if (userData.mpin !== currentMpin) {
      throw new Error('Current MPIN is incorrect');
    }
    
    return db.ref(`users/${user.uid}`).update({ mpin: newMpin });
  }).then(() => {
    alert('MPIN changed successfully');
    document.getElementById('mpinChangeForm').classList.add('hidden');
    document.getElementById('currentMpin').value = '';
    document.getElementById('newMpin').value = '';
  }).catch((error) => {
    console.error('MPIN change error:', error);
    alert(`MPIN change failed: ${error.message}`);
  });
});

// Update profile
document.getElementById('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const updatedData = {
    name: document.getElementById('editName').value,
    mobile: document.getElementById('editMobile').value,
    dob: document.getElementById('editDob').value,
    gender: document.getElementById('editGender').value,
    lastUpdated: new Date().toISOString()
  };

  const user = auth.currentUser;
  if (!user) {
    alert('Not authenticated');
    return;
  }
  
  db.ref(`users/${user.uid}`).update(updatedData).then(() => {
    alert('Profile updated successfully!');
    document.getElementById('editProfileForm').classList.add('hidden');
    location.reload();
  }).catch((error) => {
    console.error('Profile update error:', error);
    alert(`Profile update failed: ${error.message}`);
  });
});

// Logout function
document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  }).catch((error) => {
    console.error('Logout error:', error);
    alert('Logout failed: ' + error.message);
  });
});