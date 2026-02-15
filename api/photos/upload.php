<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization');
header('Content-Type: application/json');

require_once '../../config/functions.php';

$user = getUserFromToken();
if (!$user) errorResponse('Non autorisé', 401);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Méthode non autorisée', 405);

if (!isset($_FILES['photo'])) errorResponse('Aucune photo');

$db = (new Database())->getConnection();

// Compter les photos existantes
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM user_photos WHERE user_id = ?");
$stmt->execute([$user['id']]);
$cnt = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
if ($cnt >= 4) errorResponse('Maximum 4 photos');

$upload = uploadPhoto($_FILES['photo'], $user['id']);
if (!$upload['success']) errorResponse($upload['error']);

$isMain = isset($_POST['isMain']) && $_POST['isMain'] == 'true';
if ($isMain) {
    $db->prepare("UPDATE user_photos SET is_main = 0 WHERE user_id = ?")->execute([$user['id']]);
}

$stmt = $db->prepare("INSERT INTO user_photos (user_id, photo_url, is_main, display_order) VALUES (?,?,?,?)");
$stmt->execute([$user['id'], $upload['path'], $isMain, $cnt]);

jsonResponse(['message' => 'Photo uploadée', 'photoUrl' => $upload['path'], 'photoId' => $db->lastInsertId()]);
?>