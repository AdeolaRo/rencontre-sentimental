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

// Vérifier si un like existe déjà
$stmt = $db->prepare("SELECT type FROM likes WHERE from_user_id = ? AND to_user_id = ?");
$stmt->execute([$user['id'], $targetId]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    if ($existing['type'] === 'dislike') {
        errorResponse('Vous avez déjà disliké cette personne', 400);
    } else {
        // Remplacer le like par dislike
        $update = $db->prepare("UPDATE likes SET type = 'dislike' WHERE from_user_id = ? AND to_user_id = ?");
        $update->execute([$user['id'], $targetId]);
        // Supprimer l'éventuel match
        $deleteMatch = $db->prepare("DELETE FROM matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)");
        $deleteMatch->execute([$user['id'], $targetId, $targetId, $user['id']]);
    }
} else {
    $insert = $db->prepare("INSERT INTO likes (from_user_id, to_user_id, type) VALUES (?, ?, 'dislike')");
    $insert->execute([$user['id'], $targetId]);
}

jsonResponse(['message' => 'Dislike enregistré']);
?>