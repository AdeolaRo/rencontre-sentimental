<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Content-Type: application/json');

require_once '../../config/functions.php';

$user = getUserFromToken();
if (!$user) errorResponse('Non autorisé', 401);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Méthode non autorisée', 405);

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['targetUserId']) || empty($data['comment']) || empty($data['encounterId'])) {
    errorResponse('Données incomplètes');
}

$db = (new Database())->getConnection();

// Vérifier que la rencontre est validée des deux côtés
$stmt = $db->prepare("SELECT id FROM encounters WHERE id = ? AND 
                      ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) 
                      AND user1_confirmed = 1 AND user2_confirmed = 1 
                      AND user1_secret_correct = 1 AND user2_secret_correct = 1");
$stmt->execute([$data['encounterId'], $user['id'], $data['targetUserId'], $data['targetUserId'], $user['id']]);
if (!$stmt->fetch()) errorResponse('Rencontre non vérifiée', 403);

$stmt = $db->prepare("INSERT INTO comments (author_id, target_user_id, encounter_id, comment) VALUES (?,?,?,?)");
$stmt->execute([$user['id'], $data['targetUserId'], $data['encounterId'], $data['comment']]);

jsonResponse(['message' => 'Commentaire ajouté', 'commentId' => $db->lastInsertId()]);
?>