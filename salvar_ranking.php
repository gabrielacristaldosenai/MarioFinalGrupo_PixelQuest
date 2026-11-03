<?php
/**
 * Endpoint para salvar a pontuação do jogador no banco de dados
 */
header('Content-Type: application/json; charset=utf-8');
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
    exit;
}

// Aceita requisições tanto em formato JSON quanto form-data / POST padrão
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$nome = isset($input['nome'])
    ? trim($input['nome'])
    : '';

if (!isset($input['pontos']) || !is_numeric($input['pontos'])) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'A pontuação não foi recebida corretamente.',
        'dados_recebidos' => $input
    ]);

    exit;
}

$pontos = (int) $input['pontos'];

if (empty($nome)) {
    $nome = 'Jogador Anônimo';
}

// Limita tamanho do nome a 40 caracteres
$nome = mb_substr($nome, 0, 40);

try {
    // Insere o registro no banco com Prepared Statement
    $stmt = $pdo->prepare("INSERT INTO ranking (nome, pontos) VALUES (:nome, :pontos)");
    $stmt->execute([
        ':nome' => $nome,
        ':pontos' => $pontos
    ]);

    // Busca os 10 melhores colocados atualizados
    $stmtRanking = $pdo->prepare("
        SELECT id, nome, pontos, DATE_FORMAT(dataRegistro, '%d/%m/%Y %H:%i') as data 
        FROM ranking 
        ORDER BY pontos DESC, id ASC 
        LIMIT 10
    ");
    $stmtRanking->execute();
    $ranking = $stmtRanking->fetchAll();

    echo json_encode([
        'status' => 'success',
        'message' => 'Pontuação registrada com sucesso!',
        'ranking' => $ranking
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erro ao salvar no banco: ' . $e->getMessage()
    ]);
}