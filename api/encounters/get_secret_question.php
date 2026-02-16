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

if (empty($_GET['userId'])) errorResponse('ID utilisateur requis');

$targetId = $_GET['userId'];
$db = (new Database())->getConnection();

// Vérifier qu'il existe un match accepté entre les deux
$stmt = $db->prepare("SELECT id FROM matches WHERE ((user1_id = :uid AND user2_id = :target) OR (user1_id = :target AND user2_id = :uid)) AND status = 'accepted'");
$stmt->execute(['uid' => $user['id'], 'target' => $targetId]);
if (!$stmt->fetch()) errorResponse('Vous n\'avez pas de match accepté avec cette personne', 403);

// Récupérer la question secrète
$stmt = $db->prepare("SELECT secret_question FROM users WHERE id = ?");
$stmt->execute([$targetId]);
$question = $stmt->fetchColumn();

jsonResponse(['secretQuestion' => $question]);
?>