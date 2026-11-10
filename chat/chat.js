const firebaseConfig = { databaseURL: "https://gjw-chat-default-rtdb.europe-west1.firebasedatabase.app" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let isUserScrolledUp = false;
let unreadMessagesCount = 0;
let hasScrolledInitially = false;

function getDeviceFingerprint() {
    let fp = localStorage.getItem('gjw_device_fingerprint');
    if (!fp) {
        fp = 'device_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        localStorage.setItem('gjw_device_fingerprint', fp);
    }
    return fp;
}

let deviceFingerprint = getDeviceFingerprint();
let currentUser = localStorage.getItem('gjw_saved_user') || null;
let currentUserId = localStorage.getItem('gjw_saved_user_id') || null;
if (!currentUserId) {
    currentUserId = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('gjw_saved_user_id', currentUserId);
}

let isAdmin = sessionStorage.getItem('gjw_admin_session') === 'true';
let adminMode = sessionStorage.getItem('gjw_admin_mode') || 'observed';
let activeProfileUid = null;
let activeProfileName = null;
let restrictionInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('gjw_admin_session') === 'true') {
        isAdmin = true;
        currentUser = "admin (Admin)";
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('userSubtitle').innerText = currentUser;
        initChatListener();
    } else if (currentUser) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('userSubtitle').innerText = currentUser;
        initChatListener();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

db.ref('restrictions').on('value', snap => {
    const restrictions = snap.val() || {};
    let myRest = null;
    
    for (let uid in restrictions) {
        if (restrictions[uid].fingerprint === deviceFingerprint) {
            myRest = restrictions[uid];
            break;
        }
    }
    if (!myRest && restrictions[currentUserId]) {
        myRest = restrictions[currentUserId];
    }

    if (!myRest) {
        document.getElementById('bannedScreen').style.display = 'none';
        document.getElementById('mutedNoticeBox').classList.add('hidden');
        document.getElementById('activeInputControls').style.display = 'block';
        return;
    }

    if (myRest.kicked) {
        alert("Byl jsi vyhozen správcem!");
        db.ref('restrictions/' + (myRest.userId || currentUserId) + '/kicked').remove();
        handleLogout();
        return;
    }

    if (myRest.ban && (myRest.ban.permanent || Date.now() < myRest.ban.expiresAt)) {
        const ban = myRest.ban;
        document.getElementById('bannedReasonText').innerText = ban.reason || 'Bez důvodu';
        document.getElementById('bannedDurationText').innerText = ban.permanent ? 'Natrvalo' : `Do ${new Date(ban.expiresAt).toLocaleString()}`;
        
        const countContainer = document.getElementById('bannedCountdownContainer');
        const countTimer = document.getElementById('bannedCountdownTimer');

        if (!ban.permanent && ban.expiresAt) {
            countContainer.classList.remove('hidden');
            if (restrictionInterval) clearInterval(restrictionInterval);
            restrictionInterval = setInterval(() => {
                const rem = ban.expiresAt - Date.now();
                if (rem <= 0) { clearInterval(restrictionInterval); location.reload(); return; }
                const d = Math.floor(rem / 86400000);
                const h = Math.floor((rem % 86400000) / 3600000);
                const m = Math.floor((rem % 3600000) / 60000);
                const s = Math.floor((rem % 60000) / 1000);
                countTimer.innerText = `${d}d ${h}h ${m}m ${s}s`;
            }, 1000);
        }
        document.getElementById('bannedScreen').style.display = 'flex';
        return;
    }

    if (myRest.mute && (myRest.mute.permanent || Date.now() < myRest.mute.expiresAt)) {
        const mute = myRest.mute;
        const notice = document.getElementById('mutedNoticeBox');
        const timer = document.getElementById('mutedCountdownTimer');
        notice.classList.remove('hidden');
        document.getElementById('activeInputControls').style.display = 'none';

        if (!mute.permanent && mute.expiresAt) {
            if (restrictionInterval) clearInterval(restrictionInterval);
            restrictionInterval = setInterval(() => {
                const rem = mute.expiresAt - Date.now();
                if (rem <= 0) { clearInterval(restrictionInterval); location.reload(); return; }
                const m = Math.floor(rem / 60000);
                const s = Math.floor((rem % 60000) / 1000);
                timer.innerText = `${m}m ${s}s`;
            }, 1000);
        }
    } else {
        document.getElementById('mutedNoticeBox').classList.add('hidden');
        document.getElementById('activeInputControls').style.display = 'block';
    }
});

function handleLogin() {
    const nick = document.getElementById('loginNickname').value.trim();
    const cls = document.getElementById('loginClass').value;
    const err = document.getElementById('loginError');
    if (!nick) { err.innerText = "Zadej přezdívku!"; err.classList.remove('hidden'); return; }
    
    currentUser = nick + (cls ? ' (' + cls + ')' : '');
    localStorage.setItem('gjw_saved_user', currentUser);
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('userSubtitle').innerText = currentUser;

    db.ref('messages').push({
        userId: currentUserId,
        fingerprint: deviceFingerprint,
        user: currentUser,
        text: `${currentUser} vstoupil do chatu`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
    });
    initChatListener();
}

function handleLogout() {
    localStorage.removeItem('gjw_saved_user');
    sessionStorage.removeItem('gjw_admin_session');
    location.reload();
}

function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const isGhost = isAdmin && adminMode === 'hidden';

    db.ref('messages').push({
        userId: currentUserId,
        fingerprint: deviceFingerprint,
        user: currentUser,
        isAdmin: isAdmin && !isGhost,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    scrollToBottomSmooth();
}

function deleteMessage(firebaseKey) {
    if (!isAdmin) return;
    if (confirm("Opravdu smazat tuto zprávu?")) {
        db.ref('messages/' + firebaseKey).remove();
    }
}

function openUserProfileModal(uid, username) {
    if (!isAdmin) return;
    activeProfileUid = uid;
    activeProfileName = username;
    document.getElementById('profileUsernameTitle').innerText = username;
    document.getElementById('profileUserIdSub').innerText = 'ID: ' + uid;
    document.getElementById('userProfileModal').classList.remove('hidden');
    document.getElementById('userProfileModal').classList.add('flex');
}

function closeUserProfileModal() {
    document.getElementById('userProfileModal').classList.remove('flex');
    document.getElementById('userProfileModal').classList.add('hidden');
}

function actionKickActive() {
    if (!activeProfileUid) return;
    db.ref('presence/' + activeProfileUid).once('value', snap => {
        const pData = snap.val();
        const targetFp = pData ? pData.fingerprint : 'unknown_fp';

        db.ref('restrictions/' + activeProfileUid).set({
            kicked: true,
            fingerprint: targetFp,
            userId: activeProfileUid
        });
        alert("Uživatel byl vyhozen.");
        closeUserProfileModal();
    });
}

function actionMuteActive() {
    if (!activeProfileUid) return;
    const val = prompt("Zadejte délku ztlumení (např. 30s, 10m, 2h, 1d nebo 'perm' pro natrvalo):");
    if (!val) return;
    const ms = parseDuration(val);
    const permanent = val.toLowerCase() === 'perm';
    
    db.ref('presence/' + activeProfileUid).once('value', snap => {
        const pData = snap.val();
        const targetFp = pData ? pData.fingerprint : 'unknown_fp';

        db.ref('restrictions/' + activeProfileUid).update({
            mute: { permanent: permanent, expiresAt: permanent ? 0 : Date.now() + ms },
            fingerprint: targetFp,
            userId: activeProfileUid
        });
        alert("Uživatel byl ztlumen.");
        closeUserProfileModal();
    });
}

function actionBanActive() {
    if (!activeProfileUid) return;
    const val = prompt("Zadejte délku banu (např. 1h, 7d, 30d nebo 'perm' pro natrvalo):");
    if (!val) return;
    const reason = prompt("Zadejte důvod banu:") || "Porušení pravidel";
    const ms = parseDuration(val);
    const permanent = val.toLowerCase() === 'perm';

    db.ref('presence/' + activeProfileUid).once('value', snap => {
        const pData = snap.val();
        const targetFp = pData ? pData.fingerprint : 'unknown_fp';

        db.ref('restrictions/' + activeProfileUid).update({
            ban: { permanent: permanent, expiresAt: permanent ? 0 : Date.now() + ms, reason: reason, username: activeProfileName },
            fingerprint: targetFp,
            userId: activeProfileUid
        });
        alert("Uživatel byl zabanován.");
        closeUserProfileModal();
    });
}

function parseDuration(str) {
    str = str.toLowerCase().trim();
    if (str === 'perm') return 0;
    const num = parseInt(str);
    if (isNaN(num)) return 60000;
    if (str.includes('s')) return num * 1000;
    if (str.includes('m')) return num * 60000;
    if (str.includes('h')) return num * 3600000;
    if (str.includes('d')) return num * 86400000;
    if (str.includes('w')) return num * 604800000;
    if (str.includes('mo')) return num * 2592000000;
    return num * 60000;
}

// --- INSTAGRAM-LIKE SCROLL A IKONKY ---

function scrollToBottomInstant() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    isUserScrolledUp = false;
    unreadMessagesCount = 0;
    updateNewMessagesUI();
}

function scrollToBottomSmooth() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
    isUserScrolledUp = false;
    unreadMessagesCount = 0;
    updateNewMessagesUI();
}

function handleChatScroll() {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;

    const distanceToBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
    const scrollBtn = document.getElementById('scrollToBottomBtn');

    if (distanceToBottom > 120) {
        isUserScrolledUp = true;
        if (scrollBtn) scrollBtn.style.display = 'flex';
    } else {
        isUserScrolledUp = false;
        if (scrollBtn) scrollBtn.style.display = 'none';
        if (unreadMessagesCount > 0) {
            unreadMessagesCount = 0;
            updateNewMessagesUI();
        }
    }
}

function updateNewMessagesUI() {
    const badge = document.getElementById('newMessagesBadge');
    const countSpan = document.getElementById('newMessagesCount');
    
    if (!badge || !countSpan) return;

    if (isUserScrolledUp && unreadMessagesCount > 0) {
        countSpan.innerText = unreadMessagesCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function initChatListener() {
    db.ref('messages').on('value', (snapshot) => {
        const data = snapshot.val();
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        if (!data) { 
            document.getElementById('emptyState').classList.remove('hidden'); 
            return; 
        }
        document.getElementById('emptyState').classList.add('hidden');

        Object.entries(data).forEach(([key, msg]) => {
            const div = document.createElement('div');
            if (msg.isSystem) {
                div.className = "text-center text-gray-500 text-[11px] italic my-1 flex items-center justify-center gap-2";
                div.innerHTML = `<span>-- ${msg.text} --</span>`;
                if (isAdmin) {
                    const delBtn = document.createElement('button');
                    delBtn.innerText = "[smazat]";
                    delBtn.className = "text-red-600 cursor-pointer hover:underline text-[10px]";
                    delBtn.onclick = () => deleteMessage(key);
                    div.appendChild(delBtn);
                }
            } else {
                div.className = "bg-white border border-gray-300 p-2 rounded shadow-sm text-xs relative group";
                const nameHtml = msg.isAdmin 
                    ? `<span class="rainbow-admin cursor-pointer" onclick="openUserProfileModal('${msg.userId}', '${msg.user}')">${msg.user}</span>`
                    : `<span class="font-bold text-blue-900 cursor-pointer underline" onclick="openUserProfileModal('${msg.userId}', '${msg.user}')">${msg.user}</span>`;
                
                div.innerHTML = `<div class="flex justify-between text-[11px] mb-0.5"><span>${nameHtml}</span><span class="text-gray-400 font-normal">${msg.time}</span></div><div>${msg.text}</div>`;
                
                if (isAdmin) {
                    const delBtn = document.createElement('button');
                    delBtn.innerText = "Smazat";
                    delBtn.className = "absolute top-1 right-2 text-[10px] text-red-600 hidden group-hover:inline-block cursor-pointer bg-red-50 px-1 border border-red-200 rounded";
                    delBtn.onclick = () => deleteMessage(key);
                    div.appendChild(delBtn);
                }
            }
            messagesList.appendChild(div);
        });

        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) return;

        const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 120;

        if (!hasScrolledInitially) {
            setTimeout(scrollToBottomInstant, 50);
            hasScrolledInitially = true;
        } else if (!isUserScrolledUp || isAtBottom) {
            scrollToBottomInstant();
        } else {
            unreadMessagesCount++;
            updateNewMessagesUI();
        }
    });
}