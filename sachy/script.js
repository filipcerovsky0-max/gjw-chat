const firebaseConfig = { databaseURL: "https://gjw-chat-default-rtdb.europe-west1.firebasedatabase.app" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

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
let selectedSquare = null;
let legalMoves = [];
let gameBoard = [];
let moveHistory = [];
let chatListenerRegistered = false;

// Audio efekty z CDN Chess.com
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

// Originální figurky z Chess.com CDN (Neo Theme)
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

// Přihlášení přes Google Auth
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        const user = result.user;
        myId = user.uid;
        myNickname = user.displayName || 'Šachista';
        userPhotoURL = user.photoURL;
        isGoogleUser = true;

        const selClass = document.getElementById('playerClass').value;
        if (selClass) myClass = selClass;

        enterLobby();
    }).catch(err => {
        alert("Chyba při přihlášení přes Google: " + err.message);
    });
}

// Anonymní vstup
function joinLobbyAnonymous() {
    const nameInput = document.getElementById('playerName').value.trim();
    if (!nameInput) {
        alert('Zadej prosím svou přezdívku!');
        return;
    }
    myNickname = nameInput;
    myClass = document.getElementById('playerClass').value;
    isGoogleUser = false;

    enterLobby();
}

function enterLobby() {
    const userDisplay = `${myNickname} ${myClass ? '(' + myClass + ')' : ''}`;
    document.getElementById('userInfoHeader').innerHTML = userPhotoURL 
        ? `<img src="${userPhotoURL}" class="w-6 h-6 rounded-full border border-gray-400"> <span>${userDisplay}</span>`
        : `<span>${userDisplay}</span>`;

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'grid';

    const userRef = db.ref(`sachy/lobby/${myId}`);
    userRef.set({
        name: myNickname,
        class: myClass,
        photoURL: userPhotoURL,
        isGoogle: isGoogleUser,
        status: 'idle',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    userRef.onDisconnect().remove();

    listenLobby();
    listenInvites();
    listenLeaderboard();
}

function leaveLobby() {
    db.ref(`sachy/lobby/${myId}`).remove();
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
}

function listenLobby() {
    db.ref('sachy/lobby').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const listEl = document.getElementById('playersList');
        const badge = document.getElementById('onlineBadge');
        listEl.innerHTML = '';

        let count = 0;
        for (let id in users) {
            if (id === myId) continue;
            const u = users[id];
            count++;

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2.5 rounded border border-[#3d3b38]';
            
            const avatar = u.photoURL 
                ? `<img src="${u.photoURL}" class="w-7 h-7 rounded-full border">`
                : `<div class="w-7 h-7 rounded bg-gray-600 flex items-center justify-center font-bold text-xs">${u.name.substring(0, 2).toUpperCase()}</div>`;

            const infoSpan = document.createElement('div');
            infoSpan.className = 'flex items-center gap-2';
            infoSpan.innerHTML = `${avatar} <span class="font-bold text-xs md:text-sm">${u.name} ${u.class ? '(' + u.class + ')' : ''}</span>`;
            
            const btn = document.createElement('button');
            if (u.status === 'playing') {
                btn.className = 'bg-gray-600 text-xs px-3 py-1.5 rounded font-bold cursor-not-allowed opacity-60';
                btn.innerText = 'Ve hře';
                btn.disabled = true;
            } else {
                btn.className = 'btn-chess text-xs px-3 py-1.5 rounded';
                btn.innerText = 'Vyzvat na šachy';
                btn.onclick = () => sendInvite(id);
            }

            div.appendChild(infoSpan);
            div.appendChild(btn);
            listEl.appendChild(div);
        }

        badge.innerText = count;

        if (count === 0) {
            listEl.innerHTML = '<p class="text-gray-500 text-center py-8 text-xs md:text-sm">V lobby zatím nikdo další není.</p>';
        }
    });
}

function sendInvite(targetId) {
    db.ref(`sachy/invites/${targetId}`).set({
        fromId: myId,
        fromName: myNickname,
        fromPhoto: userPhotoURL
    });
}

function listenInvites() {
    db.ref(`sachy/invites/${myId}`).on('value', (snapshot) => {
        const invite = snapshot.val();
        if (!invite) {
            document.getElementById('inviteModal').style.display = 'none';
            return;
        }

        window.currentInvite = invite;
        document.getElementById('inviteText').innerText = `${invite.fromName} tě vyzývá na šachový zápas!`;
        document.getElementById('inviteModal').style.display = 'flex';
    });
}

function acceptInvite() {
    const invite = window.currentInvite;
    if (!invite) return;

    db.ref(`sachy/invites/${myId}`).remove();
    document.getElementById('inviteModal').style.display = 'none';

    const matchId = 'chess_' + Math.random().toString(36).substr(2, 9);
    const p1White = Math.random() < 0.5;

    db.ref(`sachy/games/${matchId}`).set({
        player1: { id: invite.fromId, name: invite.fromName, photo: invite.fromPhoto || null, color: p1White ? 'w' : 'b' },
        player2: { id: myId, name: myNickname, photo: userPhotoURL || null, color: p1White ? 'b' : 'w' },
        board: initialBoard,
        turn: 'w',
        status: 'playing',
        lastMove: null,
        history: [],
        lastMoveTime: firebase.database.ServerValue.TIMESTAMP
    });

    db.ref(`sachy/lobby/${invite.fromId}/status`).set('playing');
    db.ref(`sachy/lobby/${myId}/status`).set('playing');
}

function rejectInvite() {
    db.ref(`sachy/invites/${myId}`).remove();
    document.getElementById('inviteModal').style.display = 'none';
}

db.ref('sachy/games').on('child_added', (snapshot) => {
    const game = snapshot.val();
    const gameId = snapshot.key;
    if (activeGameId === gameId) return;

    if (game && (game.player1.id === myId || game.player2.id === myId)) {
        activeGameId = gameId;
        setupGameUI(game);
    }
});

function setupGameUI(game) {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'grid';

    const isP1 = game.player1.id === myId;
    myColor = isP1 ? game.player1.color : game.player2.color;
    opponentName = isP1 ? game.player2.name : game.player1.name;
    opponentId = isP1 ? game.player2.id : game.player1.id;

    const myPhoto = isP1 ? game.player1.photo : game.player2.photo;
    const oppPhoto = isP1 ? game.player2.photo : game.player1.photo;

    document.getElementById('bottomPlayerName').innerText = `${myNickname} (${myColor === 'w' ? 'Bílý ♔' : 'Černý ♚'})`;
    document.getElementById('topPlayerName').innerText = `${opponentName} (${myColor === 'w' ? 'Černý ♚' : 'Bílý ♔'})`;

    if (myPhoto) document.getElementById('bottomAvatar').innerHTML = `<img src="${myPhoto}" class="w-full h-full object-cover">`;
    if (oppPhoto) document.getElementById('topAvatar').innerHTML = `<img src="${oppPhoto}" class="w-full h-full object-cover">`;

    playSound('gameStart');
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
            alert('Zápas byl ukončen.');
            exitGame();
            return;
        }

        gameBoard = game.board;
        myTurn = game.turn === myColor;
        moveHistory = game.history || [];

        renderBoard(game.lastMove);
        renderHistory();

        const statusHeader = document.getElementById('gameStatusHeader');
        if (game.status === 'won') {
            const isWinner = game.winner === myId;
            statusHeader.innerText = isWinner ? '🎉 VYHRÁL JSI!' : `😢 Prohra. Vyhrál ${opponentName}`;
            statusHeader.className = isWinner ? 'text-center p-2.5 bg-green-800 text-white rounded font-bold text-sm mb-3 border border-green-500' : 'text-center p-2.5 bg-red-900 text-white rounded font-bold text-sm mb-3 border border-red-500';
            document.getElementById('rematchBtn').classList.remove('hidden');
        } else if (game.status === 'draw') {
            statusHeader.innerText = '🤝 Remíza!';
            document.getElementById('rematchBtn').classList.remove('hidden');
        } else {
            statusHeader.innerText = myTurn ? 'Jsi na tahu!' : `Čeká se na tah (${opponentName})...`;
            statusHeader.className = myTurn ? 'text-center p-2.5 bg-[#81b64c] text-white rounded font-bold text-sm mb-3' : 'text-center p-2.5 bg-[#1e1e1c] text-gray-300 rounded font-bold text-sm mb-3 border border-[#3d3b38]';
        }
    });
}

function renderBoard(lastMove) {
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';

    const isFlipped = myColor === 'b';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const row = isFlipped ? 7 - r : r;
            const col = isFlipped ? 7 - c : c;

            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            square.className = `square ${isLight ? 'light' : 'dark'}`;

            // Chess.com Žluté Zvýraznění posledního tahu (#f7f769)
            if (lastMove && ((lastMove.from.r === row && lastMove.from.c === col) || (lastMove.to.r === row && lastMove.to.c === col))) {
                square.classList.add('last-move');
            }

            if (selectedSquare && selectedSquare.r === row && selectedSquare.c === col) {
                square.classList.add('selected');
            }

            // Souřadnice na okrajích
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

            const piece = gameBoard[row][col];
            if (piece) {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = 'piece';
                pieceDiv.style.backgroundImage = `url('${pieceSVGs[piece]}')`;
                square.appendChild(pieceDiv);
            }

            // Tečky pro právoplatné tahy
            const isLegal = legalMoves.some(m => m.r === row && m.c === col);
            if (isLegal) {
                if (piece) {
                    const ring = document.createElement('div');
                    ring.className = 'capture-ring';
                    square.appendChild(ring);
                } else {
                    const dot = document.createElement('div');
                    dot.className = 'move-dot';
                    square.appendChild(dot);
                }
            }

            square.onclick = () => handleSquareClick(row, col);
            boardEl.appendChild(square);
        }
    }
}

function handleSquareClick(r, c) {
    if (!myTurn) return;

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
        legalMoves = getLegalMoves(r, c, gameBoard, myColor);
    } else {
        selectedSquare = null;
        legalMoves = [];
    }

    renderBoard();
}

function getLegalMoves(r, c, board, color) {
    const piece = board[r][c];
    if (!piece || piece[0] !== color) return [];

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
            while (addMove(r + dr * step, c + dc * step)) {
                step++;
            }
        });
    }

    return moves;
}

function executeMove(from, to) {
    const movingPiece = gameBoard[from.r][from.c];
    const targetPiece = gameBoard[to.r][to.c];
    
    let finalPiece = movingPiece;
    if (movingPiece[1] === 'P' && (to.r === 0 || to.r === 7)) {
        finalPiece = myColor + 'Q';
    }

    const newBoard = gameBoard.map(row => [...row]);
    newBoard[from.r][from.c] = '';
    newBoard[to.r][to.c] = finalPiece;

    const isCapture = targetPiece !== '';
    playSound(isCapture ? 'capture' : 'move');

    const moveNotation = `${movingPiece[1]}${String.fromCharCode(97 + to.c)}${8 - to.r}`;

    db.ref(`sachy/games/${activeGameId}`).transaction((game) => {
        if (!game || game.status !== 'playing') return;

        game.board = newBoard;
        game.turn = myColor === 'w' ? 'b' : 'w';
        game.lastMove = { from, to };
        if (!game.history) game.history = [];
        game.history.push(`${myNickname}: ${moveNotation}`);

        return game;
    });
}

function recordWinStreak(winnerId, winnerName) {
    if (!winnerId) return;
    const streakRef = db.ref(`sachy/streaks/${winnerId}`);
    streakRef.transaction((current) => {
        if (!current) return { name: winnerName, count: 1 };
        return { name: winnerName, count: (current.count || 0) + 1 };
    });
}

function listenLeaderboard() {
    db.ref('sachy/streaks').orderByChild('count').limitToLast(3).on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.values(data).sort((a,b) => b.count - a.count);

        const lbEl = document.getElementById('leaderboardList');
        lbEl.innerHTML = '';
        list.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-[#1e1e1c] p-2.5 rounded border border-[#3d3b38]';
            div.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-extrabold ${idx===0?'text-yellow-400':idx===1?'text-gray-300':'text-amber-600'} text-sm">${idx + 1}.</span>
                    <span class="font-bold text-xs md:text-sm">${item.name}</span>
                </div>
                <strong class="text-[#81b64c] text-xs md:text-sm">${item.count} výher</strong>
            `;
            lbEl.appendChild(div);
        });

        if (list.length === 0) {
            lbEl.innerHTML = '<p class="text-gray-500 text-center py-4 text-xs">Žádné odehrané výhry.</p>';
        }
    });
}

function renderHistory() {
    const container = document.getElementById('moveHistory');
    container.innerHTML = '';
    moveHistory.forEach(m => {
        const div = document.createElement('div');
        div.innerText = m;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    db.ref(`sachy/chats/${activeGameId}`).push({
        sender: myNickname,
        text: msg,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    input.value = '';
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function listenChat() {
    const chatEl = document.getElementById('chatMessages');
    chatEl.innerHTML = '';
    db.ref(`sachy/chats/${activeGameId}`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.className = 'border-b border-[#2d2b28] pb-1';
        div.innerHTML = `<strong class="text-[#81b64c]">${msg.sender}:</strong> ${msg.text}`;
        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;
    });
}

function surrenderGame() {
    if (confirm('Opravdu chceš hru vzdát?')) {
        if (activeGameId) {
            db.ref(`sachy/games/${activeGameId}`).update({
                status: 'won',
                winner: opponentId
            });
            recordWinStreak(opponentId, opponentName);
            playSound('gameEnd');
        }
    }
}

function exitGame() {
    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}`).remove();
        db.ref(`sachy/lobby/${myId}/status`).set('idle');
        activeGameId = null;
        chatListenerRegistered = false;
    }
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'grid';
}