<?php
require_once 'conexao.php';

const TABELA_RANKING = 'ranking';
const COLUNA_PONTOS  = 'pontos';

$rankingInicial = [];
try {
    $sql = 'SELECT id, nome, `' . COLUNA_PONTOS . '` AS pontos
            FROM `' . TABELA_RANKING . '`
            ORDER BY `' . COLUNA_PONTOS . '` DESC, id ASC
            LIMIT 10';
    $rankingInicial = $pdo->query($sql)->fetchAll();
} catch (Exception $e) {
    $rankingInicial = [];
}

function medalha(int $i): string {
    return match ($i) {
        0 => '🥇 1º',
        1 => '🥈 2º',
        2 => '🥉 3º',
        default => ($i + 1) . 'º',
    };
}

$v = @filemtime(__DIR__ . '/css/style.css') ?: 1; // evita cache antigo do CSS
$vj = @filemtime(__DIR__ . '/js/script.js') ?: 1;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#171a44">
    <title>Super Jump – Corra, pule e entre no ranking</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css?v=<?= $v ?>">
</head>
<body>

    <div class="game-container">

        <button type="button" class="sound-toggle" id="sound-toggle" aria-label="Desligar o som" aria-pressed="false">🔊</button>

        <header class="hud">
            <div class="hud-item hud-player">
                <span class="label">Jogador</span>
                <span class="value" id="hud-player-name">---</span>
            </div>
            <div class="hud-item">
                <span class="label">Nível</span>
                <span class="value" id="level-display">1</span>
            </div>
            <div class="hud-item">
                <span class="label">Vidas</span>
                <span class="lives" id="lives-display" role="img" aria-label="3 vidas"></span>
            </div>
            <div class="hud-item">
                <span class="label">Moedas</span>
                <span class="value" id="coins-display">0</span>
            </div>
            <div class="hud-item">
                <span class="label">Pontos</span>
                <span class="value value-score" id="score-display">0</span>
            </div>
        </header>

        <main class="game-board stage-1" id="game-board" aria-label="Área do jogo">
            <!-- Fundo temático (só aparece com nomes secretos): 3 imagens, a do meio espelhada, para rolar sem emenda -->
            <div class="bg-track" id="bg-track" aria-hidden="true">
                <img alt="" draggable="false">
                <img alt="" draggable="false" class="flip">
                <img alt="" draggable="false">
            </div>

            <div class="stars" aria-hidden="true"></div>
            <div class="orb" aria-hidden="true"></div>

            <img class="cloud cloud-a" id="cloud-a" src="assets/clouds.png" alt="" draggable="false">
            <img class="cloud cloud-b" id="cloud-b" src="assets/clouds.png" alt="" draggable="false">

            <div class="ground" id="ground" aria-hidden="true"></div>

            <div class="shadow" id="shadow" aria-hidden="true"></div>
            <img class="player" id="player" src="assets/homem_1.gif" alt="Homem 1" draggable="false">

            <div class="level-banner" id="level-banner" aria-live="polite"></div>
            <span class="jump-tip" id="jump-tip">Toque na tela ou aperte espaço para pular</span>
        </main>

    </div>

    <!-- MENU INICIAL: nome + personagem -->
    <div class="modal-overlay active" id="start-modal" role="dialog" aria-modal="true" aria-labelledby="start-title">
        <div class="modal-card">

            <section id="panel-home">
                <div class="modal-header">
                    <h1 class="game-title" id="start-title">SUPER JUMP</h1>
                    <p class="game-subtitle">Desvie dos canos, pegue moedas e chegue ao topo do ranking.</p>
                </div>

                <button type="button" class="chosen" id="chosen-btn" aria-label="Trocar personagem">
                    <img id="chosen-img" src="assets/homem_1.gif" alt="">
                    <span class="chosen-text">
                        <small>Você joga com</small>
                        <strong id="chosen-name">Homem 1</strong>
                    </span>
                    <span class="chosen-action">Trocar</span>
                </button>

                <form class="start-form" id="start-form" autocomplete="off">
                    <div class="input-group">
                        <label for="player-input">Seu nome</label>
                        <input type="text" id="player-input" placeholder="Ex.: Ana" maxlength="30" required>
                    </div>

                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary" id="btn-start">Jogar</button>
                        <button type="button" class="btn btn-secondary" id="btn-view-ranking">Ver ranking</button>
                        <a href="empresa.html" class="btn btn-secondary" id="btn-company">Site da empresa</a>
                    </div>
                </form>
            </section>

            <section id="panel-chars" hidden>
                <div class="modal-header">
                    <h2 class="game-title game-title-sm">Escolha seu personagem</h2>
                </div>
                <div class="char-grid" id="char-grid"></div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="btn-back">Voltar ao menu</button>
                </div>
            </section>

            <div class="server-status" id="server-status">
                <span class="status-dot"></span>
                <span id="server-status-text">Conectando ao servidor…</span>
            </div>
        </div>
    </div>

    <!-- FIM DE JOGO / RANKING -->
    <div class="modal-overlay" id="gameover-modal" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
        <div class="modal-card gameover-card" id="gameover-card">
            <div class="modal-header">
                <h2 class="gameover-title" id="gameover-title">FIM DE JOGO</h2>

                <div class="result" id="result-box">
                    <div class="result-main">
                        <span class="label">Pontos</span>
                        <span class="result-score" id="final-score-value">0</span>
                    </div>
                    <div class="result-side">
                        <span class="label">Moedas</span>
                        <span class="result-num" id="final-coins-value">0</span>
                    </div>
                    <div class="result-side">
                        <span class="label">Seu recorde</span>
                        <span class="result-num" id="best-score-value">0</span>
                    </div>
                </div>
                <div class="save-status" id="save-status-msg" role="status"></div>
            </div>

            <div class="ranking-container">
                <h3 class="ranking-title">🏆 Top 10 melhores pontuações</h3>
                <div class="table-wrapper">
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Pos.</th>
                                <th>Jogador</th>
                                <th>Pontos</th>
                            </tr>
                        </thead>
                        <tbody id="ranking-body">
                            <?php if (!empty($rankingInicial)): ?>
                                <?php foreach ($rankingInicial as $i => $row): ?>
                                    <tr>
                                        <td class="ranking-pos"><?= medalha($i) ?></td>
                                        <td><strong><?= htmlspecialchars($row['nome']) ?></strong></td>
                                        <td><?= (int)$row['pontos'] ?> pts</td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="3" class="loading-cell">Ainda não há pontuações. Jogue para ser o 1º!</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn btn-primary" id="btn-restart">Jogar de novo</button>
                <button type="button" class="btn btn-secondary" id="btn-change-player">Trocar jogador ou personagem</button>
            </div>
        </div>
    </div>

    <noscript><p style="position:fixed;inset:auto 0 20px;text-align:center">Ative o JavaScript para jogar.</p></noscript>
    <script src="js/script.js?v=<?= $vj ?>" defer></script>
</body>
</html>