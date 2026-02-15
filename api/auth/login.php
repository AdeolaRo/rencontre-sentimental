<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

require_once '../../config/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Méthode non autorisée', 405);

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['email']) || empty($data['password'])) errorResponse('Email et mot de passe requis');

$db = (new Database())->getConnection();

$stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$data['email']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($data['password'], $user['password_hash'])) {
    errorResponse('Email ou mot de passe incorrect', 401);
}

$token = generateToken($user['id'], $user['email']);
jsonResponse([
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'city' => $user['city'],
        'department' => $user['department'],
        'profileScore' => $user['profile_score'],
        'isVerified' => (bool)$user['is_verified']
    ]
]);
?>