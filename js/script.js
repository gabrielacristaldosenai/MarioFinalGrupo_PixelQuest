/**
 * Super Jump – lógica do jogo + ranking MySQL
 * Junta o melhor das versões Mario, Roberto/Daniel e Monsters.
 */
(() => {
    'use strict';

    /* =====================================================
       CONFIGURAÇÃO (para mexer no jogo, mexa só aqui)
       ===================================================== */

    // Para adicionar um personagem: uma linha nova.
    //   img     = sprite normal
    //   largura = largura em pixels no jogo
    //   over    = imagem de "fim de jogo" (opcional; sem ela o personagem só tomba)
    const CHARACTERS = {
        homem_1:  { nome: 'Pessoa 1',  img: 'assets/homem_1.gif',  largura: 82,  over: 'assets/hn.die.gif' },
        homem_2:  { nome: 'Pessoa 2',  img: 'assets/homem_2.gif',  largura: 82,  over: 'assets/arthur e h1.die.gif' },
        mulher_1: { nome: 'Pessoa 3', img: 'assets/mulher_1.gif', largura: 120, over: 'assets/mn.die.gif' },
        mulher_2: { nome: 'Pessoa 4', img: 'assets/mulher_2.gif', largura: 120, over: 'assets/gabi e mb.die.gif' },
        abner:    { nome: 'Abner',    img: 'assets/abner.gif',    largura: 103, secret: true, over: 'assets/abner.die.gif' },
        agatha:   { nome: 'Agatha',   img: 'assets/agatha.gif',   largura: 114, secret: true, over: 'assets/gabi e mb.die.gif' },
        arthur:   { nome: 'Arthur',   img: 'assets/arthur.gif',   largura: 82,  secret: true, over: 'assets/arthur e h1.die.gif' },
        gabi:     { nome: 'Gabi',     img: 'assets/gabi.gif',     largura: 120, secret: true, over: 'assets/gabi e mb.die.gif' },
        leo:      { nome: 'Leo',      img: 'assets/leo.gif',      largura: 110, secret: true, over: 'assets/leo.die.gif' },
        roberto:  { nome: 'Roberto',  img: 'assets/roberto.gif',  largura: 130, over: 'assets/roberto.die.gif', secret: true },
        daniel:   { nome: 'Daniel',   img: 'assets/daniel.gif',   largura: 130, over: 'assets/daniel.die.gif', secret: true }
    };
    // Precisa ser um personagem que NÃO seja secreto (é o que todo mundo tem de início)
    const DEFAULT_CHARACTER = 'homem_1';
    const PIPE_SRC = 'assets/roboVivo.png';         // obstáculo (robô inteiro)
    const PIPE_DEAD_SRC = 'assets/roboMorto.png';   // o mesmo robô, depois que o jogador bate

    // Nomes secretos: ao digitar o nome, o personagem é liberado (para sempre)
    // e o fundo do jogo vira a imagem do tema enquanto você jogar com esse nome.
    //   groundFrac = altura do chão na imagem, como fração da altura (de baixo pra cima)
    const THEMES = {
        toquio:  { src: 'assets/toquio.png',  ratio: 1671 / 941, groundFrac: 0.102 },
        galinha: { src: 'assets/galinha.png', ratio: 1672 / 941, groundFrac: 0.208 }
    };
    const SECRETS = {
        roberto: { char: 'roberto', theme: 'toquio' },
        daniel:  { char: 'daniel',  theme: 'galinha' },
        // Sem theme = só libera o personagem, o cenário continua o normal
        leo:     { char: 'leo',     theme: null },
        gabi:    { char: 'gabi',    theme: null },
        agatha:  { char: 'agatha',  theme: null },
        abner:   { char: 'abner',   theme: null },
        artur:   { char: 'arthur',  theme: null },
        arthur:  { char: 'arthur',  theme: null }
    };
    const BG_SPEED_FACTOR = 0.6;   // o fundo rola um pouco mais devagar que os canos

    // Fundos padrão: um por nível, nesta ordem. Depois do último, volta ao primeiro.
    //   ratio      = largura / altura da imagem
    //   groundFrac = altura do chão na imagem (de baixo pra cima), como fração da altura.
    //                Se o personagem parecer "flutuando" ou "afundado", ajuste só esse número.
    const SCENES = [
        { src: 'assets/entradaSesi.png',  ratio: 2048 / 768, groundFrac: 0.238 },
        { src: 'assets/entradaSenai.png', ratio: 2048 / 768, groundFrac: 0.190 },
        { src: 'assets/ladoSenai.png',    ratio: 2172 / 724, groundFrac: 0.137 },
        { src: 'assets/ladoSesi.jpg',     ratio: 1584 / 672, groundFrac: 0.122 }
    ];
    const sceneIndexFor = (nivel) => (nivel - 1) % SCENES.length;

    const COIN_POINTS = 25;

    // Vidas
    const MAX_LIVES = 3;            // vidas no início de cada partida
    const HEART_EVERY = 750;        // a cada quantos pontos aparece um coração
    const HEART_FULL_BONUS = 50;    // pontos extras se pegar o coração com as vidas cheias
    const INVULN_TIME = 1.6;        // segundos de invencibilidade depois de levar uma batida

    // rate = multiplicador de velocidade do cenário e dos canos
    // Depois do último nível da tabela o jogo continua sem fim: a cada ENDLESS_STEP
    // pontos sobe mais um nível, até a velocidade máxima (MAX_RATE).
    const LEVELS = [
        { nivel: 1,  pontos: 0,    rate: 1.00 },
        { nivel: 2,  pontos: 200,  rate: 1.15 },
        { nivel: 3,  pontos: 450,  rate: 1.30 },
        { nivel: 4,  pontos: 750,  rate: 1.45 },
        { nivel: 5,  pontos: 1100, rate: 1.60 },
        { nivel: 6,  pontos: 1500, rate: 1.75 },
        { nivel: 7,  pontos: 1950, rate: 1.90 },
        { nivel: 8,  pontos: 2450, rate: 2.05 },
        { nivel: 9,  pontos: 3000, rate: 2.20 },
        { nivel: 10, pontos: 3600, rate: 2.35 },
        { nivel: 11, pontos: 4250, rate: 2.50 },
        { nivel: 12, pontos: 4950, rate: 2.65 }
    ];
    const ENDLESS_STEP = 700;
    const ENDLESS_RATE_STEP = 0.08;
    const MAX_RATE = 3.1;

    // Ordem dos cenários: dia → noite → dia (vai e volta a cada nível)
    const STAGE_CYCLE = [1, 2, 3, 4, 5, 4, 3, 2];

    const BASE_CROSS_TIME = 2.2;   // segundos que um cano leva para cruzar a tela no nível 1
    const GRAVITY = 2600;          // px/s² (na altura de referência de 480px)
    const JUMP_VELOCITY = 950;     // px/s
    const JUMP_BUFFER = 0.12;      // perdoa o toque dado um instante antes de aterrissar
    const PLAYER_X = 28;
    const PIPE_BASE_W = 100;       // largura do robô (obstáculo), na altura de referência de 480px
    const COIN_BASE = 34;

    const KEYS = {
        player: 'superjump_player',
        char: 'superjump_char',
        best: 'superjump_best',
        unlocked: 'superjump_unlocked',
        muted: 'superjump_muted'
    };

    // Músicas (arquivos MP3 na pasta assets/audio). Menu, ranking e fim de jogo tocam "menu";
    // durante a partida toca "game". Os sons de moeda e coração são gerados pelo navegador.
    const SOUNDS = {
        menu: 'assets/audio/menu.mp3',
        game: 'assets/audio/jogo.mp3'
    };
    const MUSIC_VOLUME = 0.35;     // 0 a 1

    /* =====================================================
       ELEMENTOS
       ===================================================== */
    const $ = (id) => document.getElementById(id);

    const board = $('game-board');
    const ground = $('ground');
    const player = $('player');
    const shadow = $('shadow');
    const clouds = [
        { el: $('cloud-a'), x: 0, factor: 0.10 },
        { el: $('cloud-b'), x: 0, factor: 0.18 }
    ];
    const bgTrack = $('bg-track');
    const bgImgs = bgTrack.querySelectorAll('img');
    const jumpTip = $('jump-tip');
    const levelBanner = $('level-banner');

    const hudPlayerName = $('hud-player-name');
    const levelDisplay = $('level-display');
    const coinsDisplay = $('coins-display');
    const livesDisplay = $('lives-display');
    const scoreDisplay = $('score-display');

    const startModal = $('start-modal');
    const panelHome = $('panel-home');
    const panelChars = $('panel-chars');
    const startForm = $('start-form');
    const playerInput = $('player-input');
    const chosenBtn = $('chosen-btn');
    const chosenImg = $('chosen-img');
    const chosenName = $('chosen-name');
    const charGrid = $('char-grid');
    const btnBack = $('btn-back');
    const btnViewRanking = $('btn-view-ranking');
    const serverStatus = $('server-status');
    const serverStatusText = $('server-status-text');

    const gameoverModal = $('gameover-modal');
    const gameoverCard = $('gameover-card');
    const gameoverTitle = $('gameover-title');
    const finalScoreValue = $('final-score-value');
    const finalCoinsValue = $('final-coins-value');
    const saveStatusMsg = $('save-status-msg');
    const rankingBody = $('ranking-body');
    const btnRestart = $('btn-restart');
    const btnChangePlayer = $('btn-change-player');

    /* =====================================================
       ESTADO
       ===================================================== */
    const state = {
        playing: false,
        char: DEFAULT_CHARACTER,
        player: '',
        score: 0,
        coins: 0,
        level: LEVELS[0],
        last: 0,
        raf: 0,
        tick: 0,            // acumulador do ponto por tempo
        y: 0,               // altura do personagem acima do chão
        vy: 0,
        onGround: true,
        jumpBuffer: 0,
        scroll: 0,
        sinceSpawn: 0,
        nextGap: 0,
        pipes: [],
        coinsOnBoard: [],       // moedas e corações coletáveis
        lives: MAX_LIVES,
        invuln: 0,              // tempo restante de invencibilidade
        nextHeartAt: HEART_EVERY,
        heartPending: false,
        theme: null,            // 'toquio' | 'galinha' | null (fundo secreto; null = fundos padrão)
        scene: 0                // índice em SCENES (fundo padrão atual)
    };

    let dims = { w: 900, h: 480, s: 1, groundH: 56, playerW: 130, playerH: 130, pipeW: 80, coin: 34 };

    // Mede a imagem do cano uma vez, para saber a proporção
    const pipeProbe = new Image();
    pipeProbe.src = PIPE_SRC;
    Object.values(THEMES).forEach((t) => { new Image().src = t.src; });
    SCENES.forEach((s) => { new Image().src = s.src; });
    new Image().src = PIPE_DEAD_SRC;
    Object.values(CHARACTERS).forEach((c) => {
        [c.img, c.over].filter(Boolean).forEach((src) => { new Image().src = src; });
    });

    /* =====================================================
       UTILIDADES
       ===================================================== */
    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignora */ } }
    };

    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (list) => list[Math.floor(Math.random() * list.length)];

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function levelFor(score) {
        let found = LEVELS[0];
        for (const lvl of LEVELS) if (score >= lvl.pontos) found = lvl;

        const last = LEVELS[LEVELS.length - 1];
        if (score >= last.pontos + ENDLESS_STEP) {
            const extra = Math.floor((score - last.pontos) / ENDLESS_STEP);
            return {
                nivel: last.nivel + extra,
                pontos: last.pontos + extra * ENDLESS_STEP,
                rate: Math.min(MAX_RATE, last.rate + extra * ENDLESS_RATE_STEP)
            };
        }
        return found;
    }

    const stageFor = (nivel) => STAGE_CYCLE[(nivel - 1) % STAGE_CYCLE.length];

    const currentSpeed = () => (dims.w / BASE_CROSS_TIME) * state.level.rate;

    /* =====================================================
       SONS
       ===================================================== */
    const soundToggle = $('sound-toggle');
    const music = {};
    Object.entries(SOUNDS).forEach(([name, src]) => {
        const a = new Audio(src);
        a.loop = true;
        a.volume = MUSIC_VOLUME;
        a.preload = 'auto';
        music[name] = a;
    });

    let muted = store.get(KEYS.muted) === '1';
    let currentTrack = null;
    let audioCtx = null;

    function tryPlay(a) {
        const p = a.play();
        if (p && p.catch) p.catch(() => { /* bloqueado até o 1º toque, ou arquivo ausente */ });
        return p;
    }

    // restart = true começa a música do zero (usado na música da partida)
    function playMusic(name, restart = false) {
        currentTrack = name;
        Object.entries(music).forEach(([key, a]) => { if (key !== name) a.pause(); });
        const a = music[name];
        if (restart) { try { a.currentTime = 0; } catch (e) { /* ignora */ } }
        if (!muted) tryPlay(a);
    }

    function renderSoundToggle() {
        soundToggle.textContent = muted ? '🔇' : '🔊';
        soundToggle.setAttribute('aria-pressed', muted ? 'true' : 'false');
        soundToggle.setAttribute('aria-label', muted ? 'Ligar o som' : 'Desligar o som');
    }

    function setMuted(value) {
        muted = value;
        store.set(KEYS.muted, muted ? '1' : '0');
        renderSoundToggle();
        if (muted) Object.values(music).forEach((a) => a.pause());
        else if (currentTrack) tryPlay(music[currentTrack]);
    }

    function getAudioCtx() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            audioCtx = new AC();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    // Uma nota curta (efeitos sonoros)
    function beep(freq, start, dur, type, vol) {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const t0 = ctx.currentTime + start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    // Moeda: dois "blips" agudos, no estilo clássico
    function playCoin() {
        if (muted) return;
        beep(988, 0, 0.09, 'square', 0.12);
        beep(1319, 0.08, 0.3, 'square', 0.12);
    }

    // Coração: arpejo subindo, mais suave
    function playHeart() {
        if (muted) return;
        [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.08, 0.24, 'triangle', 0.2));
    }

    function initAudio() {
        renderSoundToggle();
        soundToggle.addEventListener('click', () => setMuted(!muted));

        // Navegadores só deixam tocar som depois do primeiro toque/tecla na página
        const unlockEvents = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'];
        const removeUnlock = () => unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock));
        function unlock() {
            getAudioCtx();
            if (muted || !currentTrack) return;
            const p = music[currentTrack].play();
            if (p && p.then) p.then(removeUnlock).catch(() => { /* tenta de novo no próximo toque */ });
            else removeUnlock();
        }
        unlockEvents.forEach((ev) => window.addEventListener(ev, unlock));

        // Aba escondida: pausa a música
        document.addEventListener('visibilitychange', () => {
            if (!currentTrack) return;
            if (document.hidden) music[currentTrack].pause();
            else if (!muted) tryPlay(music[currentTrack]);
        });

        playMusic('menu');
    }

    /* =====================================================
       PERSONAGENS SECRETOS E TEMAS
       ===================================================== */
    let unlocked = new Set();
    try { unlocked = new Set(JSON.parse(store.get(KEYS.unlocked) || '[]')); } catch (e) { unlocked = new Set(); }

    const isLocked = (key) => !!CHARACTERS[key].secret && !unlocked.has(key);

    const normalizeName = (name) =>
        name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Retorna true se acabou de ser liberado agora
    function unlockCharacter(key) {
        if (unlocked.has(key)) return false;
        unlocked.add(key);
        store.set(KEYS.unlocked, JSON.stringify([...unlocked]));
        buildCharGrid();
        return true;
    }

    // Bloqueia de novo todos os personagens secretos (para a próxima pessoa)
    function resetUnlocked() {
        unlocked.clear();
        store.set(KEYS.unlocked, '[]');
        buildCharGrid();
        // Se o personagem escolhido era secreto, volta para o padrão
        if (isLocked(state.char)) selectCharacter(DEFAULT_CHARACTER);
    }

    // Fundo atual: o secreto (se houver) ou o do nível em que o jogador está
    const currentBg = () => (state.theme ? THEMES[state.theme] : SCENES[state.scene]);

    function applyBackground() {
        const bg = currentBg();
        board.classList.add('themed');
        board.classList.remove(...Object.keys(THEMES).map((k) => 'theme-' + k));
        if (state.theme) board.classList.add('theme-' + state.theme);
        bgImgs.forEach((img) => {
            if (img.getAttribute('src') !== bg.src) img.src = bg.src;
        });
    }

    function applyTheme(key) {
        state.theme = THEMES[key] ? key : null;
        applyBackground();
    }

    // Troca o fundo padrão quando o nível muda (nomes secretos mantêm o seu fundo)
    function changeScene(index) {
        if (state.theme || index === state.scene) return;
        state.scene = index;
        applyBackground();
        measure();
        refitObjects();
    }

    // Cada fundo tem o chão numa altura; canos e moedas já na tela acompanham
    function refitObjects() {
        state.coinsOnBoard.forEach((c) => { c.el.style.bottom = (dims.groundH + c.y) + 'px'; });
    }

    /* =====================================================
       MEDIDAS E LAYOUT
       ===================================================== */
    function measure() {
        const ch = CHARACTERS[state.char];
        const w = board.clientWidth;
        const h = board.clientHeight;
        const s = h / 480;

        // Fundo temático: a imagem cobre o palco, e o chão passa a ser o da imagem
        const theme = currentBg();
        let sceneW = 0;
        if (theme) {
            const scaledH = Math.max(h, w / theme.ratio);
            sceneW = Math.ceil(scaledH * theme.ratio);
            board.style.setProperty('--ground-h', Math.round(scaledH * theme.groundFrac) + 'px');
            bgTrack.style.width = sceneW * 3 + 'px';
            bgTrack.style.height = Math.round(scaledH) + 'px';
            bgImgs.forEach((img) => {
                img.style.width = sceneW + 'px';
                img.style.height = Math.round(scaledH) + 'px';
            });
        } else {
            board.style.removeProperty('--ground-h');
        }

        dims = {
            w, h, s, sceneW,
            groundH: ground.offsetHeight,
            playerW: Math.round(ch.largura * s),
            playerH: 0,
            pipeW: Math.round(PIPE_BASE_W * s),
            coin: Math.round(COIN_BASE * s)
        };

        player.style.width = dims.playerW + 'px';
        dims.playerH = player.offsetHeight || dims.playerW;

        shadow.style.width = Math.round(dims.playerW * 0.6) + 'px';
        shadow.style.left = Math.round(PLAYER_X + dims.playerW * 0.2) + 'px';
    }

    player.addEventListener('load', () => {
        dims.playerH = player.offsetHeight || dims.playerW;
    });

    window.addEventListener('resize', () => {
        measure();
        refitObjects();
        if (!state.playing) renderIdle();
    });

    /* =====================================================
       PERSONAGEM
       ===================================================== */
    function buildCharGrid() {
        charGrid.innerHTML = '';
        Object.entries(CHARACTERS).forEach(([key, c]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'char-card';
            btn.dataset.char = key;

            if (isLocked(key)) {
                btn.classList.add('locked');
                btn.setAttribute('aria-disabled', 'true');
                btn.setAttribute('aria-label', 'Personagem secreto bloqueado');
                btn.innerHTML = `<img src="${c.img}" alt=""><span>🔒 ???</span>`;
            } else {
                btn.setAttribute('aria-pressed', 'false');
                btn.innerHTML = `<img src="${c.img}" alt=""><span>${c.nome}</span>`;
            }
            charGrid.appendChild(btn);
        });
        if (CHARACTERS[state.char]) markSelected();
    }

    function markSelected() {
        charGrid.querySelectorAll('.char-card').forEach((card) => {
            const on = card.dataset.char === state.char;
            card.classList.toggle('selected', on);
            if (!card.classList.contains('locked')) card.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function selectCharacter(key) {
        if (!CHARACTERS[key] || isLocked(key)) key = DEFAULT_CHARACTER;
        const c = CHARACTERS[key];
        state.char = key;
        store.set(KEYS.char, key);

        markSelected();

        chosenImg.src = c.img;
        chosenName.textContent = c.nome;

        if (!state.playing) {
            player.src = c.img;
            player.alt = c.nome;
            player.classList.remove('is-dead');
            measure();
        }
    }

    charGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.char-card');
        if (!card || card.classList.contains('locked')) return;
        selectCharacter(card.dataset.char);
        showPanel('home');
    });

    function showPanel(name) {
        panelHome.hidden = name !== 'home';
        panelChars.hidden = name !== 'chars';
        if (name === 'home') playerInput.focus({ preventScroll: true });
        else {
            const sel = charGrid.querySelector('.selected');
            if (sel) sel.focus({ preventScroll: true });
        }
    }

    chosenBtn.addEventListener('click', () => showPanel('chars'));
    btnBack.addEventListener('click', () => showPanel('home'));

    /* =====================================================
       JOGO
       ===================================================== */
    function clearObjects() {
        state.pipes.forEach((p) => p.el.remove());
        state.coinsOnBoard.forEach((c) => c.el.remove());
        state.pipes = [];
        state.coinsOnBoard = [];
    }

    function setStage(nivel) {
        board.classList.remove('stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5');
        board.classList.add('stage-' + nivel);
    }

    function startGame() {
        cancelAnimationFrame(state.raf);
        clearObjects();

        const c = CHARACTERS[state.char];
        player.src = c.img;
        player.alt = c.nome;
        player.classList.remove('is-dead');
        board.classList.remove('shake');
        player.style.marginLeft = '';
        state.scene = 0;          // toda partida começa no primeiro fundo
        applyBackground();
        measure();

        Object.assign(state, {
            playing: true,
            score: 0,
            coins: 0,
            level: LEVELS[0],
            tick: 0,
            y: 0,
            vy: 0,
            onGround: true,
            jumpBuffer: 0,
            scroll: 0,
            sinceSpawn: 0,
            lives: MAX_LIVES,
            invuln: 0,
            nextHeartAt: HEART_EVERY,
            heartPending: false
        });

        player.classList.remove('blink');
        renderLives();
        setStage(1);
        hudPlayerName.textContent = state.player || 'Jogador';
        levelDisplay.textContent = '1';
        coinsDisplay.textContent = '0';
        scoreDisplay.textContent = '0';
        jumpTip.style.opacity = '1';

        clouds[0].x = dims.w * 0.18;
        clouds[1].x = dims.w * 0.62;

        spawnPipe();
        playMusic('game', true);

        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

        state.last = performance.now();
        state.raf = requestAnimationFrame(frame);
    }

    function frame(now) {
        if (!state.playing) return;
        const dt = Math.min(0.05, (now - state.last) / 1000);
        state.last = now;

        update(dt);
        if (!state.playing) return;   // morreu neste quadro

        render();
        state.raf = requestAnimationFrame(frame);
    }

    function update(dt) {
        const speed = currentSpeed();

        // Pontos por tempo: 1 ponto a cada 100 ms
        state.tick += dt;
        while (state.tick >= 0.1) {
            state.tick -= 0.1;
            addScore(1);
        }

        // Invencibilidade depois de perder uma vida
        if (state.invuln > 0) {
            state.invuln -= dt;
            if (state.invuln <= 0) player.classList.remove('blink');
        }

        // Pulo (com buffer: toque um pouco antes de pousar também vale)
        if (state.jumpBuffer > 0) {
            state.jumpBuffer -= dt;
            if (state.onGround) doJump();
        }
        if (!state.onGround) {
            state.vy -= GRAVITY * dims.s * dt;
            state.y += state.vy * dt;
            if (state.y <= 0) {
                state.y = 0;
                state.vy = 0;
                state.onGround = true;
            }
        }

        // Cenário
        state.scroll += speed * dt;
        clouds.forEach((cl) => {
            cl.x -= speed * cl.factor * dt;
            const cw = cl.el.offsetWidth || 200;
            if (cl.x < -cw) cl.x = dims.w + rand(0, 120);
        });

        // Novos canos por distância percorrida
        state.sinceSpawn += speed * dt;
        if (state.sinceSpawn >= state.nextGap) spawnPipe();

        // Hitbox do personagem (um pouco menor que o desenho: mais justo)
        const pL = PLAYER_X + dims.playerW * 0.24;
        const pR = PLAYER_X + dims.playerW * 0.76;
        const pBottom = state.y + dims.playerH * 0.06;
        const pTop = state.y + dims.playerH * 0.92;

        // Canos
        for (let i = state.pipes.length - 1; i >= 0; i--) {
            const p = state.pipes[i];
            p.x -= speed * dt;

            if (p.x < -p.w - 10) {
                p.el.remove();
                state.pipes.splice(i, 1);
                continue;
            }

            const l = p.x + p.w * 0.14;
            const r = p.x + p.w * 0.86;
            if (!p.broken && state.invuln <= 0 && pR > l && pL < r && pBottom < p.h * 0.88) {
                if (loseLife(p, i)) return;   // acabaram as vidas
            }
        }

        // Moedas
        for (let i = state.coinsOnBoard.length - 1; i >= 0; i--) {
            const c = state.coinsOnBoard[i];
            c.x -= speed * dt;

            if (c.x < -c.w - 10) {
                c.el.remove();
                state.coinsOnBoard.splice(i, 1);
                continue;
            }

            const touchX = pR > c.x + 4 && pL < c.x + c.w - 4;
            const touchY = pBottom < c.y + c.h && pTop > c.y;
            if (touchX && touchY) collectPickup(c, i);
        }
    }

    function render() {
        player.style.transform = `translate3d(0, ${-state.y}px, 0)`;

        // A sombra encolhe conforme o personagem sobe
        const k = Math.max(0.35, 1 - state.y / (260 * dims.s));
        shadow.style.transform = `scaleX(${k})`;
        shadow.style.opacity = k;

        ground.style.setProperty('--scroll', `${-state.scroll}px`);
        if (dims.sceneW) {
            const off = (state.scroll * BG_SPEED_FACTOR) % (2 * dims.sceneW);
            bgTrack.style.transform = `translate3d(${-off}px, 0, 0)`;
        }

        clouds.forEach((cl) => { cl.el.style.transform = `translate3d(${cl.x}px, 0, 0)`; });
        state.pipes.forEach((p) => { p.el.style.transform = `translate3d(${p.x}px, 0, 0)`; });
        state.coinsOnBoard.forEach((c) => { c.el.style.translate = `${c.x}px 0`; });
    }

    // Posição de repouso (antes de jogar / ao redimensionar)
    function renderIdle() {
        player.style.transform = '';
        shadow.style.transform = '';
        bgTrack.style.transform = '';
        clouds[0].x = dims.w * 0.18;
        clouds[1].x = dims.w * 0.62;
        clouds.forEach((cl) => { cl.el.style.transform = `translate3d(${cl.x}px, 0, 0)`; });
    }

    /* ---------- Pontos e níveis ---------- */
    function addScore(n) {
        state.score += n;
        scoreDisplay.textContent = state.score;

        // A cada HEART_EVERY pontos, um coração entra no próximo intervalo entre canos
        while (state.score >= state.nextHeartAt) {
            state.nextHeartAt += HEART_EVERY;
            state.heartPending = true;
        }

        const lvl = levelFor(state.score);
        if (lvl.nivel !== state.level.nivel) {
            state.level = lvl;
            levelDisplay.textContent = lvl.nivel;
            setStage(stageFor(lvl.nivel));
            changeScene(sceneIndexFor(lvl.nivel));
            showBanner('Nível ' + lvl.nivel);
        }
    }

    function showBanner(text, small = false) {
        levelBanner.textContent = text;
        levelBanner.classList.toggle('banner-sm', small);
        levelBanner.classList.remove('show');
        void levelBanner.offsetWidth;   // reinicia a animação
        levelBanner.classList.add('show');
    }

    /* ---------- Canos e moedas ---------- */
    function spawnPipe() {
        const w = Math.round(dims.pipeW * rand(0.9, 1.1));
        const ratio = pipeProbe.naturalWidth
            ? Math.min(1.5, pipeProbe.naturalHeight / pipeProbe.naturalWidth)
            : 1.2;
        const h = Math.round(w * ratio);

        // O obstáculo (o robô) é um bloco com a imagem dentro
        const el = document.createElement('div');
        el.className = 'pipe';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.transform = `translate3d(${dims.w}px, 0, 0)`;

        const img = document.createElement('img');
        img.src = PIPE_SRC;
        img.alt = '';
        img.draggable = false;
        el.appendChild(img);

        board.appendChild(el);

        const pipe = { el, img, x: dims.w, w, h, broken: false };
        state.pipes.push(pipe);

        // Tempo entre canos fica parecido em qualquer velocidade
        state.sinceSpawn = 0;
        const lv = state.level.nivel - 1;
        const gapMin = Math.max(0.9, 1.15 - lv * 0.03);
        const gapMax = Math.max(1.35, 2.0 - lv * 0.06);
        state.nextGap = currentSpeed() * rand(gapMin, gapMax);

        // Recompensa: moeda sobre o cano (risco/recompensa) ou no meio do intervalo
        const r = Math.random();
        if (state.heartPending) {
            state.heartPending = false;
            addPickup('heart', dims.w + state.nextGap / 2, 30 * dims.s);
        } else if (r < 0.5) {
            addPickup('coin', pipe.x + w / 2 - dims.coin / 2, h + 48 * dims.s);
        } else if (r < 0.9) {
            addPickup('coin', dims.w + state.nextGap / 2, pick([8, 80]) * dims.s);
        }
    }

    // type: 'coin' (pontos) ou 'heart' (devolve uma vida)
    function addPickup(type, x, y) {
        const el = document.createElement('div');
        let w = dims.coin;
        let h = dims.coin;

        if (type === 'heart') {
            w = Math.round(38 * dims.s);
            h = Math.round(w * 6 / 7);
            el.className = 'pickup-heart';
            el.style.width = w + 'px';
            el.style.height = h + 'px';
        } else {
            el.className = 'coin';
        }

        el.style.bottom = (dims.groundH + y) + 'px';
        el.style.translate = `${x}px 0`;
        board.appendChild(el);
        state.coinsOnBoard.push({ el, x, y, w, h, type });
    }

    function floatText(text, left, top, extraClass = '') {
        const pop = document.createElement('span');
        pop.className = 'float-pts ' + extraClass;
        pop.textContent = text;
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        board.appendChild(pop);
        pop.addEventListener('animationend', () => pop.remove());
    }

    function collectPickup(item, index) {
        const top = dims.h - dims.groundH - item.y - item.h - 18;

        item.el.remove();
        state.coinsOnBoard.splice(index, 1);

        if (item.type === 'heart') {
            playHeart();
            if (state.lives < MAX_LIVES) {
                state.lives += 1;
                renderLives();
                floatText('+1 vida', item.x, top, 'float-heart');
            } else {
                floatText('+' + HEART_FULL_BONUS, item.x, top, 'float-heart');
                addScore(HEART_FULL_BONUS);
            }
            return;
        }

        playCoin();
        floatText('+' + COIN_POINTS, item.x, top);
        state.coins += 1;
        coinsDisplay.textContent = state.coins;
        addScore(COIN_POINTS);
    }

    /* ---------- Vidas ---------- */
    function buildLives() {
        livesDisplay.innerHTML = '';
        for (let i = 0; i < MAX_LIVES; i++) {
            const h = document.createElement('span');
            h.className = 'heart';
            livesDisplay.appendChild(h);
        }
        renderLives();
    }

    function renderLives() {
        livesDisplay.querySelectorAll('.heart').forEach((h, i) => {
            h.classList.toggle('lost', i >= state.lives);
        });
        livesDisplay.setAttribute('aria-label', `${state.lives} de ${MAX_LIVES} vidas`);
    }

    // O robô que levou a batida vira a versão quebrada (e não machuca mais)
    function breakRobot(pipe) {
        pipe.broken = true;
        pipe.img.src = PIPE_DEAD_SRC;
        pipe.el.classList.add('broken');
    }

    // Retorna true se foi a última vida (fim de jogo)
    function loseLife(pipe, index) {
        state.lives -= 1;
        renderLives();
        breakRobot(pipe);

        if (state.lives <= 0) {
            gameOver();
            return true;
        }

        // Ainda tem vida: o robô fica quebrado passando pela tela e o jogador fica invencível por um instante
        state.invuln = INVULN_TIME;
        player.classList.add('blink');

        board.classList.remove('shake');
        void board.offsetWidth;
        board.classList.add('shake');
        setTimeout(() => { if (state.playing) board.classList.remove('shake'); }, 400);

        floatText('-1 vida', PLAYER_X, dims.h - dims.groundH - state.y - dims.playerH - 10, 'float-hurt');
        return false;
    }

    /* ---------- Entrada ---------- */
    function doJump() {
        state.vy = JUMP_VELOCITY * dims.s;
        state.onGround = false;
        state.jumpBuffer = 0;
        jumpTip.style.opacity = '0';
    }

    function requestJump() {
        if (!state.playing) return;
        if (state.onGround) doJump();
        else state.jumpBuffer = JUMP_BUFFER;
    }

    board.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        requestJump();
    });

    document.addEventListener('keydown', (e) => {
        if (!state.playing || e.repeat) return;
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            requestJump();
        }
    });

    // Pausa sozinho quando a aba fica escondida
    document.addEventListener('visibilitychange', () => {
        if (!state.playing) return;
        if (document.hidden) {
            cancelAnimationFrame(state.raf);
        } else {
            state.last = performance.now();
            state.raf = requestAnimationFrame(frame);
        }
    });

    /* ---------- Fim de jogo ---------- */
    function gameOver() {
        state.playing = false;
        cancelAnimationFrame(state.raf);

        board.classList.add('shake');
        player.classList.remove('blink');
        player.classList.add('is-dead');
        playMusic('menu');

        const c = CHARACTERS[state.char];
        if (c.over) {
            const probe = new Image();
            probe.onload = () => { if (!state.playing) player.src = c.over; };
            probe.src = c.over;
        }

        finalScoreValue.textContent = state.score;
        finalCoinsValue.textContent = state.coins;
        saveStatusMsg.textContent = 'Salvando pontuação…';
        saveStatusMsg.style.color = '#ffc531';

        setGameoverMode('over');
        saveScore(state.player, state.score, state.coins);

        // Dá um instante para ver o tombo antes do painel
        setTimeout(() => {
            if (!state.playing) openModal(gameoverModal);
        }, 650);
    }

    function setGameoverMode(mode) {
        const ranking = mode === 'ranking';
        gameoverCard.classList.toggle('is-ranking', ranking);
        gameoverTitle.textContent = ranking ? 'RANKING' : 'FIM DE JOGO';
        btnChangePlayer.textContent = ranking ? 'Voltar ao menu' : 'Trocar jogador ou personagem';
    }

    /* =====================================================
       RANKING (MySQL)
       ===================================================== */
    const pointsOf = (item) => {
        const n = Number(item.pontos ?? item.ponto ?? item.points ?? item.score);
        return Number.isFinite(n) ? n : 0;
    };

    function saveScore(name, score, coins) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Envia "ponto" e "pontos": funciona com qualquer um dos dois nomes no PHP
            body: JSON.stringify({ nome: name, ponto: score, pontos: score, moedas: coins })
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 'success') {
                    saveStatusMsg.textContent = 'Pontuação registrada!';
                    saveStatusMsg.style.color = '#34d399';
                    if (data.ranking) renderRanking(data.ranking, name, score);
                } else {
                    saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Não foi possível registrar.');
                    saveStatusMsg.style.color = '#f87171';
                }
            })
            .catch((err) => {
                console.error('Erro ao salvar:', err);
                saveStatusMsg.textContent = '⚠️ Sem conexão com o servidor. Pontuação não salva.';
                saveStatusMsg.style.color = '#f87171';
            });
    }

    function fetchRanking() {
        return fetch('obter_ranking.php')
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 'success' && data.ranking) renderRanking(data.ranking);
                return true;
            });
    }

    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Ainda não há pontuações. Jogue para ser o 1º!</td></tr>';
            return;
        }

        let highlighted = false;
        const medals = ['🥇 1º', '🥈 2º', '🥉 3º'];

        list.forEach((item, index) => {
            const tr = document.createElement('tr');
            const pts = pointsOf(item);

            if (!highlighted && highlightName && item.nome === highlightName && pts === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            tr.innerHTML = `
                <td class="ranking-pos">${medals[index] || (index + 1) + 'º'}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${pts} pts</td>
            `;
            rankingBody.appendChild(tr);
        });
    }

    // Mostra de verdade se o servidor responde
    function checkServer() {
        fetchRanking()
            .then(() => {
                serverStatus.classList.add('online');
                serverStatusText.textContent = 'Conectado ao servidor';
            })
            .catch(() => {
                serverStatus.classList.add('offline');
                serverStatusText.textContent = 'Sem conexão: as pontuações não serão salvas';
            });
    }

    /* =====================================================
       MODAIS E BOTÕES
       ===================================================== */
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    startForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = playerInput.value.trim();
        if (!name) {
            playerInput.focus();
            return;
        }
        // Nome diferente do último jogador = pessoa nova: os secretos voltam a ficar bloqueados
        const isNewPerson = normalizeName(state.player || '') !== normalizeName(name);
        state.player = name;
        if (isNewPerson) resetUnlocked();

        // Nome secreto? Libera o personagem e troca o fundo
        const secret = SECRETS[normalizeName(name)];
        let justUnlocked = false;
        if (secret) {
            justUnlocked = unlockCharacter(secret.char);
            if (justUnlocked) selectCharacter(secret.char);   // só escolhe sozinho na primeira vez
        }
        applyTheme(secret ? secret.theme : null);

        closeModal(startModal);
        startGame();
        if (justUnlocked) showBanner(CHARACTERS[secret.char].nome + ' liberado!', true);
    });

    btnViewRanking.addEventListener('click', () => {
        fetchRanking().catch((err) => console.error('Erro ao buscar ranking:', err));
        setGameoverMode('ranking');
        closeModal(startModal);
        openModal(gameoverModal);
    });

    btnRestart.addEventListener('click', () => {
        closeModal(gameoverModal);
        startGame();
    });

    btnChangePlayer.addEventListener('click', () => {
        closeModal(gameoverModal);
        if (state.playing) {
            state.playing = false;
            cancelAnimationFrame(state.raf);
        }
        clearObjects();
        selectCharacter(state.char);   // volta o sprite normal
        playMusic('menu');
        playerInput.value = '';        // campo de nome limpo para a próxima pessoa
        showPanel('home');
        openModal(startModal);
    });

    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */
    // Toda vez que o jogo é aberto, os personagens secretos voltam a ficar bloqueados
    unlocked.clear();
    store.set(KEYS.unlocked, '[]');

    initAudio();
    applyBackground();
    buildLives();
    buildCharGrid();
    selectCharacter(store.get(KEYS.char) || DEFAULT_CHARACTER);

    // O nome não fica salvo: apaga qualquer nome guardado por versões antigas
    store.set(KEYS.player, '');
    playerInput.value = '';

    measure();
    renderIdle();
    checkServer();
    playerInput.focus({ preventScroll: true });
})();