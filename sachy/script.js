// Konfigurace Firebase RTDB & OAuth Client ID
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

// Klasická šedá profilová ikona z nahraného obrázku (SVG Data URL)
const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23cccccc"/><circle cx="50" cy="36" r="18" fill="%23e6e6e6"/><path d="M 20 82 C 20 62, 35 55, 50 55 C 65 55, 80 62, 80 82 Z" fill="%23e6e6e6"/></svg>`;

function getAvatarHTML(photoURL, sizeClass = "w-7 h-7") {
    const url = photoURL || DEFAULT_AVATAR;
    return `<img src="${url}" class="${sizeClass} rounded-full object-cover border border-gray-500 shadow-sm">`;
}

let myId = 'user_' + Math.random().toString(36).substr(2, 9);
let myNickname = '';
let myClass = '';
let userPhotoURL = null;
let isGoogleUser = false;

let activeGameId = null;
let myColor = 'w';
let opponentId = null;
let opponentName = '';
let myTurn = false;
let gameStatus = 'idle';

let selectedSquare = null;
let legalMoves = [];
let gameBoard = [];
let moveHistory = [];
let fullBoardSnapshots = [];
let currentViewIndex = -1;
let chatListenerRegistered = false;

let draggedFromSquare = null;
let touchStartSquare = null;

let castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
let enPassantTarget = null;

let whiteTimeSeconds = 600;
let blackTimeSeconds = 600;
let timerInterval = null;

const sounds = {
    move: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_default/mp3/move-self.mp3'),
    capture: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_default/mp3/capture.mp3'),
    check: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_default/mp3/move-check.mp3'),
    castle: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_default/mp3/castle.mp3'),
    gameStart: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_default/mp3/game-start.mp3'),
    gameEnd: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_default/mp3/game-end.mp3')
};

function playSound(name) {
    if (sounds[name]) {
        sounds[name].currentTime = 0;
        sounds[name].play().catch(() => {});
    }
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

// Obnova relace z DB
auth.onAuthStateChanged((user) => {
    if (user) {
        myId = user.uid;
        isGoogleUser = true;

        db.ref(`sachy/users/${myId}`).once('value', (snap) => {
            const userData = snap.val();
            if (userData) {
                myNickname = userData.name || user.displayName || 'Šachista';
                myClass = userData.class || '';
                userPhotoURL = userData.photoURL || user.photoURL;
            } else {
                myNickname = user.displayName || 'Šachista';
                userPhotoURL = user.photoURL;
                saveUserProfileToDB();
            }

            const loginSec = document.getElementById('loginSection');
            if (loginSec && !loginSec.classList.contains('hidden')) enterLobby();
        });
    }
});

function saveUserProfileToDB() {
    if (!myId) return;
    db.ref(`sachy/users/${myId}`).update({
        name: myNickname,
        class: myClass,
        photoURL: userPhotoURL || null,
        isGoogle: isGoogleUser
    });
}

window.loginWithGoogle = function() {
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
                            userPhotoURL = user.photoURL;
                            isGoogleUser = true;
                            saveUserProfileToDB();
                            enterLobby();
                        }).catch(() => fallbackPopupLogin());
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
        userPhotoURL = user.photoURL;
        isGoogleUser = true;
        saveUserProfileToDB();
        enterLobby();
    }).catch(() => {
        const fallbackName = prompt("Zadej přezdívku:");
        if (fallbackName) {
            myNickname = fallbackName;
            isGoogleUser = false;
            enterLobby();
        }
    });
}

window.joinLobbyAnonymous = function() {
    const nameInput = document.getElementById('playerName').value.trim();
    if (!nameInput) {
        alert('Zadej prosím přezdívku!');
        return;
    }
    myNickname = nameInput;
    myClass = document.getElementById('playerClass').value;
    userPhotoURL = null; // Anonym používá výchozí šedou ikonku
    isGoogleUser = false;
    enterLobby();
};

function updateHeaderUI() {
    const classDisplay = myClass ? `(${myClass})` : '';
    const userDisplay = `${myNickname} ${classDisplay}`;
    
    document.getElementById('userInfoHeader').innerHTML = `
        ${getAvatarHTML(userPhotoURL, 'w-6 h-6')}
        <span>${userDisplay}</span>
    `;

    if (isGoogleUser) {
        document.getElementById('btnCommunity').classList.remove('hidden');
    }
}

// ----------------------------------------------------
// OPRAVENÁ ÚPRAVA PROFILU S GARANTOVANÝM UKLÁDÁNÍM FOTKY
// ----------------------------------------------------
window.openProfileModal = function() {
    if (!isGoogleUser) {
        alert('Anonymní uživatelé si nemohou upravovat profil. Přihlas se přes Google!');
        return;
    }
    document.getElementById('editNicknameInput').value = myNickname;
    document.getElementById('editClassInput').value = myClass;
    const modal = document.getElementById('profileModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeProfileModal = function() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.saveProfileChanges = function() {
    const newName = document.getElementById('editNicknameInput').value.trim();
    if (!newName) {
        alert('Přezdívka nemůže být prázdná!');
        return;
    }
    myNickname = newName;
    myClass = document.getElementById('editClassInput').value;

    const fileInput = document.getElementById('editAvatarInput');
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            userPhotoURL = e.target.result; // Nahraný Base64 obrázek
            commitProfileToFirebase();
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        commitProfileToFirebase();
    }
};

function commitProfileToFirebase() {
    closeProfileModal();
    updateHeaderUI();

    // 1. Trvalé uložení v DB
    saveUserProfileToDB();

    // 2. Aktualizace stavu v Lobby
    db.ref(`sachy/lobby/${myId}`).update({
        name: myNickname,
        class: myClass,
        photoURL: userPhotoURL || null
    });

    // 3. Aktualizace jména a fotky v Žebříčku výher
    db.ref(`sachy/streaks/${myId}`).once('value', (snap) => {
        if (snap.exists()) {
            db.ref(`sachy/streaks/${myId}`).update({
                name: myNickname,
                class: myClass,
                photoURL: userPhotoURL || null
            });
        }
    });

    alert('Profil byl úspěšně uložen!');
}

function enterLobby() {
    updateHeaderUI();

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('hidden');

    const userRef = db.ref(`sachy/lobby/${myId}`);
    userRef.set({
        name: myNickname,
        class: myClass,
        photoURL: userPhotoURL || null,
        isGoogle: isGoogleUser,
        status: 'idle',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    userRef.onDisconnect().remove();

    listenLobby();
    listenInvites();
    listenLeaderboard();
    if (isGoogleUser) {
        loadUserHistory();
        listenFriendRequests();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) joinGameByCodeString(joinCode);
}

window.logoutUser = function() {
    db.ref(`sachy/lobby/${myId}`).remove();
    if (isGoogleUser) auth.signOut();
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
            count++;

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2.5 rounded border border-[#3d3b38]';
            
            const avatarHTML = getAvatarHTML(u.photoURL, 'w-7 h-7');

            const infoSpan = document.createElement('div');
            infoSpan.className = 'flex items-center gap-2';
            infoSpan.innerHTML = `${avatarHTML} <span class="font-bold text-xs md:text-sm">${u.name} ${u.class ? '(' + u.class + ')' : ''}</span>`;
            
            const btnGroup = document.createElement('div');
            btnGroup.className = 'flex items-center gap-1.5';

            if (u.status === 'playing') {
                const playingBtn = document.createElement('button');
                playingBtn.className = 'bg-gray-600 text-xs px-3 py-1.5 rounded font-bold cursor-not-allowed opacity-60';
                playingBtn.innerText = 'Ve hře';
                playingBtn.disabled = true;
                btnGroup.appendChild(playingBtn);
            } else {
                const inviteBtn = document.createElement('button');
                inviteBtn.className = 'btn-chess text-xs px-3 py-1.5 rounded';
                inviteBtn.innerText = 'Vyzvat na šachy';
                inviteBtn.onclick = () => sendInvite(id);
                btnGroup.appendChild(inviteBtn);
            }

            if (isGoogleUser && u.isGoogle) {
                const addFriendBtn = document.createElement('button');
                addFriendBtn.className = 'btn-outline text-xs p-1.5 rounded text-blue-400 hover:border-blue-500';
                addFriendBtn.title = 'Poslat žádost o přátelství';
                addFriendBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>`;
                addFriendBtn.onclick = () => sendFriendRequest(id, u.name);
                btnGroup.appendChild(addFriendBtn);
            }

            div.appendChild(infoSpan);
            div.appendChild(btnGroup);
            listEl.appendChild(div);
        }

        if (badge) badge.innerText = count;
        if (count === 0) listEl.innerHTML = '<p class="text-gray-500 text-center py-8 text-xs">V lobby zatím nikdo není.</p>';
    });
}

// ----------------------------------------------------
// SYSTÉM PŘÁTEL (KOMUNITA)
// ----------------------------------------------------
function sendFriendRequest(targetId, targetName) {
    if (!isGoogleUser) {
        alert('Pro přidávání přátel se musíte přihlásit přes Google!');
        return;
    }
    db.ref(`sachy/friendRequests/${targetId}/${myId}`).set({
        fromId: myId,
        fromName: myNickname,
        fromPhoto: userPhotoURL || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    alert(`Žádost o přátelství odeslána uživateli ${targetName}!`);
}

function sendFriendRequestInGame() {
    window.toggleGameMenu();
    if (opponentId) sendFriendRequest(opponentId, opponentName);
}

function listenFriendRequests() {
    db.ref(`sachy/friendRequests/${myId}`).on('value', (snap) => {
        const reqs = snap.val() || {};
        const count = Object.keys(reqs).length;

        const badge = document.getElementById('friendReqBadge');
        const reqTabCount = document.getElementById('reqTabCount');

        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('hidden');
            if (reqTabCount) reqTabCount.innerText = `(${count})`;
        } else {
            badge.classList.add('hidden');
            if (reqTabCount) reqTabCount.innerText = '';
        }

        renderRequestsTab(reqs);
    });

    listenFriendsList();
}

function listenFriendsList() {
    db.ref(`sachy/friends/${myId}`).on('value', (snap) => {
        const friends = snap.val() || {};
        renderFriendsTab(friends);
    });
}

window.openCommunityModal = function() {
    document.getElementById('communityModal').classList.remove('hidden');
    document.getElementById('communityModal').classList.add('flex');
};

window.closeCommunityModal = function() {
    document.getElementById('communityModal').classList.add('hidden');
    document.getElementById('communityModal').classList.remove('flex');
};

window.switchCommunityTab = function(tab) {
    const fBtn = document.getElementById('tabFriendsBtn');
    const rBtn = document.getElementById('tabRequestsBtn');
    const fCont = document.getElementById('tabFriendsContent');
    const rCont = document.getElementById('tabRequestsContent');

    if (tab === 'friends') {
        fBtn.className = 'flex-1 py-2 text-[#81b64c] border-b-2 border-[#81b64c]';
        rBtn.className = 'flex-1 py-2 text-gray-400 hover:text-white';
        fCont.classList.remove('hidden');
        rCont.classList.add('hidden');
    } else {
        rBtn.className = 'flex-1 py-2 text-[#81b64c] border-b-2 border-[#81b64c]';
        fBtn.className = 'flex-1 py-2 text-gray-400 hover:text-white';
        rCont.classList.remove('hidden');
        fCont.classList.add('hidden');
    }
};

function renderFriendsTab(friends) {
    const container = document.getElementById('tabFriendsContent');
    if (!container) return;
    container.innerHTML = '';

    const fKeys = Object.keys(friends);
    if (fKeys.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-6">Zatím nemáš žádné přidané přátele.</p>';
        return;
    }

    fKeys.forEach(fId => {
        const f = friends[fId];
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2.5 rounded border border-[#3d3b38]';
        
        const avatarHTML = getAvatarHTML(f.photo, 'w-7 h-7');

        div.innerHTML = `
            <div class="flex items-center gap-2">
                ${avatarHTML}
                <span class="font-bold text-xs">${f.name}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick="sendInvite('${fId}')" class="btn-chess text-[11px] px-2.5 py-1 rounded">Vyzvat</button>
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
        container.innerHTML = '<p class="text-gray-500 text-center py-6">Žádné nové žádosti o přátelství.</p>';
        return;
    }

    rKeys.forEach(reqId => {
        const r = reqs[reqId];
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2.5 rounded border border-[#3d3b38]';
        
        const avatarHTML = getAvatarHTML(r.fromPhoto, 'w-7 h-7');

        div.innerHTML = `
            <div class="flex items-center gap-2">
                ${avatarHTML}
                <span class="font-bold text-xs">${r.fromName}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick="acceptFriendRequest('${r.fromId}', '${r.fromName}', '${r.fromPhoto || ''}')" class="btn-chess text-[11px] px-2 py-1 rounded">Přijmout</button>
                <button type="button" onclick="rejectFriendRequest('${r.fromId}')" class="bg-red-600 text-white text-[11px] px-2 py-1 rounded">Odmítnout</button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.acceptFriendRequest = function(friendId, friendName, friendPhoto) {
    db.ref(`sachy/friends/${myId}/${friendId}`).set({ name: friendName, photo: friendPhoto });
    db.ref(`sachy/friends/${friendId}/${myId}`).set({ name: myNickname, photo: userPhotoURL });
    db.ref(`sachy/friendRequests/${myId}/${friendId}`).remove();
};

window.rejectFriendRequest = function(friendId) {
    db.ref(`sachy/friendRequests/${myId}/${friendId}`).remove();
};

// ----------------------------------------------------
// SDÍLENÍ ODKAZU & QR KÓDY
// ----------------------------------------------------
window.shareGameLink = function() {
    const shareData = {
        title: 'chess.gjw - Online Šachy Studenstvo GJW',
        text: 'Pojď si se mnou zahrát šachy na gjwprostejov.com/sachy/',
        url: 'https://gjwprostejov.com/sachy/'
    };

    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else {
        navigator.clipboard.writeText('Pojď si se mnou zahrát šachy na https://gjwprostejov.com/sachy/');
        alert('Odkaz byl zkopírován do schránky!');
    }
};

window.openQRModal = function() {
    const matchId = 'chess_' + Math.random().toString(36).substr(2, 9);
    const joinURL = `https://gjwprostejov.com/sachy/?join=${matchId}`;
    
    const qrImg = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinURL)}" alt="QR Výzva" class="w-44 h-44 border border-gray-300">`;
    document.getElementById('qrImgBox').innerHTML = qrImg;
    document.getElementById('manualQrGameIdInput').value = matchId;

    const p1White = Math.random() < 0.5;
    db.ref(`sachy/games/${matchId}`).set({
        player1: { id: myId, name: myNickname, photo: userPhotoURL || null, color: p1White ? 'w' : 'b' },
        player2: { id: 'waiting', name: 'Čeká se...', photo: null, color: p1White ? 'b' : 'w' },
        board: initialBoard,
        turn: 'w',
        status: 'waiting_qr',
        votes: {},
        voteEndTime: Date.now() + 20000,
        timeLimit: 10,
        whiteTime: 600,
        blackTime: 600,
        lastMove: null,
        history: [],
        snapshots: [initialBoard],
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        enPassant: null
    });

    document.getElementById('qrModal').classList.remove('hidden');
    document.getElementById('qrModal').classList.add('flex');
};

window.closeQRModal = function() {
    document.getElementById('qrModal').classList.add('hidden');
    document.getElementById('qrModal').classList.remove('flex');
};

window.joinGameByCode = function() {
    const code = document.getElementById('manualQrGameIdInput').value.trim();
    if (code) joinGameByCodeString(code);
};

function joinGameByCodeString(gameId) {
    db.ref(`sachy/games/${gameId}`).once('value', (snap) => {
        const game = snap.val();
        if (game && (game.status === 'waiting_qr' || game.status === 'voting')) {
            db.ref(`sachy/games/${gameId}/player2`).set({
                id: myId,
                name: myNickname,
                photo: userPhotoURL || null,
                color: game.player1.color === 'w' ? 'b' : 'w'
            });
            db.ref(`sachy/games/${gameId}`).update({
                status: 'voting',
                voteEndTime: Date.now() + 20000
            });
            closeQRModal();
        } else {
            alert('Zápas s tímto kódem neexistuje nebo je již plný.');
        }
    });
}

function sendInvite(targetId) {
    db.ref(`sachy/invites/${targetId}`).set({
        fromId: myId,
        fromName: myNickname,
        fromPhoto: userPhotoURL || null
    });
}

function listenInvites() {
    db.ref(`sachy/invites/${myId}`).on('value', (snapshot) => {
        const invite = snapshot.val();
        const modal = document.getElementById('inviteModal');
        if (!modal) return;
        if (!invite) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            return;
        }

        window.currentInvite = invite;
        
        // Zobrazení fotky a jména v modalu výzvy
        document.getElementById('inviteAvatar').innerHTML = getAvatarHTML(invite.fromPhoto, 'w-16 h-16');
        document.getElementById('inviteText').innerText = `${invite.fromName} tě vyzývá na šachový zápas!`;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

window.acceptInvite = function() {
    const invite = window.currentInvite;
    if (!invite) return;

    db.ref(`sachy/invites/${myId}`).remove();
    document.getElementById('inviteModal').classList.add('hidden');

    const matchId = 'chess_' + Math.random().toString(36).substr(2, 9);
    const p1White = Math.random() < 0.5;

    db.ref(`sachy/games/${matchId}`).set({
        player1: { id: invite.fromId, name: invite.fromName, photo: invite.fromPhoto || null, color: p1White ? 'w' : 'b' },
        player2: { id: myId, name: myNickname, photo: userPhotoURL || null, color: p1White ? 'b' : 'w' },
        board: initialBoard,
        turn: 'w',
        status: 'voting',
        votes: {},
        voteEndTime: Date.now() + 20000,
        timeLimit: 10,
        whiteTime: 600,
        blackTime: 600,
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
    document.getElementById('inviteModal').classList.add('hidden');
};

db.ref('sachy/games').on('child_added', (snapshot) => {
    const game = snapshot.val();
    const gameId = snapshot.key;
    if (activeGameId === gameId) return;

    if (game && (game.player1.id === myId || (game.player2 && game.player2.id === myId))) {
        activeGameId = gameId;
        setupGameUI(game);
    }
});

function setupGameUI(game) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');

    const isP1 = game.player1.id === myId;
    myColor = isP1 ? game.player1.color : game.player2.color;
    opponentName = isP1 ? game.player2.name : game.player1.name;
    opponentId = isP1 ? game.player2.id : game.player1.id;

    const myPhoto = isP1 ? game.player1.photo : game.player2.photo;
    const oppPhoto = isP1 ? game.player2.photo : game.player1.photo;

    document.getElementById('bottomPlayerName').innerText = `${myNickname} (${myColor === 'w' ? 'Bílý ♔' : 'Černý ♚'})`;
    document.getElementById('topPlayerName').innerText = `${opponentName} (${myColor === 'w' ? 'Černý ♚' : 'Bílý ♔'})`;

    document.getElementById('bottomAvatar').innerHTML = getAvatarHTML(myPhoto, 'w-8 h-8');
    document.getElementById('topAvatar').innerHTML = getAvatarHTML(oppPhoto, 'w-8 h-8');

    listenGame();
    if (!chatListenerRegistered) {
        listenChat();
        chatListenerRegistered = true;
    }
}

function listenGame() {
    db.ref(`sachy/games/${activeGameId}`).on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) {
            exitGame();
            return;
        }

        gameStatus = game.status;
        gameBoard = game.board;
        myTurn = game.turn === myColor;
        moveHistory = game.history || [];
        fullBoardSnapshots = game.snapshots || [initialBoard];
        castlingRights = game.castling || { wK: true, wQ: true, bK: true, bQ: true };
        enPassantTarget = game.enPassant || null;

        const rematchVotes = game.rematchVotes || {};
        const count = Object.keys(rematchVotes).length;
        document.getElementById('rematchCount').innerText = `${count}/2`;
        if (rematchVotes[myId]) {
            document.getElementById('btnRematch').innerText = `Čeká se na soupeře (${count}/2)...`;
            document.getElementById('btnRematch').disabled = true;
        }

        if (game.status === 'voting') {
            handleVotingPhase(game);
        } else if (game.status === 'playing') {
            document.getElementById('timeVoteModal').classList.add('hidden');
            document.getElementById('gameOverModal').classList.add('hidden');
            
            whiteTimeSeconds = game.whiteTime || (game.timeLimit * 60);
            blackTimeSeconds = game.blackTime || (game.timeLimit * 60);
            updateTimersDisplay();
            startClocks();

            document.getElementById('btnSurrender').disabled = false;
            document.getElementById('btnDraw').disabled = false;

            const drawModal = document.getElementById('drawModal');
            if (game.drawOffer && game.drawOffer !== myId) {
                drawModal.classList.remove('hidden');
                drawModal.classList.add('flex');
            } else {
                drawModal.classList.add('hidden');
                drawModal.classList.remove('flex');
            }
        } else if (game.status === 'won' || game.status === 'draw') {
            stopClocks();
            document.getElementById('btnSurrender').disabled = true;
            document.getElementById('btnDraw').disabled = true;
            showGameOverModal(game);
        }

        currentViewIndex = fullBoardSnapshots.length - 1;
        renderBoard(game.lastMove);
    });
}

function handleVotingPhase(game) {
    const modal = document.getElementById('timeVoteModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const votes = game.votes || {};
    const myVote = votes[myId];
    
    const oppId = game.player1.id === myId ? game.player2.id : game.player1.id;
    const oppVote = votes[oppId];

    [3, 5, 10].forEach(t => {
        const btn = document.getElementById(`btnVote${t}`);
        const oppTag = document.getElementById(`oppVoteTag${t}`);

        if (myVote === t) {
            btn.className = 'w-full p-3 bg-[#81b64c] text-white border border-[#457524] rounded text-xs font-bold shadow-lg';
        } else {
            btn.className = 'w-full p-3 bg-[#1e1e1c] border border-[#3d3b38] rounded text-xs font-bold hover:border-[#81b64c]';
        }

        if (oppVote === t) {
            oppTag.classList.remove('hidden');
        } else {
            oppTag.classList.add('hidden');
        }
    });

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((game.voteEndTime - now) / 1000));
    document.getElementById('voteTimerSec').innerText = remaining;

    const vKeys = Object.keys(votes);
    if (vKeys.length === 2 && remaining > 0) {
        document.getElementById('voteStatusText').innerText = `Oba hráči odhlasovali! Vyhodnocuji...`;
    } else {
        document.getElementById('voteStatusText').innerText = `Probíhá hlasování o čase...`;
    }

    if (remaining <= 0 && game.status === 'voting') {
        finalizeTimeVote(game);
    }
}

window.voteTime = function(minutes) {
    if (!activeGameId) return;
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
            reel.style.top = `-${(spinStep % 3) * 90}px`;
        }, 100);

        setTimeout(() => {
            clearInterval(spinInterval);
            const targetOffset = chosenTime === 3 ? 0 : (chosenTime === 5 ? 90 : 180);
            reel.style.top = `-${targetOffset}px`;
            document.getElementById('slotMachineText').innerText = `Vylosovaný čas: ${chosenTime} minut!`;

            setTimeout(() => {
                slotArea.classList.add('hidden');
                startGameWithTime(chosenTime);
            }, 1600);
        }, 2200);
    }
}

function startGameWithTime(timeMin) {
    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}`).update({
            status: 'playing',
            timeLimit: timeMin,
            whiteTime: timeMin * 60,
            blackTime: timeMin * 60
        });
        playSound('gameStart');
    }
}

function startClocks() {
    stopClocks();
    timerInterval = setInterval(() => {
        if (gameStatus !== 'playing') return;

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
    const winningColor = losingColor === 'w' ? 'b' : 'w';
    db.ref(`sachy/games/${activeGameId}`).once('value', (snap) => {
        const g = snap.val();
        if (!g || g.status !== 'playing') return;

        const winnerId = g.player1.color === winningColor ? g.player1.id : g.player2.id;
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

    document.getElementById('bottomTimer').innerText = format(mySec);
    document.getElementById('topTimer').innerText = format(oppSec);
}

function showGameOverModal(game) {
    const modal = document.getElementById('gameOverModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const titleEl = document.getElementById('gameOverTitle');
    const descEl = document.getElementById('gameOverDesc');

    if (game.status === 'won') {
        const isWinner = game.winner === myId;
        if (isWinner) {
            titleEl.innerText = 'Vítězství!';
            descEl.innerText = game.reason === 'timeout' ? 'Soupeřovi vypršel čas.' : 'Vyhrál jsi matem nebo vzdáním soupeře!';
        } else {
            titleEl.innerText = 'Porážka';
            descEl.innerText = game.reason === 'timeout' ? 'Vypršel ti čas.' : `Vyhrál ${opponentName}.`;
        }
    } else {
        titleEl.innerText = 'Remíza';
        descEl.innerText = 'Zápas skončil nerozhodně.';
    }
}

window.voteRematch = function() {
    if (!activeGameId) return;
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

function renderBoard(lastMove) {
    const boardEl = document.getElementById('chessBoard');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const isFlipped = myColor === 'b';
    const displayBoard = (currentViewIndex >= 0 && currentViewIndex < fullBoardSnapshots.length) 
        ? fullBoardSnapshots[currentViewIndex] 
        : gameBoard;

    const isViewingHistory = currentViewIndex !== fullBoardSnapshots.length - 1;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const row = isFlipped ? 7 - r : r;
            const col = isFlipped ? 7 - c : c;

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

            if (col === (isFlipped ? 7 : 0)) {
                const rankLabel = document.createElement('span');
                rankLabel.className = 'coord-label coord-rank';
                rankLabel.innerText = 8 - row;
                square.appendChild(rankLabel);
            }
            if (row === (isFlipped ? 0 : 7)) {
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
                
                if (!isViewingHistory && piece[0] === myColor && myTurn && gameStatus === 'playing') {
                    pieceDiv.draggable = true;
                    pieceDiv.ondragstart = (e) => handleDragStart(e, row, col);
                    pieceDiv.ontouchstart = (e) => handleTouchStart(e, row, col);
                    pieceDiv.ontouchend = (e) => handleTouchEnd(e);
                }
                square.appendChild(pieceDiv);
            }

            if (!isViewingHistory && gameStatus === 'playing') {
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

            square.ondragover = (e) => e.preventDefault();
            square.ondrop = (e) => {
                e.preventDefault();
                if (!isViewingHistory && draggedFromSquare) handleDrop(row, col);
            };

            square.onclick = () => {
                if (!isViewingHistory && gameStatus === 'playing') handleSquareClick(row, col);
            };

            boardEl.appendChild(square);
        }
    }
}

function handleDragStart(e, r, c) {
    if (!myTurn || gameStatus !== 'playing') return;
    draggedFromSquare = { r, c };
    selectedSquare = { r, c };
    legalMoves = getValidatedLegalMoves(r, c);
    renderBoard();
    e.dataTransfer.setData('text/plain', JSON.stringify({ r, c }));
}

function handleDrop(toR, toC) {
    if (!draggedFromSquare || !myTurn || gameStatus !== 'playing') return;
    const move = legalMoves.find(m => m.r === toR && m.c === toC);
    if (move) {
        executeMove(draggedFromSquare, { r: toR, c: toC });
        selectedSquare = null;
        legalMoves = [];
    }
    draggedFromSquare = null;
}

function handleTouchStart(e, r, c) {
    if (!myTurn || gameStatus !== 'playing') return;
    touchStartSquare = { r, c };
    selectedSquare = { r, c };
    legalMoves = getValidatedLegalMoves(r, c);
    renderBoard();
}

function handleTouchEnd(e) {
    if (!touchStartSquare || !myTurn || gameStatus !== 'playing') return;
    const touch = e.changedTouches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const squareEl = targetEl ? targetEl.closest('.square') : null;

    if (squareEl && squareEl.dataset.row !== undefined && squareEl.dataset.col !== undefined) {
        const toR = parseInt(squareEl.dataset.row);
        const toC = parseInt(squareEl.dataset.col);
        const move = legalMoves.find(m => m.r === toR && m.c === toC);
        if (move) {
            executeMove(touchStartSquare, { r: toR, c: toC });
            selectedSquare = null;
            legalMoves = [];
        }
    }
    touchStartSquare = null;
}

function handleSquareClick(r, c) {
    if (!myTurn || gameStatus !== 'playing') return;

    const clickedPiece = gameBoard[r][c];

    if (selectedSquare) {
        const move = legalMoves.find(m => m.r === r && m.c === c);
        if (move) {
            executeMove(selectedSquare, { r, c });
            selectedSquare = null;
            legalMoves = [];
            return;
        }
    }

    if (clickedPiece && clickedPiece[0] === myColor) {
        selectedSquare = { r, c };
        legalMoves = getValidatedLegalMoves(r, c);
    } else {
        selectedSquare = null;
        legalMoves = [];
    }
    renderBoard();
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

function getValidatedLegalMoves(r, c) {
    const rawMoves = getRawPieceMoves(r, c, gameBoard, myColor, enPassantTarget);
    const validMoves = [];

    rawMoves.forEach(m => {
        const testBoard = gameBoard.map(row => [...row]);
        const piece = testBoard[r][c];
        testBoard[r][c] = '';
        testBoard[m.r][m.c] = piece;

        if (piece[1] === 'P' && enPassantTarget && m.r === enPassantTarget.r && m.c === enPassantTarget.c) {
            testBoard[r][m.c] = '';
        }

        if (!isInCheck(myColor, testBoard)) {
            validMoves.push(m);
        }
    });

    const piece = gameBoard[r][c];
    if (piece === myColor + 'K' && !isInCheck(myColor, gameBoard)) {
        const row = myColor === 'w' ? 7 : 0;
        if (r === row && c === 4) {
            const oppColor = myColor === 'w' ? 'b' : 'w';
            
            const canCastleShort = myColor === 'w' ? castlingRights.wK : castlingRights.bK;
            if (canCastleShort && gameBoard[row][5] === '' && gameBoard[row][6] === '' && gameBoard[row][7] === myColor + 'R') {
                if (!isSquareAttacked(row, 5, oppColor, gameBoard) && !isSquareAttacked(row, 6, oppColor, gameBoard)) {
                    validMoves.push({ r: row, c: 6, isCastleShort: true });
                }
            }

            const canCastleLong = myColor === 'w' ? castlingRights.wQ : castlingRights.bQ;
            if (canCastleLong && gameBoard[row][1] === '' && gameBoard[row][2] === '' && gameBoard[row][3] === '' && gameBoard[row][0] === myColor + 'R') {
                if (!isSquareAttacked(row, 2, oppColor, gameBoard) && !isSquareAttacked(row, 3, oppColor, gameBoard)) {
                    validMoves.push({ r: row, c: 2, isCastleLong: true });
                }
            }
        }
    }

    return validMoves;
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

function executeMove(from, to) {
    if (gameStatus !== 'playing') return;

    const movingPiece = gameBoard[from.r][from.c];
    const targetPiece = gameBoard[to.r][to.c];
    
    let finalPiece = movingPiece;
    let isCastle = false;

    if (movingPiece[1] === 'P' && (to.r === 0 || to.r === 7)) {
        finalPiece = myColor + 'Q';
    }

    const newBoard = gameBoard.map(row => [...row]);
    newBoard[from.r][from.c] = '';
    newBoard[to.r][to.c] = finalPiece;

    if (movingPiece[1] === 'K' && Math.abs(to.c - from.c) === 2) {
        isCastle = true;
        const row = from.r;
        if (to.c === 6) {
            newBoard[row][7] = '';
            newBoard[row][5] = myColor + 'R';
        } else if (to.c === 2) {
            newBoard[row][0] = '';
            newBoard[row][3] = myColor + 'R';
        }
    }

    if (movingPiece[1] === 'P' && enPassantTarget && to.r === enPassantTarget.r && to.c === enPassantTarget.c) {
        newBoard[from.r][to.c] = '';
    }

    let newEnPassant = null;
    if (movingPiece[1] === 'P' && Math.abs(to.r - from.r) === 2) {
        newEnPassant = { r: (from.r + to.r) / 2, c: from.c };
    }

    const newCastling = { ...castlingRights };
    if (movingPiece === 'wK') { newCastling.wK = false; newCastling.wQ = false; }
    if (movingPiece === 'bK') { newCastling.bK = false; newCastling.bQ = false; }
    if (from.r === 7 && from.c === 0) newCastling.wQ = false;
    if (from.r === 7 && from.c === 7) newCastling.wK = false;
    if (from.r === 0 && from.c === 0) newCastling.bQ = false;
    if (from.r === 0 && from.c === 7) newCastling.bK = false;

    const isCapture = targetPiece !== '' || (movingPiece[1] === 'P' && enPassantTarget && to.r === enPassantTarget.r && to.c === enPassantTarget.c);
    
    if (isCastle) playSound('castle');
    else playSound(isCapture ? 'capture' : 'move');

    const oppColor = myColor === 'w' ? 'b' : 'w';
    const isOppInCheck = isInCheck(oppColor, newBoard);
    if (isOppInCheck) playSound('check');

    let oppHasLegalMoves = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (newBoard[r][c] && newBoard[r][c][0] === oppColor) {
                const rawMoves = getRawPieceMoves(r, c, newBoard, oppColor, newEnPassant);
                for (let m of rawMoves) {
                    const testBoard = newBoard.map(row => [...row]);
                    testBoard[r][c] = '';
                    testBoard[m.r][m.c] = newBoard[r][c];
                    if (!isInCheck(oppColor, testBoard)) {
                        oppHasLegalMoves = true;
                        break;
                    }
                }
            }
            if (oppHasLegalMoves) break;
        }
    }

    let nextStatus = 'playing';
    let winnerId = null;

    if (!oppHasLegalMoves) {
        if (isOppInCheck) {
            nextStatus = 'won';
            winnerId = myId;
            playSound('gameEnd');
        } else {
            nextStatus = 'draw';
            playSound('gameEnd');
        }
    }

    const moveNotation = `${movingPiece[1]}${String.fromCharCode(97 + to.c)}${8 - to.r}${isOppInCheck ? '+' : ''}`;

    db.ref(`sachy/games/${activeGameId}`).transaction((game) => {
        if (!game || game.status !== 'playing') return;

        game.board = newBoard;
        game.turn = oppColor;
        game.lastMove = { from, to };
        game.castling = newCastling;
        game.enPassant = newEnPassant;
        game.status = nextStatus;
        if (winnerId) game.winner = winnerId;
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
    document.getElementById('chatModal').classList.toggle('hidden');
    document.getElementById('chatBadge').classList.add('hidden');
};

window.navMove = function(direction) {
    if (fullBoardSnapshots.length === 0) return;
    if (direction === 'prev') currentViewIndex = Math.max(0, currentViewIndex - 1);
    else if (direction === 'next') currentViewIndex = Math.min(fullBoardSnapshots.length - 1, currentViewIndex + 1);
    renderBoard(null);
};

window.requestDraw = function() {
    window.toggleGameMenu();
    if (gameStatus !== 'playing') return;
    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}/drawOffer`).set(myId);
        alert('Žádost o remízu byla odeslána.');
    }
};

window.respondDraw = function(accepted) {
    document.getElementById('drawModal').classList.add('hidden');
    if (!activeGameId || gameStatus !== 'playing') return;

    if (accepted) {
        db.ref(`sachy/games/${activeGameId}`).update({ status: 'draw', drawOffer: null });
        recordMatchResult(myId, myNickname, opponentId, opponentName, '=');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '=');
        playSound('gameEnd');
    } else {
        db.ref(`sachy/games/${activeGameId}/drawOffer`).remove();
    }
};

window.surrenderGame = function() {
    window.toggleGameMenu();
    if (gameStatus !== 'playing') {
        alert('Zápas již skončil, nelze se vzdát!');
        return;
    }

    if (confirm('Opravdu chceš zápas vzdát?')) {
        if (activeGameId) {
            db.ref(`sachy/games/${activeGameId}`).update({
                status: 'won',
                winner: opponentId,
                reason: 'surrender'
            });
            recordMatchResult(opponentId, opponentName, myId, myNickname, '+');
            recordMatchResult(myId, myNickname, opponentId, opponentName, '-');
            playSound('gameEnd');
        }
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
            div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2 rounded border border-[#3d3b38]';
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
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2.5 rounded border border-[#3d3b38]';
            const classText = item.class ? ` (${item.class})` : '';
            const avatarHTML = getAvatarHTML(item.photoURL, 'w-6 h-6');

            div.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-extrabold ${idx===0?'text-yellow-400':idx===1?'text-gray-300':'text-amber-600'} text-sm">${idx + 1}.</span>
                    ${avatarHTML}
                    <span class="font-bold text-xs md:text-sm">${item.name}${classText}</span>
                </div>
                <strong class="text-[#81b64c] text-xs md:text-sm">${item.count} výher</strong>
            `;
            lbEl.appendChild(div);
        });
    });
}

window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !activeGameId) return;

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
    if (!chatEl) return;
    chatEl.innerHTML = '';
    db.ref(`sachy/chats/${activeGameId}`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.className = 'border-b border-[#2d2b28] pb-1';
        div.innerHTML = `<strong class="text-[#81b64c]">${msg.sender}:</strong> ${msg.text}`;
        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;

        if (document.getElementById('chatModal').classList.contains('hidden')) {
            document.getElementById('chatBadge').classList.remove('hidden');
        }
    });
}

window.exitGame = function() {
    stopClocks();
    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}`).remove();
        db.ref(`sachy/lobby/${myId}/status`).set('idle');
        activeGameId = null;
        chatListenerRegistered = false;
        gameStatus = 'idle';
    }
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('gameSection').classList.add('hidden');
    document.getElementById('gameOverModal').classList.add('hidden');
    document.getElementById('timeVoteModal').classList.add('hidden');
    document.getElementById('lobbySection').classList.remove('hidden');
};