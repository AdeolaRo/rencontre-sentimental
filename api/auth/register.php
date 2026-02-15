<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

require_once '../../config/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') errorResponse('Méthode non autorisée', 405);

$data = json_decode(file_get_contents('php://input'), true);
$required = ['email','password','firstName','lastName','birthDate','gender','city','department','title','secretQuestion','secretAnswer'];
foreach ($required as $field) {
    if (empty($data[$field])) errorResponse("Champ $field requis");
}

$db = (new Database())->getConnection();

// Vérifier email existant
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$data['email']]);
if ($stmt->fetch()) errorResponse('Email déjà utilisé');

$hashed_pass = password_hash($data['password'], PASSWORD_DEFAULT);
$hashed_secret = password_hash($data['secretAnswer'], PASSWORD_DEFAULT);

$query = "INSERT INTO users (email, password_hash, first_name, last_name, birth_date, gender, city, department, title, description, secret_question, secret_answer) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $db->prepare($query);
$stmt->execute([
    $data['email'],
    $hashed_pass,
    $data['firstName'],
    $data['lastName'],
    $data['birthDate'],
    $data['gender'],
    $data['city'],
    $data['department'],
    $data['title'],
    $data['description'] ?? '',
    $data['secretQuestion'],
    $hashed_secret
]);
$userId = $db->lastInsertId();

// Questionnaire
if (!empty($data['questionnaire'])) {
    $q = $data['questionnaire'];
    $stmt = $db->prepare("INSERT INTO user_questionnaire (user_id, personality, preferences, style, music_tastes, passions, lifestyle) VALUES (?,?,?,?,?,?,?)");
    $stmt->execute([$userId, $q['personality']??'', $q['preferences']??'', $q['style']??'', $q['musicTastes']??'', $q['passions']??'', $q['lifestyle']??'']);
}

$token = generateToken($userId, $data['email']);
jsonResponse(['message' => 'Inscription réussie', 'token' => $token, 'userId' => $userId]);
?>