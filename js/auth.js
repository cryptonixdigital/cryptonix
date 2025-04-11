import { 
  auth,
  db,
  ref,
  set,
  get,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification // ✅ নতুন যোগ করা
} from './firebase.js';

// Generate 35-character wallet address
function generateWalletAddress(userId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const seed = userId + Date.now().toString();

  for (let i = 0; i < 35; i++) {
    const mix = seed.charCodeAt(i % seed.length) + Math.floor(Math.random() * 100);
    const randomIndex = mix % chars.length;
    result += chars[randomIndex];
  }

  return 'CRX' + result; // CRX prefix added
}

// Registration with email verification
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
    const user = userCredential.user;
    
    // 2. Send email verification
    await sendEmailVerification(user);
    
    // 3. Generate wallet address
    const walletAddress = generateWalletAddress(user.uid);
    
    // 4. Prepare user data
    const userData = {
      name,
      email,
      mpin,
      uid: walletAddress,
      balance: 10.00,
      createdAt: new Date().toISOString(),
      emailVerified: false // ✅ নতুন যোগ করা
    };
    
    // 5. Save to Realtime Database
    await set(ref(db, `users/${user.uid}`), userData);
    
    alert(`Registration successful! Please check your email (${email}) for verification link.\nYour Wallet Address: ${walletAddress}`);
    window.location.href = 'verify-email.html'; // ✅ নতুন যোগ করা
  } catch (error) {
    console.error('Registration error:', error);
    
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

// Login with email verification check
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified ✅ নতুন যোগ করা
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
    } else if (error.message === 'EMAIL_NOT_VERIFIED') { // ✅ নতুন যোগ করা
      errorMessage = 'Email not verified. Please check your inbox for verification link.';
    }
    
    alert(errorMessage);
  }
});

// Logout function (no changes)
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  }
});