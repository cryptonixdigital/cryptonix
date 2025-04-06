import { 
  auth,
  db,
  ref,
  set,
  get,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from './firebase.js';

// Generate 35-character wallet address
function generateWalletAddress(userId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const seed = userId + Date.now().toString();
  
  for (let i = 0; i < 35; i++) {
    const randomIndex = seed.charCodeAt(i % seed.length) % chars.length;
    result += chars[randomIndex];
  }
  
  return result;
}

// Registration with complete validation
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const mpin = document.getElementById('mpin').value;
  
  // Validate inputs
  if (!name || !email || !password || !mpin) {
    alert('All fields are required');
    return;
  }
  
  if (password.length < 8 || password.length > 12) {
    alert('Password must be between 8 to 12 characters');
    return;
  }
  
  if (!/^\d{6}$/.test(mpin)) {
    alert('MPIN must be exactly 6 digits');
    return;
  }

  try {
    // 1. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    // 2. Generate wallet address
    const walletAddress = generateWalletAddress(userId);
    
    // 3. Prepare user data
    const userData = {
      name,
      email,
      mpin,
      uid: walletAddress,
      balance: 10.00,
      createdAt: new Date().toISOString()
    };
    
    // 4. Save to Realtime Database
    await set(ref(db, `users/${userId}`), userData);
    
    alert(`Registration successful!\nWallet Address: ${walletAddress}`);
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Registration error:', error);
    
    // User-friendly error messages
    let errorMessage = 'Registration failed. Please try again.';
    switch(error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be 8-12 characters.';
        break;
      case 'PERMISSION_DENIED':
        errorMessage = 'Database error. Please contact support.';
        break;
    }
    
    alert(errorMessage);
  }
});

// Login function
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Verify user exists in database
    const userRef = ref(db, `users/${userCredential.user.uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      await auth.signOut();
      throw new Error('User data not found. Please register again.');
    }
    
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    }
    
    alert(errorMessage);
  }
});

// Logout function
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  }
});