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

$db = (new Database())->getConnection();

// Vérifier match existant
$stmt = $db->prepare("SELECT id FROM matches WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)");
$stmt->execute([$user['id'], $data['targetUserId'], $data['targetUserId'], $user['id']]);
if ($stmt->fetch()) errorResponse('Match déjà existant');

$stmt = $db->prepare("INSERT INTO matches (user1_id, user2_id, status) VALUES (?, ?, 'pending')");
$stmt->execute([$user['id'], $data['targetUserId']]);

jsonResponse(['message' => 'Match créé', 'matchId' => $db->lastInsertId()]);
?>