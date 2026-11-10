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
let matchId_safe = null;
let afkInterval = null;

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

            // OPRAVA: Pokud uživatel nemá jméno nebo je 'undefined', rovnou ho z DB smažeme, aby nevisel v lobby
            if (!u || !u.name || u.name === 'undefined') {
                db.ref(`piskvorky/lobby/${id}`).remove();
                continue;
            }

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
    matchId_safe = matchId;
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
    matchId_safe = matchId;
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
    document.getElementById('inviteModal').style.display = 'none';
    document.getElementById('voteModal').style.display = 'flex';

    let timeLeft = 10;
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

    // Sledování změn stavu zápasu v DB
    db.ref(`piskvorky/matches/${matchId}`).on('value', (snapshot) => {
        const m = snapshot.val();
        if (!m) return;

        if (m.status === 'coinflip' && m.chosenMode) {
            db.ref(`piskvorky/matches/${matchId}`).off();
            startCoinflipAnimation(matchId, m.chosenMode);
        } else if (m.status === 'lottery' && document.getElementById('lotteryModal').style.display !== 'flex') {
            document.getElementById('voteModal').style.display = 'none';
            document.getElementById('lotteryModal').style.display = 'flex';
            runLotteryVisuals(matchId);
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
            // Jakmile oba zahlasovali (nebo vypršel čas)
            if (voteValues.length === 2 && !voteValues.includes(null)) {
                if (match.player1 === myId) {
                    evaluateAndResolveVotes(match, activeGameId);
                }
            }
        });
    });
}

function evaluateAndResolveVotes(match, matchId) {
    const votesObj = match.votes || {};
    const vals = Object.values(votesObj);

    // Pojistka kdyby někdo nestihl zahlasit
    const v1 = vals[0] || 'easy';
    const v2 = vals[1] || 'easy';

    if (v1 === v2) {
        // Shoda: Oba chtějí to samé -> rovnou coinflip s touto obtížností
        db.ref(`piskvorky/matches/${matchId}`).update({
            status: 'coinflip',
            chosenMode: v1
        });
    } else {
        // Neshoda: Každý chtěl něco jiného -> spuštění loterie
        db.ref(`piskvorky/matches/${matchId}`).update({ status: 'lottery' });
    }
}

function runLotteryVisuals(matchId) {
    let counter = 0;
    const interval = setInterval(() => {
        counter++;
        const tempMode = counter % 2 === 0 ? 'Jednodušší (3x3)' : 'Těžší (15x15)';
        const el = document.getElementById('lotteryResultText');
        if (el) el.innerText = tempMode;
        
        if (counter >= 12) {
            clearInterval(interval);
            
            // Určení skutečného výsledku loterie
            const finalMode = Math.random() < 0.5 ? 'easy' : 'hard';
            const modeName = finalMode === 'easy' ? 'Jednodušší (3x3)' : 'Těžší (15x15)';
            if (el) el.innerHTML = `Vylosováno: <br><strong>${modeName}</strong>`;

            setTimeout(() => {
                // Pouze player1 zapíše finální výsledek do DB, aby nedošlo ke konfliktu
                db.ref(`piskvorky/matches/${matchId}`).once('value', (snap) => {
                    const m = snap.val();
                    if (m && m.status === 'lottery') {
                        db.ref(`piskvorky/matches/${matchId}`).update({
                            status: 'coinflip',
                            chosenMode: finalMode
                        });
                    }
                });
            }, 2000);
        }
    }, 250);
}

function startCoinflipAnimation(matchId, mode) {
    document.getElementById('voteModal').style.display = 'none';
    document.getElementById('lotteryModal').style.display = 'none';
    document.getElementById('coinflipModal').style.display = 'flex';

    let count = 0;
    const coinInterval = setInterval(() => {
        count++;
        const randSymbol = Math.random() < 0.5 ? '❌' : '⭕';
        const el = document.getElementById('coinflipResultText');
        if (el) el.innerText = randSymbol;
        
        if (count >= 12) {
            clearInterval(coinInterval);
            
            db.ref(`piskvorky/matches/${matchId}`).once('value', (snap) => {
                const mData = snap.val();
                if (!mData) return;

                if (mData.p1Symbol && mData.p2Symbol) {
                    showFinalCoinflipResult(mData, mode);
                } else if (mData.player1 === myId) {
                    const p1GetsX = Math.random() < 0.5;
                    const p1Symbol = p1GetsX ? 'X' : 'O';
                    const p2Symbol = p1GetsX ? 'O' : 'X';
                    db.ref(`piskvorky/matches/${matchId}`).update({
                        p1Symbol: p1Symbol,
                        p2Symbol: p2Symbol
                    });
                    showFinalCoinflipResult({ ...mData, p1Symbol, p2Symbol }, mode);
                } else {
                    setTimeout(() => {
                        db.ref(`piskvorky/matches/${matchId}`).once('value', (s2) => {
                            showFinalCoinflipResult(s2.val(), mode);
                        });
                    }, 500);
                }
            });
        }
    }, 250);
}

function showFinalCoinflipResult(mData, mode) {
    if (!mData) return;
    const myAssignedSymbol = mData.player1 === myId ? mData.p1Symbol : mData.p2Symbol;
    const modeText = mode === 'easy' ? 'Jednodušší (3x3)' : 'Těžší (15x15)';

    const resEl = document.getElementById('coinflipResultText');
    if (resEl) {
        resEl.innerHTML = `Padlo ti: <strong>${myAssignedSymbol}</strong> (${myAssignedSymbol === 'X' ? 'Začínáš!' : 'Jsi druhý'})<br><br>Obtížnost: ${modeText}`;
    }

    setTimeout(() => {
        if (mData.player1 === myId && (!mData.gameCreated)) {
            db.ref(`piskvorky/matches/${matchId_safe || activeGameId}`).update({ gameCreated: true });
            createGameInDB(activeGameId, mode, mData, mData.p1Symbol, mData.p2Symbol);
        }
    }, 2000);
}

function createGameInDB(matchId, mode, mData, p1Symbol, p2Symbol) {
    boardSize = mode === 'easy' ? 3 : 15;
    winLength = mode === 'easy' ? 3 : 5;

    const starterId = p1Symbol === 'X' ? mData.player1 : mData.player2;

    db.ref(`piskvorky/games/${matchId}`).set({
        boardSize: boardSize,
        winLength: winLength,
        board: new Array(boardSize * boardSize).fill(''),
        turn: starterId,
        lastMoveTime: firebase.database.ServerValue.TIMESTAMP,
        player1: { id: mData.player1, symbol: p1Symbol },
        player2: { id: mData.player2, symbol: p2Symbol },
        status: 'playing',
        rematchVotes: { [mData.player1]: false, [mData.player2]: false }
    });

    db.ref(`piskvorky/lobby/${mData.player1}/status`).set('playing');
    db.ref(`piskvorky/lobby/${mData.player2}/status`).set('playing');
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
    document.getElementById('coinflipModal').style.display = 'none';
    document.getElementById('inviteModal').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';
    document.getElementById('opponentInfo').innerText = `Soupeř: ${opponentName}`;

    buildBoardUI();
    listenGame();
    if (!chatListenerRegistered) {
        listenChat();
        chatListenerRegistered = true;
    }
    startAfkChecker();
}

function startAfkChecker() {
    clearInterval(afkInterval);
    afkInterval = setInterval(() => {
        if (!activeGameId) return;

        db.ref(`piskvorky/games/${activeGameId}`).once('value', (snapshot) => {
            const game = snapshot.val();
            if (!game || game.status !== 'playing') return;

            const now = Date.now();
            const lastMove = game.lastMoveTime || now;
            const diffSeconds = (now - lastMove) / 1000;

            if (diffSeconds > 120) {
                const afkPlayer = game.turn;
                const winnerId = afkPlayer === game.player1.id ? game.player2.id : game.player1.id;

                db.ref(`piskvorky/games/${activeGameId}`).update({
                    status: 'won',
                    winner: winnerId
                });

                if (myId === winnerId) {
                    alert('Soupeř byl neaktivní déle než 2 minuty. Vyhráváš kontumací!');
                } else {
                    alert('Byl jsi neaktivní déle než 2 minuty. Hra byla ukončena!');
                }
            }
        });
    }, 10000);
}

function buildBoardUI() {
    const boardEl = document.getElementById('gameBoard');
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${boardSize}, ${boardSize === 3 ? '75px' : '24px'})`;
    boardEl.style.gridTemplateRows = `repeat(${boardSize}, ${boardSize === 3 ? '75px' : '24px'})`;

    for (let i = 0; i < boardSize * boardSize; i++) {
        const cell = document.createElement('div');
        cell.className = boardSize === 3 ? 'cell' : 'cell hard-cell';
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

        const cells = document.querySelectorAll('.cell');
        game.board.forEach((val, idx) => {
            if(cells[idx]) {
                cells[idx].innerText = val;
            }
        });

        // --- ZVÝRAZNĚNÍ POSLEDNÍHO TAHU (Chess.com styl) ---
        cells.forEach(c => c.classList.remove('highlight-last'));
        if (game.lastMoveIndex !== undefined && game.lastMoveIndex !== null && cells[game.lastMoveIndex]) {
            cells[game.lastMoveIndex].classList.add('highlight-last');
        }

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
            document.getElementById('gameStatus').innerText = myTurn ? 'Jsi na tahu!' : 'Čeká se na tah soupeře...';
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
        game.lastMoveIndex = index;
        game.lastMoveTime = firebase.database.ServerValue.TIMESTAMP;

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
            lbEl.innerHTML = '<p style="color:#666; text-align:center;">Žádné záznamy.</p>';
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
        triggerRematchCoinflip();
    }
}

function triggerRematchCoinflip() {
    document.getElementById('rematchContainer').style.display = 'none';
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('coinflipModal').style.display = 'flex';

    let count = 0;
    const coinInterval = setInterval(() => {
        count++;
        const randSymbol = Math.random() < 0.5 ? '❌' : '⭕';
        const el = document.getElementById('coinflipResultText');
        if (el) el.innerText = randSymbol;
        
        if (count >= 12) {
            clearInterval(coinInterval);
            
            db.ref(`piskvorky/games/${activeGameId}`).once('value', (snap) => {
                const gData = snap.val();
                if (!gData) return;

                const p1GetsX = Math.random() < 0.5;
                const p1Symbol = p1GetsX ? 'X' : 'O';
                const p2Symbol = p1GetsX ? 'O' : 'X';
                const starterId = p1Symbol === 'X' ? gData.player1.id : gData.player2.id;
                
                const myAssignedSymbol = gData.player1.id === myId ? p1Symbol : p2Symbol;

                const resEl = document.getElementById('coinflipResultText');
                if (resEl) {
                    resEl.innerHTML = `Odvetný Coinflip!<br>Padlo ti: <strong>${myAssignedSymbol}</strong> (${myAssignedSymbol === 'X' ? 'Začínáš!' : 'Jsi druhý'})`;
                }

                setTimeout(() => {
                    document.getElementById('coinflipModal').style.display = 'none';
                    const totalCells = boardSize * boardSize;
                    db.ref(`piskvorky/games/${activeGameId}`).update({
                        board: new Array(totalCells).fill(''),
                        status: 'playing',
                        winner: null,
                        turn: starterId,
                        lastMoveIndex: null,
                        lastMoveTime: firebase.database.ServerValue.TIMESTAMP,
                        'player1/symbol': p1Symbol,
                        'player2/symbol': p2Symbol,
                        rematchVotes: { [gData.player1.id]: false, [gData.player2.id]: false }
                    });
                    document.getElementById('gameSection').style.display = 'block';
                }, 2000);
            });
        }
    }, 250);
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
    clearInterval(afkInterval);
    if (activeGameId) {
        db.ref(`piskvorky/games/${activeGameId}`).remove();
        db.ref(`piskvorky/lobby/${myId}/status`).set('idle');
        activeGameId = null;
        chatListenerRegistered = false;
    }
    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('voteModal').style.display = 'none';
    document.getElementById('lotteryModal').style.display = 'none';
    document.getElementById('coinflipModal').style.display = 'none';
    document.getElementById('inviteModal').style.display = 'none';
    document.getElementById('lobbySection').style.display = 'block';
}