// Firebase Configuration & Client Auth
const firebaseConfig = {
    apiKey: "AIzaSyDwkNCpRshjgM4IvGs4OqRHghdvrDpWjao",
    authDomain: "gjw-chat.firebaseapp.com",
    databaseURL: "https://gjw-chat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gjw-chat",
    storageBucket: "gjw-chat.firebasestorage.app",
    messagingSenderId: "26054026514",
    appId: "1:26054026514:web:ddc576d453c73118723fcb"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();

const GOOGLE_CLIENT_ID = "26054026514-qvfltgpdsq4ivhmlf00sple6c86lmjqj.apps.googleusercontent.com";

function safeGetStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {}
}

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23cccccc'/><circle cx='50' cy='36' r='18' fill='%23e6e6e6'/><path d='M 20 82 C 20 62, 35 55, 50 55 C 65 55, 80 62, 80 82 Z' fill='%23e6e6e6'/></svg>`;
const BOT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%232563eb'/><rect x='28' y='32' width='44' height='32' rx='6' fill='%23ffffff'/><circle cx='40' cy='45' r='5' fill='%231e3a8a'/><circle cx='60' cy='45' r='5' fill='%231e3a8a'/><rect x='42' y='54' width='16' height='4' rx='2' fill='%231e3a8a'/><rect x='46' y='16' width='8' height='16' fill='%23ffffff'/><circle cx='50' cy='14' r='6' fill='%23ef4444'/></svg>`;

function getAvatarHTML(photoURL, sizeClass = "w-7 h-7") {
    const url = photoURL || DEFAULT_AVATAR;
    return `<img src="${url}" class="${sizeClass} rounded-full object-cover border border-gray-500 shadow-sm" alt="Avatar">`;
}

// Helper pro plynulé otevírání a zavírání modálních oken
function openModalEl(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
    requestAnimationFrame(() => el.classList.add('open'));
}

function closeModalEl(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }, 200);
}

let myId = null;
let myNickname = '';
let myClass = '';
let myEmail = '';
let userPhotoURL = null;
let isGoogleUser = false;
let allRegisteredGoogleUsers = {};
let activeDmTarget = null;

// Stav hry s Botem
let isBotGame = false;
let selectedBotTimeLimit = 10;
let botTimerTimeout = null;

let activeGameId = null;
let myColor = 'w';
let visualFlipped = false;
let opponentId = null;
let opponentName = '';
let opponentIsGoogle = false;
let myTurn = false;
let gameStatus = 'idle';
let checkmatedColor = null; // 'w' nebo 'b' pro červené zvýraznění krále při matu

let selectedSquare = null;
let legalMoves = [];
let gameBoard = [];
let moveHistory = [];
let fullBoardSnapshots = [];
let currentViewIndex = -1;
let chatListenerRegistered = false;
let gameWatcherAttached = false;
let lobbyListenersAttached = false;
let halfMoveClock = 0;

// Pre-move stav
let queuedPremove = null;
let premoveSourceSelected = null;

// Stav pro garantované 5s čekání na konci partie
let gameOverDelayTimeout = null;
let gameOverCountdownInterval = null;
let gameOverSequenceStarted = false;

// Pointer Drag-and-Drop se stínem
let activeDragState = null;

let castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
let enPassantTarget = null;

let whiteTimeSeconds = 600;
let blackTimeSeconds = 600;
let timerInterval = null;
let tenSecPlayedMy = false;
let tenSecPlayedOpp = false;

// Crop fotky
let rawCropImage = null;
let cropOffsetX = 0;
let cropOffsetY = 0;
let isCropDragging = false;
let cropDragStartX = 0;
let cropDragStartY = 0;

// ----------------------------------------------------
// ORIGINÁLNÍ CHESS.COM ZVUKY (OPRAVENÉ URL + ODBLOKOVÁNÍ)
// ----------------------------------------------------
const SOUND_URLS = {
    'game-start': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3',
    'game-end': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
    'capture': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3',
    'castle': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3',
    'premove': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/premove.mp3',
    'move-self': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3',
    'move-opponent': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent.mp3',
    'move-check': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3',
    'promote': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3',
    'notify': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3',
    'illegal': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3',
    'tenseconds': 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/tenseconds.mp3'
};

const CHESSCOM_SOUNDS = {};
Object.entries(SOUND_URLS).forEach(([key, url]) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    CHESSCOM_SOUNDS[key] = audio;
});

let audioUnlocked = false;
function unlockAllSounds() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Object.values(CHESSCOM_SOUNDS).forEach(a => {
        try {
            a.volume = 0;
            const p = a.play();
            if (p) {
                p.then(() => {
                    a.pause();
                    a.currentTime = 0;
                    a.volume = 0.9;
                }).catch(() => { a.volume = 0.9; });
            }
        } catch (e) {}
    });
}
document.addEventListener('pointerdown', unlockAllSounds, { passive: true });
document.addEventListener('keydown', unlockAllSounds, { passive: true });

function playSound(name) {
    const base = CHESSCOM_SOUNDS[name];
    if (!base) return;
    try {
        const inst = new Audio(SOUND_URLS[name]);
        inst.volume = 0.9;
        inst.play().catch(() => {
            base.currentTime = 0;
            base.volume = 0.9;
            base.play().catch(() => {});
        });
    } catch (e) {}
}

function playCheckmateSound() {
    playSound('move-check');
    setTimeout(() => {
        playSound('game-end');
    }, 280);
}

const pieceSVGs = {
    'wP': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
    'wR': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
    'wN': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
    'wB': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
    'wQ': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
    'wK': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
    'bP': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
    'bR': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    'bN': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
    'bB': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
    'bQ': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
    'bK': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png'
};

const initialBoard = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
];

window.setBoardTheme = function(theme, persist = true) {
    document.body.classList.remove('theme-wood', 'theme-blue');
    if (theme === 'wood') document.body.classList.add('theme-wood');
    if (theme === 'blue') document.body.classList.add('theme-blue');
    if (persist) safeSetStorage('chess_gjw_theme', theme);
};

const savedTheme = safeGetStorage('chess_gjw_theme');
if (savedTheme) setBoardTheme(savedTheme, false);

// ----------------------------------------------------
// PŘIHLÁŠENÍ A OCHRANA PROTI "ČEKÁM NA..." PO REFRESH
// ----------------------------------------------------
auth.getRedirectResult().catch((err) => {
    if (err && err.code) console.warn('Redirect login info:', err.message);
});

auth.onAuthStateChanged((user) => {
    if (user) {
        myId = user.uid;
        isGoogleUser = true;
        myEmail = user.email || '';

        let cachedProfile = null;
        const cachedRaw = safeGetStorage(`chess_gjw_profile_${myId}`);
        if (cachedRaw) {
            try { cachedProfile = JSON.parse(cachedRaw); } catch (e) {}
        }

        db.ref(`sachy/users/${myId}`).once('value', (snap) => {
            const userData = snap.val();
            if (userData) {
                myNickname = userData.name || cachedProfile?.name || user.displayName || 'Šachista';
                myClass = userData.class || cachedProfile?.class || '';
                userPhotoURL = userData.photoURL || cachedProfile?.photoURL || user.photoURL || null;
                myEmail = userData.email || user.email || '';
            } else if (cachedProfile) {
                myNickname = cachedProfile.name || user.displayName || 'Šachista';
                myClass = cachedProfile.class || '';
                userPhotoURL = cachedProfile.photoURL || user.photoURL || null;
            } else {
                myNickname = user.displayName || 'Šachista';
                myClass = '';
                userPhotoURL = user.photoURL || null;
            }
            cacheLocalProfile();
            saveUserProfileToDB();
            enterLobby();
        }).catch(() => {
            if (cachedProfile) {
                myNickname = cachedProfile.name || user.displayName || 'Šachista';
                myClass = cachedProfile.class || '';
                userPhotoURL = cachedProfile.photoURL || user.photoURL || null;
            } else {
                myNickname = user.displayName || 'Šachista';
                userPhotoURL = user.photoURL || null;
            }
            enterLobby();
        });
    }
});

function cacheLocalProfile() {
    if (!myId) return;
    safeSetStorage(`chess_gjw_profile_${myId}`, JSON.stringify({
        name: myNickname,
        class: myClass,
        photoURL: userPhotoURL || null,
        email: myEmail || ''
    }));
}

function saveUserProfileToDB() {
    if (!myId || !isGoogleUser) return Promise.resolve();
    return db.ref(`sachy/users/${myId}`).update({
        id: myId,
        name: myNickname,
        class: myClass,
        email: myEmail || null,
        photoURL: userPhotoURL || null,
        isGoogle: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

window.loginWithGoogle = function() {
    unlockAllSounds();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    if (isMobileDevice()) {
        auth.signInWithRedirect(provider).catch(() => {
            fallbackPopupLogin();
        });
        return;
    }

    try {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'profile email',
                callback: (tokenResponse) => {
                    if (tokenResponse.access_token) {
                        const credential = firebase.auth.GoogleAuthProvider.credential(null, tokenResponse.access_token);
                        auth.signInWithCredential(credential).then((result) => {
                            const user = result.user;
                            myId = user.uid;
                            myNickname = user.displayName || 'Šachista';
                            myEmail = user.email || '';
                            userPhotoURL = user.photoURL;
                            isGoogleUser = true;
                            cacheLocalProfile();
                            saveUserProfileToDB();
                            enterLobby();
                        }).catch(() => fallbackPopupLogin());
                    } else {
                        fallbackPopupLogin();
                    }
                }
            });
            client.requestAccessToken();
        } else {
            fallbackPopupLogin();
        }
    } catch (e) {
        fallbackPopupLogin();
    }
};

function fallbackPopupLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        const user = result.user;
        myId = user.uid;
        myNickname = user.displayName || 'Šachista';
        myEmail = user.email || '';
        userPhotoURL = user.photoURL;
        isGoogleUser = true;
        cacheLocalProfile();
        saveUserProfileToDB();
        enterLobby();
    }).catch((err) => {
        if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
            auth.signInWithRedirect(provider);
            return;
        }
        const fallbackName = prompt("Zadej přezdívku:");
        if (fallbackName) {
            myId = 'anon_' + Math.random().toString(36).substr(2, 9);
            myNickname = fallbackName;
            myEmail = '';
            isGoogleUser = false;
            enterLobby();
        }
    });
}

window.joinLobbyAnonymous = function() {
    unlockAllSounds();
    const nameInput = document.getElementById('playerName').value.trim();
    if (!nameInput) {
        alert('Zadej prosím přezdívku!');
        return;
    }
    myId = 'anon_' + Math.random().toString(36).substr(2, 9);
    myNickname = nameInput;
    myClass = document.getElementById('playerClass').value;
    myEmail = '';
    userPhotoURL = null;
    isGoogleUser = false;
    enterLobby();
};

function updateHeaderUI() {
    const headerBar = document.getElementById('userHeaderBar');
    if (headerBar) {
        headerBar.classList.remove('hidden');
        headerBar.classList.add('flex');
    }

    const classDisplay = myClass ? `(${myClass})` : '';
    const userDisplay = `${myNickname || 'Šachista'} ${classDisplay}`;
    
    const headerEl = document.getElementById('userInfoHeader');
    if (headerEl) {
        headerEl.innerHTML = `
            ${getAvatarHTML(userPhotoURL, 'w-6 h-6')}
            <span class="font-bold text-xs text-white max-w-[110px] sm:max-w-none truncate">${userDisplay}</span>
        `;
    }

    const friendsBtn = document.getElementById('friendsHeaderBtn');
    const lobbySearchBtn = document.getElementById('lobbyGoogleSearchBtn');
    if (isGoogleUser) {
        if (friendsBtn) {
            friendsBtn.classList.remove('hidden');
            friendsBtn.classList.add('flex');
        }
        if (lobbySearchBtn) lobbySearchBtn.classList.remove('hidden');
    } else {
        if (friendsBtn) {
            friendsBtn.classList.add('hidden');
            friendsBtn.classList.remove('flex');
        }
        if (lobbySearchBtn) lobbySearchBtn.classList.add('hidden');
    }
}

// ----------------------------------------------------
// SPRÁVA ÚČTU + CROP FOTKY
// ----------------------------------------------------
window.openProfileModal = function() {
    if (!myNickname) return;
    document.getElementById('editNicknameInput').value = myNickname || '';
    document.getElementById('editClassInput').value = myClass || '';
    document.getElementById('cropBoxContainer').classList.add('hidden');
    updateSettingsLivePreview();
    openModalEl('profileModal');
};

function buildCompressedAvatarDataURL(sourceCanvas) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 96;
    outCanvas.height = 96;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(sourceCanvas, 0, 0, 96, 96);
    return outCanvas.toDataURL('image/jpeg', 0.65);
}

window.updateSettingsLivePreview = function() {
    const nameVal = document.getElementById('editNicknameInput').value.trim() || myNickname || 'Šachista';
    const classVal = document.getElementById('editClassInput').value;
    const fullTitle = classVal ? `${nameVal} (${classVal})` : nameVal;

    const previewNameEl = document.getElementById('settingsPreviewName');
    const previewEmailEl = document.getElementById('settingsPreviewEmail');
    const previewBadgeEl = document.getElementById('settingsPreviewBadge');
    const previewAvatarEl = document.getElementById('settingsPreviewAvatar');

    if (previewNameEl) previewNameEl.innerText = fullTitle;

    let previewPhoto = userPhotoURL;
    const cropBox = document.getElementById('cropBoxContainer');
    const cropCanvas = document.getElementById('cropCanvas');
    if (cropBox && !cropBox.classList.contains('hidden') && cropCanvas && rawCropImage) {
        previewPhoto = buildCompressedAvatarDataURL(cropCanvas);
    }
    if (previewAvatarEl) previewAvatarEl.innerHTML = getAvatarHTML(previewPhoto, 'w-14 h-14');

    if (isGoogleUser) {
        if (previewEmailEl) previewEmailEl.innerText = myEmail || 'Google účet';
        if (previewBadgeEl) {
            previewBadgeEl.innerText = 'Google';
            previewBadgeEl.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/40';
        }
    } else {
        if (previewEmailEl) previewEmailEl.innerText = 'Anonymní účet';
        if (previewBadgeEl) {
            previewBadgeEl.innerText = 'Anonym';
            previewBadgeEl.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-700/60 text-gray-300 border border-gray-600';
        }
    }
};

window.closeProfileModal = function() {
    closeModalEl('profileModal');
};

window.loadAvatarCropPreview = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            rawCropImage = new Image();
            rawCropImage.onload = function() {
                cropOffsetX = 0;
                cropOffsetY = 0;
                document.getElementById('cropBoxContainer').classList.remove('hidden');
                document.getElementById('cropBoxContainer').classList.add('flex');
                document.getElementById('cropZoomSlider').value = 1;
                initCropCanvasDrag();
                updateCropCanvas();
            };
            rawCropImage.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

function initCropCanvasDrag() {
    const canvas = document.getElementById('cropCanvas');
    if (!canvas || canvas.dataset.dragBound) return;
    canvas.dataset.dragBound = 'true';

    const startDrag = (clientX, clientY) => {
        isCropDragging = true;
        cropDragStartX = clientX - cropOffsetX;
        cropDragStartY = clientY - cropOffsetY;
    };
    const moveDrag = (clientX, clientY) => {
        if (!isCropDragging) return;
        cropOffsetX = clientX - cropDragStartX;
        cropOffsetY = clientY - cropDragStartY;
        updateCropCanvas();
    };
    const endDrag = () => { isCropDragging = false; };

    canvas.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (isCropDragging && e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', endDrag);
}

window.updateCropCanvas = function() {
    if (!rawCropImage) return;
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    const zoom = parseFloat(document.getElementById('cropZoomSlider').value) || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minSide = Math.min(rawCropImage.width, rawCropImage.height);
    const scale = (canvas.width / minSide) * zoom;
    const drawW = rawCropImage.width * scale;
    const drawH = rawCropImage.height * scale;

    const maxPanX = Math.max(0, (drawW - canvas.width) / 2);
    const maxPanY = Math.max(0, (drawH - canvas.height) / 2);
    cropOffsetX = Math.max(-maxPanX, Math.min(maxPanX, cropOffsetX));
    cropOffsetY = Math.max(-maxPanY, Math.min(maxPanY, cropOffsetY));

    const dx = (canvas.width - drawW) / 2 + cropOffsetX;
    const dy = (canvas.height - drawH) / 2 + cropOffsetY;

    ctx.drawImage(rawCropImage, dx, dy, drawW, drawH);

    const previewAvatarEl = document.getElementById('settingsPreviewAvatar');
    if (previewAvatarEl) {
        previewAvatarEl.innerHTML = getAvatarHTML(buildCompressedAvatarDataURL(canvas), 'w-14 h-14');
    }
};

window.saveProfileChanges = function() {
    const newName = document.getElementById('editNicknameInput').value.trim();
    if (!newName) {
        alert('Přezdívka nemůže být prázdná!');
        return;
    }
    myNickname = newName;
    myClass = document.getElementById('editClassInput').value;

    const cropBox = document.getElementById('cropBoxContainer');
    if (cropBox && !cropBox.classList.contains('hidden') && rawCropImage) {
        const canvas = document.getElementById('cropCanvas');
        userPhotoURL = buildCompressedAvatarDataURL(canvas);
    }

    cacheLocalProfile();
    closeProfileModal();
    updateHeaderUI();

    if (isGoogleUser && myId) {
        saveUserProfileToDB().catch((err) => {
            alert('Uložení do databáze selhalo: ' + (err?.message || 'zkontroluj oprávnění Firebase'));
        });
    }

    if (myId) {
        db.ref(`sachy/lobby/${myId}`).update({
            name: myNickname,
            class: myClass,
            photoURL: userPhotoURL || null,
            isGoogle: isGoogleUser
        }).catch(() => {});
    }
};

// ----------------------------------------------------
// BOT (~500 ELO) LOGIKA
// ----------------------------------------------------
window.openBotModal = function() {
    openModalEl('botModal');
};

window.closeBotModal = function() {
    closeModalEl('botModal');
};

window.selectBotTime = function(minutes) {
    selectedBotTimeLimit = minutes;
    [3, 5, 10].forEach(m => {
        const btn = document.getElementById(`btnBotTime${m}`);
        if (m === minutes) {
            btn.className = 'p-2.5 bg-[#81b64c] text-white border border-[#457524] rounded-lg text-xs font-bold';
        } else {
            btn.className = 'p-2.5 bg-[#191816] border border-[#3d3b38] rounded-lg text-xs font-bold hover:border-[#81b64c]';
        }
    });
};

window.startBotGame = function() {
    unlockAllSounds();
    closeBotModal();
    clearEndgameTimers();
    clearPremove();

    isBotGame = true;
    activeGameId = 'bot_match_' + Date.now();
    gameOverSequenceStarted = false;
    checkmatedColor = null;
    tenSecPlayedMy = false;
    tenSecPlayedOpp = false;

    myColor = Math.random() < 0.5 ? 'w' : 'b';
    visualFlipped = (myColor === 'b');
    opponentName = 'Šachobot (500 ELO)';
    opponentId = 'bot_500';
    opponentIsGoogle = false;

    gameBoard = initialBoard.map(row => [...row]);
    castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    enPassantTarget = null;
    halfMoveClock = 0;
    moveHistory = [];
    fullBoardSnapshots = [initialBoard.map(row => [...row])];
    currentViewIndex = 0;
    gameStatus = 'playing';
    myTurn = (myColor === 'w');

    whiteTimeSeconds = selectedBotTimeLimit * 60;
    blackTimeSeconds = selectedBotTimeLimit * 60;

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.add('hidden');
    closeModalEl('gameOverModal');
    document.getElementById('endgameBanner').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('flex');

    document.getElementById('bottomPlayerName').innerText = `${myNickname} (${myColor === 'w' ? 'Bílý ♔' : 'Černý ♚'})`;
    document.getElementById('topPlayerName').innerText = `${opponentName} (${myColor === 'w' ? 'Černý ♚' : 'Bílý ♔'})`;

    document.getElementById('bottomAvatar').innerHTML = getAvatarHTML(userPhotoURL, 'w-8 h-8');
    document.getElementById('topAvatar').innerHTML = getAvatarHTML(BOT_AVATAR, 'w-8 h-8');

    document.getElementById('btnSurrender').disabled = false;
    document.getElementById('btnDraw').disabled = false;
    document.getElementById('btnAddFriendInGame').classList.add('hidden');

    updateTurnIndicators();
    updateTimersDisplay();
    updateCapturedAndDesktopLog();
    renderBoard(null);
    startClocks();
    playSound('game-start');

    if (!myTurn) {
        triggerBotMove();
    }
};

function triggerBotMove() {
    if (!isBotGame || gameStatus !== 'playing' || myTurn) return;

    const botColor = myColor === 'w' ? 'b' : 'w';
    let allLegalMoves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (gameBoard[r][c] && gameBoard[r][c][0] === botColor) {
                const moves = getValidatedLegalMovesForColor(r, c, botColor, gameBoard, castlingRights, enPassantTarget);
                moves.forEach(m => {
                    allLegalMoves.push({ from: { r, c }, to: { r: m.r, c: m.c } });
                });
            }
        }
    }

    if (allLegalMoves.length === 0) return;

    const scoredMoves = allLegalMoves.map(m => {
        let score = 0;
        const piece = gameBoard[m.from.r][m.from.c];
        const target = gameBoard[m.to.r][m.to.c];
        const pieceValues = { 'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000 };
        const oppColor = botColor === 'w' ? 'b' : 'w';

        if (target && target[0] === oppColor) {
            const victimVal = pieceValues[target[1]] || 0;
            const attackerVal = pieceValues[piece[1]] || 0;
            score += (victimVal * 10) - attackerVal;
        }
        if ((m.to.r === 3 || m.to.r === 4) && (m.to.c === 3 || m.to.c === 4)) {
            score += 25;
        }
        const testBoard = simulateMoveOnBoard(gameBoard, m.from, m.to, enPassantTarget, 'Q');
        if (isInCheck(oppColor, testBoard)) score += 50;
        if (isSquareAttacked(m.to.r, m.to.c, oppColor, testBoard)) {
            score -= (pieceValues[piece[1]] || 100) * 0.7;
        }
        return { move: m, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);

    let chosenMove;
    if (Math.random() < 0.65 && scoredMoves.length > 0) {
        const topPoolSize = Math.min(3, scoredMoves.length);
        chosenMove = scoredMoves[Math.floor(Math.random() * topPoolSize)].move;
    } else {
        chosenMove = scoredMoves[Math.floor(Math.random() * scoredMoves.length)].move;
    }

    const delay = Math.floor(Math.random() * 600) + 420;
    botTimerTimeout = setTimeout(() => {
        if (!isBotGame || gameStatus !== 'playing') return;
        executeMoveInternal(chosenMove.from, chosenMove.to, botColor, 'Q', true);
    }, delay);
}

// ----------------------------------------------------
// LOBBY, GOOGLE PŘÁTELÉ, ZPRÁVY A VÝZVY (3m / 5m / 10m)
// ----------------------------------------------------
function enterLobby() {
    updateHeaderUI();

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('flex');

    const userRef = db.ref(`sachy/lobby/${myId}`);
    userRef.set({
        id: myId,
        name: myNickname,
        class: myClass,
        email: myEmail || null,
        photoURL: userPhotoURL || null,
        isGoogle: isGoogleUser,
        status: 'idle',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    userRef.onDisconnect().remove();

    if (!lobbyListenersAttached) {
        lobbyListenersAttached = true;
        listenLobby();
        listenInvites();
        listenLeaderboard();
        loadUserHistory();
        if (isGoogleUser) {
            listenAllGoogleUsers();
            listenFriendRequests();
            listenFriendMessages();
        }
    }

    if (!gameWatcherAttached) {
        gameWatcherAttached = true;
        attachGameWatcher();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) joinGameByCodeString(joinCode);
}

window.logoutUser = function() {
    if (myId) db.ref(`sachy/lobby/${myId}`).remove();
    if (!isGoogleUser && myId) {
        db.ref(`sachy/users/${myId}`).remove();
    } else {
        auth.signOut();
    }
    location.reload();
};

function listenLobby() {
    db.ref('sachy/lobby').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const listEl = document.getElementById('playersList');
        const badge = document.getElementById('onlineBadge');
        if (!listEl) return;
        listEl.innerHTML = '';

        let count = 0;
        for (let id in users) {
            if (id === myId) continue;
            const u = users[id];

            if (!u || !u.name || u.name === 'undefined') {
                db.ref(`sachy/lobby/${id}`).remove();
                continue;
            }

            count++;
            const displayName = u.name || 'Šachista';

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#191816] p-2.5 rounded-xl border border-[#383632] hover:border-[#4d4a44] transition-colors';
            
            const avatarHTML = getAvatarHTML(u.photoURL, 'w-8 h-8');
            const googleTag = u.isGoogle ? `<span class="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold">Google</span>` : '';

            const infoSpan = document.createElement('div');
            infoSpan.className = 'flex items-center gap-2.5 min-w-0';
            infoSpan.innerHTML = `${avatarHTML} <div class="truncate"><span class="font-bold text-xs sm:text-sm text-white">${displayName} ${u.class ? '(' + u.class + ')' : ''}</span> ${googleTag}</div>`;
            
            const btnGroup = document.createElement('div');
            btnGroup.className = 'flex items-center gap-1.5 flex-shrink-0';

            if (u.status === 'playing') {
                const playingBtn = document.createElement('button');
                playingBtn.className = 'bg-gray-700 text-xs px-3 py-1.5 rounded-lg font-bold cursor-not-allowed opacity-60';
                playingBtn.innerText = 'Ve hře';
                playingBtn.disabled = true;
                btnGroup.appendChild(playingBtn);
            } else {
                const inviteBtn = document.createElement('button');
                inviteBtn.className = 'btn-chess text-xs px-3 py-1.5 rounded-lg';
                inviteBtn.innerText = 'Vyzvat';
                inviteBtn.onclick = () => sendInvite(id, null);
                btnGroup.appendChild(inviteBtn);
            }

            if (isGoogleUser && u.isGoogle) {
                const addFriendBtn = document.createElement('button');
                addFriendBtn.className = 'btn-outline text-xs p-1.5 rounded-lg text-blue-400 hover:border-blue-500';
                addFriendBtn.title = 'Přidat do přátel';
                addFriendBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>`;
                addFriendBtn.onclick = () => sendFriendRequest(id, displayName);
                btnGroup.appendChild(addFriendBtn);
            }

            div.appendChild(infoSpan);
            div.appendChild(btnGroup);
            listEl.appendChild(div);
        }

        if (badge) badge.innerText = count;
        if (count === 0) listEl.innerHTML = '<p class="text-gray-500 text-center py-6 text-xs">V lobby zatím nikdo další není.</p>';
    });
}

function listenAllGoogleUsers() {
    if (!isGoogleUser) return;
    db.ref('sachy/users').on('value', (snap) => {
        allRegisteredGoogleUsers = snap.val() || {};
        renderAllGoogleUsers();
    });
}

window.renderAllGoogleUsers = function() {
    const container = document.getElementById('allGoogleUsersList');
    if (!container || !isGoogleUser) return;
    const query = (document.getElementById('googleUserSearchInput')?.value || '').toLowerCase().trim();
    container.innerHTML = '';

    let found = 0;
    Object.entries(allRegisteredGoogleUsers).forEach(([uid, u]) => {
        if (uid === myId || !u || !u.isGoogle) return;
        const nameMatch = (u.name || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        if (query && !nameMatch && !emailMatch) return;

        found++;
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-[#191816] p-2 rounded-xl border border-[#3d3b38]';
        div.innerHTML = `
            <div class="flex items-center gap-2 min-w-0">
                ${getAvatarHTML(u.photoURL, 'w-7 h-7')}
                <div class="min-w-0">
                    <div class="font-bold text-xs text-white truncate">${u.name || 'Google hráč'}</div>
                    <div class="text-[10px] text-gray-400 truncate">${u.email || ''}</div>
                </div>
            </div>
            <button type="button" onclick="sendFriendRequest('${uid}', '${(u.name || 'Hráč').replace(/'/g, "\\'")}')" class="btn-chess text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0">+ Přidat</button>
        `;
        container.appendChild(div);
    });

    if (found === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4 text-xs">Žádní další Google hráči nenalezeni.</p>';
    }
};

function sendFriendRequest(targetId, targetName) {
    if (!isGoogleUser) {
        alert('Přátele mohou mít pouze Google účty.');
        return;
    }
    if (targetId === myId) return;

    db.ref(`sachy/users/${targetId}`).once('value', (snap) => {
        const targetData = snap.val();
        if (!targetData || !targetData.isGoogle) {
            alert('Do přátel lze přidat pouze uživatele s Google účtem.');
            return;
        }

        db.ref(`sachy/friendRequests/${targetId}/${myId}`).set({
            fromId: myId,
            fromName: myNickname,
            fromPhoto: userPhotoURL || null,
            fromGoogle: true,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        playSound('notify');
        alert(`Žádost o přátelství odeslána uživateli ${targetName}!`);
    });
}

function sendFriendRequestInGame() {
    window.toggleGameMenu();
    if (!isGoogleUser || !opponentIsGoogle) return;
    if (opponentId && !isBotGame) sendFriendRequest(opponentId, opponentName);
}

function listenFriendRequests() {
    if (!isGoogleUser) return;
    db.ref(`sachy/friendRequests/${myId}`).on('value', (snap) => {
        const reqs = snap.val() || {};
        const count = Object.keys(reqs).length;

        const badge = document.getElementById('friendReqBadge');
        const reqTabCount = document.getElementById('reqTabCount');

        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('hidden');
            if (reqTabCount) reqTabCount.innerText = `(${count})`;
            playSound('notify');
        } else {
            badge.classList.add('hidden');
            if (reqTabCount) reqTabCount.innerText = '';
        }

        renderRequestsTab(reqs);
    });

    db.ref(`sachy/friends/${myId}`).on('value', (snap) => {
        renderFriendsTab(snap.val() || {});
    });
}

function listenFriendMessages() {
    if (!isGoogleUser) return;
    db.ref(`sachy/directMessages/${myId}`).on('child_added', (snap) => {
        const msg = snap.val();
        const msgKey = snap.key;
        if (!msg) return;

        db.ref(`sachy/directMessages/${myId}/${msgKey}`).remove();

        playSound('notify');
        showFriendToastNotification(msg);
    });
}

function showFriendToastNotification(msg) {
    const container = document.getElementById('friendToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-slide pointer-events-auto bg-[#262421] border border-[#81b64c] rounded-2xl p-3.5 shadow-2xl text-white translate-x-full opacity-0';
    toast.innerHTML = `
        <div class="flex items-start gap-2.5">
            ${getAvatarHTML(msg.fromPhoto, 'w-8 h-8')}
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                    <span class="font-extrabold text-xs text-[#81b64c] truncate">${msg.fromName}</span>
                    <button type="button" class="text-gray-400 hover:text-white text-sm font-bold leading-none">&times;</button>
                </div>
                <p class="text-xs text-gray-200 mt-1 break-words">${msg.text}</p>
                <div class="flex items-center gap-1.5 mt-2">
                    <button type="button" class="reply-toast-btn bg-[#81b64c] hover:bg-[#73a442] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">Odpovědět</button>
                    <button type="button" class="invite-toast-btn bg-[#191816] hover:bg-[#322f2b] border border-[#3d3b38] text-gray-200 text-[10px] font-bold px-2.5 py-1 rounded-lg">Vyzvat 5m</button>
                </div>
            </div>
        </div>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.onclick = () => dismissToast(toast);

    const replyBtn = toast.querySelector('.reply-toast-btn');
    replyBtn.onclick = () => {
        dismissToast(toast);
        openFriendDmModal(msg.fromId, msg.fromName);
    };

    const invBtn = toast.querySelector('.invite-toast-btn');
    invBtn.onclick = () => {
        dismissToast(toast);
        sendInvite(msg.fromId, 5);
    };

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });

    setTimeout(() => dismissToast(toast), 9000);
}

function dismissToast(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
}

window.openFriendDmModal = function(targetId, targetName) {
    if (!isGoogleUser) return;
    activeDmTarget = { id: targetId, name: targetName };
    document.getElementById('friendDmTitle').innerText = `💬 Zpráva pro ${targetName}`;
    document.getElementById('friendDmInput').value = '';
    openModalEl('friendDmModal');
};

window.closeFriendDmModal = function() {
    closeModalEl('friendDmModal');
};

window.submitFriendDm = function() {
    if (!isGoogleUser || !activeDmTarget) return;
    const text = document.getElementById('friendDmInput').value.trim();
    if (!text) return;

    db.ref(`sachy/directMessages/${activeDmTarget.id}`).push({
        fromId: myId,
        fromName: myNickname,
        fromPhoto: userPhotoURL || null,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    closeFriendDmModal();
    playSound('move-self');
};

window.openCommunityModal = function(initialTab = 'friends') {
    if (!isGoogleUser) return;
    openModalEl('communityModal');
    switchCommunityTab(initialTab);
};

window.closeCommunityModal = function() {
    closeModalEl('communityModal');
};

window.switchCommunityTab = function(tab) {
    const fBtn = document.getElementById('tabFriendsBtn');
    const rBtn = document.getElementById('tabRequestsBtn');
    const sBtn = document.getElementById('tabSearchBtn');
    const fCont = document.getElementById('tabFriendsContent');
    const rCont = document.getElementById('tabRequestsContent');
    const sCont = document.getElementById('tabSearchContent');

    [fBtn, rBtn, sBtn].forEach(b => b.className = 'flex-1 py-2 text-gray-400 hover:text-white');
    [fCont, rCont, sCont].forEach(c => c.classList.add('hidden'));

    if (tab === 'friends') {
        fBtn.className = 'flex-1 py-2 text-[#81b64c] border-b-2 border-[#81b64c]';
        fCont.classList.remove('hidden');
    } else if (tab === 'requests') {
        rBtn.className = 'flex-1 py-2 text-[#81b64c] border-b-2 border-[#81b64c]';
        rCont.classList.remove('hidden');
    } else {
        sBtn.className = 'flex-1 py-2 text-[#81b64c] border-b-2 border-[#81b64c]';
        sCont.classList.remove('hidden');
        renderAllGoogleUsers();
    }
};

function renderFriendsTab(friends) {
    const container = document.getElementById('tabFriendsContent');
    if (!container) return;
    container.innerHTML = '';

    const fKeys = Object.keys(friends);
    if (fKeys.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-6 text-xs">Zatím nemáš žádné přátele. Přidej si je v záložce Google hráči!</p>';
        return;
    }

    fKeys.forEach(fId => {
        const f = friends[fId];
        const safeName = (f.name || 'Přítel').replace(/'/g, "\\'");
        const div = document.createElement('div');
        div.className = 'bg-[#191816] p-2.5 rounded-xl border border-[#3d3b38] space-y-2';
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 min-w-0">
                    ${getAvatarHTML(f.photo, 'w-7 h-7')}
                    <span class="font-bold text-xs text-white truncate">${f.name}</span>
                </div>
                <button type="button" onclick="openFriendDmModal('${fId}', '${safeName}')" class="btn-outline text-[11px] px-2.5 py-1 rounded-lg font-bold text-blue-300 hover:border-blue-400">
                    💬 Zpráva
                </button>
            </div>
            <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#2b2926]">
                <button type="button" onclick="sendInvite('${fId}', 3); closeCommunityModal();" class="btn-chess text-[11px] py-1 rounded-lg">⚡ 3m</button>
                <button type="button" onclick="sendInvite('${fId}', 5); closeCommunityModal();" class="btn-chess text-[11px] py-1 rounded-lg">🔥 5m</button>
                <button type="button" onclick="sendInvite('${fId}', 10); closeCommunityModal();" class="btn-chess text-[11px] py-1 rounded-lg">⏱️ 10m</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderRequestsTab(reqs) {
    const container = document.getElementById('tabRequestsContent');
    if (!container) return;
    container.innerHTML = '';

    const rKeys = Object.keys(reqs);
    if (rKeys.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-6 text-xs">Žádné nové žádosti.</p>';
        return;
    }

    rKeys.forEach(reqId => {
        const r = reqs[reqId];
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-[#191816] p-2.5 rounded-xl border border-[#3d3b38]';
        div.innerHTML = `
            <div class="flex items-center gap-2">
                ${getAvatarHTML(r.fromPhoto, 'w-7 h-7')}
                <span class="font-bold text-xs text-white">${r.fromName}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick="acceptFriendRequest('${r.fromId}', '${r.fromName}', '${r.fromPhoto || ''}')" class="btn-chess text-[11px] px-2.5 py-1 rounded-lg">Přijmout</button>
                <button type="button" onclick="rejectFriendRequest('${r.fromId}')" class="bg-red-700 hover:bg-red-600 text-white text-[11px] px-2.5 py-1 rounded-lg">Odmítnout</button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.acceptFriendRequest = function(friendId, friendName, friendPhoto) {
    if (!isGoogleUser) return;
    db.ref(`sachy/friends/${myId}/${friendId}`).set({ name: friendName, photo: friendPhoto, isGoogle: true });
    db.ref(`sachy/friends/${friendId}/${myId}`).set({ name: myNickname, photo: userPhotoURL, isGoogle: true });
    db.ref(`sachy/friendRequests/${myId}/${friendId}`).remove();
};

window.rejectFriendRequest = function(friendId) {
    db.ref(`sachy/friendRequests/${myId}/${friendId}`).remove();
};

window.shareGameLink = function() {
    const url = 'https://gjwprostejov.com/sachy/';
    const shareData = {
        title: 'chess.gjw',
        text: 'Pojď si zahrát šachy na gjwprostejov.com/sachy/',
        url: url
    };

    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => alert('Odkaz zkopírován!'));
    }
};

window.openQRModal = function() {
    const matchId = 'chess_' + Math.random().toString(36).substr(2, 9);
    const joinURL = `https://gjwprostejov.com/sachy/?join=${matchId}`;
    
    const qrImg = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinURL)}" alt="QR" class="w-44 h-44 rounded-lg">`;
    document.getElementById('qrImgBox').innerHTML = qrImg;
    document.getElementById('manualQrGameIdInput').value = matchId;

    db.ref(`sachy/games/${matchId}`).set({
        player1: { id: myId, name: myNickname, photo: userPhotoURL || null, isGoogle: isGoogleUser },
        player2: { id: 'waiting', name: 'Čeká se...', photo: null, isGoogle: false },
        board: initialBoard,
        turn: 'w',
        status: 'waiting_qr',
        votes: {},
        voteEndTime: Date.now() + 15000,
        timeLimit: 10,
        whiteTime: 600,
        blackTime: 600,
        lastMove: null,
        history: [],
        snapshots: [initialBoard],
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        enPassant: null
    });

    openModalEl('qrModal');
};

window.closeQRModal = function() {
    closeModalEl('qrModal');
};

window.joinGameByCode = function() {
    const code = document.getElementById('manualQrGameIdInput').value.trim();
    if (code) joinGameByCodeString(code);
};

function joinGameByCodeString(gameId) {
    db.ref(`sachy/games/${gameId}`).once('value', (snap) => {
        const game = snap.val();
        if (game && (game.status === 'waiting_qr' || game.status === 'voting')) {
            if (game.player1 && game.player1.id === myId) {
                alert('Nemůžeš se připojit do své vlastní hry!');
                return;
            }

            db.ref(`sachy/games/${gameId}/player2`).set({
                id: myId,
                name: myNickname,
                photo: userPhotoURL || null,
                isGoogle: isGoogleUser
            });
            db.ref(`sachy/games/${gameId}`).update({
                status: 'voting',
                voteEndTime: Date.now() + 15000
            });
            closeQRModal();
        } else {
            alert('Zápas s tímto kódem neexistuje nebo je již plný.');
        }
    });
}

function sendInvite(targetId, fixedTimeMin = null) {
    unlockAllSounds();
    if (targetId === myId) return;
    db.ref(`sachy/invites/${targetId}`).set({
        fromId: myId,
        fromName: myNickname,
        fromPhoto: userPhotoURL || null,
        fromGoogle: isGoogleUser,
        fixedTime: fixedTimeMin || null
    });
    if (fixedTimeMin) {
        alert(`Výzva (${fixedTimeMin} min) odeslána!`);
    }
}

function listenInvites() {
    db.ref(`sachy/invites/${myId}`).on('value', (snapshot) => {
        const invite = snapshot.val();
        if (!invite || invite.fromId === myId) {
            closeModalEl('inviteModal');
            return;
        }

        window.currentInvite = invite;
        playSound('notify');
        
        document.getElementById('inviteAvatar').innerHTML = getAvatarHTML(invite.fromPhoto, 'w-14 h-14');
        const timeInfo = invite.fixedTime ? ` (${invite.fixedTime} min)` : '';
        document.getElementById('inviteText').innerText = `${invite.fromName} tě vyzývá na šachový zápas${timeInfo}!`;
        
        openModalEl('inviteModal');
    });
}

window.acceptInvite = function() {
    unlockAllSounds();
    const invite = window.currentInvite;
    if (!invite || invite.fromId === myId) return;

    db.ref(`sachy/invites/${myId}`).remove();
    closeModalEl('inviteModal');

    const matchId = 'chess_' + Math.random().toString(36).substr(2, 9);
    const hasFixedTime = !!invite.fixedTime;
    const chosenTime = invite.fixedTime || 10;
    const p1GetsWhite = Math.random() < 0.5;

    db.ref(`sachy/games/${matchId}`).set({
        player1: { id: invite.fromId, name: invite.fromName, photo: invite.fromPhoto || null, isGoogle: !!invite.fromGoogle },
        player2: { id: myId, name: myNickname, photo: userPhotoURL || null, isGoogle: isGoogleUser },
        p1Color: p1GetsWhite ? 'w' : 'b',
        p2Color: p1GetsWhite ? 'b' : 'w',
        board: initialBoard,
        turn: 'w',
        status: hasFixedTime ? 'playing' : 'voting',
        votes: {},
        voteEndTime: Date.now() + 15000,
        timeLimit: chosenTime,
        whiteTime: chosenTime * 60,
        blackTime: chosenTime * 60,
        lastMove: null,
        history: [],
        snapshots: [initialBoard],
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        enPassant: null
    });

    db.ref(`sachy/lobby/${invite.fromId}/status`).set('playing');
    db.ref(`sachy/lobby/${myId}/status`).set('playing');
};

window.rejectInvite = function() {
    db.ref(`sachy/invites/${myId}`).remove();
    closeModalEl('inviteModal');
};

function attachGameWatcher() {
    db.ref('sachy/games').on('child_added', (snapshot) => {
        const game = snapshot.val();
        const gameId = snapshot.key;
        if (!myId || activeGameId === gameId || isBotGame) return;
        if (!game || game.status === 'won' || game.status === 'draw') return;

        if (game.player1 && (game.player1.id === myId || (game.player2 && game.player2.id === myId))) {
            activeGameId = gameId;
            isBotGame = false;
            gameOverSequenceStarted = false;
            checkmatedColor = null;
            setupGameUI(game);
        }
    });
}

function setupGameUI(game) {
    clearEndgameTimers();
    clearPremove();
    tenSecPlayedMy = false;
    tenSecPlayedOpp = false;

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.add('hidden');
    document.getElementById('endgameBanner').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('flex');

    const isP1 = game.player1.id === myId;
    opponentName = isP1 ? (game.player2?.name || 'Soupeř') : (game.player1?.name || 'Soupeř');
    opponentId = isP1 ? (game.player2?.id || '') : (game.player1?.id || '');
    opponentIsGoogle = isP1 ? !!(game.player2 && game.player2.isGoogle) : !!(game.player1 && game.player1.isGoogle);

    const myPhoto = isP1 ? game.player1.photo : (game.player2 && game.player2.photo);
    const oppPhoto = isP1 ? (game.player2 && game.player2.photo) : game.player1.photo;

    document.getElementById('bottomPlayerName').innerText = `${myNickname}`;
    document.getElementById('topPlayerName').innerText = `${opponentName}`;

    document.getElementById('bottomAvatar').innerHTML = getAvatarHTML(myPhoto, 'w-8 h-8');
    document.getElementById('topAvatar').innerHTML = getAvatarHTML(oppPhoto, 'w-8 h-8');

    const addFriendGameBtn = document.getElementById('btnAddFriendInGame');
    if (isGoogleUser && opponentIsGoogle) {
        addFriendGameBtn.classList.remove('hidden');
    } else {
        addFriendGameBtn.classList.add('hidden');
    }

    listenGame();
    if (!chatListenerRegistered) {
        listenChat();
        chatListenerRegistered = true;
    }
}

window.flipBoardView = function() {
    visualFlipped = !visualFlipped;
    renderBoard(null);
};

function updateTurnIndicators() {
    const topCard = document.getElementById('topPlayerCard');
    const bottomCard = document.getElementById('bottomPlayerCard');
    const topSub = document.getElementById('topStatusSub');
    const bottomSub = document.getElementById('bottomStatusSub');

    if (gameStatus !== 'playing') {
        topCard.classList.remove('player-card-active');
        bottomCard.classList.remove('player-card-active');
        if (bottomSub) bottomSub.innerText = '';
        if (topSub) topSub.innerText = '';
        return;
    }

    if (myTurn) {
        bottomCard.classList.add('player-card-active');
        topCard.classList.remove('player-card-active');
        if (bottomSub) bottomSub.innerText = '• Na tahu';
        if (topSub) topSub.innerText = '';
    } else {
        topCard.classList.add('player-card-active');
        bottomCard.classList.remove('player-card-active');
        if (topSub) topSub.innerText = '• Přemýšlí';
        if (bottomSub) bottomSub.innerText = '';
    }
}

function listenGame() {
    if (isBotGame || !activeGameId) return;
    db.ref(`sachy/games/${activeGameId}`).on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) {
            exitGame();
            return;
        }

        if (game.p1Color && game.p2Color) {
            const isP1 = game.player1.id === myId;
            const newColor = isP1 ? game.p1Color : game.p2Color;
            if (myColor !== newColor) {
                myColor = newColor;
                visualFlipped = (myColor === 'b');
            }
            document.getElementById('bottomPlayerName').innerText = `${myNickname} (${myColor === 'w' ? 'Bílý ♔' : 'Černý ♚'})`;
            document.getElementById('topPlayerName').innerText = `${opponentName} (${myColor === 'w' ? 'Černý ♚' : 'Bílý ♔'})`;
        }

        const prevMoveCount = moveHistory.length;
        const prevBoard = gameBoard.length ? gameBoard.map(r => [...r]) : null;
        const prevStatus = gameStatus;

        gameStatus = game.status;
        gameBoard = game.board;
        myTurn = game.turn === myColor;
        moveHistory = game.history || [];
        fullBoardSnapshots = game.snapshots || [initialBoard];
        castlingRights = game.castling || { wK: true, wQ: true, bK: true, bQ: true };
        enPassantTarget = game.enPassant || null;

        if (gameStatus === 'won' && game.reason === 'checkmate') {
            checkmatedColor = game.turn;
        } else {
            checkmatedColor = null;
        }

        const isOpponentNewMove = moveHistory.length > prevMoveCount && game.lastMove && game.turn === myColor;
        if (isOpponentNewMove) {
            if (gameStatus === 'won' && game.reason === 'checkmate') {
                playCheckmateSound();
            } else if (isInCheck(myColor, gameBoard)) {
                playSound('move-check');
            } else if (game.lastSound) {
                playSound(game.lastSound === 'move-self' ? 'move-opponent' : game.lastSound);
            } else {
                playSound('move-opponent');
            }
        }

        const rematchVotes = game.rematchVotes || {};
        const count = Object.keys(rematchVotes).length;
        document.getElementById('rematchCount').innerText = `${count}/2`;
        if (rematchVotes[myId]) {
            document.getElementById('btnRematch').innerText = `Čeká se (${count}/2)...`;
            document.getElementById('btnRematch').disabled = true;
        }

        if (game.status === 'voting') {
            handleVotingAndCoinflipPhase(game);
        } else if (game.status === 'playing') {
            if (prevStatus !== 'playing') playSound('game-start');
            clearEndgameTimers();
            gameOverSequenceStarted = false;
            checkmatedColor = null;
            closeModalEl('timeVoteModal');
            closeModalEl('gameOverModal');
            document.getElementById('endgameBanner').classList.add('hidden');
            
            whiteTimeSeconds = game.whiteTime || (game.timeLimit * 60);
            blackTimeSeconds = game.blackTime || (game.timeLimit * 60);
            updateTurnIndicators();
            updateTimersDisplay();
            startClocks();

            document.getElementById('btnSurrender').disabled = false;
            document.getElementById('btnDraw').disabled = false;

            if (game.drawOffer && game.drawOffer !== myId) {
                openModalEl('drawModal');
                playSound('notify');
            } else {
                closeModalEl('drawModal');
            }
        } else if (game.status === 'won' || game.status === 'draw') {
            stopClocks();
            clearPremove();
            updateTurnIndicators();
            document.getElementById('btnSurrender').disabled = true;
            document.getElementById('btnDraw').disabled = true;
            triggerEndgameSequence(game);
        }

        currentViewIndex = fullBoardSnapshots.length - 1;
        updateCapturedAndDesktopLog();

        const afterRenderCallback = () => {
            renderBoard(game.lastMove);
            if (gameStatus === 'playing' && myTurn && queuedPremove) {
                executeQueuedPremoveIfLegal();
            }
        };

        if (isOpponentNewMove && prevBoard && game.lastMove) {
            const movedPiece = prevBoard[game.lastMove.from.r][game.lastMove.from.c];
            animateSlideMove(game.lastMove.from, game.lastMove.to, movedPiece, afterRenderCallback);
        } else {
            afterRenderCallback();
        }
    });
}

function clearEndgameTimers() {
    if (gameOverDelayTimeout) {
        clearTimeout(gameOverDelayTimeout);
        gameOverDelayTimeout = null;
    }
    if (gameOverCountdownInterval) {
        clearInterval(gameOverCountdownInterval);
        gameOverCountdownInterval = null;
    }
}

function triggerEndgameSequence(game) {
    if (gameOverSequenceStarted) return;
    gameOverSequenceStarted = true;

    const reason = game.reason || 'checkmate';
    const banner = document.getElementById('endgameBanner');
    const bannerText = document.getElementById('endgameBannerText');
    const countdownEl = document.getElementById('endgameCountdown');

    let summaryTitle = '';
    if (game.status === 'won') {
        const isWinner = game.winner === myId;
        if (reason === 'timeout') {
            summaryTitle = isWinner ? '⏱️ Soupeřovi vypršel čas! Vyhrál jsi!' : '⏱️ Vypršel ti čas! Prohrál jsi.';
        } else if (reason === 'surrender') {
            summaryTitle = isWinner ? '🏳️ Soupeř vzdal partii! Vyhrál jsi!' : '🏳️ Vzdal jsi partii.';
        } else if (reason === 'left') {
            summaryTitle = isWinner ? '🚪 Soupeř opustil hru! Vyhrál jsi!' : '🚪 Opustil jsi hru.';
        } else {
            summaryTitle = isWinner ? '♔ ŠACHMAT! Vyhrál jsi partii!' : `♚ ŠACHMAT! Vyhrál ${opponentName}.`;
        }
    } else if (reason === 'stalemate') {
        summaryTitle = '🤝 PAT! Remíza – žádné legální tahy.';
    } else if (reason === 'insufficient') {
        summaryTitle = '🤝 REMÍZA! Nedostatek materiálu.';
    } else if (reason === 'fifty_move') {
        summaryTitle = '🤝 REMÍZA! Pravidlo 50 tahů.';
    } else {
        summaryTitle = '🤝 REMÍZA dohodou.';
    }

    if (banner && bannerText && countdownEl) {
        bannerText.innerText = summaryTitle;
        let secLeft = 5;
        countdownEl.innerText = `${secLeft}s`;
        banner.classList.remove('hidden');

        gameOverCountdownInterval = setInterval(() => {
            secLeft--;
            if (secLeft > 0) {
                countdownEl.innerText = `${secLeft}s`;
            } else {
                clearInterval(gameOverCountdownInterval);
                gameOverCountdownInterval = null;
            }
        }, 1000);
    }

    gameOverDelayTimeout = setTimeout(() => {
        if (banner) banner.classList.add('hidden');
        showGameOverModal(game);
    }, 5000);
}

function handleVotingAndCoinflipPhase(game) {
    openModalEl('timeVoteModal');

    if (!game.p1Color && game.player1.id === myId) {
        const p1GetsWhite = Math.random() < 0.5;
        db.ref(`sachy/games/${activeGameId}`).update({
            p1Color: p1GetsWhite ? 'w' : 'b',
            p2Color: p1GetsWhite ? 'b' : 'w'
        });
    }

    const coinEl = document.getElementById('colorCoinflipText');
    if (game.p1Color) {
        const isP1 = game.player1.id === myId;
        const assignedColor = isP1 ? game.p1Color : game.p2Color;
        coinEl.innerHTML = `Barva: <strong>${assignedColor === 'w' ? 'Bílý ♔ (Začínáš)' : 'Černý ♚ (Druhý)'}</strong>`;
        coinEl.classList.remove('animate-bounce');
    }

    const votes = game.votes || {};
    const myVote = votes[myId];
    const oppId = game.player1.id === myId ? game.player2.id : game.player1.id;
    const oppVote = votes[oppId];

    [3, 5, 10].forEach(t => {
        const btn = document.getElementById(`btnVote${t}`);
        const oppTag = document.getElementById(`oppVoteTag${t}`);

        if (myVote === t) {
            btn.className = 'relative p-2.5 bg-[#81b64c] text-white border border-[#457524] rounded-xl text-xs font-bold shadow-lg';
        } else {
            btn.className = 'relative p-2.5 bg-[#191816] border border-[#3d3b38] rounded-xl text-xs font-bold';
        }

        if (oppVote === t) oppTag.classList.remove('hidden');
        else oppTag.classList.add('hidden');
    });

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((game.voteEndTime - now) / 1000));
    document.getElementById('voteTimerSec').innerText = remaining + 's';

    if (remaining <= 0 && game.status === 'voting') {
        finalizeTimeVote(game);
    }
}

window.voteTime = function(minutes) {
    if (!activeGameId || isBotGame) return;
    db.ref(`sachy/games/${activeGameId}/votes/${myId}`).set(minutes);
};

function finalizeTimeVote(game) {
    const votes = game.votes || {};
    const p1Vote = votes[game.player1.id];
    const p2Vote = votes[game.player2.id];

    let chosenTime = 10;
    if (p1Vote && p2Vote && p1Vote === p2Vote) {
        chosenTime = p1Vote;
        startGameWithTime(chosenTime);
    } else {
        const slotArea = document.getElementById('slotMachineArea');
        slotArea.classList.remove('hidden');

        const options = [p1Vote || 5, p2Vote || 10];
        chosenTime = options[Math.floor(Math.random() * options.length)];

        const reel = document.getElementById('slotReel');
        let spinStep = 0;
        const spinInterval = setInterval(() => {
            spinStep++;
            reel.style.top = `-${(spinStep % 3) * 40}px`;
        }, 100);

        setTimeout(() => {
            clearInterval(spinInterval);
            const targetOffset = chosenTime === 3 ? 0 : (chosenTime === 5 ? 40 : 80);
            reel.style.top = `-${targetOffset}px`;
            document.getElementById('slotMachineText').innerText = `Čas: ${chosenTime} minut!`;

            setTimeout(() => {
                slotArea.classList.add('hidden');
                startGameWithTime(chosenTime);
            }, 1400);
        }, 1800);
    }
}

function startGameWithTime(timeMin) {
    if (activeGameId && !isBotGame) {
        db.ref(`sachy/games/${activeGameId}`).update({
            status: 'playing',
            timeLimit: timeMin,
            whiteTime: timeMin * 60,
            blackTime: timeMin * 60
        });
    }
}

function startClocks() {
    stopClocks();
    timerInterval = setInterval(() => {
        if (gameStatus !== 'playing') return;

        if (isBotGame) {
            const currentTurnColor = myTurn ? myColor : (myColor === 'w' ? 'b' : 'w');
            if (currentTurnColor === 'w') {
                whiteTimeSeconds = Math.max(0, whiteTimeSeconds - 1);
                if (whiteTimeSeconds === 0) handleTimeout('w');
            } else {
                blackTimeSeconds = Math.max(0, blackTimeSeconds - 1);
                if (blackTimeSeconds === 0) handleTimeout('b');
            }
            updateTimersDisplay();
            return;
        }

        db.ref(`sachy/games/${activeGameId}`).once('value', (snap) => {
            const g = snap.val();
            if (!g || g.status !== 'playing') return;

            if (g.turn === 'w') {
                whiteTimeSeconds = Math.max(0, whiteTimeSeconds - 1);
                if (whiteTimeSeconds === 0) handleTimeout('w');
            } else {
                blackTimeSeconds = Math.max(0, blackTimeSeconds - 1);
                if (blackTimeSeconds === 0) handleTimeout('b');
            }
            updateTimersDisplay();

            if (whiteTimeSeconds % 5 === 0) {
                db.ref(`sachy/games/${activeGameId}`).update({
                    whiteTime: whiteTimeSeconds,
                    blackTime: blackTimeSeconds
                });
            }
        });
    }, 1000);
}

function stopClocks() {
    if (timerInterval) clearInterval(timerInterval);
}

function handleTimeout(losingColor) {
    stopClocks();
    playSound('game-end');
    const winningColor = losingColor === 'w' ? 'b' : 'w';

    if (isBotGame) {
        gameStatus = 'won';
        const winnerId = (myColor === winningColor) ? myId : 'bot_500';
        triggerEndgameSequence({ status: 'won', winner: winnerId, reason: 'timeout' });
        return;
    }

    db.ref(`sachy/games/${activeGameId}`).once('value', (snap) => {
        const g = snap.val();
        if (!g || g.status !== 'playing') return;

        const isP1Winner = (g.p1Color === winningColor);
        const winnerId = isP1Winner ? g.player1.id : g.player2.id;

        db.ref(`sachy/games/${activeGameId}`).update({
            status: 'won',
            winner: winnerId,
            reason: 'timeout'
        });
    });
}

function updateTimersDisplay() {
    const format = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const mySec = myColor === 'w' ? whiteTimeSeconds : blackTimeSeconds;
    const oppSec = myColor === 'w' ? blackTimeSeconds : whiteTimeSeconds;

    if (gameStatus === 'playing') {
        if (myTurn && mySec <= 10 && mySec > 0 && !tenSecPlayedMy) {
            tenSecPlayedMy = true;
            playSound('tenseconds');
        }
        if (!myTurn && oppSec <= 10 && oppSec > 0 && !tenSecPlayedOpp) {
            tenSecPlayedOpp = true;
            playSound('tenseconds');
        }
    }

    const bottomEl = document.getElementById('bottomTimer');
    const topEl = document.getElementById('topTimer');

    bottomEl.innerText = format(mySec);
    topEl.innerText = format(oppSec);

    bottomEl.classList.remove('timer-active', 'timer-low');
    topEl.classList.remove('timer-active', 'timer-low');

    if (gameStatus === 'playing') {
        if (myTurn) {
            bottomEl.classList.add(mySec <= 15 ? 'timer-low' : 'timer-active');
        } else {
            topEl.classList.add(oppSec <= 15 ? 'timer-low' : 'timer-active');
        }
    }
}

function showGameOverModal(game) {
    openModalEl('gameOverModal');

    const titleEl = document.getElementById('gameOverTitle');
    const descEl = document.getElementById('gameOverDesc');

    if (game.status === 'won') {
        const isWinner = game.winner === myId;
        if (isWinner) {
            titleEl.innerText = '🏆 Vítězství!';
            if (game.reason === 'timeout') descEl.innerText = 'Soupeřovi vypršel čas.';
            else if (game.reason === 'left') descEl.innerText = 'Soupeř opustil hru (Kontumace)!';
            else if (game.reason === 'surrender') descEl.innerText = 'Soupeř vzdal partii.';
            else descEl.innerText = 'Vyhrál jsi šachmatem!';
        } else {
            titleEl.innerText = 'Porážka';
            if (game.reason === 'timeout') descEl.innerText = 'Vypršel ti čas.';
            else if (game.reason === 'surrender') descEl.innerText = 'Vzdal jsi partii.';
            else descEl.innerText = `Vyhrál ${opponentName} (Šachmat).`;
        }
    } else {
        titleEl.innerText = '🤝 Remíza';
        if (game.reason === 'stalemate') descEl.innerText = 'Pat! Žádné legální tahy.';
        else if (game.reason === 'insufficient') descEl.innerText = 'Nedostatek materiálu k matu.';
        else if (game.reason === 'fifty_move') descEl.innerText = 'Pravidlo 50 tahů.';
        else descEl.innerText = 'Zápas skončil remízou.';
    }
}

window.voteRematch = function() {
    if (!activeGameId) return;
    clearEndgameTimers();
    document.getElementById('endgameBanner').classList.add('hidden');

    if (isBotGame) {
        window.startBotGame();
        return;
    }

    db.ref(`sachy/games/${activeGameId}/rematchVotes/${myId}`).set(true);

    db.ref(`sachy/games/${activeGameId}/rematchVotes`).once('value', (snap) => {
        const votes = snap.val() || {};
        if (Object.keys(votes).length >= 2) {
            db.ref(`sachy/games/${activeGameId}`).update({
                board: initialBoard,
                turn: 'w',
                status: 'playing',
                winner: null,
                reason: null,
                rematchVotes: null,
                drawOffer: null,
                whiteTime: 600,
                blackTime: 600,
                lastMove: null,
                history: [],
                snapshots: [initialBoard],
                castling: { wK: true, wQ: true, bK: true, bQ: true },
                enPassant: null
            });
            document.getElementById('btnRematch').disabled = false;
        }
    });
};

function updateCapturedAndDesktopLog() {
    const startCounts = { wP: 8, wN: 2, wB: 2, wR: 2, wQ: 1, bP: 8, bN: 2, bB: 2, bR: 2, bQ: 1 };
    const currentCounts = { wP: 0, wN: 0, wB: 0, wR: 0, wQ: 0, bP: 0, bN: 0, bB: 0, bR: 0, bQ: 0 };

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = gameBoard[r] && gameBoard[r][c];
            if (p && currentCounts[p] !== undefined) currentCounts[p]++;
        }
    }

    const whiteIcons = { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕' };
    const blackIcons = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛' };
    const vals = { P: 1, N: 3, B: 3, R: 5, Q: 9 };

    let whiteCapturedStr = '';
    let blackCapturedStr = '';
    let whiteMatScore = 0;
    let blackMatScore = 0;

    ['Q', 'R', 'B', 'N', 'P'].forEach(t => {
        const lostBlack = Math.max(0, startCounts['b' + t] - currentCounts['b' + t]);
        const lostWhite = Math.max(0, startCounts['w' + t] - currentCounts['w' + t]);
        if (lostBlack > 0) whiteCapturedStr += blackIcons[t].repeat(lostBlack) + ' ';
        if (lostWhite > 0) blackCapturedStr += whiteIcons[t].repeat(lostWhite) + ' ';
        whiteMatScore += lostBlack * vals[t];
        blackMatScore += lostWhite * vals[t];
    });

    const diff = whiteMatScore - blackMatScore;
    if (diff > 0) whiteCapturedStr += `<span class="text-[#81b64c] font-black ml-1">+${diff}</span>`;
    if (diff < 0) blackCapturedStr += `<span class="text-[#81b64c] font-black ml-1">+${Math.abs(diff)}</span>`;

    const bottomCapEl = document.getElementById('bottomCaptured');
    const topCapEl = document.getElementById('topCaptured');
    if (bottomCapEl && topCapEl) {
        bottomCapEl.innerHTML = myColor === 'w' ? whiteCapturedStr : blackCapturedStr;
        topCapEl.innerHTML = myColor === 'w' ? blackCapturedStr : whiteCapturedStr;
    }

    const moveListEl = document.getElementById('desktopMoveList');
    const counterBadge = document.getElementById('moveCounterBadge');
    if (counterBadge) counterBadge.innerText = `${moveHistory.length}`;

    if (moveListEl) {
        if (moveHistory.length === 0) {
            moveListEl.innerHTML = '<p class="text-gray-500 text-center py-6">Čeká se na první tah.</p>';
        } else {
            moveListEl.innerHTML = moveHistory.map((m, idx) => `
                <div class="flex items-center justify-between bg-[#191816] px-2.5 py-1.5 rounded border border-[#32302c]">
                    <span class="text-gray-500 font-mono text-[10px]">#${idx + 1}</span>
                    <span class="text-gray-200 font-semibold truncate ml-2">${m}</span>
                </div>
            `).join('');
            moveListEl.scrollTop = moveListEl.scrollHeight;
        }
    }
}

function setPremove(from, to, promo = 'Q') {
    queuedPremove = { from, to, promo };
    premoveSourceSelected = null;
    playSound('premove');
    const ind = document.getElementById('premoveIndicator');
    if (ind) ind.classList.remove('hidden');
    renderBoard(null);
}

window.clearPremove = function() {
    queuedPremove = null;
    premoveSourceSelected = null;
    const ind = document.getElementById('premoveIndicator');
    if (ind) ind.classList.add('hidden');
};

function getPseudoPremoveTargets(r, c, color, board) {
    const piece = board[r][c];
    if (!piece || piece[0] !== color) return [];
    const type = piece[1];
    const targets = [];

    for (let nr = 0; nr < 8; nr++) {
        for (let nc = 0; nc < 8; nc++) {
            if (nr === r && nc === c) continue;
            const dr = nr - r;
            const dc = nc - c;
            const adr = Math.abs(dr);
            const adc = Math.abs(dc);

            if (type === 'P') {
                const dir = color === 'w' ? -1 : 1;
                const startRow = color === 'w' ? 6 : 1;
                if (dc === 0 && dr === dir) targets.push({ r: nr, c: nc });
                else if (dc === 0 && r === startRow && dr === 2 * dir) targets.push({ r: nr, c: nc });
                else if (adc === 1 && dr === dir) targets.push({ r: nr, c: nc });
            } else if (type === 'N') {
                if ((adr === 2 && adc === 1) || (adr === 1 && adc === 2)) targets.push({ r: nr, c: nc });
            } else if (type === 'B') {
                if (adr === adc) targets.push({ r: nr, c: nc });
            } else if (type === 'R') {
                if (dr === 0 || dc === 0) targets.push({ r: nr, c: nc });
            } else if (type === 'Q') {
                if (dr === 0 || dc === 0 || adr === adc) targets.push({ r: nr, c: nc });
            } else if (type === 'K') {
                if (adr <= 1 && adc <= 1) targets.push({ r: nr, c: nc });
                else if (dr === 0 && adc === 2 && (r === 7 || r === 0)) targets.push({ r: nr, c: nc });
            }
        }
    }
    return targets;
}

function executeQueuedPremoveIfLegal() {
    if (!queuedPremove) return;
    const pm = queuedPremove;
    clearPremove();

    const piece = gameBoard[pm.from.r] && gameBoard[pm.from.r][pm.from.c];
    if (!piece || piece[0] !== myColor) {
        playSound('illegal');
        renderBoard(null);
        return;
    }

    const validMoves = getValidatedLegalMovesForColor(pm.from.r, pm.from.c, myColor, gameBoard, castlingRights, enPassantTarget);
    const isNowLegal = validMoves.some(m => m.r === pm.to.r && m.c === pm.to.c);

    if (isNowLegal) {
        animateSlideMove(pm.from, pm.to, piece, () => {
            executeMoveInternal(pm.from, pm.to, myColor, pm.promo || 'Q', false);
        });
    } else {
        playSound('illegal');
        renderBoard(null);
    }
}

function getSquareElement(row, col) {
    const boardEl = document.getElementById('chessBoard');
    if (!boardEl) return null;
    return boardEl.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

function animateSlideMove(from, to, pieceCode, onComplete) {
    if (!pieceCode || !pieceSVGs[pieceCode]) {
        if (onComplete) onComplete();
        return;
    }
    const fromSq = getSquareElement(from.r, from.c);
    const toSq = getSquareElement(to.r, to.c);
    if (!fromSq || !toSq) {
        if (onComplete) onComplete();
        return;
    }

    const fromRect = fromSq.getBoundingClientRect();
    const toRect = toSq.getBoundingClientRect();

    const origPiece = fromSq.querySelector('.piece');
    if (origPiece) origPiece.style.opacity = '0';

    const ghost = document.createElement('div');
    ghost.className = 'sliding-piece-ghost';
    ghost.style.backgroundImage = `url('${pieceSVGs[pieceCode]}')`;
    ghost.style.width = `${fromRect.width * 0.88}px`;
    ghost.style.height = `${fromRect.height * 0.88}px`;
    ghost.style.left = `${fromRect.left + fromRect.width * 0.06}px`;
    ghost.style.top = `${fromRect.top + fromRect.height * 0.06}px`;
    document.body.appendChild(ghost);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ghost.style.left = `${toRect.left + toRect.width * 0.06}px`;
            ghost.style.top = `${toRect.top + toRect.height * 0.06}px`;
        });
    });

    setTimeout(() => {
        ghost.remove();
        if (onComplete) onComplete();
    }, 225);
}

function renderBoard(lastMove) {
    const boardEl = document.getElementById('chessBoard');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const displayBoard = (currentViewIndex >= 0 && currentViewIndex < fullBoardSnapshots.length) 
        ? fullBoardSnapshots[currentViewIndex] 
        : gameBoard;

    const isViewingHistory = currentViewIndex !== fullBoardSnapshots.length - 1;

    const wKingPos = findKing('w', displayBoard);
    const bKingPos = findKing('b', displayBoard);
    const wInCheck = isInCheck('w', displayBoard) ? wKingPos : null;
    const bInCheck = isInCheck('b', displayBoard) ? bKingPos : null;

    const matedKingPos = (!isViewingHistory && checkmatedColor)
        ? (checkmatedColor === 'w' ? wKingPos : bKingPos)
        : null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const row = visualFlipped ? 7 - r : r;
            const col = visualFlipped ? 7 - c : c;

            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;

            if (!isViewingHistory && lastMove && ((lastMove.from.r === row && lastMove.from.c === col) || (lastMove.to.r === row && lastMove.to.c === col))) {
                square.classList.add('last-move');
            }

            if (!isViewingHistory && selectedSquare && selectedSquare.r === row && selectedSquare.c === col) {
                square.classList.add('selected');
            }

            if (!isViewingHistory && queuedPremove && ((queuedPremove.from.r === row && queuedPremove.from.c === col) || (queuedPremove.to.r === row && queuedPremove.to.c === col))) {
                square.classList.add('premove-sq');
            }
            if (!isViewingHistory && premoveSourceSelected && premoveSourceSelected.r === row && premoveSourceSelected.c === col) {
                square.classList.add('premove-sq');
            }

            if (matedKingPos && matedKingPos.r === row && matedKingPos.c === col) {
                square.classList.add('checkmate-king');
            } else if ((wInCheck && wInCheck.r === row && wInCheck.c === col) || (bInCheck && bInCheck.r === row && bInCheck.c === col)) {
                square.classList.add('in-check');
            }

            if (col === (visualFlipped ? 7 : 0)) {
                const rankLabel = document.createElement('span');
                rankLabel.className = 'coord-label coord-rank';
                rankLabel.innerText = 8 - row;
                square.appendChild(rankLabel);
            }
            if (row === (visualFlipped ? 0 : 7)) {
                const fileLabel = document.createElement('span');
                fileLabel.className = 'coord-label coord-file';
                fileLabel.innerText = String.fromCharCode(97 + col);
                square.appendChild(fileLabel);
            }

            const piece = displayBoard[row][col];
            if (piece) {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = 'piece';
                pieceDiv.style.backgroundImage = `url('${pieceSVGs[piece]}')`;
                
                if (!isViewingHistory && piece[0] === myColor && gameStatus === 'playing') {
                    pieceDiv.addEventListener('pointerdown', (e) => handlePiecePointerDown(e, row, col, piece, pieceDiv));
                }
                square.appendChild(pieceDiv);
            }

            if (!isViewingHistory && gameStatus === 'playing' && myTurn) {
                const isLegal = legalMoves.some(m => m.r === row && m.c === col);
                if (isLegal) {
                    const isOpponentPiece = piece && piece[0] !== myColor;
                    const isEnPassantCapture = enPassantTarget && enPassantTarget.r === row && enPassantTarget.c === col && selectedSquare && gameBoard[selectedSquare.r][selectedSquare.c][1] === 'P';

                    if (isOpponentPiece || isEnPassantCapture) {
                        const ring = document.createElement('div');
                        ring.className = 'capture-ring';
                        square.appendChild(ring);
                    } else if (!piece) {
                        const dot = document.createElement('div');
                        dot.className = 'move-dot';
                        square.appendChild(dot);
                    }
                }
            }

            square.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (queuedPremove || premoveSourceSelected) {
                    clearPremove();
                    renderBoard(null);
                }
            });

            square.addEventListener('click', () => {
                if (!isViewingHistory && gameStatus === 'playing') handleSquareClick(row, col);
            });

            boardEl.appendChild(square);
        }
    }
}

function handlePiecePointerDown(e, r, c, pieceCode, pieceEl) {
    if (gameStatus !== 'playing' || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (myTurn) {
        selectedSquare = { r, c };
        legalMoves = getValidatedLegalMovesForColor(r, c, myColor, gameBoard, castlingRights, enPassantTarget);
        renderBoard(null);
    } else {
        if (queuedPremove) clearPremove();
        premoveSourceSelected = { r, c };
        renderBoard(null);
    }

    const freshSq = getSquareElement(r, c);
    const freshPieceEl = freshSq ? freshSq.querySelector('.piece') : pieceEl;
    const rect = freshSq ? freshSq.getBoundingClientRect() : pieceEl.getBoundingClientRect();

    activeDragState = {
        from: { r, c },
        pieceCode,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false,
        ghostEl: null,
        sourceEl: freshPieceEl,
        size: rect.width * 0.92,
        hoveredSqEl: null
    };
}

window.addEventListener('pointermove', (e) => {
    if (!activeDragState) return;
    const dx = e.clientX - activeDragState.startX;
    const dy = e.clientY - activeDragState.startY;

    if (!activeDragState.hasMoved && Math.hypot(dx, dy) > 5) {
        activeDragState.hasMoved = true;
        if (activeDragState.sourceEl) activeDragState.sourceEl.style.opacity = '0.22';

        const ghost = document.createElement('div');
        ghost.className = 'floating-drag-piece';
        ghost.style.backgroundImage = `url('${pieceSVGs[activeDragState.pieceCode]}')`;
        ghost.style.width = `${activeDragState.size}px`;
        ghost.style.height = `${activeDragState.size}px`;
        document.body.appendChild(ghost);
        activeDragState.ghostEl = ghost;
    }

    if (activeDragState.hasMoved && activeDragState.ghostEl) {
        activeDragState.ghostEl.style.left = `${e.clientX}px`;
        activeDragState.ghostEl.style.top = `${e.clientY}px`;

        if (activeDragState.hoveredSqEl) {
            activeDragState.hoveredSqEl.classList.remove('drag-over-target');
            activeDragState.hoveredSqEl = null;
        }
        const underEl = document.elementFromPoint(e.clientX, e.clientY);
        const sqEl = underEl ? underEl.closest('.square') : null;
        if (sqEl) {
            sqEl.classList.add('drag-over-target');
            activeDragState.hoveredSqEl = sqEl;
        }
    }
});

window.addEventListener('pointerup', (e) => {
    if (!activeDragState) return;
    const state = activeDragState;
    activeDragState = null;

    if (state.hoveredSqEl) state.hoveredSqEl.classList.remove('drag-over-target');
    if (state.ghostEl) state.ghostEl.remove();

    if (!state.hasMoved) {
        if (state.sourceEl) state.sourceEl.style.opacity = '1';
        return;
    }

    const underEl = document.elementFromPoint(e.clientX, e.clientY);
    const sqEl = underEl ? underEl.closest('.square') : null;

    if (sqEl && sqEl.dataset.row !== undefined && sqEl.dataset.col !== undefined) {
        const toR = parseInt(sqEl.dataset.row);
        const toC = parseInt(sqEl.dataset.col);

        if (myTurn) {
            const isLegal = legalMoves.some(m => m.r === toR && m.c === toC);
            if (isLegal) {
                selectedSquare = null;
                legalMoves = [];
                initiatePlayerMove(state.from, { r: toR, c: toC }, false);
                return;
            } else if (toR !== state.from.r || toC !== state.from.c) {
                playSound('illegal');
            }
        } else {
            const pseudoTargets = getPseudoPremoveTargets(state.from.r, state.from.c, myColor, gameBoard);
            if (pseudoTargets.some(t => t.r === toR && t.c === toC)) {
                setPremove(state.from, { r: toR, c: toC }, 'Q');
                return;
            } else if (toR !== state.from.r || toC !== state.from.c) {
                clearPremove();
                playSound('illegal');
            }
        }
    }

    if (state.sourceEl) state.sourceEl.style.opacity = '1';
    renderBoard(null);
});

function handleSquareClick(r, c) {
    if (gameStatus !== 'playing') return;

    const clickedPiece = gameBoard[r][c];

    if (!myTurn) {
        if (queuedPremove && !premoveSourceSelected) {
            clearPremove();
            renderBoard(null);
            return;
        }
        if (premoveSourceSelected) {
            if (premoveSourceSelected.r === r && premoveSourceSelected.c === c) {
                clearPremove();
                renderBoard(null);
                return;
            }
            const pseudoTargets = getPseudoPremoveTargets(premoveSourceSelected.r, premoveSourceSelected.c, myColor, gameBoard);
            if (pseudoTargets.some(t => t.r === r && t.c === c)) {
                setPremove(premoveSourceSelected, { r, c }, 'Q');
                return;
            } else {
                clearPremove();
                playSound('illegal');
                renderBoard(null);
                return;
            }
        }
        if (clickedPiece && clickedPiece[0] === myColor) {
            premoveSourceSelected = { r, c };
            renderBoard(null);
        }
        return;
    }

    if (selectedSquare) {
        const move = legalMoves.find(m => m.r === r && m.c === c);
        if (move) {
            const from = { ...selectedSquare };
            selectedSquare = null;
            legalMoves = [];
            initiatePlayerMove(from, { r, c }, true);
            return;
        } else if (!clickedPiece || clickedPiece[0] !== myColor) {
            if (selectedSquare.r !== r || selectedSquare.c !== c) {
                playSound('illegal');
            }
        }
    }

    if (clickedPiece && clickedPiece[0] === myColor) {
        selectedSquare = { r, c };
        legalMoves = getValidatedLegalMovesForColor(r, c, myColor, gameBoard, castlingRights, enPassantTarget);
    } else {
        selectedSquare = null;
        legalMoves = [];
    }
    renderBoard(null);
}

function initiatePlayerMove(from, to, withSlideAnimation) {
    const movingPiece = gameBoard[from.r][from.c];
    if (movingPiece && movingPiece[1] === 'P' && (to.r === 0 || to.r === 7)) {
        openPromotionModal(myColor, (chosenType) => {
            if (withSlideAnimation) {
                animateSlideMove(from, to, movingPiece, () => {
                    executeMoveInternal(from, to, myColor, chosenType, false);
                });
            } else {
                executeMoveInternal(from, to, myColor, chosenType, false);
            }
        });
        return;
    }

    if (withSlideAnimation) {
        animateSlideMove(from, to, movingPiece, () => {
            executeMoveInternal(from, to, myColor, 'Q', false);
        });
    } else {
        executeMoveInternal(from, to, myColor, 'Q', false);
    }
}

function openPromotionModal(color, onSelect) {
    const container = document.getElementById('promotionChoices');
    if (!container) {
        onSelect('Q');
        return;
    }

    const types = [
        { code: 'Q', label: 'Dáma' },
        { code: 'R', label: 'Věž' },
        { code: 'B', label: 'Střelec' },
        { code: 'N', label: 'Jezdec' }
    ];

    container.innerHTML = '';
    types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'bg-[#191816] hover:bg-[#322f2b] border border-[#3d3b38] hover:border-[#81b64c] rounded-xl p-2 flex flex-col items-center gap-1 transition-all';
        btn.innerHTML = `
            <img src="${pieceSVGs[color + t.code]}" class="w-12 h-12 object-contain" alt="${t.label}">
            <span class="text-[10px] font-bold text-gray-200">${t.label}</span>
        `;
        btn.onclick = () => {
            closeModalEl('promotionModal');
            onSelect(t.code);
        };
        container.appendChild(btn);
    });

    openModalEl('promotionModal');
}

function simulateMoveOnBoard(board, from, to, epTarget, promoType = 'Q') {
    const newBoard = board.map(row => [...row]);
    const movingPiece = newBoard[from.r][from.c];
    if (!movingPiece) return newBoard;

    const movingColor = movingPiece[0];
    let finalPiece = movingPiece;

    if (movingPiece[1] === 'P' && (to.r === 0 || to.r === 7)) {
        finalPiece = movingColor + (promoType || 'Q');
    }

    newBoard[from.r][from.c] = '';
    newBoard[to.r][to.c] = finalPiece;

    if (movingPiece[1] === 'K' && Math.abs(to.c - from.c) === 2) {
        const row = from.r;
        if (to.c === 6) {
            newBoard[row][7] = '';
            newBoard[row][5] = movingColor + 'R';
        } else if (to.c === 2) {
            newBoard[row][0] = '';
            newBoard[row][3] = movingColor + 'R';
        }
    }

    if (movingPiece[1] === 'P' && epTarget && to.r === epTarget.r && to.c === epTarget.c) {
        newBoard[from.r][to.c] = '';
    }

    return newBoard;
}

function isSquareAttacked(targetR, targetC, attackerColor, board) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p[0] === attackerColor) {
                const rawMoves = getRawPieceMoves(r, c, board, attackerColor, null);
                if (rawMoves.some(m => m.r === targetR && m.c === targetC)) return true;
            }
        }
    }
    return false;
}

function findKing(color, board) {
    if (!board || !board.length) return null;
    const kP = color + 'K';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kP) return { r, c };
        }
    }
    return null;
}

function isInCheck(color, board) {
    const kingPos = findKing(color, board);
    if (!kingPos) return false;
    const oppColor = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(kingPos.r, kingPos.c, oppColor, board);
}

function getValidatedLegalMovesForColor(r, c, color, board, castling, epTarget) {
    const rawMoves = getRawPieceMoves(r, c, board, color, epTarget);
    const validMoves = [];

    rawMoves.forEach(m => {
        const testBoard = simulateMoveOnBoard(board, { r, c }, m, epTarget, 'Q');
        if (!isInCheck(color, testBoard)) {
            validMoves.push(m);
        }
    });

    const piece = board[r][c];
    if (piece === color + 'K' && !isInCheck(color, board)) {
        const row = color === 'w' ? 7 : 0;
        if (r === row && c === 4) {
            const oppColor = color === 'w' ? 'b' : 'w';
            
            const canCastleShort = color === 'w' ? castling.wK : castling.bK;
            if (canCastleShort && board[row][5] === '' && board[row][6] === '' && board[row][7] === color + 'R') {
                if (!isSquareAttacked(row, 5, oppColor, board) && !isSquareAttacked(row, 6, oppColor, board)) {
                    validMoves.push({ r: row, c: 6, isCastleShort: true });
                }
            }

            const canCastleLong = color === 'w' ? castling.wQ : castling.bQ;
            if (canCastleLong && board[row][1] === '' && board[row][2] === '' && board[row][3] === '' && board[row][0] === color + 'R') {
                if (!isSquareAttacked(row, 2, oppColor, board) && !isSquareAttacked(row, 3, oppColor, board)) {
                    validMoves.push({ r: row, c: 2, isCastleLong: true });
                }
            }
        }
    }

    return validMoves;
}

function hasAnyLegalMove(color, board, castling, epTarget) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && board[r][c][0] === color) {
                const moves = getValidatedLegalMovesForColor(r, c, color, board, castling, epTarget);
                if (moves.length > 0) return true;
            }
        }
    }
    return false;
}

function isInsufficientMaterial(board) {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p[1] !== 'K') {
                pieces.push({ type: p[1], color: p[0], sqColor: (r + c) % 2 });
            }
        }
    }
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (pieces[0].type === 'B' || pieces[0].type === 'N')) return true;
    if (pieces.length === 2 && pieces[0].type === 'B' && pieces[1].type === 'B' && pieces[0].color !== pieces[1].color && pieces[0].sqColor === pieces[1].sqColor) {
        return true;
    }
    return false;
}

function getRawPieceMoves(r, c, board, color, epTarget) {
    const piece = board[r][c];
    if (!piece) return [];
    const type = piece[1];
    const moves = [];

    const addMove = (nr, nc) => {
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = board[nr][nc];
            if (!target) {
                moves.push({ r: nr, c: nc });
                return true;
            } else if (target[0] !== color) {
                moves.push({ r: nr, c: nc });
                return false;
            }
        }
        return false;
    };

    if (type === 'P') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;

        if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
            moves.push({ r: r + dir, c });
            if (r === startRow && !board[r + 2 * dir][c]) {
                moves.push({ r: r + 2 * dir, c });
            }
        }
        [-1, 1].forEach(dc => {
            if (c + dc >= 0 && c + dc < 8 && r + dir >= 0 && r + dir < 8) {
                const target = board[r + dir][c + dc];
                if (target && target[0] !== color) {
                    moves.push({ r: r + dir, c: c + dc });
                } else if (epTarget && epTarget.r === r + dir && epTarget.c === c + dc) {
                    moves.push({ r: r + dir, c: c + dc });
                }
            }
        });
    } else if (type === 'N') {
        const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (type === 'K') {
        const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (type === 'R' || type === 'B' || type === 'Q') {
        const dirs = [];
        if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);

        dirs.forEach(([dr, dc]) => {
            let step = 1;
            while (addMove(r + dr * step, c + dc * step)) step++;
        });
    }

    return moves;
}

function executeMoveInternal(from, to, movingColor, promoType = 'Q', animateSlide = false) {
    if (gameStatus !== 'playing') return;

    const movingPiece = gameBoard[from.r][from.c];
    const targetPiece = gameBoard[to.r][to.c];
    const isCastle = (movingPiece[1] === 'K' && Math.abs(to.c - from.c) === 2);
    const isPromote = (movingPiece[1] === 'P' && (to.r === 0 || to.r === 7));
    const isEnPassant = (movingPiece[1] === 'P' && enPassantTarget && to.r === enPassantTarget.r && to.c === enPassantTarget.c);
    const isCapture = targetPiece !== '' || isEnPassant;

    const newBoard = simulateMoveOnBoard(gameBoard, from, to, enPassantTarget, promoType);

    let newEnPassant = null;
    if (movingPiece[1] === 'P' && Math.abs(to.r - from.r) === 2) {
        newEnPassant = { r: (from.r + to.r) / 2, c: from.c };
    }

    const newCastling = { ...castlingRights };
    if (movingPiece === 'wK') { newCastling.wK = false; newCastling.wQ = false; }
    if (movingPiece === 'bK') { newCastling.bK = false; newCastling.bQ = false; }
    if ((from.r === 7 && from.c === 0) || (to.r === 7 && to.c === 0)) newCastling.wQ = false;
    if ((from.r === 7 && from.c === 7) || (to.r === 7 && to.c === 7)) newCastling.wK = false;
    if ((from.r === 0 && from.c === 0) || (to.r === 0 && to.c === 0)) newCastling.bQ = false;
    if ((from.r === 0 && from.c === 7) || (to.r === 0 && to.c === 7)) newCastling.bK = false;

    if (movingPiece[1] === 'P' || isCapture) halfMoveClock = 0;
    else halfMoveClock++;

    const oppColor = movingColor === 'w' ? 'b' : 'w';
    const isOppInCheck = isInCheck(oppColor, newBoard);
    const oppHasLegalMoves = hasAnyLegalMove(oppColor, newBoard, newCastling, newEnPassant);

    let nextStatus = 'playing';
    let winnerId = null;
    let endReason = null;

    if (!oppHasLegalMoves) {
        if (isOppInCheck) {
            nextStatus = 'won';
            winnerId = movingColor === myColor ? myId : (isBotGame ? 'bot_500' : opponentId);
            endReason = 'checkmate';
            checkmatedColor = oppColor;
        } else {
            nextStatus = 'draw';
            endReason = 'stalemate';
        }
    } else if (isInsufficientMaterial(newBoard)) {
        nextStatus = 'draw';
        endReason = 'insufficient';
    } else if (halfMoveClock >= 100) {
        nextStatus = 'draw';
        endReason = 'fifty_move';
    }

    let soundToPlay = movingColor === myColor ? 'move-self' : 'move-opponent';
    if (isCastle) soundToPlay = 'castle';
    else if (isPromote) soundToPlay = 'promote';
    else if (isCapture) soundToPlay = 'capture';

    if (nextStatus === 'won' && endReason === 'checkmate') {
        playCheckmateSound();
    } else if (isOppInCheck) {
        playSound('move-check');
    } else {
        playSound(soundToPlay);
        if (nextStatus === 'draw') {
            setTimeout(() => playSound('game-end'), 200);
        }
    }

    const pieceLetter = movingPiece[1] === 'P' ? '' : movingPiece[1];
    const captureMark = isCapture ? 'x' : '';
    const promoSuffix = isPromote ? `=${promoType}` : '';
    const checkSuffix = !oppHasLegalMoves && isOppInCheck ? '#' : (isOppInCheck ? '+' : '');
    const moveNotation = isCastle
        ? (to.c === 6 ? 'O-O' : 'O-O-O') + checkSuffix
        : `${pieceLetter}${captureMark}${String.fromCharCode(97 + to.c)}${8 - to.r}${promoSuffix}${checkSuffix}`;

    if (isBotGame) {
        const applyBotBoardState = () => {
            gameBoard = newBoard;
            myTurn = (oppColor === myColor);
            castlingRights = newCastling;
            enPassantTarget = newEnPassant;
            gameStatus = nextStatus;
            moveHistory.push(`${movingColor === myColor ? myNickname : opponentName}: ${moveNotation}`);
            fullBoardSnapshots.push(newBoard.map(row => [...row]));
            currentViewIndex = fullBoardSnapshots.length - 1;

            updateTurnIndicators();
            updateCapturedAndDesktopLog();
            renderBoard({ from, to });

            if (nextStatus === 'won' || nextStatus === 'draw') {
                stopClocks();
                clearPremove();
                triggerEndgameSequence({ status: nextStatus, winner: winnerId, reason: endReason });
            } else if (myTurn && queuedPremove) {
                setTimeout(() => executeQueuedPremoveIfLegal(), 90);
            } else if (!myTurn) {
                triggerBotMove();
            }
        };

        if (animateSlide) {
            animateSlideMove(from, to, movingPiece, applyBotBoardState);
        } else {
            applyBotBoardState();
        }
        return;
    }

    db.ref(`sachy/games/${activeGameId}`).transaction((game) => {
        if (!game || game.status !== 'playing') return;

        game.board = newBoard;
        game.turn = oppColor;
        game.lastMove = { from, to };
        game.lastSound = soundToPlay;
        game.castling = newCastling;
        game.enPassant = newEnPassant;
        game.status = nextStatus;
        if (winnerId) game.winner = winnerId;
        if (endReason) game.reason = endReason;
        if (!game.history) game.history = [];
        if (!game.snapshots) game.snapshots = [initialBoard];
        game.history.push(`${myNickname}: ${moveNotation}`);
        game.snapshots.push(newBoard);

        return game;
    });

    if (nextStatus === 'won') {
        recordMatchResult(myId, myNickname, opponentId, opponentName, '+');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '-');
    } else if (nextStatus === 'draw') {
        recordMatchResult(myId, myNickname, opponentId, opponentName, '=');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '=');
    }
}

window.toggleGameMenu = function() {
    document.getElementById('gameActionDropdown').classList.toggle('hidden');
};

window.toggleChatModal = function() {
    const el = document.getElementById('chatModal');
    if (el.classList.contains('hidden')) {
        openModalEl('chatModal');
        document.getElementById('chatBadge').classList.add('hidden');
    } else {
        closeModalEl('chatModal');
    }
};

window.navMove = function(direction) {
    if (fullBoardSnapshots.length === 0) return;
    if (direction === 'prev') currentViewIndex = Math.max(0, currentViewIndex - 1);
    else if (direction === 'next') currentViewIndex = Math.min(fullBoardSnapshots.length - 1, currentViewIndex + 1);
    renderBoard(null);
};

window.requestDraw = function() {
    const dropdown = document.getElementById('gameActionDropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) dropdown.classList.add('hidden');
    if (gameStatus !== 'playing') return;

    if (isBotGame) {
        if (Math.random() < 0.5) {
            playSound('game-end');
            gameStatus = 'draw';
            stopClocks();
            triggerEndgameSequence({ status: 'draw', reason: 'agreement' });
        } else {
            playSound('illegal');
            alert('Šachobot odmítl nabídku remízy!');
        }
        return;
    }

    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}/drawOffer`).set(myId);
        alert('Žádost o remízu byla odeslána.');
    }
};

window.respondDraw = function(accepted) {
    closeModalEl('drawModal');
    if (!activeGameId || gameStatus !== 'playing') return;

    if (accepted) {
        playSound('game-end');
        db.ref(`sachy/games/${activeGameId}`).update({ status: 'draw', reason: 'agreement', drawOffer: null });
        recordMatchResult(myId, myNickname, opponentId, opponentName, '=');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '=');
    } else {
        db.ref(`sachy/games/${activeGameId}/drawOffer`).remove();
    }
};

window.surrenderGame = function() {
    const dropdown = document.getElementById('gameActionDropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) dropdown.classList.add('hidden');
    if (gameStatus !== 'playing') return;

    if (confirm('Opravdu chceš zápas vzdát?')) {
        playSound('game-end');
        if (isBotGame) {
            gameStatus = 'won';
            stopClocks();
            triggerEndgameSequence({ status: 'won', winner: 'bot_500', reason: 'surrender' });
            return;
        }

        if (activeGameId) {
            db.ref(`sachy/games/${activeGameId}`).update({
                status: 'won',
                winner: opponentId,
                reason: 'surrender'
            });
            recordMatchResult(opponentId, opponentName, myId, myNickname, '+');
            recordMatchResult(myId, myNickname, opponentId, opponentName, '-');
        }
    }
};

window.leaveToLobbyDirect = function() {
    const dropdown = document.getElementById('gameActionDropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) dropdown.classList.add('hidden');

    if (gameStatus === 'playing') {
        if (confirm('Zápas stále probíhá! Pokud odejdeš, prohraješ kontumačně. Chceš odejít?')) {
            playSound('game-end');
            if (isBotGame) {
                gameStatus = 'won';
                stopClocks();
                exitGame();
                return;
            }

            if (activeGameId) {
                db.ref(`sachy/games/${activeGameId}`).update({
                    status: 'won',
                    winner: opponentId,
                    reason: 'left'
                });
                recordMatchResult(opponentId, opponentName, myId, myNickname, '+');
                recordMatchResult(myId, myNickname, opponentId, opponentName, '-');
            }
            exitGame();
        }
    } else {
        exitGame();
    }
};

function recordMatchResult(pId, pName, oppId, oppName, resultSymbol) {
    if (!pId) return;
    if (resultSymbol === '+') {
        db.ref(`sachy/streaks/${pId}`).transaction((current) => {
            if (!current) return { name: pName, class: myClass, photoURL: userPhotoURL || null, count: 1 };
            return { name: pName, class: myClass, photoURL: userPhotoURL || null, count: (current.count || 0) + 1 };
        });
    }
    db.ref(`sachy/history/${pId}`).push({
        result: resultSymbol,
        opponent: oppName,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function loadUserHistory() {
    db.ref(`sachy/history/${myId}`).limitToLast(10).on('value', (snapshot) => {
        const historyData = snapshot.val() || {};
        const historyEl = document.getElementById('userHistoryList');
        if (!historyEl) return;
        historyEl.innerHTML = '';

        const items = Object.values(historyData).reverse();
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#191816] p-2 rounded-lg border border-[#383632]';
            let badgeClass = 'text-gray-400';
            let label = 'Remíza';
            if (item.result === '+') { badgeClass = 'text-green-500 font-extrabold'; label = 'Výhra'; }
            if (item.result === '-') { badgeClass = 'text-red-500 font-extrabold'; label = 'Prohra'; }

            div.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="${badgeClass} text-sm">${item.result}</span>
                    <span>vs <strong>${item.opponent}</strong></span>
                </div>
                <span class="text-[10px] text-gray-500">${label}</span>
            `;
            historyEl.appendChild(div);
        });
        if (items.length === 0) historyEl.innerHTML = '<p class="text-gray-500 text-center py-2">Zatím žádné zápasy.</p>';
    });

    db.ref(`sachy/streaks/${myId}`).on('value', (snap) => {
        const val = snap.val();
        if (val && val.count) {
            document.getElementById('userStreakBadge').innerText = `${val.count} Výher`;
        }
    });
}

function listenLeaderboard() {
    db.ref('sachy/streaks').orderByChild('count').limitToLast(3).on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.values(data).sort((a,b) => b.count - a.count);

        const lbEl = document.getElementById('leaderboardList');
        if (!lbEl) return;
        lbEl.innerHTML = '';
        list.forEach((item, idx) => {
            const displayName = item.name || 'Šachista';
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#191816] p-2 rounded-xl border border-[#383632]';
            const classText = item.class ? ` (${item.class})` : '';
            const avatarHTML = getAvatarHTML(item.photoURL, 'w-6 h-6');

            div.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    <span class="font-extrabold ${idx===0?'text-yellow-400':idx===1?'text-gray-300':'text-amber-600'} text-sm">${idx + 1}.</span>
                    ${avatarHTML}
                    <span class="font-bold text-xs text-white truncate">${displayName}${classText}</span>
                </div>
                <strong class="text-[#81b64c] text-xs flex-shrink-0 ml-2">${item.count}</strong>
            `;
            lbEl.appendChild(div);
        });
    });
}

window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !activeGameId) return;

    if (isBotGame) {
        const chatEl = document.getElementById('chatMessages');
        const div1 = document.createElement('div');
        div1.className = 'border-b border-[#2d2b28] pb-1';
        div1.innerHTML = `<strong class="text-[#81b64c]">${myNickname}:</strong> ${msg}`;
        chatEl.appendChild(div1);

        setTimeout(() => {
            const botReplies = ["Hodně štěstí!", "Pěknej tah!", "Dobrá hra!", "Soustřeď se na figurky ;)"];
            const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
            const div2 = document.createElement('div');
            div2.className = 'border-b border-[#2d2b28] pb-1';
            div2.innerHTML = `<strong class="text-[#81b64c]">Šachobot:</strong> ${reply}`;
            chatEl.appendChild(div2);
            chatEl.scrollTop = chatEl.scrollHeight;
            playSound('notify');
        }, 700);

        input.value = '';
        return;
    }

    db.ref(`sachy/chats/${activeGameId}`).push({
        sender: myNickname,
        text: msg,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    input.value = '';
};

window.handleChatKeyPress = function(e) {
    if (e.key === 'Enter') window.sendChatMessage();
};

function listenChat() {
    const chatEl = document.getElementById('chatMessages');
    if (!chatEl || isBotGame) return;
    chatEl.innerHTML = '';
    db.ref(`sachy/chats/${activeGameId}`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.className = 'border-b border-[#2d2b28] pb-1';
        div.innerHTML = `<strong class="text-[#81b64c]">${msg.sender}:</strong> ${msg.text}`;
        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;

        if (msg.sender !== myNickname) {
            playSound('notify');
            if (document.getElementById('chatModal').classList.contains('hidden')) {
                document.getElementById('chatBadge').classList.remove('hidden');
            }
        }
    });
}

window.exitGame = function() {
    stopClocks();
    clearEndgameTimers();
    clearPremove();
    if (botTimerTimeout) clearTimeout(botTimerTimeout);

    if (activeGameId && !isBotGame && myId) {
        db.ref(`sachy/lobby/${myId}/status`).set('idle');
    }

    activeGameId = null;
    isBotGame = false;
    chatListenerRegistered = false;
    gameStatus = 'idle';
    gameOverSequenceStarted = false;
    checkmatedColor = null;

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('gameSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('flex');
    document.getElementById('endgameBanner').classList.add('hidden');
    closeModalEl('gameOverModal');
    closeModalEl('timeVoteModal');
    document.getElementById('lobbySection').classList.remove('hidden');
};