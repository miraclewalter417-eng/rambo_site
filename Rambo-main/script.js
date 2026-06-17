// --- THE MASTER KEY CATCHER (Add to your Main Site's script.js) ---
// --- THE MASTER KEY CATCHER (Final Version) ---
const params = new URLSearchParams(window.location.search);
const token = params.get('impersonateToken');

if (token) {
    // 1. Clean the URL immediately so the token disappears
    window.history.replaceState({}, document.title, "/");

    // 2. Wait a split second for Firebase to be fully awake
    setTimeout(() => {
        console.log("Boss Kingsley: Unlocking user account...");

        // 3. Use the token to log in
        // NOTE: Make sure 'signInWithCustomToken' is imported at the top!
        signInWithCustomToken(auth, token)
            .then((userCredential) => {
                console.log("Success! Logged in as:", userCredential.user.email);
                
                // 4. Set the 'Boss' flag
                sessionStorage.setItem("isImpersonating", "true");
                
                // 5. CRITICAL: Refresh the page so your site 
                // realizes it should show the dashboard now
                window.location.reload(); 
            })
            .catch((err) => {
                console.error("Login failed:", err.message);
                alert("The secure link expired. Please try again from the Admin Panel.");
            });
    }, 500); // 500ms is enough to let the script breathe
}



// ===================== FIREBASE & FIRESTORE SETUP ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  increment,
  query,
  where,
  arrayUnion, 
  runTransaction,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// 1. MAIN Database Config (The one you've been using)
const mainConfig = {
  apiKey: "AIzaSyAZmHDphXh9nog-AKKYDEjRMGFBesPX5FA",
  authDomain: "mimiads-market.firebaseapp.com",
  projectId: "mimiads-market",
  storageBucket: "mimiads-market.firebasestorage.app",
  messagingSenderId: "336481233471",
  appId: "1:336481233471:web:3d937c108c4156c022e68a",
  measurementId: "G-0W9N3L6KYB"
};

// 2. HEAVY LOAD Database Config (The new one for Deposits/Withdrawals)
const heavyLoadConfig = {
  apiKey: "AIzaSyB31b1NhUPNpTFlxe8FpwrDu6kiwKR5IhA",
  authDomain: "oga-viral.firebaseapp.com",
  projectId: "oga-viral",
  storageBucket: "oga-viral.firebasestorage.app",
  messagingSenderId: "1003908808185",
  appId: "1:1003908808185:web:e6378ca372888d2080d128",
  measurementId: "G-E48F3DS2CP"
};

// 3. CORE NEXT Database Config (The third instance)
const coreNextConfig = {
  apiKey: "AIzaSyAlglNiJCX2BDC-RfbD_438f26r6L8Kq7w",
  authDomain: "ads-manager-b7cf2.firebaseapp.com",
  projectId: "ads-manager-b7cf2",
  storageBucket: "ads-manager-b7cf2.firebasestorage.app",
  messagingSenderId: "45297966034",
  appId: "1:45297966034:web:58941a5de594dfabec460b",
  measurementId: "G-N0MY6616BK"
};
// --- INITIALIZATION ---

// Initialize Main App (Default)
const app = initializeApp(mainConfig);
const db = getFirestore(app); // Use 'db' for profiles, auth, etc.
const auth = getAuth(app);    // Use this for Login

// Initialize Heavy Load App (Named)
const heavyApp = initializeApp(heavyLoadConfig, "heavyApp"); 
const transactionDb = getFirestore(heavyApp); // Use 'transactionDb' for deposits/withdrawals

const coreNextApp = initializeApp(coreNextConfig, "coreNextApp");
const coreNextDb = getFirestore(coreNextApp); // Use 'coreNextDb' to read/write to this third database

console.log("Main App loaded:", app.name);
console.log("HeavyLoad App loaded:", heavyApp.name);
console.log("CoreNext App loaded:", coreNextApp.name);
// ======================================================================

let autoClaimStarted = false; 
let isAppInitialized = false;
let balanceAmount; // This will hold your balance display element


window.FintechNotify = {
  base: Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#111',
    customClass: {
      popup: 'fintech-toast-offset'
    }
  }),

  success(title, text = '') {
    return this.base.fire({ icon: 'success', title, text });
  },
  info(title, text = '') {
    return this.base.fire({ icon: 'info', title, text });
  },
  warning(title, text = '') {
    return this.base.fire({ icon: 'warning', title, text });
  },
  error(title, text = '') {
    return this.base.fire({ icon: 'error', title, text });
  }
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});





/**
 * Global Toast Notification
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'error', or 'warning'
 */
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `modern-toast toast-${type}`;
    
    // Icon Logic
    let icon = 'fa-circle-info';
    if(type === 'success') icon = 'fa-circle-check';
    if(type === 'error') icon = 'fa-circle-xmark';
    if(type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Slide in from right
    setTimeout(() => toast.classList.add('show'), 50);

    // Stay for 3 seconds, then slide back out
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};



let currentDepositId = null;
let countdownTimer = null;



// ======================================================
// CHANGE PAGE
// ======================================================
function changePage(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.style.display = 'none';
    });

    const target = document.getElementById(pageId);
    if (target) {
        target.style.display = 'block';
        localStorage.setItem('lastPage', pageId);
    }
}

// ======================================================
// DOM READY - INSTANT CHECK BEFORE FIREBASE WAKES UP
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');

    const wasLoggedIn = localStorage.getItem('isLoggedIn');
    const savedPage = localStorage.getItem('lastPage') || 'dashboard';

    if (wasLoggedIn === 'true') {
        // Hide auth forms immediately to prevent flicker
        if (signupContainer) signupContainer.classList.remove('active');
        if (loginContainer) loginContainer.classList.remove('active');

        // Show the page they were on
        const targetPage = document.getElementById(savedPage);
        if (targetPage) targetPage.style.display = 'block';
    } else {
        // Not logged in — show login by default
        if (signupContainer) signupContainer.classList.remove('active');
        if (loginContainer) loginContainer.classList.add('active');
    }

    // --- LIVE PAYOUT NOTIFICATION TICKER ---
    const payoutText = document.getElementById('payoutText');
    if (payoutText) {
        const prefixes = ['0803', '0816', '0706', '0905', '0805', '0913', '0809', '0703', '0814', '0902'];
        const actions = ['withdrew', 'received payout of', 'earned commission of'];
        const amounts = [5000, 7500, 10000, 15000, 22000, 35000, 45000, 50000, 85000, 120000];
        
        function updatePayout() {
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = Math.floor(100 + Math.random() * 900);
            const action = actions[Math.floor(Math.random() * actions.length)];
            const amount = amounts[Math.floor(Math.random() * amounts.length)];
            
            payoutText.classList.add('fade');
            setTimeout(() => {
                payoutText.innerText = `User ${prefix}***${suffix} ${action} ₦${amount.toLocaleString()}`;
                payoutText.classList.remove('fade');
            }, 400);
        }
        
        updatePayout();
        setInterval(updatePayout, 4500);
    }

    // --- AUTOMATIC FLYER SLIDER CAROUSEL ---
    const balanceFlyer = document.querySelector('.balance-flyer');
    if (balanceFlyer) {
        let activeIndex = 0;
        const slides = balanceFlyer.querySelectorAll('.flyer-card');
        const totalSlides = slides.length;
        
        function autoScroll() {
            if (totalSlides === 0) return;
            const width = balanceFlyer.clientWidth;
            if (width === 0) return;
            
            // Adjust index to match current user scroll position
            activeIndex = Math.round(balanceFlyer.scrollLeft / width);
            
            // Move to the next slide
            activeIndex = (activeIndex + 1) % totalSlides;
            
            balanceFlyer.scrollTo({
                left: activeIndex * width,
                behavior: 'smooth'
            });
        }
        
        setInterval(autoScroll, 4000); // Shift slide every 4 seconds
    }
});

// ======================================================
// AUTH STATE LISTENER
// ======================================================
onAuthStateChanged(auth, async (user) => {
    const body = document.body;
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    const dashboard = document.getElementById('dashboard');

    body.classList.remove('auth-loading');

    if (!user) {
        isAppInitialized = false;
        autoClaimStarted = false;
        localStorage.setItem('isLoggedIn', 'false');
        localStorage.setItem('lastPage', 'dashboard'); // Ensure next login defaults to dashboard

        body.classList.remove('logged-in');
        if (dashboard) dashboard.style.display = 'none';

        // Show LOGIN by default when logged out
        if (signupContainer) signupContainer.classList.remove('active');
        if (loginContainer) loginContainer.classList.add('active');
        return;
    }

    // USER IS LOGGED IN
    localStorage.setItem('isLoggedIn', 'true');
    body.classList.add('logged-in');

    if (loginContainer) loginContainer.classList.remove('active');
    if (signupContainer) signupContainer.classList.remove('active');

    // Show bottom navigation bar
    const bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.style.display = "flex";

    // Stay on the page they were on
    const currentSavedPage = localStorage.getItem('lastPage') || 'dashboard';
    const pageToDisplay = document.getElementById(currentSavedPage);
    if (pageToDisplay) pageToDisplay.style.display = 'block';

    if (isAppInitialized) return;

    console.log("Initializing user data...");
    afterLogin();

    await loadBalance();
    startAutoClaim();
   

    isAppInitialized = true;
});

// ======================================================
// POPUP FUNCTION
// ======================================================
function showWelcomePopup() {
    const welcomePopup = document.getElementById('welcomePopup');
    if (welcomePopup) {
        welcomePopup.style.display = 'flex';
    }
}

// ======================================================
// POST-LOGIN
// ======================================================
function afterLogin() {
    showWelcomePopup();
}

// ======================================================
// SHOW / HIDE AUTH FORMS
// ======================================================
function showSignup() {
    document.getElementById("loginContainer").classList.remove("active");
    document.getElementById("signupContainer").classList.add("active");
}

function showLogin() {
    document.getElementById("signupContainer").classList.remove("active");
    document.getElementById("loginContainer").classList.add("active");
}

window.showLogin = showLogin;
window.showSignup = showSignup;

// ======================================================
// PASSWORD EYE TOGGLE
// ======================================================
document.querySelectorAll('.eye-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const inputId = btn.getAttribute('data-target');
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
      btn.classList.add('active');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
      btn.classList.remove('active');
    }
  });
});

// ======================================================
// PROFILE
// ======================================================
window.openProfile = function() {
    console.log("Profile clicked!");
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.display = "block";
};

function showAlert(message) {
  const alertBox = document.getElementById('customAlert');
  alertBox.textContent = message;
  alertBox.style.opacity = '1';
  alertBox.style.transform = 'translateY(0)';

  // Hide after 3 seconds
  setTimeout(() => {
    alertBox.style.opacity = '0';
    alertBox.style.transform = 'translateY(-20px)';
  }, 3000);
}


function showLoader(options) {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  // options: { callback: function, url: string }
  const { callback, url } = options || {};

  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
      if (typeof callback === 'function') {
        callback();  // run JS action (signup/login)
      } else if (url) {
        window.location.href = url; // redirect to page
      }
    }, 500); // fade-out duration
  }, 3000); // loader visible for 3 seconds
}


// Function to simulate page load
function loadPage(url) {
  const loader = document.getElementById('pageLoader');
  loader.style.opacity = '1';
  loader.style.display = 'flex';

  // After 3 seconds, redirect or show content
  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => { 
      loader.style.display = 'none';
      // If real page redirect:
      window.location.href = url;
      // If single-page content, you can instead show/hide sections here
    }, 500);
  }, 3000);
}


// Elements
const signupContainer = document.getElementById('signupContainer');
const loginContainer = document.getElementById('loginContainer');
const dashboard = document.getElementById('dashboard');


// Initial display
signupContainer.classList.add('active');




// --- GLOBAL CONFIG & LOCKS ---
const MS_IN_DAY = 20 * 60 * 60 * 1000; // 20-hour income cycle
let isSyncingNow = false; // 🔒 The "Guard" that stops double drops

// ====================== AUTO-FILL REFERRAL ======================
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const ref = urlParams.get('ref');
  if (ref) {
    const referralInput = document.getElementById('referral');
    if (referralInput) referralInput.value = ref;
  }
});


// ====================== SIGNUP ======================
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  const number = document.getElementById('number').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const referral = document.getElementById('referral').value.trim();

  if (!number || !password || !confirmPassword) {
    loader.style.display = 'none';
    window.showToast('Validation Failed: All fields are required!', 'error');
    return;
}

if (password !== confirmPassword) {
    loader.style.display = 'none';
    window.showToast('Validation Failed: Passwords do not match!', 'error');
    return;
}
  try {
    const fakeEmail = `${number}@user.com`;

    // 1️⃣ Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      fakeEmail,
      password
    );
    const user = userCredential.user;

    // 2️⃣ Generate referral ID
    const referralId =
      Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('') + Math.floor(100 + Math.random() * 900);

    // 3️⃣ Resolve referrer
    let referrerId = "";
    let grandReferrerId = "";

    if (referral) {
      const refQuery = query(
        collection(db, "users"),
        where("referralId", "==", referral)
      );
      const refSnap = await getDocs(refQuery);

      if (!refSnap.empty) {
        referrerId = refSnap.docs[0].id;
        grandReferrerId = refSnap.docs[0].data().referrerId || "";
      }
    }

   // --- Step 4.0: Get the Bonus you set in Admin Panel ---
let dynamicBonus = 500; // This is only the backup if the DB fails
try {
    // CHANGE THIS LINE to match your Admin Panel path
    const adminSnap = await getDoc(doc(db, "adminSettings", "globals")); 
    
    if (adminSnap.exists()) {
        // Use the value from your Admin Panel
        const cloudBonus = adminSnap.data().welcomeBonus;
        
        // If there is a value in the cloud, use it. Otherwise, stay at 700.
        if (cloudBonus !== undefined && cloudBonus !== null) {
            dynamicBonus = Number(cloudBonus);
        }
    }
} catch (e) {
    console.error("Error fetching admin bonus:", e);
}

// --- Step 4.1: Create Firestore user document ---
await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    number,
    referral: referral || "",
    referralId,
    referrerId,

    // USE THE DYNAMIC BONUS HERE
    balance: dynamicBonus, 
    bonus: dynamicBonus,

    createdAt: new Date(),
    banned: false,

    referrals: {
        level1: [],
        level2: []
    },

    trackedInvestments: [],
    totalCommission: 0,
    availableCommissionLevel1: 0,
    availableCommissionLevel2: 0
});


// --- Step 4.2: UPDATE GLOBAL USER STATS (QUOTA SAVER) ---
try {
    await setDoc(doc(db, "adminSettings", "stats"), {
        totalUsers: increment(1)
    }, { merge: true });
    console.log("Global user count incremented.");
} catch (statsErr) {
    console.error("Failed to update global user count:", statsErr);
    // We don't stop the signup even if the stats update fails
}


    // 5️⃣ Update referrer records
    if (referrerId) {
      await updateDoc(doc(db, "users", referrerId), {
        "referrals.level1": arrayUnion({
          uid: user.uid,
          number,
          createdAt: new Date()
        })
      });

      if (grandReferrerId) {
        await updateDoc(doc(db, "users", grandReferrerId), {
          "referrals.level2": arrayUnion({
            uid: user.uid,
            number,
            createdAt: new Date()
          })
        });
      }
    }

    // ✅ Auto-login after signup
window.showToast('Signup Successful: Logging you in...', 'success');

// Optionally show dashboard immediately
showDashboard();
startInvestmentSystem(user.uid);
} catch (err) {
    console.error("Auth Error Code:", err.code);

    // Default message if we don't recognize the error
    let cleanMessage = "An unexpected error occurred. Please try again.";

    // 🛡️ CUSTOM CLEAN MESSAGES
    if (err.code === 'auth/email-already-in-use') {
        cleanMessage = "This mobile number is already registered.";
    } else if (err.code === 'auth/invalid-email') {
        cleanMessage = "Invalid mobile number format.";
    } else if (err.code === 'auth/weak-password') {
        cleanMessage = "Password is too weak. Please use at least 6 characters.";
    } else if (err.code === 'auth/network-request-failed') {
        cleanMessage = "Network error. Please check your connection.";
    } else if (err.code === 'auth/operation-not-allowed') {
        cleanMessage = "Signup is currently disabled.";
    }

   window.showToast(`Signup Failed: ${cleanMessage}`, 'error');

} finally {
    // Hide the loader regardless of success or failure
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
    }, 500);
}
});

// ====================== LOGIN ======================
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  const loginNumber = document.getElementById('loginNumber').value.trim();
  const loginPassword = document.getElementById('loginPassword').value.trim();
  const fakeEmail = `${loginNumber}@user.com`;

  try {
    // 1️⃣ Sign in user
    const userCredential = await signInWithEmailAndPassword(
      auth,
      fakeEmail,
      loginPassword
    );
    const user = userCredential.user;

    // 2️⃣ Validate Firestore user
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

   if (!userSnap.exists()) {
    await signOut(auth);
    window.showToast('User Not Found: User record not found!', 'error');
    return;
}

if (userSnap.data().banned) {
    await signOut(auth);
    window.showToast('Account Banned: Your account has been banned. Contact support.', 'error');
    return;
}

    // 3️⃣ Setup referral (safe, no UI)
    setupReferral(user);

    // 4️⃣ Real-time banned watcher
onSnapshot(userDocRef, (docSnap) => {
  if (docSnap.exists() && docSnap.data().banned) {
    window.showToast('Account Banned: Your account has been banned. Logging out...', 'error');
    signOut(auth).then(() => window.location.reload());
  }
});

 
    // Backfill old investment profits
    await backfillInvestmentRecords(user.uid);

    // ✅ Always land on Home (dashboard) after login, not the last visited page
    localStorage.setItem('lastPage', 'dashboard');

    // ❌ NO UI LOGIC HERE
    // Auth state listener will handle dashboard & navbar

 } catch (error) {
    console.error("Login Error Code:", error.code);

    // ✅ PROFESSIONAL SECRECY: Don't tell them if it's the number or the password that is wrong.
    // This stops people from "probing" your database to see who is registered.
    let cleanMessage = "Invalid mobile number or password.";

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        cleanMessage = "Invalid mobile number or password.";
    } else if (error.code === 'auth/user-disabled') {
        cleanMessage = "This account has been suspended. Please contact support.";
    } else if (error.code === 'auth/too-many-requests') {
        cleanMessage = "Too many failed attempts. Please try again later.";
    } else if (error.code === 'auth/network-request-failed') {
        cleanMessage = "Network error. Please check your internet connection.";
    }

    window.showToast(`Login Failed: ${cleanMessage}`, 'error');

  } finally {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
});



// ======================================================
// FETCH PRODUCTS (OPTIMIZED FOR LOW QUOTA)
// ======================================================
async function listenToProducts() {
  const productContainer = document.getElementById("dynamicProductList");
  if (!productContainer) return;

  // Use a loading state for a premium feel
  productContainer.innerHTML = '<div class="mx-loader">Loading Plans...</div>'; 

  // ✅ Pointing to your secondary DB (transactionDb)
  const productsRef = collection(transactionDb, "products");

  try {
    // ✅ CHANGED: Use getDocs instead of onSnapshot to save reads & connections
    const snapshot = await getDocs(productsRef); 
    
    productContainer.innerHTML = ""; 
    const productList = [];

    snapshot.forEach((docSnap) => {
      productList.push({ id: docSnap.id, ...docSnap.data() });
    });

    // MASTER SORT: VIP 1 to 12
    productList.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    // Render sorted list
    productList.forEach((p) => {
      if (p.locked) return; 

    
      const cardHtml = `
  <div class="mx-product-card">

  <div class="mx-card-header">
    <div class="mx-header-top">

      <!-- IMAGE SLOT: replace src with your image URL -->
      <div class="mx-img-slot">
        <img src="Rambo logo.jpg" alt="Rambo" />" 
             onerror="this.style.display='none'" />
      </div>

      <div class="mx-brand-col">
        <div class="mx-brand-pill">
          <div class="mx-brand-dot"></div>
          <span class="mx-brand-text">RAMBO</span>
        </div>
        <span class="mx-plan-name">${p.name || "Starter Plan"}</span>
      </div>
    </div>

    <div class="mx-price-block">
      <span class="mx-price-label">Investment amount</span>
      <span class="mx-main-price">₦${Number(p.price || 0).toLocaleString()}</span>
    </div>
  </div>

  <div class="mx-card-body">
    <div class="mx-data-row">
      <div class="mx-row-left">
        <i class="fa-regular fa-clock"></i>
        <span class="mx-info-label">Duration</span>
      </div>
      <span class="mx-info-value">${p.cycle || 0} Days</span>
    </div>

    <div class="mx-data-row">
      <div class="mx-row-left">
        <i class="fa-solid fa-chart-simple"></i>
        <span class="mx-info-label">Daily profit</span>
      </div>
      <span class="mx-info-value">₦${Number(p.dailyIncome || 0).toLocaleString()}</span>
    </div>

    <div class="mx-data-row mx-highlight-row">
      <div class="mx-row-left">
        <i class="fa-solid fa-trophy"></i>
        <span class="mx-info-label">Total earnings</span>
      </div>
      <span class="mx-earnings-val">₦${Number(p.totalIncome || 0).toLocaleString()}</span>
    </div>
  </div>

  <div class="mx-card-footer">
    <button class="mx-invest-btn"
      onclick="handleInvestment(event, ${p.price}, ${p.dailyIncome}, ${p.cycle}, '${p.name}')">
      <i class="fas fa-rocket"></i>
      Invest now
    </button>
  </div>

</div>
    
    
  </div>
`;

      productContainer.insertAdjacentHTML("beforeend", cardHtml);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    productContainer.innerHTML = '<div class="mx-error">Failed to load products. Please refresh.</div>';
  }
}

// Initialize on page load
listenToProducts();

auth.onAuthStateChanged(async (user) => {
  if (!user) return; // user not signed in, do nothing

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let bonus = 0;

    if (userSnap.exists()) {
      const data = userSnap.data();
      bonus = data.bonus || 0;
    }

    

  } catch (error) {
    console.error("Error fetching user bonus:", error);
   
  }
});


auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const balance = userSnap.data().balance || 0;
  document.getElementById("userBalance").textContent = balance.toLocaleString();
});


onAuthStateChanged(auth, (user) => {
  if (user) {
    
  }
});


auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // PHONE NUMBER (top-left label)
  const phoneEl = document.getElementById("userPhoneNumber");
  if (phoneEl) {
    phoneEl.innerText = data.number || "";
  }

  // BALANCE
  const balanceEl = document.getElementById("balanceAmount");
  if (balanceEl) {
    balanceEl.innerText = `₦${(data.balance || 0).toLocaleString()}`;
  }
});


function logout() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  // Reset lastPage state on logout
  localStorage.setItem('lastPage', 'dashboard');

  setTimeout(async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }

    // Hide all pages
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("profilePage").style.display = "none";
    document.getElementById("bottomNav").style.display = "none";

    // Show login page
    showLogin();

    // Hide loader
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);

  }, 500); // small delay so loader appears
}

// Make it global
window.logout = logout;



document.addEventListener("DOMContentLoaded", () => {
  const giftCodeBtn = document.getElementById("giftCodeBtn");

  giftCodeBtn.addEventListener("click", async () => {

    const loader = document.getElementById("dailyLoader");
    loader.style.display = "flex";

    const user = auth.currentUser;
  
    if (!user) {
    loader.style.display = "none";
    window.showToast('Please Login: You must be logged in!', 'warning');
    return;
}

    const userRef = doc(db, "users", user.uid);

    try {

      const today = new Date().toISOString().split("T")[0];

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        loader.style.display = "none";
        return;
      }

      const userData = userSnap.data();

      // Check active investment
      const hasActiveInvestment = Array.isArray(userData.investments) &&
        userData.investments.some(inv => inv.status === "active");

     if (!hasActiveInvestment) {
    loader.style.display = "none";
    window.showToast('Need to Purchase a Product: Please purchase a product to continue.', 'warning');
    return;
}

      // Already claimed
if (userData.lastDailyClaim === today) {
  loader.style.display = "none";

  FintechNotify.info(
    'Check-in completed',
    'You’ve already checked in today. Come back tomorrow.'
  );

  return;
}
      // Give bonus
      await updateDoc(userRef, {
        balance: increment(100),
        bonus: increment(100),
        lastDailyClaim: today
      });

      // Save record
      await addDoc(collection(db, "users", user.uid, "records"), {
        type: "Daily Login",
        amount: 100,
        status: "Claimed",
        timestamp: serverTimestamp()
      });

      // Update balance realtime
      const balanceElem = document.getElementById("balanceAmount");
      if (balanceElem) {
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            balanceElem.textContent = `₦${(data.balance || 0).toLocaleString()}`;
          }
        });
      }

     window.showToast('Daily Login Successful: 🎁 ₦100 added.', 'success');
loader.style.display = "none";

    } catch (err) {

      console.error("Daily login error:", err);
      loader.style.display = "none";
    window.showToast('Failed to Claim Daily Reward: Please try again later.', 'error');

    }
  });
});

async function updateBalance(amount) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, {
      balance: increment(amount) // Firestore atomic increment
    });
  } catch (err) {
    console.error("Failed to update balance:", err);
  }
}




auth.onAuthStateChanged((user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  onSnapshot(userRef, async (snap) => {
    const data = snap.data();
    if (!data) return;

    // -------------------- Update dashboard balance --------------------
    const balanceAmount = document.getElementById("balanceAmount");
    if (balanceAmount) {
      balanceAmount.textContent = `₦${data.balance.toLocaleString()}`;
    }

    // -------------------- Update total commission --------------------
    const totalCommissionEl = document.getElementById("totalCommission");
    if (totalCommissionEl) {
      const commissionsCol = collection(userRef, "commissions");
      const commissionsSnap = await getDocs(commissionsCol);
      let totalCommission = 0;
      commissionsSnap.forEach(doc => {
        const c = doc.data();
        totalCommission += c.amount || 0;
      });
      totalCommissionEl.textContent = `Total Commission: ₦${totalCommission.toLocaleString()}`;
    }

    // -------------------- Update team summary --------------------
    const totalReferralsEl = document.getElementById("totalReferrals");
    if (totalReferralsEl) {
      const level1Count = data.referrals?.level1?.length || 0;
      const level2Count = data.referrals?.level2?.length || 0;
      totalReferralsEl.textContent = `Total Referrals: ${level1Count + level2Count}`;
    }
  });
});


function openProfile() {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(page => {
      if (page) page.style.display = 'none';
    });
  }

  if (productPage) productPage.style.display = 'none';

  const profilePage = document.getElementById("profilePage");
  if (profilePage) profilePage.style.display = "block";

  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "flex";
}

// Make it global
window.openProfile = openProfile;


function showDashboard() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  setTimeout(() => {
    // Hide other pages
    document.getElementById("profilePage").style.display = "none";
    document.getElementById("productPage").style.display = "none";
    document.getElementById("bankPage").style.display = "none";

    // Show dashboard
    document.getElementById("dashboard").style.display = "block";

    // Show bottom nav
    document.getElementById("bottomNav").style.display = "flex";

    // Show welcome popup
    showWelcomePopup();

    // Hide loader
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }, 500); // small delay so loader is visible
}

// Make it global
window.showDashboard = showDashboard;


function backToProfile() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  setTimeout(() => {
    // Hide bank page
    document.getElementById("bankPage").style.display = "none";
    // Show profile page
    document.getElementById("profilePage").style.display = "block";

    // Show nav
    document.getElementById("bottomNav").style.display = "flex";

    // Hide loader
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }, 500); // small delay so loader is visible
}

// Make it global
window.backToProfile = backToProfile;


// -------------------------------------------------------------------------
// DYNAMIC BANK INFO FETCHING (Global Settings)
// -------------------------------------------------------------------------
async function fetchBankDetails() {
    try {
        const docRef = doc(db, "adminSettings", "settings");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data().bankAccount;
            if (document.getElementById('accNameDisplay')) document.getElementById('accNameDisplay').innerText = data.accountName;
            if (document.getElementById('accNumDisplay')) document.getElementById('accNumDisplay').innerText = data.accountNumber;
            if (document.getElementById('bankNameDisplay')) document.getElementById('bankNameDisplay').innerText = data.bankName;
        }
    } catch (error) {
        console.error("Error fetching bank details:", error);
    }
}
window.onload = fetchBankDetails;

// ----------------- Bank Navigation -----------------
function openBankPage() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
    setTimeout(() => {
        pages.forEach(page => { if (page) page.style.display = 'none'; });
        document.getElementById('bankPage').style.display = 'block';
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 300);
}

document.getElementById('bankAccountBtn')?.addEventListener('click', openBankPage);
document.addEventListener('click', (e) => { if (e.target.id === 'addAccountBtn') openBankPage(); });

// ----------------- References & Variables -----------------
const bankForm = document.getElementById('bankForm');
const bankSuccess = document.getElementById('bankSuccess');
const bankSelect = document.getElementById('bankName'); 
const accNumInput = document.getElementById('accountNumber');
const accNameInput = document.getElementById('accountName');
const getSubmitBtn = () => bankForm?.querySelector('.honda-submit-btn') || bankForm?.querySelector('button[type="submit"]');

// ----------------- Auth Listener (Real-time Sync) -----------------
auth.onAuthStateChanged((user) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    onSnapshot(userRef, (snap) => {
        const bank = snap.data()?.bankAccount;
        const displayCard = document.getElementById("bankDetailsDisplay");
        const addAccountBtn = document.getElementById("addAccountBtn");

        if (bank) {
            if (displayCard) displayCard.style.display = "block";
            if (addAccountBtn) addAccountBtn.style.display = "none";
            
            // Populate form fields (Fields remain enabled/editable)
            if (accNumInput) accNumInput.value = bank.accountNumber || "";
            if (accNameInput) accNameInput.value = bank.accountName || "";
            if (bankSelect) bankSelect.value = bank.bankCode || "";
            
            if (bankSuccess) {
                bankSuccess.style.display = 'block';
                bankSuccess.textContent = "Bank info saved ✅";
            }
        } else {
            if (displayCard) displayCard.style.display = "none";
            if (addAccountBtn) addAccountBtn.style.display = "block";
        }
    });
});

// ----------------- Submission Logic -----------------
bankForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = getSubmitBtn();
    const originalBtnText = submitBtn?.innerText || "Save";

    if (!bankSelect?.value || accNumInput?.value.trim().length !== 10 || !accNameInput?.value.trim()) {
        return window.showToast('Please fill all fields correctly.', 'warning');
    }
    
    if (submitBtn) { submitBtn.innerText = "Saving..."; submitBtn.disabled = true; }

    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { 
            bankAccount: { 
                bankName: bankSelect.options[bankSelect.selectedIndex].text,
                bankCode: bankSelect.value,
                accountNumber: accNumInput.value.trim(), 
                accountName: accNameInput.value.trim() 
            } 
        });
        window.showToast('Bank Account Saved Successfully!', 'success');
    } catch (err) {
        window.showToast('Failed to save. Check connection.', 'error');
    } finally {
        if (submitBtn) { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
    }
});


document.getElementById('homeNav')?.addEventListener('click', (e) => { e.preventDefault(); showDashboard(); });


// Select elements
// We changed this from .withdraw-max to #withdrawMaxBtn
const maxBtn = document.getElementById('withdrawMaxBtn'); 
const balanceEl = document.getElementById('withdrawBalance');
const inputEl = document.getElementById('withdrawAmountInput');

// Add a safety check so it doesn't crash if the button is missing
if (maxBtn && balanceEl && inputEl) {
    maxBtn.addEventListener('click', () => {
        // Get balance text (e.g. "₦12,500")
        let balanceText = balanceEl.textContent;

        // Remove currency symbol and commas
        let cleanBalance = balanceText.replace(/[₦,]/g, '').trim();

        // Set it into input
        inputEl.value = cleanBalance;
    });
} else {
    console.log("Withdrawal elements not found on this page.");
}
// Elements
const dailyChip = document.getElementById('dailyChip');
const dailyLabel = document.getElementById('dailyLabel');


const dailyReward = 100;

async function loadBalance() {
  const user = auth.currentUser;
  if (!user) return;

  // We connect the variable to the ID in your HTML
  balanceAmount = document.getElementById('withdrawBalance'); 

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  // Update the text only if the element was found
  if (balanceAmount) {
    balanceAmount.textContent = `₦${(data.balance || 0).toLocaleString()}`;
  }
}




document.addEventListener("DOMContentLoaded", () => {
   let selectedMethod = "automatic"; // Default state
  // 1. DOM Elements
  const paymentMethodPage = document.getElementById("paymentMethodPage");
  const rechargePage = document.getElementById("rechargePage");
  const bottomNav = document.getElementById("bottomNav");
  const dashboard = document.getElementById("dashboard");
  
  // Buttons that start the process from the dashboard
  const rechargeTriggers = document.querySelectorAll('.qa-btn.recharge, #mainRechargeTrigger, .action-btn#depositBtn');
  
  const proceedToRecharge = document.getElementById("proceedToRecharge");
  const methodBackBtn = document.getElementById("methodBackBtn");
  const rechargeBackBtn = document.getElementById("rechargeBackBtn");

  
  // 1. OPEN RECHARGE PAGE DIRECTLY (Bypassing Method Selection)
rechargeTriggers.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!rechargePage) return;

    // We force the variable to manual globally
    selectedMethod = "manual"; 

    if (typeof showLoader === 'function') {
      showLoader({
        callback: () => {
          if (typeof pages !== 'undefined') {
            pages.forEach(p => { if (p) p.style.display = 'none'; });
          }
          if (dashboard) dashboard.style.display = 'none';
          if (bottomNav) bottomNav.style.display = 'none';
          
          rechargePage.style.display = 'block';
        }
      });
    } else {
      rechargePage.style.display = 'block';
    }
  });
});

// 2. BACK BUTTONS
if (rechargeBackBtn) {
  rechargeBackBtn.addEventListener('click', () => {
    rechargePage.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'flex';
  });
}

if (methodBackBtn2) {
  methodBackBtn2.addEventListener('click', () => {
    manualDetailsPage.style.display = 'none';
    rechargePage.style.display = 'block';
  });
}

// 3. AMOUNT SELECTION & MANUAL REDIRECTION
if (rechargePage) {
  const amountOptions = rechargePage.querySelectorAll('.amount-option');
  const customInput = rechargePage.querySelector('#customAmount');
  const depositBtn = rechargePage.querySelector('#depositBtn');

  amountOptions.forEach(option => {
    option.addEventListener('click', function () {
      amountOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      if (customInput) customInput.value = this.dataset.value;
    });
  });

  if (depositBtn) {
    depositBtn.innerText = "Proceed to Transfer";
    depositBtn.addEventListener('click', async () => {
      if (!customInput) return;

      const amount = Number(customInput.value);
      const user = auth?.currentUser;

      if (!user) {
        Swal.fire({
          icon: 'warning',
          title: 'Authentication Required',
          html: `<p style="opacity:.8">Please login to continue</p>`,
          background: 'rgba(20,20,25,0.95)',
          color: '#fff',
          confirmButtonColor: '#007bff'
        });
        return;
      }

      if (!amount || amount < 1000) {
        Swal.fire({
          icon: 'warning',
          title: 'Minimum Recharge Not Met',
          html: `<p style="opacity:.8">Minimum recharge is ₦1,000</p>`,
          background: 'rgba(20,20,25,0.95)',
          color: '#fff',
          confirmButtonColor: '#007bff'
        });
        return;
      }

      document.getElementById("displayManualAmount").innerText = `₦${amount.toLocaleString()}`;
      rechargePage.style.display = 'none';
      document.getElementById("manualDetailsPage").style.display = 'block';
    });
  }
}

// ================= STEP PAGE TRANSITIONING HANDLERS =================
const goToSenderDetailsBtn = document.getElementById("goToSenderDetailsBtn");
const senderBackToBankBtn = document.getElementById("senderBackToBankBtn");
const senderCancelBtn = document.getElementById("senderCancelBtn");
const manualDetailsPageEl = document.getElementById("manualDetailsPage");
const senderDetailsPageEl = document.getElementById("senderDetailsPage");

if (goToSenderDetailsBtn) {
  goToSenderDetailsBtn.addEventListener('click', () => {
    manualDetailsPageEl.style.display = 'none';
    senderDetailsPageEl.style.display = 'block';
  });
}

const returnToBankDetailsView = () => {
  senderDetailsPageEl.style.display = 'none';
  manualDetailsPageEl.style.display = 'block';
};

if (senderBackToBankBtn) senderBackToBankBtn.addEventListener('click', returnToBankDetailsView);
if (senderCancelBtn) senderCancelBtn.addEventListener('click', returnToBankDetailsView);


// 4. FINAL MANUAL SUBMISSION (To Transaction Database)
const finalManualSubmit = document.getElementById("finalManualSubmit");

if (finalManualSubmit) {
  finalManualSubmit.addEventListener('click', async () => {
    const user = auth?.currentUser;
    const amount = Number(document.getElementById("customAmount").value);
    const senderName = document.getElementById("senderName").value.trim();
    const senderBank = document.getElementById("senderBank").value.trim();

    if (!user) return;
    if (!senderName || !senderBank) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Missing Info', 
        text: 'Please provide your sender name and bank for confirmation.',
        background: '#1c2333',
        color: '#fff',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    Swal.fire({
      title: 'Submitting Request',
      html: '<p style="color:#676d7d;font-size:14px;">Sending your transfer details to admin...</p>',
      background: '#1c2333',
      color: '#fff',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      let userPhoneNumber = localStorage.getItem("u_phone") || "N/A";
      if (userPhoneNumber === "N/A") {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          userPhoneNumber = userDoc.data().number || "N/A";
          localStorage.setItem("u_phone", userPhoneNumber);
        }
      }

      // Optional field value collection check for database logging tracking
      const senderAccNumEl = document.getElementById("senderAccountNumber");
      const senderAccNumValue = senderAccNumEl ? senderAccNumEl.value.trim() : "N/A";

      await addDoc(collection(transactionDb, "manualDeposits"), {
        uid: user.uid,
        userEmail: user.email || "N/A",
        userPhone: userPhoneNumber,
        amount: amount,
        senderName: senderName, 
        senderBank: senderBank, 
        senderAccountNo: senderAccNumValue,
        status: "pending",
        method: "Manual Bank Transfer",
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleString() 
      });

      Swal.fire({
        icon: 'success',
        title: 'Request Received',
        html: `
          <div style="text-align:center; line-height:1.6;">
            <p style="margin:0; font-size:15px;">Your ₦${amount.toLocaleString()} deposit is pending.</p>
            <p style="margin-top:8px; color:#676d7d; font-size:13px;">Admin will verify your transfer shortly.</p>
          </div>
        `,
        confirmButtonColor: '#10b981',
        background: '#1c2333',
        color: '#fff'
      }).then(() => {
        // Clear forms out and turn pages off safely
        if(senderAccNumEl) senderAccNumEl.value = "";
        document.getElementById("senderName").value = "";
        document.getElementById("senderBank").value = "";
        
        senderDetailsPageEl.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        if (bottomNav) bottomNav.style.display = 'flex';
      });

    } catch (error) {
      console.error("Manual Submission Failed:", error);
      Swal.fire({ 
        icon: 'error', 
        title: 'Submission Failed', 
        text: 'System busy. Please try again or contact support.',
        background: '#1c2333',
        color: '#fff'
      });
    }
  });
}
});

// Function to handle the copy button
window.copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    // Show a small toast to let the user know it worked
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Account number copied!',
      showConfirmButton: false,
      timer: 2000,
      background: '#1c2333',
      color: '#fff'
    });
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
};


const profilePage = document.getElementById('profilePage');


const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
// product page elements
const productPage = document.getElementById('productPage');
const productList = document.getElementById('productList');


// Add click event to all nav items
const pages = [
  document.getElementById('dashboard'),
  document.getElementById('profilePage'),
  document.getElementById('rechargePage'),
  document.getElementById('rechargeConfirmPage'), // include the recharge confirmation page
  document.getElementById('productPage'),
  document.getElementById('invitePage'), // <--- added here
  document.getElementById('teamPage'),
  document.getElementById('bankPage'),
  document.getElementById('withdrawPage'), // 👈 Add this
  document.getElementById("recordsPage"),
  document.getElementById("myInvestmentPage"),
  document.getElementById("earningsPage")
  // add other pages here if you create more
];


bottomNavItems.forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();

    const text = item.textContent.trim().toLowerCase();

    let targetPage = null;
    if (text.includes('home')) targetPage = pages[0];
    if (text.includes('profile')) targetPage = pages[1];
    if (text.includes('reviews')) targetPage = pages[4]; // productPage
    if (text.includes('team')) targetPage = pages[6]; // View Team button fixes
    if (text.includes('invite')) targetPage = pages[5];
    if (text.includes('bank')) targetPage = pages[7];
    if (text.includes('withdraw')) targetPage = pages[8];
    if (text.includes('records')) targetPage = pages[9];
    if (text.includes('my investment')) targetPage = pages[10];
    if (text.includes('earnings')) targetPage = pages[11];

    if (!targetPage) return;

    const loader = document.getElementById('pageLoader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';

    setTimeout(() => {
      pages.forEach(page => {
        if(page) page.style.display = 'none';
      });

      if (targetPage.id === 'invitePage') {
  targetPage.style.display = 'flex';
  targetPage.style.flexDirection = 'column';
} else {
  targetPage.style.display = 'block';
}
// 🚀 ADD THIS LINE HERE:
      localStorage.setItem('lastPage', targetPage.id);

      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
    }, 300);
  });
});



document.addEventListener("DOMContentLoaded", () => {
  const earningsPage = document.getElementById("earningsPage");       // Team page
  const earningsBackBtn = document.getElementById("earningsBackBtn"); // Back button inside team page
  const bottomNav = document.getElementById("bottomNav");             // Bottom nav
  const dashboard = document.getElementById("dashboard");             // Default page to return to

  const earningsBtn = document.getElementById("earningsBtn");         // Button to open team page
  if (earningsBtn) {
    earningsBtn.addEventListener("click", () => {
      // Hide all other pages safely
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p) p.style.display = "none";
        });
      }

      // Show Team page
      if (earningsPage) earningsPage.style.display = "block";

      // Hide bottom nav
      if (bottomNav) bottomNav.style.display = "none";
    });
  }

  // Back button click → return to dashboard/home
  if (earningsBackBtn) {
    earningsBackBtn.addEventListener("click", () => {
      if (earningsPage) earningsPage.style.display = "none";
      if (dashboard) dashboard.style.display = "block";
      if (bottomNav) bottomNav.style.display = "flex";
    });
  }
});



document.addEventListener("DOMContentLoaded", () => {
  const bottomNav = document.getElementById("bottomNav");
  const withdrawPage = document.getElementById("withdrawPage");
  const dashboard = document.getElementById("dashboard");
  const withdrawBackBtn = document.getElementById("withdrawBackBtn");


  const withdrawBtns = document.querySelectorAll('.qa-btn.withdraw, #withdrawBtn');

  

withdrawBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Hide all pages safely
    if (pages && pages.length) {
      pages.forEach(p => {
        if (p) p.style.display = 'none';
      });
    }

    if (withdrawPage) withdrawPage.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'none';

    // Load withdraw data
    if (typeof loadWithdrawData === "function") loadWithdrawData();
  });
});


  // Back button click
  if (withdrawBackBtn) {
    withdrawBackBtn.addEventListener('click', () => {
      withdrawPage.style.display = 'none';
      dashboard.style.display = 'block';
      bottomNav.style.display = 'flex';
    });
  }
});



document.addEventListener("DOMContentLoaded", () => {
  const recordsPage = document.getElementById("recordsPage");
  const recordsBackBtn = document.getElementById("recordsBackBtn");
  const bottomNav = document.getElementById("bottomNav");
  const dashboard = document.getElementById("dashboard");

  const recordsBtn = document.getElementById("myRecordsBtn");
  if (recordsBtn) {
    recordsBtn.addEventListener("click", () => {
      // Hide all other pages safely
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p) p.style.display = "none";
        });
      }

      // Show Records page
      if (recordsPage) recordsPage.style.display = "block";

      // Hide bottom nav
      if (bottomNav) bottomNav.style.display = "none";

      // Load records
      const container = document.getElementById("recordsContainer");
      if (container) loadRecords(container);
    });
  }


  // Back button click → return to home/dashboard
  if (recordsBackBtn) {
    recordsBackBtn.addEventListener("click", () => {
      recordsPage.style.display = "none";
      dashboard.style.display = "block";
      bottomNav.style.display = "flex"; // show nav again
    });
  }
});



document.addEventListener("DOMContentLoaded", () => {
  const investmentPage = document.getElementById("myInvestmentPage");
  const investmentRecordsBtn = document.getElementById("investmentRecordsBtn");
  const bottomNav = document.getElementById("bottomNav");
  const dashboard = document.getElementById("dashboard");
  const investmentBackBtn = document.getElementById("investmentBackBtn");

  const MS_IN_DAY = 20 * 60 * 60 * 1000; // 20-hour income cycle
  let countdownIntervals = [];

  // ================= BACK BUTTON =================
  if (investmentBackBtn) {
    investmentBackBtn.addEventListener("click", () => {
      investmentPage.style.display = "none";
      dashboard.style.display = "block";
      bottomNav.style.display = "flex";

      // 🔒 clear countdown timers
      countdownIntervals.forEach(id => clearInterval(id));
      countdownIntervals = [];
    });
  }

  
  // ================= INVESTMENT RECORDS =================
if (investmentRecordsBtn) {
  investmentRecordsBtn.addEventListener("click", async () => {
    // hide all pages safely
    if (typeof pages !== "undefined" && pages.length) {
      pages.forEach(p => {
        if (p) p.style.display = "none"; // ✅ safe assignment
      });
    }

    if (!investmentPage) return;

    investmentPage.style.display = "block";
    if (bottomNav) bottomNav.style.display = "none";

    const container = document.querySelector(".premium-card");
    if (!container) return;

    const user = auth?.currentUser;
   if (!user) {
    window.showToast('Not Logged In: Please log in first!', 'error');
    return;
}

const userRef = doc(db, "users", user.uid);
const snap = await getDoc(userRef);
if (!snap.exists()) {
    window.showToast('User Data Not Found: Please log in again!', 'error');
    return;
}

    let investments = snap.data().investments || [];
    if (!Array.isArray(investments)) investments = Object.values(investments);

    container.innerHTML = "";

   
    if (investments.length === 0) {
  container.innerHTML =  `
   
  `;
  return;
}


    // 🔒 clear old countdowns before rendering again
    countdownIntervals.forEach(id => clearInterval(id));
    countdownIntervals = [];

    investments.forEach((inv, index) => {
      // ===== NORMALIZE DATA =====
      let purchaseTime = inv.purchaseTime;

if (purchaseTime?.seconds) {
  purchaseTime = purchaseTime.seconds * 1000;
} else {
  purchaseTime = Number(purchaseTime);
}

if (!purchaseTime || isNaN(purchaseTime)) {
  purchaseTime = Date.now();
}

      const totalEarned = Number(inv.totalEarned) || 0;
      const daily = Number(inv.daily) || 0;
      const days = Number(inv.days) || 0;
      const price = Number(inv.price) || 0;
      const status = inv.status || "active";
     
 
      const card = document.createElement("div");
 
      card.className = "premium-card";

const progress = ((inv.lastPaidDay || 0) / inv.days) * 100;
const daysLeft = inv.days - (inv.lastPaidDay || 0);

card.innerHTML = `
  <div class="header-main">
    <div class="plan-icon-box">
      <i class="fa-solid fa-chart-line"></i>
    </div>

    <div class="title-group">
      <span class="plan-title">${inv.name || 'Investment Plan'}</span>
      <h2 class="plan-price">₦${inv.price.toLocaleString()}</h2>
    </div>

    <div class="active-tag">● Active</div>
  </div>

  <div class="timer-box">
    <span class="timer-label">NEXT INCOME IN</span>
    <div class="countdown" id="cd-${index}">00 : 00 : 00</div>
  </div>

  <div class="cycle-section">
    <div class="detail-item">
      <span>Progress</span>
      <span>${Math.round(progress)}% — ${daysLeft}d left</span>
    </div>

    <div class="progress-bar-bg">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <span class="stat-label">INVESTMENT</span>
      <span class="stat-value">₦${inv.price.toLocaleString()}</span>
    </div>

    <div class="stat-box">
      <span class="stat-label">PER DAY</span>
      <span class="stat-value">₦${inv.daily.toLocaleString()}</span>
    </div>

    <div class="stat-box">
      <span class="stat-label">TOTAL</span>
      <span class="stat-value">₦${(inv.daily * inv.days).toLocaleString()}</span>
    </div>

    <div class="stat-box">
      <span class="stat-label">CYCLES</span>
      <span class="stat-value">${inv.days}</span>
    </div>
  </div>

  <div class="details-list">
    <div class="detail-item">
      <span>Started</span>
      <span>${inv.dateStarted || '---'}</span>
    </div>

    <div class="detail-item">
      <span>Ends</span>
      <span>${inv.dateEnding || '---'}</span>
    </div>

    <div class="detail-item">
      <span>Capital</span>
      <span style="color:#00ff88;">100% Returned</span>
    </div>
  </div>
`;

container.appendChild(card);

// ===== GET ELEMENTS SAFELY =====
const cdEl = document.getElementById(`cd-${index}`);
const earnedEl = document.getElementById(`earned-${index}`);

// ===== SET EARNED ONCE (NO REWRITE LOOP) =====
if (earnedEl) earnedEl.textContent = `₦${totalEarned.toLocaleString()}`;

if (cdEl) {
  let intervalId; // <-- ADD THIS line before defining updateCountdown

  const updateCountdown = () => {
    const now = Date.now();
    const elapsedDays = Math.floor((now - purchaseTime) / MS_IN_DAY);

    if (elapsedDays >= days || status === "completed") {
      cdEl.textContent = "Ended";
      clearInterval(intervalId); // ✅ now safe
      return;
    }

    const nextPayoutTime = purchaseTime + (elapsedDays + 1) * MS_IN_DAY;
    const remaining = Math.max(0, nextPayoutTime - now);

    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);

    cdEl.textContent = `${h}h ${m}m ${s}s`;
  };

  updateCountdown();
  intervalId = setInterval(updateCountdown, 1000); // assign after
  countdownIntervals.push(intervalId);
}


    });
  });
  } 
});



const FintechToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#fff',
  color: '#111',
  customClass: {
    popup: 'fintech-toast'
  }
});

 // ======================================================
// INVESTMENT PRODUCTS
// ======================================================
const products = [
  { name: "Craft Land 1", price: 3000, daily: 500, days: 50 },
  { name: "Craft Land 2", price: 6000, daily: 1000, days: 50 },
  { name: "Craft Land 3", price: 10000, daily: 1500, days: 30 },
  { name: "Craft Land 4", price: 20000, daily: 3000, days: 50 },
  { name: "Craft Land 5", price: 30000, daily: 4500, days: 50 },
  { name: "Craft Land 6", price: 50000, daily: 7500, days: 50 },
  { name: "Craft Land 7", price: 100000, daily: 15000, days: 50 }
 
  
 
];

// ======================================================
// TIME CONFIG
// ======================================================

let investmentInterval = null;


async function handleInvestment(event, amount, daily, days, planName) {
  const btn = event.target;
  const user = auth.currentUser;
  if (!user) {
    window.showToast('Not Logged In: Please log in first!', 'error');
    return;
  }

  // --- 1. LOCK BUTTON TO PREVENT DOUBLE CLICK ---
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "Processing...";

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const balance = Number(data.balance) || 0;

    // --- 2. VALIDATION ---
    if (balance < amount) {
      window.showToast('Insufficient balance: Add funds to continue.', 'warning');
      document.getElementById("dashboard").style.display = "none";
      document.getElementById("productPage").style.display = "none";
      document.getElementById("rechargePage").style.display = "block";
      return; 
    }

    const investments = Array.isArray(data.investments) ? data.investments : [];

    // --- 3. ATOMIC UPDATE ---
    investments.push({
      purchaseId: "INV-" + Date.now() + "-" + Math.floor(Math.random() * 1000), 
      name: planName || "Investment",
      price: amount,
      daily,
      days,
      purchaseTime: Date.now(),
      totalEarned: 0,
      lastPaidDay: 0, 
      status: "active"
    });

    await updateDoc(userRef, {
      balance: increment(-amount),
      investments
    });

    // --- 4. SUCCESS UI ---
    const balEl = document.getElementById("user-balance");
    if (balEl) balEl.textContent = (balance - amount).toLocaleString();

    window.showToast('Investment Successful!', 'success');
    showDashboard();
    startInvestmentSystem(user.uid);

  } catch (err) {
    console.error("Investment Error:", err);
    window.showToast('Transaction failed. Please try again.', 'error');
  } finally {
    // --- 5. ALWAYS UNLOCK BUTTON ---
    btn.disabled = false;
    btn.innerText = originalText;
  }
}


// ======================================================
// SYNC EARNINGS (OPTIMIZED - 1 READ TOTAL)
// ======================================================
async function syncEarnings(userId) {
  // ✅ QUOTA SAVER: If a sync is already running, KILL this duplicate call immediately
  if (!userId || isSyncingNow) return; 
  
  isSyncingNow = true; // Set the lock

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      isSyncingNow = false;
      return;
    }

    const data = snap.data();
    const investments = Array.isArray(data.investments) ? data.investments : [];
    const now = Date.now();
    
    let totalEarningsToCredit = 0;
    let hasChanges = false;

    // Use a reference for history records
    const recRef = collection(db, "users", userId, "records");

    for (const inv of investments) {
      if (inv.status !== "active") continue;

      const daysSincePurchase = Math.floor((now - inv.purchaseTime) / MS_IN_DAY);
      const totalPayableDays = Math.min(daysSincePurchase, inv.days);
      const daysOwed = totalPayableDays - (inv.lastPaidDay || 0);

      if (daysOwed > 0) {
        // Calculate total for this specific plan
        const amountForThisPlan = daysOwed * inv.daily;
        
        inv.totalEarned = (inv.totalEarned || 0) + amountForThisPlan;
        inv.lastPaidDay = totalPayableDays;
        totalEarningsToCredit += amountForThisPlan;
        
        // ✅ QUOTA SAVER: Instead of 1 record per day, save 1 summary for all owed days
        await addDoc(recRef, {
          type: "Investment Profit",
          purchaseId: inv.purchaseId || "legacy",
          amount: amountForThisPlan,
          daysCredited: daysOwed,
          timestamp: serverTimestamp(),
          plan: inv.name,
          note: `Earnings for ${daysOwed} day(s)`
        });

        hasChanges = true;
      }

      if (inv.lastPaidDay >= inv.days) {
        inv.status = "completed";
        hasChanges = true;
      }
    }

    if (hasChanges) {
      // ✅ FINAL UPDATE: Credit balance in one go
      await updateDoc(userRef, {
        balance: increment(totalEarningsToCredit),
        investments: investments 
      });
      console.log(`Success: Credited ₦${totalEarningsToCredit}`);
    }

    // Refresh UI
    if (typeof renderCountdowns === "function") renderCountdowns(investments);
    
    const balEl = document.getElementById("user-balance");
    if (balEl) {
      const currentBal = Number(data.balance) || 0;
      balEl.textContent = (currentBal + totalEarningsToCredit).toLocaleString();
    }

  } catch (error) {
    console.error("Sync Earnings Error:", error);
  } finally {
    isSyncingNow = false; // 🔓 Release the lock so it can run next time
  }
}

// ======================================================
// GLOBALS & CONFIG
// ======================================================
let userInvestmentsLocal = []; 



// ======================================================
// 1. START SYSTEM (RUNS ONCE ON LOGIN)
// ======================================================
async function startInvestmentSystem(userId) {
  // Clear any existing interval to prevent multiple timers running
  if (investmentInterval) clearInterval(investmentInterval);

  // STEP A: Sync earnings ONCE (Uses 1 Read)
  // This calculates missed days automatically since the last time they logged in.
  await syncEarnings(userId);

  // STEP B: Fetch the updated data into memory to save further reads
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    userInvestmentsLocal = snap.data().investments || [];
  }

  // STEP C: START THE UI TIMER (0 Reads)
  // Updates every 1 second for a "Premium" feel without hitting Firebase.
  investmentInterval = setInterval(() => {
    renderCountdowns(userInvestmentsLocal);
  }, 1000); 
}

// ======================================================
// 2. COUNTDOWN UI (0 DATABASE CALLS)
// ======================================================
function renderCountdowns(investments) {
  const now = Date.now();
  if (!investments || investments.length === 0) return;

  investments.forEach((inv, i) => {
    const cdEl = document.getElementById(`cd-${i}`);
    const earnedEl = document.getElementById(`earned-${i}`);
    if (!cdEl) return;

    if (earnedEl) earnedEl.textContent = (inv.totalEarned || 0).toLocaleString();

    if (inv.status === "completed") {
      cdEl.textContent = "Completed";
      return;
    }

    // Calculate time until next daily payout
    const daysSinceStart = Math.floor((now - inv.purchaseTime) / MS_IN_DAY);
    const nextPayoutTime = inv.purchaseTime + (daysSinceStart + 1) * MS_IN_DAY;
    const remaining = Math.max(0, nextPayoutTime - now);
    
    // ✅ FIXED MATH:
    // 1. Get total hours
    const h = Math.floor(remaining / (1000 * 60 * 60));
    // 2. Get total minutes LEFT OVER after hours are taken out
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    // 3. Get total seconds LEFT OVER after minutes are taken out
    const s = Math.floor((remaining % (1000 * 60)) / 1000);

    // ✅ Display correctly: e.g., 17h 45m 12s
    cdEl.textContent = `${h}h ${m}m ${s}s`;

    if (remaining <= 1000 && inv.status === "active") {
        setTimeout(() => location.reload(), 2000);
    }
  });
}
// ======================================================
// 3. AUTO-START (ON LOGIN)
// ======================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    startInvestmentSystem(user.uid);
  } else {
    // Clear everything on logout
    if (investmentInterval) clearInterval(investmentInterval);
    userInvestmentsLocal = [];
  }
});


// ======================================================
// INVEST BUTTON HANDLER (FIXED)
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  const productContainer = document.querySelector(".dashboard .product-list");
  if (!productContainer) return;

  productContainer.addEventListener("click", (e) => {
    if (!e.target.classList.contains("invest-btn")) return;

    const card = e.target.closest(".product-card");
    if (!card) return;

    let price = 0;
    let daily = 0;
    let days = 0;

    // ================= PRICE + DAILY =================
    const infoRows = card.querySelectorAll(".info-row");

    infoRows.forEach(row => {
      const label = row.querySelector(".info-label")?.innerText.toLowerCase() || "";
      const value = row.querySelector(".info-value")?.innerText || "";

      if (label.includes("price")) {
        price = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
      }

      if (label.includes("daily")) {
        daily = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
      }
    });

   
    // ================= DURATION (FIXED) =================
infoRows.forEach(row => {
  const label = row.querySelector(".info-label")?.innerText.toLowerCase() || "";
  const value = row.querySelector(".info-value")?.innerText || "";

  if (label.includes("period")) {
    days = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
  }
});


    // ================= DEBUG =================
    console.log("Investment values →", { price, daily, days });

    // ================= VALIDATION =================
    if (!price || !daily || !days) {
      alert("Error: Missing or invalid product data");
      return;
    }

    // ================= CALL =================
    showLoader({
      callback: () => handleInvestment(price, daily, days)
    });
  });
});

window.handleInvestment = handleInvestment;

document.addEventListener("DOMContentLoaded", () => {

  const welcomePopup = document.getElementById("welcomePopup");
  const closePopup = document.getElementById("closePopup");
  const bottomNav = document.getElementById("bottomNav");

  /* SHOW POPUP FUNCTION */
  function showWelcomePopup() {
    welcomePopup.style.display = "flex";
  }

  /* HIDE POPUP + SHOW NAV */
  closePopup.addEventListener("click", () => {
    // Hide popup
    welcomePopup.style.display = "none";

    // Show bottom nav
    bottomNav.classList.add("open");
  });

  /* SHOW AFTER LOGIN */
  function afterLogin() {
    showWelcomePopup();
  }

  // Call this after login
  // afterLogin();

});


function openInvitePage() {
  // hide ALL pages first
  pages.forEach(page => {
    if (page) page.style.display = 'none';
  });

  // show invite page properly
  invitePage.style.display = 'flex';
  invitePage.style.flexDirection = 'column';

  // hide bottom nav if needed
  bottomNav.style.display = 'none';

  // load referral data
  const user = auth.currentUser;
  if (user) setupReferral(user);
}

document.addEventListener('DOMContentLoaded', () => {
  const bottomNav = document.getElementById("bottomNav");
  const invitePage = document.getElementById("invitePage");
  const teamPage = document.getElementById("teamPage");
  const dashboard = document.getElementById("dashboard");
  const inviteBackBtn = document.getElementById("inviteBackBtn");
  const bottomNavItems = document.querySelectorAll(".nav-item");
  const viewTeamButtons = document.querySelectorAll(".team-btn");
  const refCardBtn = document.getElementById("refCard"); // Invite button

  // ------------------ Disable "View Team" buttons on Invite Page ------------------
  viewTeamButtons.forEach(btn => btn.disabled = true);

  // ------------------ Bottom Nav Clicks ------------------
  bottomNavItems.forEach(item => {
    item.addEventListener('click', function () {
      const text = item.textContent.trim().toLowerCase();

      // Hide all pages first
      [dashboard, invitePage, teamPage].forEach(p => {
        if (p) p.style.display = 'none';
      });

      if (text === "home") {
        dashboard.style.display = 'block';
        bottomNav.style.display = 'flex';
      }

     if (text.includes('invite')) {
  openInvitePage();
  return;
}

      if (text === "team") {
        teamPage.style.display = 'block';
        invitePage.style.display = 'none';
        bottomNav.style.display = 'none';
        openTeam(1); // Load Level 1 by default
      }
    });
  });

  

  // ------------------ Invite Button (refCard) Click ------------------
if (refCardBtn) {
  refCardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openInvitePage();
  });
}

// ------------------ Share Button (shareBtn) Click ------------------
const shareBtn = document.getElementById('shareBtn');

if (shareBtn) {
  shareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openInvitePage();
  });
}

  const myTeamBtn = document.getElementById("myTeamBtn");

if (myTeamBtn) {
  myTeamBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Hide all pages in the pages array
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });

    // Hide bottom nav
    if (bottomNav) bottomNav.style.display = "none";

    // Show the invite/referral page
    if (invitePage) {
      invitePage.style.display = "flex";
      invitePage.style.flexDirection = "column";
      invitePage.style.width = "100%";
    }

    // Setup referral
    const user = auth.currentUser;
    if (user) setupReferral(user);
  });
}



  // ------------------ Invite Back Button ------------------
  if (inviteBackBtn) {
    inviteBackBtn.addEventListener('click', () => {
      invitePage.style.display = 'none';
      dashboard.style.display = 'block';
      bottomNav.style.display = 'flex';
    });
  }
});


function copyInviteLink() {
  const refInput = document.getElementById("refLink");
  if (!refInput) return;

  // Select and copy the value
  refInput.select();
  refInput.setSelectionRange(0, 99999); // for mobile

  // Use execCommand for compatibility
  document.execCommand("copy");

  window.showToast('Copied: Referral link copied to clipboard!', 'success');
} 
window.copyInviteLink = copyInviteLink;

// ------------------ Copy Invite Code ------------------
function copyInviteCode() {
  const codeText = document.getElementById("inviteCode");
  if (!codeText) return;

  const temp = document.createElement("textarea");
  temp.value = codeText.textContent;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);

  window.showToast('Invite code copied successfully!', 'success');
} 
window.copyInviteCode = copyInviteCode;


// ------------------ Setup Referral ------------------
async function setupReferral(user) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  let referralId = data.referralId;

  if (!referralId) {
    referralId = generateReferralId();
    await updateDoc(userRef, { referralId });
  }

  // Show short invite code
  const inviteCodeBox = document.getElementById("inviteCode");
  if (inviteCodeBox) {
    inviteCodeBox.textContent = referralId;
  }

  // Set full referral link
  const refInput = document.getElementById("refLink");
  if (refInput) {
    refInput.value = `${window.location.origin}${window.location.pathname}#?ref=${referralId}`;
  }
}

// ------------------ Generate Referral ID ------------------
function generateReferralId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  const part1 = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("");

  const part2 = Array.from({ length: 3 }, () =>
    numbers[Math.floor(Math.random() * numbers.length)]
  ).join("");

  return part1 + part2;
}


const referralLink = document.getElementById("refLink");

document.querySelectorAll('.share-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const link = referralLink.value;
    let url = "#";

    if (btn.classList.contains('facebook')) url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    if (btn.classList.contains('twitter')) url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`;
    if (btn.classList.contains('whatsapp')) url = `https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`;
    if (btn.classList.contains('telegram')) url = `https://t.me/share/url?url=${encodeURIComponent(link)}`;
  
    window.open(url, '_blank');
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Handle opening the Team Page
  document.getElementById("viewTeamBtn")?.addEventListener("click", () => {
    // 1. Show the Team Page (assuming you have a function or style change here)
    const teamPage = document.getElementById("teamPage"); // Use your actual ID
    if (teamPage) teamPage.style.display = "block";

    // 2. Set the Level 1 tab to active visually
    const l1Btn = document.getElementById("level1Btn");
    if (l1Btn) setActiveTab(l1Btn);

    // 3. Trigger the data load
    loadTeam(1); 

    // 4. Hide nav
    const nav = document.getElementById("bottomNav");
    if (nav) nav.style.display = "none";
  });
});


// ======================================================
// AUTO CLAIM COMMISSION (DYNAMIC & DUAL-DB OPTIMIZED)
// ======================================================



async function startAutoClaim() {
  if (autoClaimStarted) return;
  autoClaimStarted = true;

  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  // 1️⃣ Listen to the User Document (Main DB)
  onSnapshot(userRef, async (snap) => {
    if (!snap.exists()) return;

    // 2️⃣ Fetch Dynamic Rates from Admin Panel (Main DB)
    const ratesSnap = await getDoc(doc(db, "adminSettings", "rates"));
    const globalRates = ratesSnap.exists() 
      ? ratesSnap.data() 
      : { level1: 0.25, level2: 0.02 }; // Professional default fallback

    const uData = snap.data();
    
    // We keep 'trackedInvestments' in Main DB to prevent duplicate payout loops
    const claimed = Array.isArray(uData.trackedInvestments) ? uData.trackedInvestments : [];

    let newClaimed = [...claimed];
    let balanceIncrease = 0;
    let recordsToSave = [];

    // Referrals lists are currently in Main DB
    const referrals = [
      ...(uData.referrals?.level1 || []).map(r => ({ uid: r.uid, level: 1 })),
      ...(uData.referrals?.level2 || []).map(r => ({ uid: r.uid, level: 2 }))
    ];

    // 3️⃣ Loop through each referral to check for new investments
    for (const ref of referrals) {
      const refRef = doc(db, "users", ref.uid);
      const refSnap = await getDoc(refRef);
      
      if (!refSnap.exists()) continue;

      const refData = refSnap.data();
      if (!Array.isArray(refData.investments)) continue;

      const rate = ref.level === 1 ? globalRates.level1 : globalRates.level2;

      for (const inv of refData.investments) {
        if (!inv.purchaseTime || !inv.price) continue;

        // Unique ID prevents paying the same commission twice
        const uniqueId = `${inv.purchaseTime}-${ref.uid}-L${ref.level}`;
        if (newClaimed.includes(uniqueId)) continue;

        const commission = Number(inv.price) * rate;
        if (commission <= 0) continue;

        newClaimed.push(uniqueId);
        balanceIncrease += commission;

        // Prepare record for Heavy Load DB
        recordsToSave.push({
          id: uniqueId,
          data: {
            uid: user.uid, // Owner of the commission
            type: "Commission",
            amount: commission,
            level: ref.level,
            refUid: ref.uid,
            refNumber: refData.number || "User",
            status: "success", // For the records page logic
            timestamp: serverTimestamp(), // Use Firestore server time
            description: `Level ${ref.level} commission from ${refData.number || 'referral'}`
          }
        });
      }
    }

    // 4️⃣ Atomic Update: Save logs to Heavy Load and update Balance in Main
    if (balanceIncrease > 0) {
      try {
        // A. Save logs to transactionDb (Heavy Load)
        const batchPromises = recordsToSave.map(rec => 
          setDoc(doc(transactionDb, "records", rec.id), rec.data)
        );
        await Promise.all(batchPromises);

        // B. Update Money and Tracker in db (Main DB)
        await updateDoc(userRef, {
          balance: increment(balanceIncrease),
          totalCommission: increment(balanceIncrease),
          trackedInvestments: newClaimed
        });

        console.log(`✅ Success: Claimed ₦${balanceIncrease} in commissions.`);
      } catch (err) {
        console.error("❌ Commission Payout Error:", err);
      }
    }
  });
}

// 🛡️ AUTH WATCHER: Ensures the system starts when the user logs in
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("Auto-Claim System: INITIALIZING...");
    startAutoClaim();
  } else {
    autoClaimStarted = false; 
  }
});


// ======================================================
// SHOW / HIDE DETAIL VIEW
// ======================================================
function showLevelDetails(level) {
  document.getElementById("detailView").style.display = "block";
  document.getElementById("listTitle").textContent = `Tier ${level} Members`;
  loadTeam(level);
}

function closeDetails() {
  document.getElementById("detailView").style.display = "none";
  document.getElementById("teamList").innerHTML = "";
}

// ======================================================
// LOAD SUMMARY CARDS (t1Count, t1Invest, t1Comm etc.)
// ======================================================
async function loadSummary() {
  const user = auth.currentUser;
  if (!user) return;


  console.log("User UID:", user.uid); // ADD THIS

  try {
    const ratesSnap = await getDoc(doc(db, "adminSettings", "rates"));
    const globalRates = ratesSnap.exists()
      ? ratesSnap.data()
      : { level1: 0.24, level2: 0.02 };

    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) return;

    const userData = userSnap.data();

     console.log("Referrals data:", userData.referrals); // ADD THIS

    for (const level of [1, 2]) {
      const referrals = level === 1
        ? (userData.referrals?.level1 || [])
        : (userData.referrals?.level2 || []);

      const commRate = level === 1 ? globalRates.level1 : globalRates.level2;

      let totalInvest = 0;

      for (const ref of referrals) {
        const refSnap = await getDoc(doc(db, "users", ref.uid));
        if (!refSnap.exists()) continue;

        const investments = refSnap.data().investments || [];
        investments.forEach(inv => {
          totalInvest += Number(inv.price || 0);
        });
      }

      const totalComm = totalInvest * commRate;

      document.getElementById(`t${level}Count`).textContent = referrals.length;
      document.getElementById(`t${level}Invest`).textContent = `₦${totalInvest.toLocaleString()}`;
      document.getElementById(`t${level}Comm`).textContent = `₦${totalComm.toLocaleString()}`;
    }
  } catch (err) {
    console.error("Summary Load Error:", err);
  }
}

// ======================================================
// LOAD TEAM LIST
// ======================================================
async function loadTeam(level) {
  const user = auth.currentUser;
  if (!user) return;

  const teamListEl = document.getElementById("teamList");
  if (!teamListEl) return;

  teamListEl.innerHTML = `<p style="text-align:center; color:#10b981; font-size:13px; margin-top:20px;">Fetching Tier ${level} data...</p>`;

  try {
    const ratesSnap = await getDoc(doc(db, "adminSettings", "rates"));
    const globalRates = ratesSnap.exists()
      ? ratesSnap.data()
      : { level1: 0.24, level2: 0.02 };

    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const referrals = level === 1
      ? (userData.referrals?.level1 || [])
      : (userData.referrals?.level2 || []);

    if (referrals.length === 0) {
      teamListEl.innerHTML = `<p style="text-align:center; color:#888; margin-top:20px;">No members in Tier ${level} yet.</p>`;
      return;
    }

    teamListEl.innerHTML = "";

    const commPercent = level === 1
      ? (globalRates.level1 * 100)
      : (globalRates.level2 * 100);

    for (const ref of referrals) {
      const refSnap = await getDoc(doc(db, "users", ref.uid));
      if (!refSnap.exists()) continue;

      const d = refSnap.data();
      const investments = d.investments || [];
      let totalInvestmentValue = 0;
      investments.forEach(inv => {
        totalInvestmentValue += Number(inv.price || 0);
      });

      const rawNum = d.number || "N/A";
      const maskedNum = rawNum.length > 7
        ? rawNum.substring(0, 4) + "****" + rawNum.slice(-3)
        : rawNum;

      const joinDate = ref.createdAt
        ? new Date(ref.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : "N/A";

      const row = document.createElement("div");
      row.className = "tier-card";
      row.innerHTML = `
        <div class="tier-header">
            <div class="tier-title">
                <i class="fa-solid fa-user-gear" style="color:#10b981;"></i>
                <span>User: ${maskedNum}</span>
            </div>
            <div class="tier-badge">Tier ${level}</div>
        </div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${joinDate}</div>
                <div class="stat-label">JOINED</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">₦${totalInvestmentValue.toLocaleString()}</div>
                <div class="stat-label">INVESTMENT</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${commPercent}%</div>
                <div class="stat-label">COMMISSION</div>
            </div>
        </div>
      `;
      teamListEl.appendChild(row);
    }
  } catch (err) {
    console.error("Team Load Error:", err);
    teamListEl.innerHTML = `<p style="text-align:center; color:#ef4444;">Failed to load team.</p>`;
  }
}


// REPLACE WITH THIS:
auth.onAuthStateChanged((user) => {
  if (user) {
    loadSummary();
  }
});

window.showLevelDetails = showLevelDetails;
window.closeDetails = closeDetails;

// Initialize Firestore and Auth (assuming you already did this)
// const db = getFirestore(app);
// const auth = getAuth(app);

// Run only when user is logged in
onAuthStateChanged(auth, (user) => {
  if (!user) return; // not logged in, skip

  // Single reference to admin settings
  const settingsRef = doc(db, "adminSettings", "settings");

  // Real-time listener
  onSnapshot(settingsRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    // Telegram group button
    const tgBtn = document.querySelector(".join-tg-btn");
    if (tgBtn && data.officialGroup) {
      tgBtn.href = data.officialGroup;
    }

    // Customer service username
    const csBtn = document.getElementById("customerServiceBtn");
    if (csBtn && data.customerService) {
      csBtn.onclick = () => {
        const username = data.customerService.replace("@", "");
        window.open(`https://t.me/${username}`, "_blank");
      };
    }

    // Official group button click
    const officialDiv = document.querySelector(".official-group-link");
    if (officialDiv) {
      officialDiv.onclick = (e) => {
        e.stopPropagation(); // Prevent this click from triggering parent click listeners
        if (data?.officialGroup) {
          window.open(data.officialGroup, "_blank");
        } else {
          Toast.fire({
            icon: 'error',
            title: 'Link Unavailable',
            text: 'Official group link not available.',
            confirmButtonColor: '#007bff'
          });
        }
      };
    }

    // --- Bank info section removed because it's not needed anymore ---
    // const bank = data.bankAccount;
    // if (bank) { ... }

  }); // End onSnapshot
}); // End onAuthStateChanged


// ======================================================
// LOAD WITHDRAWAL UI DATA
// ======================================================
async function loadWithdrawData() {
  if (!auth.currentUser) return;

  try {
    // 1️⃣ Fetch settings from MAIN DB (cached)
    if (!window._cachedSettings) {
      const settingsRef = doc(db, "adminSettings", "settings");
      const settingsSnap = await getDoc(settingsRef);
      window._cachedSettings = settingsSnap.exists() ? settingsSnap.data() : {};
    }

    const settings = window._cachedSettings;
    window.MIN_WITHDRAWAL = settings.minimumWithdrawal || 1000;

    // 2️⃣ Load user balance and bank info from MAIN DB
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    document.getElementById("withdrawBalance").textContent = "₦" + (data.balance || 0).toLocaleString();

    const bank = data.bankAccount;
    const bankCard = document.getElementById("withdrawBankCard");

    if (bank) {
      bankCard.innerHTML = `
        <p id="withdrawBankName">Bank: ${bank.bankName}</p>
        <p id="withdrawAccountName">Name: ${bank.accountName}</p>
        <p id="withdrawAccountNumber">Acct No: ${bank.accountNumber.slice(0, 4)} **** ${bank.accountNumber.slice(-4)}</p>
      `;
    } else {
      bankCard.innerHTML = `
        <div class="bank-empty">
          <div class="bank-icon">🏦</div>
          <h4>No Bank Account Linked</h4>
          <p>Please add your bank account to proceed with withdrawals.</p>
          <button id="addAccountBtn">Add Bank Account</button>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading withdrawal layout:", error);
  }
}

// ======================================================
// MANUAL WITHDRAWAL SUBMISSION LOGIC
// ======================================================
document.getElementById("withdrawSubmitBtn").onclick = async () => {
  const amountInput = document.getElementById("withdrawAmountInput");
  const submitBtn = document.getElementById("withdrawSubmitBtn");
  
  if (!auth.currentUser) return;

  const userRef = doc(db, "users", auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};
  const bank = userData.bankAccount;

  // --- 🛑 VALIDATIONS ---
  if (!bank || !bank.accountNumber || !bank.bankName || !bank.accountName) {
    window.showToast('Bank Account Required: Please bind your bank account first!', 'warning');
    return;
  }


  // ✅ ADD THIS: Check for active investment
const investments = Array.isArray(userData.investments) ? userData.investments : [];
const hasActiveInvestment = investments.some(inv => inv.status === "active");

if (!hasActiveInvestment) {
  window.showToast('No Active Investment: You must have at least one active investment to withdraw.', 'warning');
  return;
}


  const settings = window._cachedSettings || {};
  if (settings.withdrawalEnabled === false) {
    window.showToast('Withdrawals Disabled: Currently disabled by admin.', 'warning');
    return;
  }

  const amount = parseFloat(amountInput.value);
  const minWithdrawal = settings.minimumWithdrawal || 1000;
  const currentBalance = userData.balance || 0;

  if (!amount || amount <= 0) {
    window.showToast('Invalid Amount: Enter a valid amount!', 'warning');
    return;
  }
  if (amount < minWithdrawal) {
    window.showToast(`Amount Too Low: Minimum is ₦${minWithdrawal.toLocaleString()}`, 'warning');
    return;
  }
  if (amount > currentBalance) {
    window.showToast('Insufficient Balance: You do not have enough funds!', 'error');
    return;
  }
  if (userData.hasPendingWithdrawal === true) {
    window.showToast('Pending Request: You already have a pending withdrawal request.', 'warning');
    return;
  }

  // --- 🛠️ PROCESSING ---
  submitBtn.innerText = "Submitting...";
  submitBtn.disabled = true;

  try {
    // Fetch fee from admin settings
    const modeSnap = await getDoc(doc(db, "adminSettings", "withdrawal"));
    const feeRate = modeSnap.data()?.fee ?? 0.15;
    const fee = amount * feeRate;
    const finalAmount = amount - fee;

    const withdrawId = "W" + Date.now();

    // 1. Deduct balance and set pending flag in MAIN DB
    await runTransaction(db, async (transaction) => {
      const freshUserSnap = await transaction.get(userRef);
      const freshBalance = freshUserSnap.data().balance || 0;
      if (amount > freshBalance) throw new Error("Insufficient balance");
      
      transaction.update(userRef, { 
        balance: freshBalance - amount, 
        hasPendingWithdrawal: true 
      });
    });

    // 2. Create pending record in CORE_NEXT_DB for Admin Review
    await setDoc(doc(coreNextDb, "withdrawals", withdrawId), {
      uid: auth.currentUser.uid,
      number: userData.number || "N/A",
      originalAmount: amount,
      fee: fee,
      finalAmount: finalAmount,
      status: "pending",
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      createdAt: serverTimestamp(),
      note: "Manual request waiting for admin approval"
    });

    window.showToast('Submitted: Your request is now with the admin for approval.', 'success');
    document.getElementById("withdrawBalance").textContent = "₦" + (currentBalance - amount).toLocaleString();
    amountInput.value = "";
    
  } catch (err) {
    console.error("Processing Error:", err);
    window.showToast('Failed: Please try again later.', 'error');
  } finally {
    submitBtn.innerText = "Withdraw Funds";
    submitBtn.disabled = false;
  }
};

const recordsPage = document.getElementById("recordsPage");

if (recordsPage) {
  const filterBtns = recordsPage.querySelectorAll(".filter-btn");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {

      // active state only inside records page
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const type = btn.dataset.type.toLowerCase();

      const cards = recordsPage.querySelectorAll(".record-card");

      cards.forEach(card => {
        const text = card.querySelector(".record-transaction")?.innerText.toLowerCase() || "";

        if (type === "all") {
          card.style.display = "flex";
        } else {
          card.style.display = text.includes(type) ? "flex" : "none";
        }
      });

    });
  });
}


// Helper to match the icon and style
function getIconConfig(type = "") {
  const t = type.toLowerCase();
  if (t.includes("withdrawal")) {
    return { icon: "fa-arrow-down", class: "icon-withdrawal" };
  }
  return { icon: "fa-wallet", class: "icon-deposit" };
}

// Helper for date formatting: "Apr 19, 2026, 09:41 AM"
function formatRecordDate(date) {
  if (!date) return "-";
  const options = { month: 'short', day: '2-digit', year: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return `${date.toLocaleDateString('en-US', options)}, ${date.toLocaleTimeString('en-US', timeOptions)}`;
}

// 1. Registration Bonus (Static Hard-coded Card)
const bonusIcon = "fa-gift";
const bonusClass = "icon-bonus"; // Make sure to add this class to your CSS if not there

async function loadRecords(container) {
  if (!container) return;
  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  container.insertAdjacentHTML(
    "beforeend",
    `
    <div class="record-card" id="welcome-bonus-card">
      <div class="record-icon-box ${bonusClass}" style="background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2);">
        <i class="fa-solid ${bonusIcon}"></i>
      </div>
      <div class="record-middle">
        <div class="record-transaction">Registration Bonus</div>
        <div class="record-time">Accrued on Signup</div>
      </div>
      <div class="record-right">
        <div class="record-amount amount-plus">+₦500.00</div>
        <div class="record-status status-success">Confirmed</div>
      </div>
    </div>
    `
  );

  // 🚀 SWITCHED: 'withdrawals' database targets coreNextDb now instead of transactionDb
  const collections = [
    { name: "withdrawals", label: "Withdrawal", database: coreNextDb },
    { name: "deposits", label: "Deposit", database: transactionDb },
    { name: "records", label: "Commission", database: transactionDb }
  ];

  collections.forEach(({ name, label, database }) => {
    let colRef;

    if (name === "records") {
      colRef = collection(db, "users", user.uid, "records");
    } else {
      colRef = query(collection(database, name), where("uid", "==", user.uid));
    }

    onSnapshot(colRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;

        const rowId = `${name}-${change.doc.id}`;
        if (document.getElementById(rowId)) return;

        const data = change.doc.data();
        const iconConfig = getIconConfig(label);

        // ---------------- STATUS ----------------
        let statusText = "Pending";
        let statusClass = "status-pending";

        const s = data.status?.toLowerCase();

        if (s === "success" || s === "approved") {
          statusText = "Confirmed";
          statusClass = "status-success";
        } else if (s === "failed" || s === "declined") {
          statusText = "Failed";
          statusClass = "status-failed";
        }

        // ---------------- LABEL LOGIC ----------------
        let displayLabel = label;
        let subtitle = data.description || "Transaction";

        if (name === "records") {
          if (data.type === "Admin Update") {
            displayLabel = "Added via Admin";
            subtitle = "Manual credit from admin";
          } else {
            displayLabel = "Income";
            subtitle = "Craft Land";
          }

          statusText = "Confirmed";
          statusClass = "status-success";
        }

        // ---------------- DATE ----------------
        let dateObj = data.approvedAt || data.createdAt || data.timestamp;
        if (dateObj?.toDate) dateObj = dateObj.toDate();
        else if (dateObj) dateObj = new Date(dateObj);

        const formattedDate = formatRecordDate(dateObj);

        // ---------------- AMOUNT ----------------
        // Use originalAmount if it's a withdrawal, otherwise fall back to amount
        const amount = (name === "withdrawals") 
          ? (data.originalAmount ?? data.amount ?? 0) 
          : (data.amount ?? 0);

        const isWithdrawal = name === "withdrawals";
        const amountSign = isWithdrawal ? "-" : "+";
        const amountClass = isWithdrawal ? "amount-minus" : "amount-plus";

        // ---------------- RENDER ----------------
        const html = `
          <div class="record-card" id="${rowId}">
            <div class="record-icon-box ${iconConfig.class}">
              <i class="fa-solid ${iconConfig.icon}"></i>
            </div>

            <div class="record-middle">
              <div class="record-transaction">${displayLabel}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:2px;">
                ${subtitle}
              </div>
              <div class="record-time">${formattedDate}</div>
            </div>

            <div class="record-right">
              <div class="record-amount ${amountClass}">
                ${amountSign}₦${Number(amount).toLocaleString()}
              </div>
              <div class="record-status ${statusClass}">
                ${statusText}
              </div>
            </div>
          </div>
        `;

        container.insertAdjacentHTML("afterbegin", html);
      });
    });
  });
}


document.querySelector(".settings-item")?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadRecords(container);
});




const withdrawalBtn = document.getElementById("withdrawalBtn");

withdrawalBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  // Hide navbar safely
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page safely
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load withdrawal records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadWithdrawalRecords(container);
});


async function loadWithdrawalRecords(container) {
  if (!container) return;
  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  // 🚀 SWITCHED TO NEW DATABASE: Point query listener to coreNextDb instead of transactionDb
  const colRef = query(
    collection(coreNextDb, "withdrawals"), 
    where("uid", "==", user.uid)
  );

  onSnapshot(colRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `withdrawals-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      // ---------------- ICON ----------------
      // Using the circular dark style icon config
      const iconConfig = getIconConfig("Withdrawal");

      // ===============================
      // Status Logic (Matching Screenshot "Confirmed")
      // ===============================
      let statusText = "Pending";
      let statusClass = "status-pending";

      const s = data.status?.toLowerCase();

      if (s === "success" || s === "approved") {
        statusText = "Confirmed";
        statusClass = "status-success"; 
      } 
      else if (s === "failed" || s === "declined") {
        statusText = "Failed";
        statusClass = "status-failed"; 
      } 
      else if (s === "processing") {
        statusText = "Processing";
        statusClass = "status-pending"; 
      }

      // ---------------- TIME FORMATTING ----------------
      // Goal: Apr 19, 2026, 09:41 AM
      let time = data.approvedAt || data.createdAt || data.timestamp;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);

      const formattedDate = time ? 
        time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
        ", " + 
        time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
        : "-";

      // ---------------- AMOUNT ----------------
      const amount = data.amount ?? data.originalAmount ?? 0;

      // ---------------- UI RENDER ----------------
      // Using 'afterbegin' to show newest withdrawals at the top
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          
          <div class="record-icon-box ${iconConfig.class}">
            <i class="fa-solid ${iconConfig.icon}"></i>
          </div>

          <div class="record-middle">
            <div class="record-transaction">Withdrawal</div>
            <div class="record-time">${formattedDate}</div>
          </div>

          <div class="record-right">
            <div class="record-amount amount-minus">-₦${Number(amount).toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
            <div class="record-status ${statusClass}">${statusText}</div>
          </div>

        </div>
        `
      );
    });
  });
}

const depositBtn = document.getElementById("depositBtnrec");

depositBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  // Hide navbar safely
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page safely
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load deposit records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadDepositRecords(container); // Only deposits
});




async function loadDepositRecords(container) {
  if (!container) return;
  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  // ✅ HEAVY LOAD DB: Switched from 'db' to 'transactionDb'
  // ✅ FIELD FIX: Changed 'userId' to 'uid' to match storage logic
  const colRef = query(
    collection(transactionDb, "deposits"), 
    where("uid", "==", user.uid)
  );

  onSnapshot(colRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `deposits-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      // ---------------- ICON ----------------
      // Using circular style for Deposit (usually icon-deposit class)
      const iconConfig = getIconConfig("Deposit");

      // ===============================
      // Status Logic (Matching Screenshot "Confirmed")
      // ===============================
      let statusText = "Pending";
      let statusClass = "status-pending";

      const s = data.status?.toLowerCase();

      if (s === "success" || s === "approved") {
        statusText = "Confirmed";
        statusClass = "status-success"; 
      } 
      else if (s === "failed" || s === "declined") {
        statusText = "Failed";
        statusClass = "status-failed"; 
      } 
      else if (s === "processing") {
        statusText = "Processing";
        statusClass = "status-pending"; 
      }

      // ---------------- TIME FORMATTING ----------------
      // Format: Apr 18, 2026, 10:02 AM
      let time = data.createdAt || data.timestamp;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);

      const formattedDate = time ? 
        time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
        ", " + 
        time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
        : "-";

      // ---------------- AMOUNT ----------------
      const amount = data.amount ?? data.originalAmount ?? 0;
      const amountSign = "+";
      const amountClass = "amount-plus";

      // ---------------- UI RENDER ----------------
      // Using 'afterbegin' to ensure newest deposits appear at the top
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          
          <div class="record-icon-box ${iconConfig.class}">
            <i class="fa-solid ${iconConfig.icon}"></i>
          </div>

          <div class="record-middle">
            <div class="record-transaction">Deposit</div>
            <div class="record-time">${formattedDate}</div>
          </div>

          <div class="record-right">
            <div class="record-amount ${amountClass}">${amountSign}₦${Number(amount).toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
            <div class="record-status ${statusClass}">${statusText}</div>
          </div>

        </div>
        `
      );
    });
  });
}

const incomeBtn = document.getElementById("incomeBtn");

incomeBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  // Hide navbar safely
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page safely
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load income records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadIncomeRecords(container); // Only investment profit
});


async function loadIncomeRecords(container) {
  if (!container) return;
  container.innerHTML = ""; // clear previous records

  const user = auth.currentUser;
  if (!user) return;

  // ---------------- GET INVESTMENT PROFIT RECORDS ----------------
  const colRef = query(
    collection(db, "users", user.uid, "records"),
    where("type", "==", "Investment Profit")
  );

  onSnapshot(colRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `income-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      // ---------------- ICON ----------------
      // Using icon-commission or similar class for profit
      const iconConfig = getIconConfig("Commission");

      // ---------------- STATUS (STANDARD) ----------------
      const statusText = "Confirmed";
      const statusClass = "status-success";

      // ---------------- TIME FORMATTING ----------------
      // Format: Apr 18, 2026, 10:02 AM
      let time = data.timestamp;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);

      const formattedDate = time ? 
        time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
        ", " + 
        time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
        : "-";

      // ---------------- AMOUNT ----------------
      const amount = data.amount ?? 0;
      const amountSign = "+";
      const amountClass = "amount-plus"; 

      // ---------------- UI RENDER ----------------
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          
          <div class="record-icon-box ${iconConfig.class}">
            <i class="fa-solid fa-arrow-trend-up"></i> 
          </div>

          <div class="record-middle">
            <div class="record-transaction">${data.plan || "Investment Profit"}</div>
            <div class="record-time">${formattedDate}</div>
          </div>

          <div class="record-right">
            <div class="record-amount ${amountClass}">${amountSign}₦${Number(amount).toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
            <div class="record-status ${statusClass}">${statusText}</div>
          </div>

        </div>
        `
      );
    });
  });
}







const commissionBtn = document.getElementById("commissionBtn");

commissionBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (typeof pages !== 'undefined' && pages.length) {
    pages.forEach(p => { if (p) p.style.display = "none"; });
  }

  // Hide navbar
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load ONLY commission records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadCommissionRecords(container);
});



async function loadCommissionRecords(container) {
  if (!container) return;
  container.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">Loading commissions...</p>`;

  const user = auth.currentUser;
  if (!user) return;

  // ✅ Point specifically to the 'records' collection in Heavy Load DB
  const colRef = query(
    collection(transactionDb, "records"), 
    where("uid", "==", user.uid)
  );

  onSnapshot(colRef, snapshot => {
    // Clear the loader if data exists
    if (!snapshot.empty) container.innerHTML = "";

    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `commission-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      // ---------------- ICON ----------------
      // Using a purple/gold style for commissions
      const iconConfig = { class: "record-icon-commission", icon: "fa-gift" }; 

      // ---------------- TIME ----------------
      let time = data.timestamp || data.createdAt;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);

      const formattedDate = time ? 
        time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
        ", " + 
        time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
        : "Recent";

      // ---------------- UI RENDER ----------------
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          <div class="record-icon-box" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">
            <i class="fa-solid fa-share-nodes"></i>
          </div>

          <div class="record-middle">
            <div class="record-transaction" style="font-weight:700;">Affiliate Reward</div>
            <div style="font-size:11px; color:#64748b; margin-bottom:2px;">
                From: ${data.refNumber || 'Referral'} (Level ${data.level || '1'})
            </div>
            <div class="record-time">${formattedDate}</div>
          </div>

          <div class="record-right">
            <div class="record-amount amount-plus" style="color: #10b981; font-weight:800;">
                +₦${Number(data.amount || 0).toLocaleString()}
            </div>
            <div class="record-status status-success" style="background: #ecfdf5; color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 10px;">Confirmed</div>
          </div>
        </div>
        `
      );
    });

    if (snapshot.empty) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8;">No commissions earned yet.</div>`;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Select the grid buttons and input
  const amountOptions = document.querySelectorAll('.amount-option');
  const customAmountInput = document.getElementById('customAmount');
  const selectedAmountDisplay = document.getElementById('selectedAmountDisplay');

  // Optional: update header display
  const headerSelectedAmount = document.getElementById('headerSelectedAmount');

  let selectedAmount = 0;

  function updateSelectedAmountDisplay() {
  const formatted = selectedAmount ? `₦${Number(selectedAmount).toLocaleString()}` : '₦0';

  const display = document.getElementById("selectedAmountDisplay");
  if (display) display.textContent = formatted;

  const headerDisplay = document.getElementById("headerSelectedAmount");
  if (headerDisplay) headerDisplay.textContent = formatted;
}

  // ===== Grid Amount Click =====
  amountOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectedAmount = option.dataset.value;

      // Fill custom input with the clicked amount
      customAmountInput.value = selectedAmount;

      // Update top amount display
      updateSelectedAmountDisplay();

      // Highlight active grid button
      amountOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });

  // ===== Custom Amount Input =====
  customAmountInput.addEventListener('input', () => {
    selectedAmount = customAmountInput.value;

    // Update top display
    updateSelectedAmountDisplay();

    // Remove active class from grid buttons
    amountOptions.forEach(o => o.classList.remove('active'));
  });
});






document.addEventListener("DOMContentLoaded", function () {
  const nav = document.getElementById("bottomNav");

  if (!nav) {
    console.error("❌ Bottom navbar NOT found in HTML");
    return;
  }

  console.log("✅ Bottom navbar FOUND");

  // Force it visible (in case CSS hides it)
  nav.style.display = "flex";
  nav.style.visibility = "visible";
  nav.style.opacity = "1";
  nav.style.position = "fixed";
  nav.style.bottom = "0";
  nav.style.left = "0";
  nav.style.width = "100%";
  nav.style.zIndex = "99999";
});




// Scroll to last content in records page
function scrollToBottom() {
  const recordsPage = document.querySelector('.records-page');
  if (recordsPage) {
    recordsPage.scrollTop = recordsPage.scrollHeight;
  }
}

// Call after content is loaded or updated
scrollToBottom();







async function backfillInvestmentRecords(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  
  // ✅ QUOTA SAVER: If this user was already patched, STOP here.
  // This prevents hitting the database with 'updateDoc' every single login.
  if (userData.isPatched) return; 

  const investments = userData.investments || [];
  let needsUpdate = false;

  const updatedInvestments = investments.map((inv) => {
    if (!inv.purchaseId) {
      inv.purchaseId = "LEGACY-" + Math.floor(Math.random() * 1000000);
      needsUpdate = true;
    }
    return inv;
  });

  if (needsUpdate) {
    await updateDoc(userRef, {
      investments: updatedInvestments,
      isPatched: true // ✅ Mark as patched forever
    });
    console.log("User patched successfully.");
  } else {
    // Even if they had no investments, mark them as patched so we don't check again
    await updateDoc(userRef, { isPatched: true });
  }
}


// ✅ PLACE THIS OUTSIDE ALL OTHER FUNCTIONS (Global Scope)
function toggleVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    // Change icon to See-No-Evil Monkey (🙉) (Acting as "Visible")
    iconEl.textContent = "🙉";
    iconEl.style.color = "var(--accent-purple)"; // Optional: Make it purple when showing
  } else {
    input.type = "password";
    // Change back to Hear-No-Evil Monkey (🙈) (Acting as "Hidden")
    iconEl.textContent = "🙈";
    iconEl.style.color = "#a1a7b3"; // Optional: Back to neutral
  }
}
// ONLY DO THIS IF YOU USE type="module"
window.toggleVisibility = toggleVisibility;


// --- POPULATE BANKS IMMEDIATELY ---
document.addEventListener("DOMContentLoaded", function() {
    const bankSelect = document.getElementById("bankName");

    // Filtered Bank List explicitly matching your live Payrant API Payload
const banks = [
    { name: "5TT MFB", code: "090832" },
    { name: "78 FINANCE COMPANY LIMITED", code: "110072" },
    { name: "9 PSB", code: "120001" },
    { name: "9jaPay", code: "090629" },
    { name: "AAA FINANCE", code: "050005" },
    { name: "AACB MFB", code: "091013" },
    { name: "AB MICROFINANCE BANK", code: "090270" },
    { name: "ABBEY MORTGAGE BANK", code: "070010" },
    { name: "ABOVE ONLY MICROFINANCE BANK", code: "090260" },
    { name: "ABSU Microfinance Bank", code: "090640" },
    { name: "ABU MICROFINANCE BANK", code: "090197" },
    { name: "Abucoop Microfinance BANK", code: "090424" },
    { name: "ABULESORO MICROFINANCE BANK LTD", code: "090545" },
    { name: "Access Bank", code: "000014" },
    { name: "Access Bank (Diamond)", code: "000005" },
    { name: "ACCESS Y'ello & Beta", code: "100052" },
    { name: "ACCESSMONEY", code: "100013" },
    { name: "ACCION MFB", code: "090134" },
    { name: "Ada MFB", code: "090483" },
    { name: "ADAMAWA MORTGAGE BANK", code: "070030" },
    { name: "ADDOSSER MFB", code: "090160" },
    { name: "ADEYEMI COLLEGE STAFF MICROFINANCE BANK", code: "090268" },
    { name: "Advancly MFB", code: "090759" },
    { name: "ADVANS LA FAYETTE MFB", code: "090155" },
    { name: "Aella MFB", code: "090614" },
    { name: "Afekhafe MFB", code: "090292" },
    { name: "Afemai Microfinance Bank", code: "090518" },
    { name: "AFOLE MFB", code: "091017" },
    { name: "AFRIBANK NIGERIA PLC", code: "014" },
    { name: "AG MORTGAGE BANK PLC", code: "100028" },
    { name: "AGOSASA MICROFINANCE BANK", code: "090371" },
    { name: "Akalabo MFB", code: "090698" },
    { name: "Akpo Microfinance Bank", code: "090608" },
    { name: "AKSU MFB", code: "090756" },
    { name: "AKU DIEWA MFB", code: "091009" },
    { name: "Aku MFB", code: "090531" },
    { name: "AKUCHUKWU MICROFINANCE BANK LTD", code: "090561" },
    { name: "AL-BARKAH MFB", code: "090133" },
    { name: "ALEKUN MICROFINANCE BANK", code: "090259" },
    { name: "ALERT MFB", code: "090297" },
    { name: "ALHAYAT MFB", code: "090277" },
    { name: "ALLWORKERS MFB", code: "090131" },
    { name: "ALLY MICROFINANCE BANK", code: "090548" },
    { name: "ALPHA MORGAN BANK", code: "000041" },
    { name: "ALPHAKAPITAL MFB", code: "090169" },
    { name: "Alternative Bank Limited", code: "000037" },
    { name: "Alvana Microfinance BANK", code: "090489" },
    { name: "AMAANAH FINANCE", code: "050045" },
    { name: "Amac Microfinance BANK", code: "090394" },
    { name: "AMJU MFB", code: "090180" },
    { name: "AMML MFB", code: "090116" },
    { name: "AMOYE MFB", code: "090610" },
    { name: "Ample MFB", code: "090770" },
    { name: "AMS FINANCE", code: "050048" },
    { name: "Anchorage MFB", code: "090476" },
    { name: "Aniocha MFB", code: "090469" },
    { name: "ANIOMA MFB", code: "090751" },
    { name: "APEKS MICROFINANCE BANK", code: "090143" },
    { name: "Apex Trust MFB", code: "090737" },
    { name: "APPLE MICROFINANCE BANK", code: "090376" },
    { name: "Aramoko Microfinance Bank", code: "090307" },
    { name: "ARCPAY Microfinance", code: "090689" },
    { name: "ARISE MFB", code: "090282" },
    { name: "ARM MFB", code: "090816" },
    { name: "ASCENSIA FINANCE COMPANY LIMITED", code: "050040" },
    { name: "ASHA MICROFINANCE BANK", code: "091018" },
    { name: "Aso Savings and Loans", code: "090001" },
    { name: "ASPIRE MICROFINANCE BANK LTD", code: "090544" },
    { name: "ASPIRE MORTGAGE BANK LIMITED", code: "070033" },
    { name: "Assets Matrix MFB", code: "090287" },
    { name: "ASSETS Microfinance BANK", code: "090473" },
    { name: "ASTRAPOLARIS MFB", code: "090172" },
    { name: "ATBU Microfinance BANK", code: "090451" },
    { name: "AUCHI MICROFINANCE BANK", code: "090264" },
    { name: "AUCHI POLY MFB", code: "090817" },
    { name: "AVE MARIA MICROFINANCE BANK LTD", code: "090600" },
    { name: "AVEST MICROFINANCE BANK", code: "091012" },
    { name: "Avuenegbe MFB", code: "090478" },
    { name: "AVVIC MFB", code: "090853" },
    { name: "Awacash Microfinance Bank", code: "090633" },
    { name: "Awe MFB", code: "090693" },
    { name: "Awesome MFB", code: "090662" },
    { name: "Aztec Microfinance Bank", code: "090540" },
    { name: "BABCOCK MFB", code: "090729" },
    { name: "BABURA MICROFINANCE BANK", code: "090625" },
    { name: "BAIGE MFB", code: "090862" },
    { name: "BAINES CREDIT MFB", code: "090188" },
    { name: "BALERA MICROFINANCE BANK LTD", code: "090563" },
    { name: "Balogun Fulani Microfinance BANK", code: "090181" },
    { name: "BALOGUN GAMBARI MFB", code: "090326" },
    { name: "BAM MFB", code: "090651" },
    { name: "BANC CORP MICROFINANCE BANK", code: "090581" },
    { name: "Banex Microfinance BANK", code: "090425" },
    { name: "BANK OF AGRICULTURE", code: "090367" },
    { name: "BANK78 MFB", code: "090866" },
    { name: "Bankeasy MFB", code: "090789" },
    { name: "BANKIT MFB", code: "090726" },
    { name: "Bankly Microfinance Bank", code: "090529" },
    { name: "BAOBAB MICROFINANCE BANK", code: "090136" },
    { name: "BARNAWA MFB", code: "090783" },
    { name: "Bauchi CFA Microfinance Bank", code: "090387" },
    { name: "BAYERO MICROFINANCE BANK", code: "090316" },
    { name: "BC KASH MFB", code: "090127" },
    { name: "Beamer MFB", code: "090591" },
    { name: "BELLBANK MFB", code: "090672" },
    { name: "Benysta Microfinance BANK", code: "090413" },
    { name: "Berachah Microfinance Bank", code: "090618" },
    { name: "CITY CODE MORTGAGE BANK", code: "070027" },
    { name: "Cloverleaf MFB", code: "090511" },
    { name: "CoalCamp Microfinance BANK", code: "090254" },
    { name: "COASTLINE MICROFINANCE BANK", code: "090374" },
    { name: "CONFIDENCE MICROFINANCE BANK LTD", code: "090530" },
    { name: "CONSISTENT TRUST MICROFINANCE BANK LTD", code: "090553" },
    { name: "CONSUMER MFB", code: "090130" },
    { name: "COOL MFB", code: "090842" },
    { name: "COOP Mortgage BANK", code: "070021" },
    { name: "COOPFUND MFB", code: "090717" },
    { name: "Corestep MICROFINANCE BANK", code: "090365" },
    { name: "Coronation", code: "060001" },
    { name: "COUNTY FINANCE LTD", code: "050001" },
    { name: "COVENANT MFB", code: "070006" },
    { name: "CREDIT AFRIQUE MFB", code: "090159" },
    { name: "Credit Direct Limited", code: "110049" },
    { name: "Creditville MFB", code: "090611" },
    { name: "Crescent Microfinance bank", code: "090526" },
    { name: "CROSS RIVER MICROFINANCE BANK", code: "090429" },
    { name: "CRUTECH MICROFINANCE BANK", code: "090414" },
    { name: "CRYSTAL FINANCE COMPANY LIMITED", code: "050029" },
    { name: "CSD MFB", code: "090686" },
    { name: "DAL Microfinance Bank", code: "090596" },
    { name: "DASH MFB", code: "090845" },
    { name: "DAVENPORT MFB", code: "090673" },
    { name: "Davodani Microfinance BANK", code: "090391" },
    { name: "DAYLIGHT MICROFINANCE BANK", code: "090167" },
    { name: "DAYSPRING MFB", code: "090873" },
    { name: "DEC-ENUGU MFB", code: "090995" },
    { name: "Delta Trust Mortgage bank", code: "070023" },
    { name: "DESTINY MFB", code: "090723" },
    { name: "Digitvant MFB", code: "090745" },
    { name: "Dignity Finance", code: "050013" },
    { name: "DILLON MFB", code: "090828" },
    { name: "DIOBU MICROFINANCE BANK", code: "090643" },
    { name: "Doje Microfinance Bank Limited", code: "090404" },
    { name: "DOT MFB", code: "090470" },
    { name: "DSC MFB", code: "090821" },
    { name: "DUXBANK MFB", code: "090847" },
    { name: "DW MFB", code: "090721" },
    { name: "E-BARCS MFB", code: "090156" },
    { name: "E-Finance", code: "050016" },
    { name: "EAGLE FLIGHT MFB", code: "090294" },
    { name: "EARNWELL MFB", code: "090674" },
    { name: "Eartholeum", code: "100021" },
    { name: "Eastman MFB", code: "090707" },
    { name: "EBSU MICROFINANCE BANK", code: "090427" },
    { name: "Ecobank Mobile", code: "307" },
    { name: "Ecobank Nigeria", code: "000010" },
    { name: "Ecobank Xpress Account", code: "100008" },
    { name: "EDFIN MFB", code: "090310" },
    { name: "EGWAFIN MICROFINANCE BANK LTD", code: "090556" },
    { name: "EJINDU MFB", code: "090694" },
    { name: "EK-Reliable Microfinance BANK", code: "090389" },
    { name: "EKIMOGUN MICROFINANCE BANK", code: "090552" },
    { name: "EKONDO MFB", code: "090097" },
    { name: "EKWULOBIA MFB", code: "091010" },
    { name: "ELLINGTON MFB", code: "090811" },
    { name: "EMAAR MICROFINANCE BANK LTD", code: "090712" },
    { name: "EMERALDS MFB", code: "090273" },
    { name: "EMINENCE MFB", code: "091002" },
    { name: "EMPIRETRUST MICROFINANCE BANK", code: "090114" },
    { name: "eNaira(e-Naira)", code: "000033" },
    { name: "Enco Finance", code: "050012" },
    { name: "Enrich Microfinance Bank", code: "090539" },
    { name: "ENTERPRISE BANK LIMITED", code: "000019" },
    { name: "Entity MFB", code: "090656" },
    { name: "EQUATOR MICROFINANCE BANK", code: "090872" },
    { name: "ESAN MFB", code: "090189" },
    { name: "ESO-E MICROFINANCE BANK", code: "090166" },
    { name: "ETHICA MFB", code: "090982" },
    { name: "eTranzact", code: "100006" },
    { name: "EVANGEL MFB", code: "090304" },
    { name: "EVERGREEN MICROFINANCE BANK", code: "090332" },
    { name: "EVIB FINANCE", code: "050034" },
    { name: "EWT Microfinance Bank", code: "090572" },
    { name: "EXCEL MFB", code: "090678" },
    { name: "EXCELLENT MICROFINANCE BANK", code: "090541" },
    { name: "EYOWO MICROFINANCE BANK", code: "090328" },
    { name: "FACTORING AND SUPPLY CHAIN FINANCE LIMITED", code: "050042" },
    { name: "Fairmoney MFB", code: "090551" },
    { name: "FAME MICROFINANCE BANK", code: "090330" },
    { name: "FAST CREDIT", code: "050009" },
    { name: "FAST Microfinance BANK", code: "090179" },
    { name: "FBN MOBILE", code: "309" },
    { name: "FBNQuest MERCHANT BANK", code: "060002" },
    { name: "FCMB Easy Account", code: "100031" },
    { name: "FCMB MFB", code: "090409" },
    { name: "FCT MFB", code: "090290" },
    { name: "Federal Polytechnic Nekede Microfinance BANK", code: "090398" },
    { name: "FEDERALPOLY NASARAWAMFB", code: "090298" },
    { name: "Fedeth MFB", code: "090482" },
    { name: "FETS", code: "100001" },
    { name: "FEWCHORE FINANCE COMPANY LIMITED", code: "050002" },
    { name: "FFS MICROFINANCE BANK", code: "090153" },
    { name: "FHA MORTGAGE BANK LTD", code: "070026" },
    { name: "Fidelity Bank", code: "000007" },
    { name: "Fidelity Mobile", code: "100019" },
    { name: "FIDFUND MFB", code: "090126" },
    { name: "FIMS MFB", code: "090507" },
    { name: "FINATRUST MICROFINANCE BANK", code: "090111" },
    { name: "Finca Microfinance BANK", code: "090400" },
    { name: "Firmus MICROFINANCE BANK", code: "090366" },
    { name: "FIRST ALLY MICROFINANCE BANK", code: "090135" },
    { name: "First Bank Of Nigeria", code: "000016" },
    { name: "First City Monument Bank", code: "000003" },
    { name: "First Generation Mortgage Bank", code: "070014" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "Gabasawa MFB", code: "090582" },
    { name: "GADOL FINANCE", code: "050333" },
    { name: "Garki MFB", code: "090484" },
    { name: "Garun Mallam MFB", code: "090691" },
    { name: "GASHUA MICROFINANCE BANK", code: "090168" },
    { name: "GATEWAY MORTGAGE BANK", code: "070009" },
    { name: "GBEDE Microfinance Bank", code: "090579" },
    { name: "Giant Stride MFB", code: "090475" },
    { name: "GIDAUNIYAR ALHERI MICROFINANCE BANK", code: "090621" },
    { name: "Giginya MFB", code: "090632" },
    { name: "GiGinya Microfinance BANK", code: "090411" },
    { name: "Girei MFB", code: "090186" },
    { name: "GIWA MICROFINANCE BANK", code: "090441" },
    { name: "GLOBAL INITIATIVE MFB", code: "090639" },
    { name: "GLOBAL TRUST SAVINGS AND LOANS", code: "070032" },
    { name: "Globus Bank", code: "000027" },
    { name: "GLORY MFB", code: "090278" },
    { name: "GMB Microfinance BANK", code: "090408" },
    { name: "GOLDMAN MICROFINANCE BANK LTD", code: "090574" },
    { name: "GOMBE MFB", code: "090586" },
    { name: "GoMoney", code: "100022" },
    { name: "Good Neighbours Microfinance BANK", code: "090467" },
    { name: "GOOD SHEPHARD MFB", code: "090664" },
    { name: "Gosifechukwu MFB", code: "090687" },
    { name: "GOWANS MFB", code: "090122" },
    { name: "Grant Microfinance BANK", code: "090335" },
    { name: "GREEN ENERGY MICROFINANCE BANK LTD", code: "090550" },
    { name: "Greenacres MFB", code: "090599" },
    { name: "GREENBANK MFB", code: "090178" },
    { name: "GREENVILLE MICROFINANCE BANK", code: "090269" },
    { name: "GREENWICH MERCHANT BANK", code: "060004" },
    { name: "GRIFFIN FINANCE LIMITED", code: "050041" },
    { name: "GROOMING MICROFINANCE BANK", code: "090195" },
    { name: "GTBank", code: "000013" },
    { name: "GTBank Mobile Money", code: "100009" },
    { name: "GTI Microfinance BANK", code: "090385" },
    { name: "Gwong Microfinance bank", code: "090500" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "HACKMAN MICROFINANCE BANK", code: "090147" },
    { name: "Haggai Mortgage Bank", code: "070017" },
    { name: "HalaCredit MFB", code: "090291" },
    { name: "HASAL MFB", code: "090121" },
    { name: "HAYAT TRUST MFB", code: "090777" },
    { name: "Headway MFB", code: "090363" },
    { name: "HEDGE MFB", code: "091025" },
    { name: "Hedonmark", code: "100017" },
    { name: "Highland Microfinance BANK", code: "090418" },
    { name: "HomeBase Mortgage", code: "070024" },
    { name: "HopePSB", code: "120002" },
    { name: "I-MONIE Microfinance Bank", code: "090426" },
    { name: "IBA MFB", code: "090598" },
    { name: "IBBU MFB", code: "090697" },
    { name: "IBETO MICROFINANCE BANK", code: "090439" },
    { name: "IBILE MICROFINANCE BANK", code: "090118" },
    { name: "IBOLO MICORFINANCE BANK LTD", code: "090532" },
    { name: "Ibom fadama Microfinance Bank", code: "090519" },
    { name: "Ibom Mortgage Bank", code: "070025" },
    { name: "Ibu-Aje Microfinance", code: "090488" },
    { name: "IC GLOBALMicrofinance bank", code: "090520" },
    { name: "IHIALA MFB", code: "090725" },
    { name: "IJARE MFB", code: "090730" },
    { name: "IJEBU-IFE MICROFINANCE BANK LTD", code: "090546" },
    { name: "IKENNE MFB", code: "090324" },
    { name: "IKERE MFB", code: "090799" },
    { name: "IKIRE MFB", code: "090279" },
    { name: "IKORODU DIVISION MFB", code: "090844" },
    { name: "IKOYI ILE MFB", code: "090681" },
    { name: "Ikoyi-Osun Microfinance Bank", code: "090536" },
    { name: "ILARO POLY MICROFINANCE BANK LTD", code: "090571" },
    { name: "ILASAN MICROFINANCE BANK", code: "090370" },
    { name: "ILE-OLUJI MICROFINANCE BANK", code: "090710" },
    { name: "Ilora Microfinance BANK", code: "090430" },
    { name: "ILORIN MICROFINANCE BANK", code: "090350" },
    { name: "ILUTITUN-OSORO MFB", code: "090834" },
    { name: "IMO MICROFINANCE BANK", code: "090258" },
    { name: "Imowo Microfinance BANK", code: "090417" },
    { name: "Imperial Homes Mortgage Bank", code: "100024" },
    { name: "IMSU MFB", code: "090670" },
    { name: "INDULGE MFB", code: "090772" },
    { name: "INEBA", code: "080838" },
    { name: "INEBA GOGO MICROFINANCE BANK LIMITED", code: "090838" },
    { name: "INFINITY MFB", code: "090157" },
    { name: "Infinity trust  Mortgage Bank", code: "070016" },
    { name: "Innovative MFB", code: "090115" },
    { name: "Insight Microfinance BANK", code: "090434" },
    { name: "Intellifin", code: "100027" },
    { name: "Interland MFB", code: "090386" },
    { name: "Interswitch Financial Inclusion Services (IFIS)", code: "110010" },
    { name: "INVESTIN MICROFINANCE BANK", code: "090998" },
    { name: "Iperu Microfinance BANK", code: "090493" },
    { name: "IRL MICROFINANCE BANK", code: "090149" },
    { name: "ISALEOYO MICROFINANCE BANK", code: "090377" },
    { name: "Ishie Microfinance BANK", code: "090428" },
    { name: "ISI UZO MFB", code: "090849" },
    { name: "ISLAND MFB", code: "090584" },
    { name: "Isuofia MFB", code: "090353" },
    { name: "IWADE MICROFINANCE BANK LTD", code: "090578" },
    { name: "IWOAMA MICROFINANCE BANK", code: "090543" },
    { name: "IYAMOYE MICROFINANCE BANK LTD", code: "090570" },
    { name: "IYERU OKIN MICROFINANCE BANK LTD", code: "090337" },
    { name: "Izon Microfinance BANK", code: "090421" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "MAAL MFB", code: "090764" },
    { name: "Mab Allianz MFB", code: "090623" },
    { name: "Mabinas MFB", code: "090630" },
    { name: "Macrod MFB", code: "090603" },
    { name: "Maestro MFB", code: "090746" },
    { name: "MAHFUZ MFB", code: "090825" },
    { name: "MAINLAND MICROFINANCE BANK", code: "090323" },
    { name: "MAINSTREET MFB", code: "090171" },
    { name: "Maintrust MFB", code: "090465" },
    { name: "MALACHY MFB", code: "090174" },
    { name: "MANNY MICROFINANCE BANK", code: "090383" },
    { name: "Mautech Microfinance BANK", code: "090423" },
    { name: "MAXITRUST MFB", code: "090843" },
    { name: "MAYDEN MFB", code: "090854" },
    { name: "MAYFAIR MFB", code: "090321" },
    { name: "MAYFRESH MORTGAGE BANK", code: "070019" },
    { name: "Medef MFB", code: "090612" },
    { name: "MEGA MICROFINANCE BANK", code: "090824" },
    { name: "MEGAPRAISE MICROFINANCE BANK", code: "090280" },
    { name: "Memphis Microfinance BANK", code: "090432" },
    { name: "MERCURY MICROFINANCE BANK", code: "090589" },
    { name: "Mgbidi Microfinance Bank", code: "090528" },
    { name: "MIA MICROFINANCE BANK", code: "090859" },
    { name: "MICROBIZ MFB", code: "090587" },
    { name: "MICROFINANCE BANK MEMENT", code: "090867" },
    { name: "MICROVIS MICROFINANCE BANK", code: "090113" },
    { name: "Midland MFB", code: "090192" },
    { name: "MINJIBIR MICROFINANCE BANK", code: "090607" },
    { name: "MINT MFB", code: "090763" },
    { name: "MINT-FINEX MFB", code: "090281" },
    { name: "Mkobo Microfinance Bank", code: "090455" },
    { name: "Mkudi", code: "100011" },
    { name: "MODEL MFB", code: "090775" },
    { name: "MOLUSI MICROFINANCE BANK", code: "090362" },
    { name: "MoMo PSB", code: "120003" },
    { name: "Monarch Microfinance BANK", code: "090462" },
    { name: "Money Master PSB", code: "120005" },
    { name: "MoneyBox", code: "100020" },
    { name: "MONEYFIELD MICROFINANCE BANK", code: "090144" },
    { name: "MONEYTRONICS MFB", code: "090692" },
    { name: "MONEYTRUST MFB", code: "090129" },
    { name: "Moniepoint", code: "090405" },
    { name: "Moremonee MFB", code: "090685" },
    { name: "MOUA MFB", code: "090659" },
    { name: "MOVASCO-OP MFB", code: "090979" },
    { name: "MOYOFADE MICROFINANCE BANK", code: "090448" },
    { name: "Mozfin Microfinance BANK", code: "090392" },
    { name: "Mutual Alliance Mortgage Bank", code: "070028" },
    { name: "MUTUAL BENEFITS MFB", code: "090190" },
    { name: "MUTUAL TRUST MICROFINANCE BANK", code: "090151" },
    { name: "NAF MFB", code: "090740" },
    { name: "Nomase MFB", code: "090736" },
    { name: "Nombank MFB", code: "090645" },
    { name: "NORTHQUEST FINANCE", code: "050030" },
    { name: "NOUN MFB", code: "090822" },
    { name: "Nova Bank", code: "060003" },
    { name: "NOVEL MICROFINANCE BANK", code: "090863" },
    { name: "NOVUS MFB", code: "090734" },
    { name: "NOWNOW（Contec Global）", code: "100032" },
    { name: "NPF MICROFINANCE BANK", code: "070001" },
    { name: "Npolu-UST Microfinance Bank", code: "090535" },
    { name: "Nsehe Microfinance Bank", code: "090628" },
    { name: "Nsuk Microfinance BANK", code: "090491" },
    { name: "NSUKKA MFB", code: "090356" },
    { name: "NUGGETS MFB", code: "090676" },
    { name: "Numo Microfinance bank", code: "090516" },
    { name: "NUTURE MFB", code: "090364" },
    { name: "Nwannegadi MFB", code: "090399" },
    { name: "OAKLAND MICROFINANCE BANK", code: "090437" },
    { name: "OAU MICROFINANCE BANK LTD", code: "090345" },
    { name: "OBA MICROFINANCE BANK", code: "090981" },
    { name: "OBELEDU MFB", code: "090755" },
    { name: "OBOLLO MFB", code: "090810" },
    { name: "OCHE MFB", code: "090333" },
    { name: "OCTOPUS MICROFINANCE BANK LTD", code: "090576" },
    { name: "Odoakpu MFB", code: "090654" },
    { name: "OGANIRU MFB", code: "091011" },
    { name: "Ogberuru Microfinance Bank", code: "090738" },
    { name: "Ogige MFB", code: "090739" },
    { name: "OHAFIA MFB", code: "090119" },
    { name: "OHHA MICROFINANCE BANK", code: "090626" },
    { name: "Ojokoro Mfb", code: "090527" },
    { name: "OKE-ARO OREDEGBE MICROFINANCE BANK LTD", code: "090565" },
    { name: "Okengwe MFB", code: "090646" },
    { name: "OKPE MFB", code: "090855" },
    { name: "OKPOGA MFB", code: "090161" },
    { name: "OKUKU MICROFINANCE BANK LTD", code: "090566" },
    { name: "OKWO-OHA MFB", code: "090752" },
    { name: "OLABISI ONABANJO UNIVERSITY MICROFINANCE BANK", code: "090272" },
    { name: "Old Shoreham MFB", code: "090410" },
    { name: "OLIVE MFB", code: "090696" },
    { name: "OLOFIN OWENA Microfinance BANK", code: "090468" },
    { name: "OLOMU APERAN MFB", code: "090852" },
    { name: "OLUCHUKWU Microfinance BANK", code: "090471" },
    { name: "Omak MFB", code: "090700" },
    { name: "OMIYE MFB", code: "090295" },
    { name: "OneUtility MFB", code: "090605" },
    { name: "OPay", code: "100004" },
    { name: "OPTIMUS BANK", code: "000036" },
    { name: "Oraukwu Microfinance BANK", code: "090492" },
    { name: "ORISUN MFB", code: "090588" },
    { name: "ORITABASORUN MICROFINANCE BANK", code: "090460" },
    { name: "OSANTA MICROFINANCE BANK", code: "090750" },
    { name: "Oscotech MFB", code: "090396" },
    { name: "OSOMHE MFB", code: "090715" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "PalmPay", code: "100033" },
    { name: "PARRALEX", code: "090004" },
    { name: "PATHFINDER MFB", code: "090680" },
    { name: "PATRICK GOLD", code: "090317" },
    { name: "PayAttitude Online", code: "110001" },
    { name: "PAYREP MICROFINANCE BANK LIMITED", code: "090823" },
    { name: "PAYSTACK MFB", code: "090986" },
    { name: "Paystack-Titan", code: "100039" },
    { name: "Peace Microfinance BANK", code: "090402" },
    { name: "PECAN TRUST MICROFINANCE BANK", code: "090137" },
    { name: "PENIEL MICORFINANCE BANK LTD", code: "090379" },
    { name: "PENNYWISE MICROFINANCE BANK", code: "090196" },
    { name: "PENTECOST MFB", code: "090861" },
    { name: "PETRA MICROFINANCE BANK", code: "090165" },
    { name: "PETTYSAVE MFB", code: "090768" },
    { name: "PILLAR MFB", code: "090289" },
    { name: "Platinum MFB", code: "090993" },
    { name: "PLATINUM MORTGAGE BANK", code: "070013" },
    { name: "PLUG MICROFINANCE BANK", code: "090858" },
    { name: "POCKETAPP", code: "100042" },
    { name: "Poder Finance", code: "050021" },
    { name: "POINTONE MFB", code: "090754" },
    { name: "Polaris Bank", code: "000008" },
    { name: "Polyibadan Microfinance Bank", code: "090534" },
    { name: "POLYUWANNA MFB", code: "090296" },
    { name: "Preeminent Microfinance BANK", code: "090412" },
    { name: "PREMIER MFB", code: "090779" },
    { name: "Premium Trust bank", code: "000031" },
    { name: "PRESTIGE MICROFINANCE BANK", code: "090274" },
    { name: "Prisco Microfinance BANK", code: "090481" },
    { name: "Pristine Divitis Microfinance BANK", code: "090499" },
    { name: "PRODIGY MFB", code: "090784" },
    { name: "Projects Microfinance bank", code: "090503" },
    { name: "Prospa Capital Microfinance Bank", code: "090495" },
    { name: "Prosperity Microfinance Bank", code: "090642" },
    { name: "Providus Bank", code: "000023" },
    { name: "Prudent MFB", code: "090690" },
    { name: "PURPLEMONEY MFB", code: "090303" },
    { name: "PYRAMID MFB", code: "090657" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "QUBE MICROFINANCE BANK LTD", code: "090569" },
    { name: "QUICK MFB", code: "090850" },
    { name: "QUICKFUND MICROFINANCE BANK", code: "090261" },
    { name: "Radalpha Microfinance bank", code: "090496" },
    { name: "RAHAMA MFB", code: "090170" },
    { name: "Rand Merchant Bank", code: "000024" },
    { name: "RANK MFB", code: "090860" },
    { name: "RAYYAN MFB", code: "090616" },
    { name: "Refuge Mortgage Bank", code: "070011" },
    { name: "REGENT MFB", code: "090125" },
    { name: "Rehoboth Microfinance BANK", code: "090463" },
    { name: "RELIANCE MFB", code: "090173" },
    { name: "RENMONEY MICROFINANCE BANK", code: "090198" },
    { name: "REPHIDIM MFB", code: "090322" },
    { name: "RESIDENT FINTECH LTD", code: "110024" },
    { name: "RETRUST MFB", code: "090766" },
    { name: "REVELATION MFB", code: "090666" },
    { name: "REXEL", code: "110046" },
    { name: "RICHWAY MFB", code: "090132" },
    { name: "RIGO Microfinance BANK", code: "090433" },
    { name: "Rima Growth Pathway Microfinance Bank", code: "090515" },
    { name: "RIMA Microfinance BANK", code: "090443" },
    { name: "Rimin Gado MFB", code: "090713" },
    { name: "ROCKSHIELD MICROFINANCE BANK", code: "090547" },
    { name: "Royal Blue MFB", code: "090622" },
    { name: "ROYAL EXCELLENT MICROFINANCE BANK", code: "090990" },
    { name: "ROYAL EXCHANGE MICROFINANCE BANK", code: "090138" },
    { name: "RUBIES MFB", code: "090175" },
    { name: "RUN MFB", code: "090771" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "SAFEGATE MICROFINANCE BANK", code: "090485" },
    { name: "SAFELINE MFB", code: "090875" },
    { name: "SAFETRUST", code: "090006" },
    { name: "SAGAMU MICROFINANCE BANK", code: "090140" },
    { name: "SageGrey Finance Limited", code: "050003" },
    { name: "SCIART FINANCE", code: "050024" },
    { name: "SEAP Microfinance Bank", code: "090513" },
    { name: "SEED CAPITAL MICROFINANCE BANK", code: "090112" },
    { name: "SEEDVEST MICROFINANCE BANK", code: "090369" },
    { name: "Shalom Microfinance Bank", code: "090502" },
    { name: "Shanono MFB", code: "090748" },
    { name: "Shepherd Trust Microfinance BANK", code: "090401" },
    { name: "SHIELD MICROFINANCE BANK LTD", code: "090559" },
    { name: "SHINE MFB", code: "091006" },
    { name: "SHONGOM MICROFINANCE BANK LTD", code: "090558" },
    { name: "Signature Bank", code: "000034" },
    { name: "SIMPLE FINANCE LIMITED", code: "050008" },
    { name: "Simplify Synergy", code: "110034" },
    { name: "SINCERE MFB", code: "090339" },
    { name: "SLS MICROFINANCE BANK", code: "090449" },
    { name: "SmartCash PSB", code: "120004" },
    { name: "SNOW MFB", code: "090573" },
    { name: "SOFRITRUST Microfinance", code: "090435" },
    { name: "Solid Allianze MFB", code: "090506" },
    { name: "Solidrock Microfinance bank", code: "090524" },
    { name: "SOROMAN MFB", code: "090769" },
    { name: "Source Microfinance Bank", code: "090641" },
    { name: "SP", code: "0909806" },
    { name: "Sparkle", code: "090325" },
    { name: "SPECTRUM MICROFINANCE BANK", code: "090436" },
    { name: "SPRING SKY FINANCE", code: "050036" },
    { name: "SPRINGFIELD MICROFINANCE BANK", code: "090806" },
    { name: "SPRINGVILLE MICROFINANCE BANK LIMITED", code: "090786" },
    { name: "Stanbic IBTC @ease wallet", code: "100007" },
    { name: "Stanbic IBTC Bank", code: "000012" },
    { name: "STANDARD CHARTERED BANK NIGERIA LIMITED", code: "000021" },
    { name: "Standard MFB", code: "090182" },
    { name: "STANFORD MFB", code: "090162" },
    { name: "Stateside Microfinance Bank", code: "090583" },
    { name: "STB Mortgage BANK", code: "070022" },
    { name: "STELLAS MICROFINANCE BANK", code: "090262" },
    { name: "Sterling Bank", code: "000001" },
    { name: "STOCKCORP MICROFINANCE BANK", code: "090340" },
    { name: "SULSPAP MFB", code: "090305" },
    { name: "SUMMIT BANK", code: "080003" },
    { name: "Sunbeam Microfinance BANK", code: "090302" },
    { name: "SUNTOP MICROFINANCE BANK", code: "090644" },
    { name: "SUNTRUST BANK", code: "000022" },
    { name: "SUPPORT MICROFINANCE BANK", code: "090446" },
    { name: "SUPREME MICROFINANCE BANK LTD", code: "090564" },
    { name: "SURE ANCHOR MFB", code: "090728" },
    { name: "SWIFT TRUST MFB", code: "090757" },
    { name: "SYCAMORE MFB", code: "090827" },
    { name: "TagPay", code: "100023" },
    { name: "Taj Bank", code: "000026" },
    { name: "TAJ_PINSPAY", code: "080002" },
    { name: "TANADI MICROFINANCE BANK LTD", code: "090560" },
    { name: "Tangale Microfinance Bank", code: "090638" },
    { name: "TASUED MFB", code: "090593" },
    { name: "TATUM BANK", code: "000042" },
    { name: "TeasyMobile", code: "100010" },
    { name: "TEERUS MICROFINANCE BANK", code: "090991" },
    { name: "TEKLA FINANCE", code: "050007" },
    { name: "TELLERONE FI MFB", code: "090788" },
    { name: "TENN MFB", code: "090716" },
    { name: "TF MICROFINANCE BANK", code: "090373" },
    { name: "THE BROOK FINANCE LIMITED", code: "050031" },
    { name: "THRIVE MFB", code: "090283" },
    { name: "TITAN TRUST BANK", code: "000025" },
    { name: "TOPRATE MFB", code: "090801" },
    { name: "TREASURES MFB", code: "090663" },
    { name: "TRIDENT MICROFINANCE BANK", code: "090146" },
    { name: "TRINITY FINANCIAL SERVICES LIMITED", code: "050014" },
    { name: "Triple A Microfinance bank", code: "090525" },
    { name: "TRIVES FINANCE COMPANY LTD", code: "050023" },
    { name: "TRUST MFB", code: "090327" },
    { name: "TRUSTBANC J6 MICROFINANCE BANK LIMITED", code: "090123" },
    { name: "TRUSTBOND", code: "090005" },
    { name: "TRUSTFUND MICROFINANCE BANK", code: "090276" },
    { name: "TUDUN WADA MFB", code: "090870" },
    { name: "TURBO MFB", code: "090606" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "Uhuru Microfinance bank", code: "090517" },
    { name: "UKPOR MFB", code: "090820" },
    { name: "Ultimate Microfinance Bank", code: "090776" },
    { name: "Ultrapay Microfinance Bank", code: "090253" },
    { name: "Ummah Microfinance Bank", code: "090609" },
    { name: "Umuchinemere Procredit Microfinance Bank", code: "090514" },
    { name: "UMUCHUKWU MICROFINANCE BANK", code: "090652" },
    { name: "Umunnachi Microfinance Bank", code: "090510" },
    { name: "UMUNRI MFB", code: "090808" },
    { name: "Umyu MFB", code: "090704" },
    { name: "UNAAB MFB", code: "090331" },
    { name: "UNIBADAN MICROFINANCE BANK", code: "090461" },
    { name: "UNIBEN MICROFINANCE BANK", code: "090266" },
    { name: "UNICAL MFB", code: "090193" },
    { name: "Unifund Microfinance Bank", code: "090637" },
    { name: "UNILAG MICROFINANCE BANK", code: "090452" },
    { name: "UNILORIN MICROFINANCE BANK", code: "090341" },
    { name: "Unimaid Microfinance BANK", code: "090464" },
    { name: "Union Bank Of Nigeria", code: "000018" },
    { name: "UNITED BANK FOR AFRICA", code: "000004" },
    { name: "UNITY BANK PLC", code: "000011" },
    { name: "UniUyo Microfinance BANK", code: "090338" },
    { name: "Unlimint Nigeria Limited", code: "110081" },
    { name: "UNN MFB", code: "090251" },
    { name: "UNUBI MFB", code: "090719" },
    { name: "Ure Microfinance Bank", code: "090619" },
    { name: "UTAKO MFB", code: "090773" },
    { name: "UVUOMA MFB", code: "090765" },
    { name: "Uzondu Microfinance Bank", code: "090453" },
    { name: "Vale Finance Limited", code: "050020" },
    { name: "Verdant Microfinance Bank", code: "090474" },
    { name: "VFD MFB", code: "090110" },
    { name: "Victory MFB", code: "090813" },
    { name: "VIRTUE MFB", code: "090150" },
    { name: "VISA MICROFINANCE BANK", code: "090139" },
    { name: "VTNetworks", code: "100012" },
    { name: "WAILA MFB", code: "090829" },
    { name: "WALLET MFB", code: "090805" },
    { name: "WAYA MFB", code: "090590" },
    { name: "WE MICROFINANCE BANK", code: "090989" },
    { name: "Wema Bank", code: "000017" },
    { name: "WESLEY MFB", code: "090699" },
    { name: "WETLAND MFB", code: "090120" },
    { name: "Wetson-Charis MFB", code: "090741" },
    { name: "WHITECRUST FINANCE LTD", code: "050035" },
    { name: "WinView BANK", code: "090419" },
    { name: "WRA MFB", code: "090631" },
    { name: "XPRESS MTS", code: "100041" },
    { name: "Xpresswallet", code: "100040" },
    { name: "XSLNCE MICROFINANCE BANK", code: "090124" },
    { name: "YABO MFB", code: "090994" },
    // Filtered Bank List explicitly matching your live Payrant API Payload
    { name: "ZAIN MFB", code: "090976" },
    { name: "ZEDVANCE FINANCE LIMITED", code: "050019" },
    { name: "Zefa MFB", code: "090747" },
    { name: "Zenith Bank", code: "000015" },
    { name: "ZENITH EASY WALLET", code: "100034" },
    { name: "ZENITH Mobile", code: "100018" },
    { name: "Zikora Microfinance bank", code: "090504" },
    { name: "ZION MICROFINANCE BANK", code: "090384" },
    { name: "Zitra MFB", code: "090718" }
    
];

    // Clear existing options first
    bankSelect.innerHTML = '<option value="" disabled selected>Select your bank...</option>';

    // Loop through and add them
    banks.forEach(bank => {
        const option = document.createElement("option");
        option.value = bank.code;
        option.textContent = bank.name;
        bankSelect.appendChild(option);
    });

    console.log("Banks loaded successfully!");
});


document.addEventListener("DOMContentLoaded", () => {
  // Select all navigation items within your bottom nav track
  const navItems = document.querySelectorAll("#bottomNav .nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      // 1. Prevent default jump if the href is just a placeholder "#"
      if (this.getAttribute("href") === "#") {
        e.preventDefault();
      }

      // 2. Remove the 'active' class from whichever item currently has it
      const currentActive = document.querySelector("#bottomNav .nav-item.active");
      if (currentActive) {
        currentActive.classList.remove("active");
      }

      // 3. Apply the electric cyan active state to the clicked element
      this.classList.add("active");
    });
  });
});