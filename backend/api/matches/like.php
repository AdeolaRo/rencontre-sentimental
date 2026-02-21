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
if (empty($data['targetUserId'])) errorResponse('ID cible requis');

$targetId = $data['targetUserId'];
$db = (new Database())->getConnection();

// Vérifier que la cible existe
$stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
$stmt->execute([$targetId]);
if (!$stmt->fetch()) errorResponse('Utilisateur non trouvé', 404);

// Vérifier si un like existe déjà
$stmt = $db->prepare("SELECT type FROM likes WHERE from_user_id = ? AND to_user_id = ?");
$stmt->execute([$user['id'], $targetId]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    if ($existing['type'] === 'like') {
        errorResponse('Vous avez déjà liké cette personne', 400);
    } else {
        // Remplacer un dislike par un like
        $update = $db->prepare("UPDATE likes SET type = 'like' WHERE from_user_id = ? AND to_user_id = ?");
        $update->execute([$user['id'], $targetId]);
    }
} else {
    // Insérer le like
    $insert = $db->prepare("INSERT INTO likes (from_user_id, to_user_id, type) VALUES (?, ?, 'like')");
    $insert->execute([$user['id'], $targetId]);
}

// Vérifier si l'autre utilisateur nous a déjà liké
$check = $db->prepare("SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ? AND type = 'like'");
$check->execute([$targetId, $user['id']]);
if ($check->fetch()) {
    // C'est un match ! Insérer dans la table matchs
    $matchInsert = $db->prepare("INSERT IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)");
    $matchInsert->execute([$user['id'], $targetId]);
    jsonResponse(['message' => 'C\'est un match !', 'match' => true]);
} else {
    jsonResponse(['message' => 'Like enregistré', 'match' => false]);
}
?>