import { 
  auth,
  db,
  ref,
  set,
  get,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from './firebase.js';

// Generate 38-character wallet address (CRX + 35 characters)
function generateWalletAddress(userId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'CRX'; // First 3 characters CRX
  const seed = userId + Date.now().toString();
  
  for (let i = 0; i < 35; i++) { // Remaining 35 characters
    const mix = seed.charCodeAt(i % seed.length) + Math.floor(Math.random() * 100);
    const randomIndex = mix % chars.length;
    result += chars[randomIndex];
  }
  
  return result; // Total 38 characters (CRX + 35)
}

// Registration function
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const mpin = document.getElementById('mpin').value;
  
  // Validation
  if (!name || !email || !password || !mpin) {
    alert('Please fill all fields');
    return;
  }
  
  if (password.length < 8 || password.length > 12) {
    alert('Password must be 8-12 characters');
    return;
  }
  
  if (!/^\d{6}$/.test(mpin)) {
    alert('MPIN must be 6 digits');
    return;
  }

  try {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 2. Send email verification
    await sendEmailVerification(user);
    
    // 3. Generate wallet address (38 characters)
    const walletAddress = generateWalletAddress(user.uid);
    
    // 4. Prepare user data
    const userData = {
      name,
      email,
      mpin,
      uid: walletAddress, // 38-character address
      balance: 10.00,
      createdAt: new Date().toISOString(),
      emailVerified: false
    };
    
    // 5. Save to database
    await set(ref(db, `users/${user.uid}`), userData);
    
    alert(`Registration successful! Verification link sent to ${email}\nYour wallet address: ${walletAddress}`);
    window.location.href = 'verify-email.html';
  } catch (error) {
    console.error('Registration error:', error);
    
    let errorMessage = 'Registration failed. Please try again.';
    switch(error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email already registered';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter valid email';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password must be 8-12 characters';
        break;
      case 'PERMISSION_DENIED':
        errorMessage = 'Database error. Please contact support';
        break;
    }
    
    alert(errorMessage);
  }
});

// Login function with email verification check
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
    if (!user.emailVerified) {
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }
    
    // Verify user exists in database
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      await signOut(auth);
      throw new Error('User data not found. Please register again.');
    }
    
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found' || error.message === 'User data not found. Please register again.') {
      errorMessage = 'No account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.message === 'EMAIL_NOT_VERIFIED') {
      errorMessage = 'Email not verified. Please check your inbox for verification link.';
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