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
if (empty($data['matchId']) || !isset($data['hasMet'])) errorResponse('Données incomplètes');

$db = (new Database())->getConnection();

// Vérifier le match
$stmt = $db->prepare("SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND status = 'accepted'");
$stmt->execute([$data['matchId'], $user['id'], $user['id']]);
$match = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$match) errorResponse('Match non trouvé', 404);

$otherUserId = ($match['user1_id'] == $user['id']) ? $match['user2_id'] : $match['user1_id'];

// Vérifier ou créer l'encounter
$stmt = $db->prepare("SELECT id FROM encounters WHERE match_id = ?");
$stmt->execute([$data['matchId']]);
$encounter = $stmt->fetch(PDO::FETCH_ASSOC);
if ($encounter) {
    $encounterId = $encounter['id'];
} else {
    $db->prepare("INSERT INTO encounters (match_id) VALUES (?)")->execute([$data['matchId']]);
    $encounterId = $db->lastInsertId();
}

// Vérifier réponse secrète
$secretCorrect = false;
if (!empty($data['secretAnswer'])) {
    $stmt = $db->prepare("SELECT secret_answer FROM users WHERE id = ?");
    $stmt->execute([$otherUserId]);
    $other = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($other) $secretCorrect = password_verify($data['secretAnswer'], $other['secret_answer']);
}

// Mettre à jour les champs correspondants
$userField = ($match['user1_id'] == $user['id']) ? 'user1_confirmed' : 'user2_confirmed';
$secretField = ($match['user1_id'] == $user['id']) ? 'user1_secret_provided' : 'user2_secret_provided';
$secretCorrectField = ($match['user1_id'] == $user['id']) ? 'user1_secret_correct' : 'user2_secret_correct';

$update = "UPDATE encounters SET $userField = :hasMet, $secretField = 1, $secretCorrectField = :secretCorrect WHERE id = :eid";
$stmt = $db->prepare($update);
$stmt->execute(['hasMet' => $data['hasMet'], 'secretCorrect' => $secretCorrect, 'eid' => $encounterId]);

if ($secretCorrect && $data['hasMet'] && !empty($data['badges'])) {
    $badges = json_encode($data['badges']);
    $scoreInc = count($data['badges']) * 10;
    
    $stmt = $db->prepare("INSERT INTO post_meeting_validations (encounter_id, validator_id, validated_user_id, badges, trust_score_increment) VALUES (?,?,?,?,?)");
    $stmt->execute([$encounterId, $user['id'], $otherUserId, $badges, $scoreInc]);
    
    $db->prepare("UPDATE users SET profile_score = profile_score + ? WHERE id = ?")->execute([$scoreInc, $otherUserId]);
    
    // Vérifier si les deux ont confirmé
    $stmt = $db->prepare("SELECT user1_confirmed, user2_confirmed, user1_secret_correct, user2_secret_correct FROM encounters WHERE id = ?");
    $stmt->execute([$encounterId]);
    $e = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($e['user1_confirmed'] && $e['user2_confirmed'] && $e['user1_secret_correct'] && $e['user2_secret_correct']) {
        $db->prepare("INSERT INTO comments (author_id, target_user_id, encounter_id, comment) VALUES (?,?,?,'Rencontre vérifiée')")
           ->execute([$user['id'], $otherUserId, $encounterId]);
    }
}

jsonResponse(['message' => 'Validation enregistrée', 'isSecretCorrect' => $secretCorrect, 'hasMet' => $data['hasMet']]);
?>