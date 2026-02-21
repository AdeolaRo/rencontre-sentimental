<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization');
header('Content-Type: application/json');

require_once '../../config/functions.php';

$user = getUserFromToken();
if (!$user) errorResponse('Non autorisé', 401);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Méthode non autorisée', 405);

if (empty($_GET['targetUserId'])) errorResponse('ID cible requis');

$targetId = $_GET['targetUserId'];
$db = (new Database())->getConnection();

// Vérifier like/dislike
$stmt = $db->prepare("SELECT type FROM likes WHERE from_user_id = ? AND to_user_id = ?");
$stmt->execute([$user['id'], $targetId]);
$like = $stmt->fetch(PDO::FETCH_ASSOC);

// Vérifier match
$stmtMatch = $db->prepare("SELECT id FROM matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)");
$stmtMatch->execute([$user['id'], $targetId, $targetId, $user['id']]);
$match = $stmtMatch->fetch();

jsonResponse([
    'like' => $like ? $like['type'] : null,
    'match' => $match ? true : false
]);
?>