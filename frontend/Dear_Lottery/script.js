import { 
    auth,
    db,
    ref,
    set,
    get,
    update,
    push,
    onValue,
    onAuthStateChanged
} from '../js/firebase.js';

// Global variables
let currentUser = null;
let selectedGameType = '1cr';
let currentAction = { type: '', gameType: '', time: '', callback: null };

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.body.style.display = 'block';
        loadAllData();
    } else {
        // Redirect to login if not authenticated
        window.location.href = '../login.html';
    }
});

// Function to get user-specific database reference
function getUserRef(path = '') {
    if (!currentUser) return null;
    return ref(db, `users/${currentUser.uid}/${path}`);
}

// Function to get lottery results reference
function getResultsRef() {
    return getUserRef('lotteryResults');
}

// Function to get save count reference
function getSaveCountRef() {
    return getUserRef('saveCount');
}

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize the rest if user is authenticated
    if (!currentUser) return;
    
    // ট্যাব ফাংশনালিটি
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // সকল ট্যাব এবং কন্টেন্ট থেকে active ক্লাস সরান
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // নির্বাচিত ট্যাব এবং কন্টেন্টে active ক্লাস যোগ করুন
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // মোবাইল ডিভাইসে ট্যাব क्लিক করলে পেজ স্ক্রল করে উপরে নিয়ে আসে
            if (window.innerWidth < 768) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
    
    // গেম টাইপ সিলেক্টর
    const gameTypeBtns = document.querySelectorAll('.game-type-btn');
    gameTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            gameTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedGameType = btn.getAttribute('data-game-type');
            
            // UI আপডেট করুন
            updateGameTypeUI();
        });
    });
    
    // তারিখ সেট করুন
    const today = new Date();
    document.getElementById('resultDate').valueAsDate = today;
    document.getElementById('historyDate').valueAsDate = today;
    document.getElementById('manageDate').valueAsDate = today;
    
    // রেজাল্ট সেভ করার ইভেন্ট
    document.getElementById('saveResult').addEventListener('click', function() {
        const date = document.getElementById('resultDate').value;
        const time = document.getElementById('drawTime').value;
        const number = document.getElementById('lotteryNumber').value.trim().toUpperCase();
        
        saveResult(date, time, number);
    });
    
    // লাকি নাম্বার জেনারেট করুন
    document.getElementById('generateLucky').addEventListener('click', function() {
        analyzeAndGenerateLuckyNumber();
    });
    
    // ইতিহাস লোড করুন
    document.getElementById('loadHistory').addEventListener('click', function() {
        loadHistory();
    });
    
    // ম্যানেজ ডেটা লোড করুন
    document.getElementById('loadManageData').addEventListener('click', function() {
        loadManageData();
    });
    
    // সমস্ত ডেটা রিসেট করুন
    document.getElementById('resetAllData').addEventListener('click', function() {
        showConfirmationModal(
            'সমস্ত ডেটা রিসেট করুন', 
            'আপনি কি নিশ্চিত যে আপনি সমস্ত ডেটা মুছে ফেলতে চান? এই কাজটিUndo করা যাবে না।',
            resetAllData
        );
    });
    
    // তারিখ পরিবর্তন হলে রেজাল্ট লোড করুন
    document.getElementById('resultDate').addEventListener('change', function() {
        loadDateResults(this.value);
    });
    
    // এডিট বাটন ইভেন্ট
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const gameType = this.getAttribute('data-game-type');
            const time = this.getAttribute('data-time');
            editResult(gameType, time);
        });
    });
    
    // ডিলিট বাটন ইভেন্ট
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const gameType = this.getAttribute('data-game-type');
            const time = this.getAttribute('data-time');
            
            showConfirmationModal(
                'রেজাল্ট ডিলিট করুন', 
                `আপনি কি ${getTimeName(time)} এর ${gameType.toUpperCase()} রেজাল্ট ডিলিট করতে চান?`,
                function() { deleteResult(gameType, time); }
            );
        });
    });
    
    // মোডাল ইভেন্ট
    document.getElementById('modalConfirm').addEventListener('click', function() {
        if (currentAction.callback) {
            currentAction.callback();
        }
        hideConfirmationModal();
    });
    
    document.getElementById('modalCancel').addEventListener('click', function() {
        hideConfirmationModal();
    });
});

// কনফার্মেশন মোডাল ফাংশন
function showConfirmationModal(title, message, callback) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmationModal').style.display = 'flex';
    
    currentAction.callback = callback;
}

function hideConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
    currentAction.callback = null;
}

// গেম টাইপ UI আপডেট ফাংশন
function updateGameTypeUI() {
    // লাকি নাম্বার টাইটেল আপডেট
    const gameTypeText = selectedGameType === '1cr' ? '1CR' : '5CR';
    document.getElementById('luckyNumberTitle').textContent = `${gameTypeText} গেমের লাকি নাম্বার`;
    
    // ইতিহাস টাইটেল আপডেট
    document.getElementById('historyDateTitle').textContent = `${gameTypeText} গেমের ইতিহাস`;
    
    // তারিখের রেজাল্ট রিলোড
    loadDateResults(document.getElementById('resultDate').value);
}

// সময়ের নাম ফাংশন
function getTimeName(time) {
    const timeNames = {
        'afternoon': 'দুপুর ১টা',
        'evening': 'সন্ধ্যা ৬টা', 
        'night': 'রাত ৮টা'
    };
    return timeNames[time] || time;
}

// নাম্বার ভ্যালিডেশন ফাংশন
function isValidNumber(number) {
    // 8 অক্ষরের নাম্বার, প্রথম দুটি সংখ্যা, তারপর একটি ইংরেজি অক্ষর, তারপর পাঁচটি সংখ্যা
    const regex = /^[0-9]{2}[A-Z]{1}[0-9]{5}$/;
    return regex.test(number);
}

// সমস্ত ডেটা বিশ্লেষণ করে লাকি নাম্বার জেনারেটর (হট নাম্বার)
function analyzeAndGenerateLuckyNumber() {
    const resultsRef = getResultsRef();
    if (!resultsRef) return;
    
    get(resultsRef).then((snapshot) => {
        const results = snapshot.val() || {};
        const allNumbers = [];
        
        // সমস্ত সেভকৃত নাম্বার সংগ্রহ করুন
        for (const date in results) {
            for (const key in results[date]) {
                if (results[date][key] && results[date][key] !== '---') {
                    allNumbers.push(results[date][key]);
                }
            }
        }
        
        if (allNumbers.length === 0) {
            alert('কোন ডেটা পাওয়া যায়নি। প্রথমে কিছু রেজাল্ট সেভ করুন।');
            return;
        }
        
        // ফ্রিকোয়েন্সি এনালাইসিস
        const digitFrequency = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
        const letterFrequency = {A:0,B:0,C:0,D:0,E:0,G:0,H:0,J:0,K:0,L:0};
        
        allNumbers.forEach(number => {
            // সংখ্যা অংশ বিশ্লেষণ (পজিশন 0,1,3,4,5,6,7)
            for (let i = 0; i < 8; i++) {
                if (i !== 2) { // 3rd position is letter, skip
                    const char = number[i];
                    if (!isNaN(char)) {
                        digitFrequency[char]++;
                    }
                }
            }
            
            // অক্ষর অংশ বিশ্লেষণ (পজিশন 2)
            const letter = number[2];
            if (letterFrequency.hasOwnProperty(letter)) {
                letterFrequency[letter]++;
            }
        });
        
        // সবচেয়ে বেশি ব্যবহৃত সংখ্যা এবং অক্ষর খুঁজুন (হট নাম্বার)
        const mostUsedDigits = findMostUsed(digitFrequency, 2);
        const mostUsedLetter = findMostUsed(letterFrequency, 1)[0];
        
        // লাকি নাম্বার তৈরি করুন (হট নাম্বার)
        const baseNumber = mostUsedDigits[0] + mostUsedDigits[1] + mostUsedLetter + 
                          getRandomDigits(5, digitFrequency, true);
        
        document.getElementById('luckyNumber').textContent = baseNumber;
        
        // প্রতিটি সময়ের জন্য আলাদা নাম্বার জেনারেট করুন
        document.getElementById('luckyAfternoon').textContent = generateTimeSpecificNumber(baseNumber, 'afternoon');
        document.getElementById('luckyEvening').textContent = generateTimeSpecificNumber(baseNumber, 'evening');
        document.getElementById('luckyNight').textContent = generateTimeSpecificNumber(baseNumber, 'night');
        
        // বিশ্লেষণ রিপোর্ট দেখান
        showAnalysisReport(digitFrequency, letterFrequency, baseNumber);
    });
}

function findMostUsed(frequencyObj, count) {
    return Object.entries(frequencyObj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(item => item[0]);
}

function getRandomDigits(length, frequency, useMostFrequent) {
    let result = '';
    const sortedDigits = Object.entries(frequency)
        .sort((a, b) => useMostFrequent ? b[1] - a[1] : a[1] - b[1])
        .slice(0, 10);
    
    for (let i = 0; i < length; i++) {
        // বেশি ব্যবহৃত সংখ্যাগুলো থেকে র‍্যান্ডমলি নির্বাচন
        const randomIndex = Math.floor(Math.random() * Math.min(5, sortedDigits.length));
        result += sortedDigits[randomIndex][0];
    }
    return result;
}

function generateTimeSpecificNumber(baseNumber, time) {
    // অনুমোদিত ইংরেজি অক্ষর
    const allowedLetters = ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'J', 'K', 'L'];
    
    // সময়ের উপর ভিত্তি করে নাম্বার পরিবর্তন করুন
    const timeFactors = {
        'afternoon': 3,
        'evening': 7,
        'night': 11
    };
    
    const factor = timeFactors[time];
    
    // প্রথম দুটি সংখ্যা পরিবর্তন
    let firstTwo = parseInt(baseNumber.substring(0, 2));
    firstTwo = (firstTwo + factor) % 100;
    const newFirstTwo = firstTwo.toString().padStart(2, '0');
    
    // মধ্যের অক্ষর পরিবর্তন (শুধুমাত্র অনুমোদিত অক্ষর ব্যবহার)
    const originalChar = baseNumber.substring(2, 3);
    const currentIndex = allowedLetters.indexOf(originalChar);
    const newIndex = (currentIndex + factor) % allowedLetters.length;
    const newChar = allowedLetters[newIndex];
    
    // শেষ পাঁচটি সংখ্যা পরিবর্তন
    let lastFive = parseInt(baseNumber.substring(3));
    lastFive = (lastFive + factor) % 100000;
    const newLastFive = lastFive.toString().padStart(5, '0');
    
    return newFirstTwo + newChar + newLastFive;
}

function showAnalysisReport(digitFrequency, letterFrequency, luckyNumber) {
    console.log('ডিজিট ফ্রিকোয়েন্সি:', digitFrequency);
    console.log('লেটার ফ্রিকোয়েন্সি:', letterFrequency);
    console.log('জেনারেটেড লাকি নাম্বার:', luckyNumber);
}

// ইতিহাস লোড ফাংশন
function loadHistory() {
    const date = document.getElementById('historyDate').value;
    const dateKey = new Date(date).toDateString();
    const resultsRef = getResultsRef();
    if (!resultsRef) return;
    
    get(resultsRef).then((snapshot) => {
        const results = snapshot.val() || {};
        const historyResults = document.getElementById('historyResults');
        
        if (results[dateKey]) {
            let html = '<div class="game-results">';
            
            // নির্বাচিত গেম টাইপের রেজাল্ট দেখান
            ['afternoon', 'evening', 'night'].forEach(time => {
                const resultKey = `${selectedGameType}_${time}`;
                const result = results[dateKey][resultKey] || '---';
                html += `
                    <div class="game-result">
                        <h3>${getTimeName(time)}</h3>
                        <div class="lottery-number">${result}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            historyResults.innerHTML = html;
        } else {
            historyResults.innerHTML = '<p>এই তারিখে কোন রেজাল্ট পাওয়া যায়নি।</p>';
        }
    });
}

// ফাংশনগুলি
function loadAllData() {
    // সেভ কাউন্টার লোড করুন
    const saveCountRef = getSaveCountRef();
    if (!saveCountRef) return;
    
    get(saveCountRef).then((snapshot) => {
        const saveCount = snapshot.val() || 0;
        document.getElementById('saveCount').textContent = saveCount;
    });
    
    // আজকের রেজাল্ট লোড করুন
    loadDateResults(new Date().toISOString().slice(0, 10));
}

function loadDateResults(dateString) {
    const date = new Date(dateString);
    const dateKey = date.toDateString();
    const resultsRef = getResultsRef();
    if (!resultsRef) return;
    
    get(resultsRef).then((snapshot) => {
        const results = snapshot.val() || {};
        
        // তারিখ শিরোনাম আপডেট করুন
        const dateTitle = date.toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('selectedDateResult').textContent = `${dateTitle} এর রেজাল্ট`;
        
        // 1CR গেমের রেজাল্ট
        document.getElementById('1crAfternoonResult').textContent = (results[dateKey] && results[dateKey]['1cr_afternoon']) || '---';
        document.getElementById('1crEveningResult').textContent = (results[dateKey] && results[dateKey]['1cr_evening']) || '---';
        document.getElementById('1crNightResult').textContent = (results[dateKey] && results[dateKey]['1cr_night']) || '---';
        
        // 5CR গেমের রেজাল্ট
        document.getElementById('5crAfternoonResult').textContent = (results[dateKey] && results[dateKey]['5cr_afternoon']) || '---';
        document.getElementById('5crEveningResult').textContent = (results[dateKey] && results[dateKey]['5cr_evening']) || '---';
        document.getElementById('5crNightResult').textContent = (results[dateKey] && results[dateKey]['5cr_night']) || '---';
    });
}

function saveResult(dateString, time, number) {
    if (!number) {
        alert('দয়া করে একটি বৈধ নাম্বার লিখুন');
        return;
    }
    
    if (!isValidNumber(number)) {
        alert('দয়া করে সঠিক ফরম্যাটে নাম্বার লিখুন (যেমন: 65G93018) - প্রথম দুটি সংখ্যা, তারপর একটি ইংরেজি অক্ষর, তারপর পাঁচটি সংখ্যা');
        return;
    }
    
    const date = new Date(dateString);
    const dateKey = date.toDateString();
    const resultsRef = getResultsRef();
    const saveCountRef = getSaveCountRef();
    if (!resultsRef || !saveCountRef) return;
    
    get(resultsRef).then((snapshot) => {
        let results = snapshot.val() || {};
        
        if (!results[dateKey]) {
            results[dateKey] = {};
        }
        
        // গেমের কী তৈরি করুন (যেমন: 1cr_afternoon)
        const gameKey = `${selectedGameType}_${time}`;
        results[dateKey][gameKey] = number;
        
        // Firebase-এ ডেটা সেভ করুন
        set(resultsRef, results);
        
        // সেভ কাউন্টার বাড়ান
        get(saveCountRef).then((countSnapshot) => {
            const saveCount = (countSnapshot.val() || 0) + 1;
            set(saveCountRef, saveCount);
            document.getElementById('saveCount').textContent = saveCount;
        });
        
        // UI আপডেট করুন
        loadDateResults(dateString);
        
        // ইনপুট ফিল্ড ক্লিয়ার করুন
        document.getElementById('lotteryNumber').value = '';
        
        alert(`${selectedGameType.toUpperCase()} - ${getTimeName(time)} এর রেজাল্ট সেভ হয়েছে!`);
    });
}

function editResult(gameType, time) {
    const date = document.getElementById('resultDate').value;
    const dateKey = new Date(date).toDateString();
    const resultsRef = getResultsRef();
    if (!resultsRef) return;
    
    get(resultsRef).then((snapshot) => {
        const results = snapshot.val() || {};
        
        if (results[dateKey] && results[dateKey][`${gameType}_${time}`]) {
            // গেম টাইপ সিলেক্ট করুন
            document.querySelectorAll('.game-type-btn').forEach(btn => {
                if (btn.getAttribute('data-game-type') === gameType) {
                    btn.click();
                }
            });
            
            // সময় সিলেক্ট করুন
            document.getElementById('drawTime').value = time;
            
            // নাম্বার সেট করুন
            document.getElementById('lotteryNumber').value = results[dateKey][`${gameType}_${time}`];
            
            alert(`${gameType.toUpperCase()} - ${getTimeName(time)} এর রেজাল্ট এডিট করার জন্য প্রস্তুত। সেভ করুন বাটনে ক্লিক করে আপডেট করুন।`);
        } else {
            alert('এই সময়ের জন্য কোন রেজাল্ট পাওয়া যায়নি।');
        }
    });
}

function deleteResult(gameType, time) {
    const date = document.getElementById('resultDate').value;
    const dateKey = new Date(date).toDateString();
    const resultsRef = getResultsRef();
    const saveCountRef = getSaveCountRef();
    if (!resultsRef || !saveCountRef) return;
    
    get(resultsRef).then((snapshot) => {
        let results = snapshot.val() || {};
        
        if (results[dateKey] && results[dateKey][`${gameType}_${time}`]) {
            delete results[dateKey][`${gameType}_${time}`];
            
            // যদি তারিখে আর কোন ডেটা না থাকে, তাহলে পুরো তারিখ ডিলিট করুন
            if (Object.keys(results[dateKey]).length === 0) {
                delete results[dateKey];
            }
            
            // Firebase-এ আপডেটেড ডেটা সেভ করুন
            set(resultsRef, results);
            
            // সেভ কাউন্টার কমান
            get(saveCountRef).then((countSnapshot) => {
                const saveCount = Math.max(0, (countSnapshot.val() || 0) - 1);
                set(saveCountRef, saveCount);
                document.getElementById('saveCount').textContent = saveCount;
            });
            
            // UI আপডেট করুন
            loadDateResults(date);
            
            alert(`${gameType.toUpperCase()} - ${getTimeName(time)} এর রেজাল্ট ডিলিট হয়েছে!`);
        }
    });
}

function loadManageData() {
    const date = document.getElementById('manageDate').value;
    const dateKey = new Date(date).toDateString();
    const resultsRef = getResultsRef();
    if (!resultsRef) return;
    
    get(resultsRef).then((snapshot) => {
        const results = snapshot.val() || {};
        const manageResults = document.getElementById('manageResults');
        
        if (results[dateKey]) {
            let html = '<h3>রেজাল্টসমূহ:</h3><div class="game-results">';
            
            // 1CR গেমের রেজাল্ট
            html += '<div style="width: 100%; margin-bottom: 20px;"><h4>1CR গেম</h4>';
            ['afternoon', 'evening', 'night'].forEach(time => {
                const result = results[dateKey][`1cr_${time}`] || '---';
                html += `
                    <div class="game-result">
                        <h3>${getTimeName(time)}</h3>
                        <div class="lottery-number">${result}</div>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="manageEditResult('1cr', '${time}', '${date}')">এডিট</button>
                            <button class="action-btn delete-btn" onclick="manageDeleteResult('1cr', '${time}', '${date}')">ডিলিট</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
              // 5CR গেমের রেজাল্ট
            html += '<div style="width: 100%;"><h4>5CR गेम</h4>';
            ['afternoon', 'evening', 'night'].forEach(time => {
                const result = results[dateKey][`5cr_${time}`] || '---';
                html += `
                    <div class="game-result">
                        <h3>${getTimeName(time)}</h3>
                        <div class="lottery-number">${result}</div>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="manageEditResult('5cr', '${time}', '${date}')">এডিট</button>
                            <button class="action-btn delete-btn" onclick="manageDeleteResult('5cr', '${time}', '${date}')">डिलিট</button>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
            
            manageResults.innerHTML = html;
        } else {
            manageResults.innerHTML = '<p>এই তারিখে কোন রেজাল্ট পাওয়া যায়নি।</p>';
        }
    });
}

// গ্লোবাল ফাংশন ম্যানেজমেন্ট এর জন্য
window.manageEditResult = function(gameType, time, date) {
    document.getElementById('resultDate').value = date;
    document.querySelector(`.tab[data-tab="entry"]`).click();
    
    setTimeout(() => {
        document.querySelectorAll('.game-type-btn').forEach(btn => {
            if (btn.getAttribute('data-game-type') === gameType) {
                btn.click();
            }
        });
        
        document.getElementById('drawTime').value = time;
        
        const dateKey = new Date(date).toDateString();
        const resultsRef = getResultsRef();
        if (!resultsRef) return;
        
        get(resultsRef).then((snapshot) => {
            const results = snapshot.val() || {};
            if (results[dateKey] && results[dateKey][`${gameType}_${time}`]) {
                document.getElementById('lotteryNumber').value = results[dateKey][`${gameType}_${time}`];
            }
        });
    }, 100);
};

window.manageDeleteResult = function(gameType, time, date) {
    showConfirmationModal(
        'রেজাল্ট ডিলিট করুন', 
        `আপনি কি ${date} তারিখের ${getTimeName(time)} এর ${gameType.toUpperCase()} রেজাল্ট ডিলিট করতে চান?`,
        function() { 
            const dateKey = new Date(date).toDateString();
            const resultsRef = getResultsRef();
            const saveCountRef = getSaveCountRef();
            if (!resultsRef || !saveCountRef) return;
            
            get(resultsRef).then((snapshot) => {
                let results = snapshot.val() || {};
                
                if (results[dateKey] && results[dateKey][`${gameType}_${time}`]) {
                    delete results[dateKey][`${gameType}_${time}`];
                    
                    // যদি তারিখে আর কোন ডেটা না থাকে, তাহলে পুরো তারিখ ডিলিট করুন
                    if (Object.keys(results[dateKey]).length === 0) {
                        delete results[dateKey];
                    }
                    
                    // Firebase-এ আপডেটেড ডেটা সেভ করুন
                    set(resultsRef, results);
                    
                    // সেভ কাউন্টার কমান
                    get(saveCountRef).then((countSnapshot) => {
                        const saveCount = Math.max(0, (countSnapshot.val() || 0) - 1);
                        set(saveCountRef, saveCount);
                        document.getElementById('saveCount').textContent = saveCount;
                    });
                    
                    // UI আপডেট করুন
                    loadManageData();
                    loadDateResults(document.getElementById('resultDate').value);
                    
                    alert(`${gameType.toUpperCase()} - ${getTimeName(time)} এর রেজাল্ট ডিলিট হয়েছে!`);
                }
            });
        }
    );
};

function resetAllData() {
    const resultsRef = getResultsRef();
    const saveCountRef = getSaveCountRef();
    if (!resultsRef || !saveCountRef) return;
    
    // Firebase থেকে ডেটা ডিলিট করুন
    set(resultsRef, {});
    set(saveCountRef, 0);
    
    // UI আপডেট করুন
    document.getElementById('saveCount').textContent = '0';
    loadDateResults(document.getElementById('resultDate').value);
    document.getElementById('manageResults').innerHTML = '';
    
    alert('সমস্ত ডেটা রিসেট করা হয়েছে!');
}
```

     