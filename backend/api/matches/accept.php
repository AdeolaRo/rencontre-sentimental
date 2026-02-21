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
if (empty($data['matchId'])) errorResponse('ID du match requis');

$db = (new Database())->getConnection();

// Vérifier que le match concerne l'utilisateur et est en pending
$stmt = $db->prepare("SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND status = 'pending'");
$stmt->execute([$data['matchId'], $user['id'], $user['id']]);
$match = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$match) errorResponse('Match non trouvé ou déjà traité', 404);

// Mettre à jour le status
$update = $db->prepare("UPDATE matches SET status = 'accepted' WHERE id = ?");
$update->execute([$data['matchId']]);

jsonResponse(['message' => 'Match accepté']);
?>