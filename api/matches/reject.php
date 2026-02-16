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

// Vérifier que le match concerne l'utilisateur
$stmt = $db->prepare("SELECT id FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)");
$stmt->execute([$data['matchId'], $user['id'], $user['id']]);
if (!$stmt->fetch()) errorResponse('Match non trouvé', 404);

// Supprimer le match (ou on pourrait passer en 'rejected')
$delete = $db->prepare("DELETE FROM matches WHERE id = ?");
$delete->execute([$data['matchId']]);

jsonResponse(['message' => 'Match rejeté']);
?>