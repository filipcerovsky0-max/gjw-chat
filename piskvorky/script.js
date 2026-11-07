const firebaseConfig = { databaseURL: "https://gjw-chat-default-rtdb.europe-west1.firebasedatabase.app" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let myId = 'user_' + Math.random().toString(36).substr(2, 9);
let myNickname = '';
let myClass = '';
let activeGameId = null;
let mySymbol = '';
let opponentId = null;
let opponentName = '';
let myTurn = false;
let boardSize = 3;
let winLength = 3;
let chatListenerRegistered = false;

function joinLobby() {
    const nameInput = document.getElementById('playerName').value.trim();
    const classInput = document.getElementById('playerClass').value;

    if (!nameInput) {
        alert('Zadej prosím svou přezdívku!');
        return;
    }

    myNickname = nameInput;
    myClass = classInput;

    document.getElementById('currentNickname').innerText = `${myNickname} ${myClass ? '(' + myClass + ')' : ''}`;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';

    const userRef = db.ref(`piskvorky/lobby/${myId}`);
    userRef.set({
        name: myNickname,
        class: myClass,
        status: 'idle',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    userRef.onDisconnect().remove();

    listenLobby();
    listenInvites();
    listenLeaderboard();
}

function leaveLobby() {
    db.ref(`piskvorky/lobby/${myId}`).remove();
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
}

function listenLobby() {
    db.ref('piskvorky/lobby').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const listEl = document.getElementById('playersList');
        listEl.innerHTML = '';

        let count = 0;
        for (let id in users) {
            if (id === myId) continue;
            const u = users[id];
            count++;

            const div = document.createElement('div');
            div.className = 'player-item';
            
            const infoSpan = document.createElement('span');
            infoSpan.innerText = `${u.name} ${u.class ? '(' + u.class + ')' : ''}`;
            
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

function sendInvite(targetId, targetName) {
    db.ref(`piskvorky/invites/${targetId}`).set({
        fromId: myId,
        fromName: myNickname
    });
    alert(`Výzva byla odeslána hráči ${targetName}. Čeká se na odpověď...`);
}

function listenInvites() {
    db.ref(`piskvorky/invites/${myId}`).on('value', (snapshot) => {
        const invite = snapshot.val();
        if (!invite) {
            document.getElementById('inviteModal').style.display = 'none';
            return;
        }

        window.currentInvite = invite;
        document.getElementById('inviteText').innerText = `${invite.fromName} tě vyzval na souboj v piškvorkách!`;
        document.getElementById('inviteModal').style.display = 'flex';
    });
}

function acceptInvite() {
    const invite = window.currentInvite;
    if (!invite) return;

    db.ref(`piskvorky/invites/${myId}`).remove();
    document.getElementById('inviteModal').style.display = 'none';

    const matchId = 'match_' + Math.random().toString(36).substr(2, 9);
    db.ref(`piskvorky/matches/${matchId}`).set({
        player1: invite.fromId,
        player2: myId,
        votes: {
            [invite.fromId]: null,
            [myId]: null
        },
        status: 'voting'
    });

    startVotingSession(matchId, invite.fromId, invite.fromName);
}

function rejectInvite() {
    db.ref(`piskvorky/invites/${myId}`).remove();
    document.getElementById('inviteModal').style.display = 'none';
}

db.ref('piskvorky/matches').on('child_added', (snapshot) => {
    const match = snapshot.val();
    const matchId = snapshot.key;
    if (activeGameId) return;

    if ((match.player1 === myId || match.player2 === myId) && match.status === 'voting') {
        const oppId = match.player1 === myId ? match.player2 : match.player1;
        db.ref(`piskvorky/lobby/${oppId}/name`).once('value', (snap) => {
            const oppName = snap.val() || 'Soupeř';
            if (document.getElementById('voteModal').style.display !== 'flex' && document.getElementById('gameSection').style.display !== 'block') {
                startVotingSession(matchId, oppId, oppName);
            }
        });
    }
});

let votingTimer = null;
function startVotingSession(matchId, oppId, oppName) {
    opponentId = oppId;
    opponentName = oppName;
    activeGameId = matchId;

    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('voteModal').style.display = 'flex';

    let timeLeft = 10; // 10 sekund na hlasování
    document.getElementById('voteTimerText').innerText = `Vyber obtížnost (zbývá ${timeLeft}s):`;

    clearInterval(votingTimer);
    votingTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('voteTimerText').innerText = `Vyber obtížnost (zbývá ${timeLeft}s):`;
        if (timeLeft <= 0) {
            clearInterval(votingTimer);
            submitVote();
        }
    }, 1000);

    db.ref(`piskvorky/matches/${matchId}`).on('value', (snapshot) => {
        const m = snapshot.val();
        if (m && m.status === 'ready' && m.chosenMode) {
            db.ref(`piskvorky/matches/${matchId}`).off();
            proceedToGame(matchId, m.chosenMode);
        }
    });
}

function submitVote() {
    clearInterval(votingTimer);
    const mode = document.getElementById('voteModeSelect').value;
    document.getElementById('voteModal').style.display = 'none';

    db.ref(`piskvorky/matches/${activeGameId}/votes/${myId}`).set(mode).then(() => {
        db.ref(`piskvorky/matches/${activeGameId}`).once('value', (snapshot) => {
            const match = snapshot.val();
            if (!match || match.status !== 'voting') return;

            const votes = match.votes || {};
            const voteValues = Object.values(votes);
            if (voteValues.length === 2 && !voteValues.includes(null)) {
                if (match.player1 === myId) {
                    evaluateAndResolveVotes(match, activeGameId);
                }
            }
        });
    });
}

function evaluateAndResolveVotes(match, matchId) {
    const vals = Object.values(match.votes);
    let chosenMode = 'easy';

    if (vals[0] === vals[1]) {
        chosenMode = vals[0];
        db.ref(`piskvorky/matches/${matchId}`).update({
            status: 'ready',
            chosenMode: chosenMode
        });
    } else {
        db.ref(`piskvorky/matches/${matchId}`).update({ status: 'lottery' });
        triggerLotteryAnimation(matchId);
    }
}

db.ref('piskvorky/matches').on('child_changed', (snapshot) => {
    const match = snapshot.val();
    const matchId = snapshot.key;
    if (activeGameId === matchId && match.status === 'lottery' && document.getElementById('lotteryModal').style.display !== 'flex') {
        document.getElementById('voteModal').style.display = 'none';
        document.getElementById('lotteryModal').style.display = 'flex';
        runLotteryVisuals();
    }
});

function triggerLotteryAnimation(matchId) {
    document.getElementById('voteModal').style.display = 'none';
    document.getElementById('lotteryModal').style.display = 'flex';
    runLotteryVisuals();

    // 3 sekundy trvající animace losování
    setTimeout(() => {
        const finalMode = Math.random() < 0.5 ? 'easy' : 'hard';
        db.ref(`piskvorky/matches/${matchId}`).update({
            status: 'ready',
            chosenMode: finalMode
        });
    }, 3000);
}

function runLotteryVisuals() {
    let counter = 0;
    const interval = setInterval(() => {
        counter++;
        const tempMode = counter % 2 === 0 ? 'Jednodušší (3x3)' : 'Těžší (15x15)';
        document.getElementById('lotteryResultText').innerText = tempMode;
        if (counter >= 12) {
            clearInterval(interval);
        }
    }, 250);
}

function proceedToGame(matchId, mode) {
    document.getElementById('voteModal').style.display = 'none';
    document.getElementById('lotteryModal').style.display = 'none';
    document.getElementById('inviteModal').style.display = 'none';

    boardSize = mode === 'easy' ? 3 : 15;
    winLength = mode === 'easy' ? 3 : 5;

    db.ref(`piskvorky/games/${matchId}`).once('value', (snap) => {
        if (!snap.exists()) {
            db.ref(`piskvorky/matches/${matchId}`).once('value', (mSnap) => {
                const mData = mSnap.val();
                
                // Coinflip pro symboly (každému padne něco jiného, křížky X začínají vždy první)
                const p1GetsX = Math.random() < 0.5;
                const p1Symbol = p1GetsX ? 'X' : 'O';
                const p2Symbol = p1GetsX ? 'O' : 'X';
                const starterId = p1GetsX ? mData.player1 : mData.player2;

                db.ref(`piskvorky/games/${matchId}`).set({
                    boardSize: boardSize,
                    winLength: winLength,
                    board: new Array(boardSize * boardSize).fill(''),
                    turn: starterId,
                    player1: { id: mData.player1, symbol: p1Symbol },
                    player2: { id: mData.player2, symbol: p2Symbol },
                    status: 'playing',
                    rematchVotes: { [mData.player1]: false, [mData.player2]: false }
                });

                db.ref(`piskvorky/lobby/${mData.player1}/status`).set('playing');
                db.ref(`piskvorky/lobby/${mData.player2}/status`).set('playing');
            });
        }
    });

    setupGameUI();
}

db.ref('piskvorky/games').on('child_added', (snapshot) => {
    const game = snapshot.val();
    const gameId = snapshot.key;
    if (activeGameId === gameId && document.getElementById('gameSection').style.display === 'block') return;

    if (game && (game.player1.id === myId || game.player2.id === myId)) {
        activeGameId = gameId;
        boardSize = game.boardSize;
        winLength = game.winLength;
        const opp = game.player1.id === myId ? game.player2 : game.player1;
        
        db.ref(`piskvorky/lobby/${opp.id}/name`).once('value', (snap) => {
            opponentId = opp.id;
            opponentName = snap.val() || 'Soupeř';
            setupGameUI();
        });
    }
});

function setupGameUI() {
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('voteModal').style.display = 'none';
    document.getElementById('lotteryModal').style.display = 'none';
    document.getElementById('inviteModal').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';
    document.getElementById('opponentInfo').innerText = `Soupeř: ${opponentName}`;

    buildBoardUI();
    listenGame();
    if (!chatListenerRegistered) {
        listenChat();
        chatListenerRegistered = true;
    }
}

function buildBoardUI() {
    const boardEl = document.getElementById('gameBoard');
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${boardSize}, ${boardSize === 3 ? '75px' : '26px'})`;
    boardEl.style.gridTemplateRows = `repeat(${boardSize}, ${boardSize === 3 ? '75px' : '26px'})`;

    for (let i = 0; i < boardSize * boardSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if(boardSize !== 3) cell.style.fontSize = '12px';
        cell.dataset.index = i;
        cell.onclick = () => makeMove(i);
        boardEl.appendChild(cell);
    }
}

function listenGame() {
    db.ref(`piskvorky/games/${activeGameId}`).on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) {
            alert('Soupeř opustil hru!');
            exitGame();
            return;
        }

        mySymbol = game.player1.id === myId ? game.player1.symbol : game.player2.symbol;
        document.getElementById('mySymbol').innerText = `Symbol: ${mySymbol} (${mySymbol === 'X' ? 'Začínáš!' : 'Jsi druhý'})`;

        myTurn = game.turn === myId;
        document.getElementById('turnIndicator').innerText = myTurn ? 'Na tahu: TY' : `Na tahu: ${opponentName}`;
        document.getElementById('coinTossInfo').innerText = `Coinflip hotov! Ty máš ${mySymbol}.`;

        const cells = document.querySelectorAll('.cell');
        game.board.forEach((val, idx) => {
            if(cells[idx]) cells[idx].innerText = val;
        });

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
        if (game.board[index] !== '') return;
        if (game.turn !== myId) return;

        game.board[index] = mySymbol;

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

function checkWin(board, symbol, size, wLen) {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r * size + c] !== symbol) continue;
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

function recordWinStreak(winnerId) {
    const streakRef = db.ref(`piskvorky/streaks/${winnerId}`);
    streakRef.transaction((current) => {
        if (!current) return { name: myNickname, count: 1 };
        return { name: myNickname, count: (current.count || 0) + 1 };
    });
    
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
            div.innerHTML = `<span>${idx + 1}. ${item.name}</span><strong>${item.count} výher</strong>`;
            lbEl.appendChild(div);
        });
        if (list.length === 0) {
            lbEl.innerHTML = '<p style="color:#666; text-align:center;">Zatím žádné záznamy.</p>';
        }
    });
}

function requestRematch() {
    db.ref(`piskvorky/games/${activeGameId}/rematchVotes/${myId}`).set(true);
}

function updateRematchBtn(votes) {
    if (!votes) return;
    const count = Object.values(votes).filter(v => v === true).length;
    const btn = document.getElementById('rematchBtn');
    btn.innerText = `Požádat o odvetu (${count}/2)`;

    if (count === 2 && myId === Object.keys(votes)[0]) {
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
    const chatEl = document.getElementById('chatMessages');
    chatEl.innerHTML = '';
    db.ref(`piskvorky/chats/${activeGameId}`).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.innerHTML = `<strong>${msg.sender}:</strong> ${msg.text}`;
        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;
    });
}

function surrenderGame() {
    if (confirm('Opravdu chceš hru vzdát?')) {
        if(activeGameId) {
            db.ref(`piskvorky/games/${activeGameId}`).remove();
        }
        exitGame();
    }
}

function exitGame() {
    if (activeGameId) {
        db.ref(`piskvorky/games/${activeGameId}`).remove();
        db.ref(`piskvorky/lobby/${myId}/status`).set('idle');
        activeGameId = null;
        chatListenerRegistered = false;
    }
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('voteModal').style.display = 'none';
    document.getElementById('lotteryModal').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';
}