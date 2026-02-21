<?php
// Désactiver l'affichage des erreurs pour la production
error_reporting(0);
ini_set('display_errors', 0);

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

// Convertir les valeurs enum de l'anglais au français
$genderMap = ['male' => 'homme', 'female' => 'femme', 'other' => 'autre'];
$lookingForMap = ['meeting' => 'rencontres', 'discussion' => 'discussion', 'serious' => 'histoire sérieuse'];
$childMap = ['yes' => 'oui', 'no' => 'non', 'maybe' => 'peut-être plus tard'];
$alcoholMap = ['never' => 'jamais', 'occasionally' => 'occasionnellement', 'often' => 'souvent'];
$smokeMap = ['never' => 'jamais', 'occasionally' => 'occasionnellement', 'often' => 'souvent'];

// Convertir les valeurs
$data['gender'] = $genderMap[$data['gender']] ?? $data['gender'];
$data['looking_for'] = $lookingForMap[$data['looking_for']] ?? ($data['looking_for'] ?? 'rencontres');
$data['enfant'] = $childMap[$data['enfant']] ?? ($data['enfant'] ?? 'non');
$data['alcool'] = $alcoholMap[$data['alcool']] ?? ($data['alcool'] ?? 'occasionnellement');
$data['cigarette'] = $smokeMap[$data['cigarette']] ?? ($data['cigarette'] ?? 'jamais');

$db = (new Database())->getConnection();

// Vérifier email existant
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$data['email']]);
if ($stmt->fetch()) errorResponse('Email déjà utilisé');

$hashed_pass = password_hash($data['password'], PASSWORD_DEFAULT);
$hashed_secret = password_hash($data['secretAnswer'], PASSWORD_DEFAULT);

$query = "INSERT INTO users (email, password_hash, first_name, last_name, birth_date, gender, city, department, title, description, secret_question, secret_answer, emploi, looking_for, taille, enfant, alcool, cigarette, sexualite, animaux, centre_interet) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
    $hashed_secret,
    $data['emploi'] ?? null,
    $data['looking_for'],
    $data['taille'] ?? null,
    $data['enfant'],
    $data['alcool'],
    $data['cigarette'],
    $data['sexualite'] ?? null,
    $data['animaux'] ?? null,
    $data['centre_interet'] ?? null
]);
$userId = $db->lastInsertId();

// Si des données de questionnaire sont fournies
if (!empty($data['personality']) || !empty($data['passions']) || !empty($data['music_tastes']) || !empty($data['style'])) {
    $qStmt = $db->prepare("INSERT INTO user_questionnaire (user_id, personality, passions, music_tastes, style) VALUES (?, ?, ?, ?, ?)");
    $qStmt->execute([
        $userId,
        $data['personality'] ?? '',
        $data['passions'] ?? '',
        $data['music_tastes'] ?? '',
        $data['style'] ?? ''
    ]);
}

$token = generateToken($userId, $data['email']);
jsonResponse(['message' => 'Inscription réussie', 'token' => $token, 'userId' => $userId]);
?>