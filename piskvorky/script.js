const firebaseConfig = { databaseURL: "https://gjw-chat-default-rtdb.europe-west1.firebasedatabase.app" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let myId = 'user_' + Math.random().toString(36.substr(2, 9));
let myNickname = '';
let myClass = '';
let currentMode = 'easy';
let activeGameId = null;
let mySymbol = ''; // 'X' nebo 'O'
let opponentId = null;
let opponentName = '';
let myTurn = false;
let boardSize = 3;
let winLength = 3;

// Inicializace hráče v lobby
function joinLobby() {
    const nameInput = document.getElementById('playerName').value.trim();
    const classInput = document.getElementById('playerClass').value.trim();
    const modeSelect = document.getElementById('gameModeSelect').value;

    if (!nameInput) {
        alert('Zadej prosím svou přezdívku!');
        return;
    }

    myNickname = nameInput;
    myClass = classInput;
    currentMode = modeSelect;
    boardSize = currentMode === 'easy' ? 3 : 15;
    winLength = currentMode === 'easy' ? 3 : 5;

    document.getElementById('currentNickname').innerText = `${myNickname} ${myClass ? '(' + myClass + ')' : ''}`;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';

    // Registrace do Firebase přítomnosti
    const userRef = db.ref(`piskvorky/lobby/${myId}`);
    userRef.set({
        name: myNickname,
        class: myClass,
        mode: currentMode,
        status: 'idle', // idle, playing
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    userRef.onDisconnect().remove();

    listenLobby();
    listenInvites();
    listenLeaderboard();
}

// Sledování lobby (ostatní hráči)
function listenLobby() {
    db.ref('piskvorky/lobby').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const listEl = document.getElementById('playersList');
        listEl.innerHTML = '';

        let count = 0;
        for (let id in users) {
            if (id === myId) continue; // Neukazuj sebe
            const u = users[id];
            count++;

            const div = document.createElement('div');
            div.className = 'player-item';
            
            const infoSpan = document.createElement('span');
            infoSpan.innerText = `${u.name} ${u.class ? '(' + u.class + ')' : ''} [${u.mode === 'easy' ? '3x3' : '15x15'}]`;
            
            const btn = document.createElement('button');
            btn.className = 'btn small primary';
            if (u.status === 'playing') {
                btn.innerText = 'Hraje';
                btn.disabled = true;
                btn.style.background = '#999';
            } else {
                btn.innerText = 'Vyzvat';
                btn.onclick = () => sendInvite(id, u.name);
            }

            div.appendChild(infoSpan);
            div.appendChild(btn);
            listEl.appendChild(div);
        }

        if (count === 0) {
            listEl.innerHTML = '<p style="color:#666; text-align:center;">Žádní další hráči v lobby.</p>';
        }
    });
}

// Posílání výzvy
function sendInvite(targetId, targetName) {
    db.ref(`piskvorky/invites/${targetId}`).set({
        fromId: myId,
        fromName: myNickname,
        mode: currentMode,
        boardSize: boardSize,
        winLength: winLength
    });
    alert(`Výzva byla odeslána hráči ${targetName}. Čeká se na odpověď...`);
}

// Naslouchání příchozím výzvám
function listenInvites() {
    db.ref(`piskvorky/invites/${myId}`).on('value', (snapshot) => {
        const invite = snapshot.val();
        if (!invite) {
            document.getElementById('inviteModal').style.display = 'none';
            return;
        }

        window.currentInvite = invite;
        document.getElementById('inviteText').innerText = `${invite.fromName} tě vyzval na souboj (${invite.boardSize === 3 ? 'Jednodušší 3x3' : 'Těžší 15x15'})!`;
        document.getElementById('inviteModal').style.display = 'flex';
    });
}

function acceptInvite() {
    const invite = window.currentInvite;
    if (!invite) return;

    db.ref(`piskvorky/invites/${myId}`).remove();

    // Vytvoření nové hry
    const gameId = 'game_' + Math.random().toString(36).substr(2, 9);
    
    // Hod mincí (kdo začíná a symboly)
    const toss = Math.random() < 0.5;
    const player1Symbol = toss ? 'X' : 'O';
    const player2Symbol = toss ? 'O' : 'X';
    const starterId = toss ? myId : invite.fromId;

    // Inicializace hrací plochy
    const totalCells = invite.boardSize * invite.boardSize;
    const initialBoard = new Array(totalCells).fill('');

    db.ref(`piskvorky/games/${gameId}`).set({
        boardSize: invite.boardSize,
        winLength: invite.winLength,
        board: initialBoard,
        turn: starterId,
        player1: { id: invite.fromId, symbol: player1Symbol },
        player2: { id: myId, symbol: player2Symbol },
        status: 'playing',
        rematchVotes: { [invite.fromId]: false, [myId]: false }
    });

    // Označit oba jako zaneprázdněné v lobby
    db.ref(`piskvorky/lobby/${myId}/status`).set('playing');
    db.ref(`piskvorky/lobby/${invite.fromId}/status`).set('playing');

    setupGame(gameId, invite.fromId, invite.fromName, invite.boardSize, invite.winLength);
}

function rejectInvite() {
    db.ref(`piskvorky/invites/${myId}`).remove();
    document.getElementById('inviteModal').style.display = 'none';
}

// Sledování vytvořených her (pokud mě někdo vyzval a já přijal)
// Nebo obecný listener pro zahájení hry
db.ref('piskvorky/games').on('child_added', (snapshot) => {
    const game = snapshot.val();
    const gameId = snapshot.key;
    if (activeGameId) return;

    if (game.player1.id === myId || game.player2.id === myId) {
        const opp = game.player1.id === myId ? game.player2 : game.player1;
        // Zjištění jména soupeře z lobby
        db.ref(`piskvorky/lobby/${opp.id}/name`).once('value', (snap) => {
            const oppName = snap.val() || 'Soupeř';
            setupGame(gameId, opp.id, oppName, game.boardSize, game.winLength);
        });
    }
});

function setupGame(gameId, oppId, oppName, bSize, wLen) {
    activeGameId = gameId;
    opponentId = oppId;
    opponentName = oppName;
    boardSize = bSize;
    winLength = wLen;

    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('inviteModal').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';
    document.getElementById('opponentInfo').innerText = `Soupeř: ${opponentName}`;

    buildBoardUI();
    listenGame();
    listenChat();
}

function buildBoardUI() {
    const boardEl = document.getElementById('gameBoard');
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${boardSize}, ${boardSize === 3 ? '80px' : '30px'})`;
    boardEl.style.gridTemplateRows = `repeat(${boardSize}, ${boardSize === 3 ? '80px' : '30px'})`;

    for (let i = 0; i < boardSize * boardSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if(boardSize !== 3) cell.style.fontSize = '14px';
        cell.dataset.index = i;
        cell.onclick = () => makeMove(i);
        boardEl.appendChild(cell);
    }
}

function listenGame() {
    db.ref(`piskvorky/games/${activeGameId}`).on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) return;

        mySymbol = game.player1.id === myId ? game.player1.symbol : game.player2.symbol;
        document.getElementById('mySymbol').innerText = `Tvůj symbol: ${mySymbol}`;

        myTurn = game.turn === myId;
        document.getElementById('turnIndicator').innerText = myTurn ? 'Na tahu: TY' : `Na tahu: ${opponentName}`;
        document.getElementById('coinTossInfo').innerText = `Hra spuštěna! Symboly rozděleny mincí.`;

        // Vykreslení desky
        const cells = document.querySelectorAll('.cell');
        game.board.forEach((val, idx) => {
            cells[idx].innerText = val;
        });

        // Kontrola stavu hry
        if (game.status === 'won') {
            const winnerText = game.winner === myId ? '🎉 VYHRÁL JSI!' : `😢 Prohrál jsi. Vyhrál ${opponentName}.`;
            document.getElementById('gameStatus').innerText = winnerText;
            document.getElementById('rematchContainer').style.display = 'block';
            updateRematchBtn(game.rematchVotes);
        } else if (game.status === 'draw') {
            document.getElementById('gameStatus').innerText = '🤝 Remíza!';
            document.getElementById('rematchContainer').style.display = 'block';
            updateRematchBtn(game.rematchVotes);
        } else {
            document.getElementById('gameStatus').innerText = myTurn ? 'Jsi na tahu!' : 'Čekáš na tah soupeře...';
            document.getElementById('rematchContainer').style.display = 'none';
        }
    });
}

function makeMove(index) {
    if (!myTurn) return;
    
    db.ref(`piskvorky/games/${activeGameId}`).transaction((game) => {
        if (!game || game.status !== 'playing') return;
        if (game.board[index] !== '') return; // obsazeno
        if (game.turn !== myId) return;

        game.board[index] = mySymbol;

        // Kontrola výhry
        if (checkWin(game.board, mySymbol, boardSize, winLength)) {
            game.status = 'won';
            game.winner = myId;
            recordWinStreak(myId);
        } else if (game.board.every(cell => cell !== '')) {
            game.status = 'draw';
        } else {
            game.turn = opponentId;
        }

        return game;
    });
}

// Algoritmus kontroly spojení tří / pěti
function checkWin(board, symbol, size, wLen) {
    // Kontrola řádků, sloupců a diagonál
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r * size + c] !== symbol) continue;

            // Směry: doprava, dolů, doprava-dolů, doprava-nahoru
            const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
            for (let [dr, dc] of directions) {
                let count = 0;
                for (let i = 0; i < wLen; i++) {
                    let nr = r + dr * i;
                    let nc = c + dc * i;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr * size + nc] === symbol) {
                        count++;
                    } else {
                        break;
                    }
                }
                if (count === wLen) return true;
            }
        }
    }
    return false;
}

// Win Streak a Leaderboard
function recordWinStreak(winnerId) {
    const streakRef = db.ref(`piskvorky/streaks/${winnerId}`);
    streakRef.transaction((current) => {
        if (!current) return { name: myNickname, count: 1 };
        return { name: myNickname, count: (current.count || 0) + 1 };
    });
    
    // Reset streak pro poraženého
    const loserId = winnerId === myId ? opponentId : myId;
    db.ref(`piskvorky/streaks/${loserId}/count`).set(0);
}

function listenLeaderboard() {
    db.ref('piskvorky/streaks').orderByChild('count').limitToLast(3).on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const list = [];
        for (let id in data) {
            list.push(data[id]);
        }
        list.sort((a, b) => b.count - a.count);

        const lbEl = document.getElementById('leaderboardList');
        lbEl.innerHTML = '';
        list.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'player-item';
            div.innerHTML = `<span>${idx + 1}. ${item.name}</span><strong>${item.count} výher v řadě</strong>`;
            lbEl.appendChild(div);
        });
        if (list.length === 0) {
            lbEl.innerHTML = '<p style="color:#666; text-align:center;">Zatím žádné záznamy.</p>';
        }
    });
}

// Odveta
function requestRematch() {
    db.ref(`piskvorky/games/${activeGameId}/rematchVotes/${myId}`).set(true);
}

function updateRematchBtn(votes) {
    if (!votes) return;
    const count = Object.values(votes).filter(v => v === true).length;
    const btn = document.getElementById('rematchBtn');
    btn.innerText = `Požádat o odvetu (${count}/2)`;

    if (count === 2 && myId === Object.keys(votes)[0]) {
        // Reset desky pro odvetu
        resetGameForRematch();
    }
}

function resetGameForRematch() {
    const totalCells = boardSize * boardSize;
    db.ref(`piskvorky/games/${activeGameId}`).update({
        board: new Array(totalCells).fill(''),
        status: 'playing',
        winner: null,
        rematchVotes: { [myId]: false, [opponentId]: false }
    });
}

// Chat a Emojis
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    db.ref(`piskvorky/chats/${activeGameId}`).push({
        sender: myNickname,
        text: msg,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    input.value = '';
}

function sendEmoji(emoji) {
    db.ref(`piskvorky/chats/${activeGameId}`).push({
        sender: myNickname,
        text: emoji,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function listenChat() {
    db.ref(`piskvorky/chats/${activeGameId}`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const chatEl = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.innerHTML = `<strong>${msg.sender}:</strong> ${msg.text}`;
        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;
    });
}

function surrenderGame() {
    if (confirm('Opravdu chceš hru vzdát?')) {
        db.ref(`piskvorky/games/${activeGameId}/status`).set('won');
        db.ref(`piskvorky/games/${activeGameId}/winner`).set(opponentId);
        recordWinStreak(opponentId);
        exitGame();
    }
}

function exitGame() {
    if (activeGameId) {
        db.ref(`piskvorky/lobby/${myId}/status`).set('idle');
        activeGameId = null;
    }
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';
}