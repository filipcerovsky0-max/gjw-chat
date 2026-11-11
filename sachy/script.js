// Konfigurace Firebase RTDB & OAuth Client ID
const firebaseConfig = { databaseURL: "https://gjw-chat-default-rtdb.europe-west1.firebasedatabase.app" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const GOOGLE_CLIENT_ID = "26054026514-qvfltgpdsq4ivhmlf00sple6c86lmjqj.apps.googleusercontent.com";

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
let fullBoardSnapshots = [];
let currentViewIndex = -1;
let chatListenerRegistered = false;

let draggedFromSquare = null;
let touchStartSquare = null;

let castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
let enPassantTarget = null;

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

// Automatická obnova relace
auth.onAuthStateChanged((user) => {
    if (user) {
        myId = user.uid;
        myNickname = user.displayName || 'Šachista';
        userPhotoURL = user.photoURL;
        isGoogleUser = true;

        const loginSec = document.getElementById('loginSection');
        if (loginSec && !loginSec.classList.contains('hidden')) {
            enterLobby();
        }
    }
});

// Google Přihlášení přes vlastní OAuth2 Client ID
window.loginWithGoogle = function() {
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

                        const selClass = document.getElementById('playerClass').value;
                        if (selClass) myClass = selClass;

                        enterLobby();
                    }).catch(err => {
                        console.error("Chyba při verifikaci tokenu Firebase:", err);
                        fallbackPopupLogin();
                    });
                }
            }
        });
        client.requestAccessToken();
    } else {
        fallbackPopupLogin();
    }
};

function fallbackPopupLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

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
        console.warn("Popup login warning:", err);
        const fallbackName = prompt("Zadej svou přezdívku pro rychlý vstup:");
        if (fallbackName) {
            myNickname = fallbackName;
            myClass = document.getElementById('playerClass').value;
            isGoogleUser = false;
            enterLobby();
        }
    });
}

window.joinLobbyAnonymous = function() {
    const nameInput = document.getElementById('playerName').value.trim();
    if (!nameInput) {
        alert('Zadej prosím svou přezdívku!');
        return;
    }
    myNickname = nameInput;
    myClass = document.getElementById('playerClass').value;
    isGoogleUser = false;

    enterLobby();
};

function enterLobby() {
    const userDisplay = `${myNickname} ${myClass ? '(' + myClass + ')' : ''}`;
    document.getElementById('userInfoHeader').innerHTML = userPhotoURL 
        ? `<img src="${userPhotoURL}" class="w-6 h-6 rounded-full border border-gray-400"> <span>${userDisplay}</span>`
        : `<span>${userDisplay}</span>`;

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('hidden');

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

    if (isGoogleUser) {
        loadUserHistory();
    }
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
        const modal = document.getElementById('inviteModal');
        if (!invite) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            return;
        }

        window.currentInvite = invite;
        document.getElementById('inviteText').innerText = `${invite.fromName} tě vyzývá na šachový zápas!`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

window.acceptInvite = function() {
    const invite = window.currentInvite;
    if (!invite) return;

    db.ref(`sachy/invites/${myId}`).remove();
    const modal = document.getElementById('inviteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

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
        snapshots: [initialBoard],
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        enPassant: null,
        lastMoveTime: firebase.database.ServerValue.TIMESTAMP
    });

    db.ref(`sachy/lobby/${invite.fromId}/status`).set('playing');
    db.ref(`sachy/lobby/${myId}/status`).set('playing');
};

window.rejectInvite = function() {
    db.ref(`sachy/invites/${myId}`).remove();
    const modal = document.getElementById('inviteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

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
        fullBoardSnapshots = game.snapshots || [initialBoard];
        castlingRights = game.castling || { wK: true, wQ: true, bK: true, bQ: true };
        enPassantTarget = game.enPassant || null;

        const drawModal = document.getElementById('drawModal');
        if (game.drawOffer && game.drawOffer !== myId) {
            drawModal.classList.remove('hidden');
            drawModal.classList.add('flex');
        } else {
            drawModal.classList.add('hidden');
            drawModal.classList.remove('flex');
        }

        currentViewIndex = fullBoardSnapshots.length - 1;

        renderBoard(game.lastMove);
        renderHistory();

        const statusHeader = document.getElementById('gameStatusHeader');
        if (game.status === 'won') {
            const isWinner = game.winner === myId;
            statusHeader.innerText = isWinner ? '🎉 VYHRÁL JSI!' : `😢 Prohra. Vyhrál ${opponentName}`;
            statusHeader.className = isWinner ? 'flex-1 text-center p-2 bg-green-800 text-white rounded font-bold text-xs border border-green-500' : 'flex-1 text-center p-2 bg-red-900 text-white rounded font-bold text-xs border border-red-500';
        } else if (game.status === 'draw') {
            statusHeader.innerText = '🤝 Remíza!';
            statusHeader.className = 'flex-1 text-center p-2 bg-gray-700 text-white rounded font-bold text-xs border border-gray-500';
        } else {
            const inCheck = isInCheck(myColor, gameBoard);
            if (inCheck && myTurn) {
                statusHeader.innerText = '⚠️ TVŮJ KRÁL JE V ŠACHU!';
                statusHeader.className = 'flex-1 text-center p-2 bg-red-600 text-white rounded font-bold text-xs animate-pulse';
            } else {
                statusHeader.innerText = myTurn ? 'Jsi na tahu!' : `Čeká se na tah (${opponentName})...`;
                statusHeader.className = myTurn ? 'flex-1 text-center p-2 bg-[#81b64c] text-white rounded font-bold text-xs' : 'flex-1 text-center p-2 bg-[#1e1e1c] text-gray-300 rounded font-bold text-xs border border-[#3d3b38]';
            }
        }
    });
}

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
                
                if (!isViewingHistory && piece[0] === myColor && myTurn) {
                    pieceDiv.draggable = true;
                    pieceDiv.ondragstart = (e) => handleDragStart(e, row, col);
                    pieceDiv.ontouchstart = (e) => handleTouchStart(e, row, col);
                    pieceDiv.ontouchend = (e) => handleTouchEnd(e);
                }

                square.appendChild(pieceDiv);
            }

            if (!isViewingHistory) {
                const isLegal = legalMoves.some(m => m.r === row && m.c === col);
                if (isLegal) {
                    if (piece || (enPassantTarget && enPassantTarget.r === row && enPassantTarget.c === col)) {
                        const ring = document.createElement('div');
                        ring.className = 'capture-ring';
                        square.appendChild(ring);
                    } else {
                        const dot = document.createElement('div');
                        dot.className = 'move-dot';
                        square.appendChild(dot);
                    }
                }
            }

            square.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            };

            square.ondrop = (e) => {
                e.preventDefault();
                if (!isViewingHistory && draggedFromSquare) {
                    handleDrop(row, col);
                }
            };

            square.onclick = () => {
                if (!isViewingHistory) handleSquareClick(row, col);
            };

            boardEl.appendChild(square);
        }
    }
}

function handleDragStart(e, r, c) {
    if (!myTurn) return;
    draggedFromSquare = { r, c };
    selectedSquare = { r, c };
    legalMoves = getValidatedLegalMoves(r, c);
    renderBoard();
    e.dataTransfer.setData('text/plain', JSON.stringify({ r, c }));
}

function handleDrop(toR, toC) {
    if (!draggedFromSquare || !myTurn) return;
    const move = legalMoves.find(m => m.r === toR && m.c === toC);
    if (move) {
        executeMove(draggedFromSquare, { r: toR, c: toC });
        selectedSquare = null;
        legalMoves = [];
    }
    draggedFromSquare = null;
}

function handleTouchStart(e, r, c) {
    if (!myTurn) return;
    touchStartSquare = { r, c };
    selectedSquare = { r, c };
    legalMoves = getValidatedLegalMoves(r, c);
    renderBoard();
}

function handleTouchEnd(e) {
    if (!touchStartSquare || !myTurn) return;
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

    let gameStatus = 'playing';
    let winnerId = null;

    if (!oppHasLegalMoves) {
        if (isOppInCheck) {
            gameStatus = 'won';
            winnerId = myId;
            playSound('gameEnd');
        } else {
            gameStatus = 'draw';
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
        game.status = gameStatus;
        if (winnerId) game.winner = winnerId;
        if (!game.history) game.history = [];
        if (!game.snapshots) game.snapshots = [initialBoard];
        game.history.push(`${myNickname}: ${moveNotation}`);
        game.snapshots.push(newBoard);

        return game;
    });

    if (gameStatus === 'won') {
        recordMatchResult(myId, myNickname, opponentId, opponentName, '+');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '-');
    } else if (gameStatus === 'draw') {
        recordMatchResult(myId, myNickname, opponentId, opponentName, '=');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '=');
    }
}

window.navMove = function(direction) {
    if (fullBoardSnapshots.length === 0) return;

    if (direction === 'first') currentViewIndex = 0;
    else if (direction === 'prev') currentViewIndex = Math.max(0, currentViewIndex - 1);
    else if (direction === 'next') currentViewIndex = Math.min(fullBoardSnapshots.length - 1, currentViewIndex + 1);
    else if (direction === 'last') currentViewIndex = fullBoardSnapshots.length - 1;

    renderBoard(null);
};

window.toggleGameMenu = function() {
    const dropdown = document.getElementById('gameActionDropdown');
    dropdown.classList.toggle('hidden');
};

window.requestDraw = function() {
    window.toggleGameMenu();
    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}/drawOffer`).set(myId);
        alert('Žádost o remízu byla odeslána soupeřovi.');
    }
};

window.respondDraw = function(accepted) {
    const modal = document.getElementById('drawModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (!activeGameId) return;

    if (accepted) {
        db.ref(`sachy/games/${activeGameId}`).update({ status: 'draw', drawOffer: null });
        recordMatchResult(myId, myNickname, opponentId, opponentName, '=');
        recordMatchResult(opponentId, opponentName, myId, myNickname, '=');
        playSound('gameEnd');
    } else {
        db.ref(`sachy/games/${activeGameId}/drawOffer`).remove();
    }
};

window.addFriend = function() {
    window.toggleGameMenu();
    if (!isGoogleUser) {
        alert('Pro přidávání přátel se musíte přihlásit přes Google účet!');
        return;
    }
    if (opponentId) {
        db.ref(`sachy/friends/${myId}/${opponentId}`).set({
            name: opponentName,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        alert(`Uživatel ${opponentName} byl přidán do tvých přátel!`);
    }
};

function recordMatchResult(pId, pName, oppId, oppName, resultSymbol) {
    if (!pId) return;

    if (resultSymbol === '+') {
        db.ref(`sachy/streaks/${pId}`).transaction((current) => {
            if (!current) return { name: pName, count: 1 };
            return { name: pName, count: (current.count || 0) + 1 };
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

        if (items.length === 0) {
            historyEl.innerHTML = '<p class="text-gray-500 text-center py-2">Zatím žádné odehrané zápasy.</p>';
        }
    });

    db.ref(`sachy/streaks/${myId}`).on('value', (snap) => {
        const val = snap.val();
        if (val && val.count) {
            const badge = document.getElementById('userStreakBadge');
            if (badge) badge.innerText = `${val.count} Výher`;
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
            lbEl.innerHTML = '<p class="text-gray-500 text-center py-2 text-xs">Žádné odehrané výhry.</p>';
        }
    });
}

function renderHistory() {
    const container = document.getElementById('moveHistory');
    if (!container) return;
    container.innerHTML = '';
    moveHistory.forEach(m => {
        const div = document.createElement('div');
        div.innerText = m;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

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
    });
}

window.surrenderGame = function() {
    window.toggleGameMenu();
    if (confirm('Opravdu chceš hru vzdát?')) {
        if (activeGameId) {
            db.ref(`sachy/games/${activeGameId}`).update({
                status: 'won',
                winner: opponentId
            });
            recordMatchResult(opponentId, opponentName, myId, myNickname, '+');
            recordMatchResult(myId, myNickname, opponentId, opponentName, '-');
            playSound('gameEnd');
        }
    }
};

window.exitGame = function() {
    if (activeGameId) {
        db.ref(`sachy/games/${activeGameId}`).remove();
        db.ref(`sachy/lobby/${myId}/status`).set('idle');
        activeGameId = null;
        chatListenerRegistered = false;
    }
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('gameSection').classList.add('hidden');
    document.getElementById('lobbySection').classList.remove('hidden');
};