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

if (empty($data['matchId']) || !isset($data['hasMet']) || empty($data['secretAnswer'])) {
    errorResponse('Données incomplètes (matchId, hasMet, secretAnswer requis)');
}

$db = (new Database())->getConnection();

// Vérifier le match accepté
$stmt = $db->prepare("SELECT * FROM matches WHERE id = :matchId AND (user1_id = :userId OR user2_id = :userId) AND status = 'accepted'");
$stmt->execute(['matchId' => $data['matchId'], 'userId' => $user['id']]);
$match = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$match) errorResponse('Match non trouvé ou non accepté', 404);

$otherUserId = ($match['user1_id'] == $user['id']) ? $match['user2_id'] : $match['user1_id'];

// Vérifier ou créer l'encounter
$stmt = $db->prepare("SELECT * FROM encounters WHERE match_id = :matchId");
$stmt->execute(['matchId' => $data['matchId']]);
$encounter = $stmt->fetch(PDO::FETCH_ASSOC);

if ($encounter) {
    $encounterId = $encounter['id'];
    // Vérifier que l'utilisateur n'a pas déjà confirmé
    $userField = ($match['user1_id'] == $user['id']) ? 'user1_confirmed' : 'user2_confirmed';
    if ($encounter[$userField]) {
        errorResponse('Vous avez déjà validé cette rencontre', 400);
    }
} else {
    // Créer un nouvel encounter
    $insert = $db->prepare("INSERT INTO encounters (match_id) VALUES (:matchId)");
    $insert->execute(['matchId' => $data['matchId']]);
    $encounterId = $db->lastInsertId();
    $encounter = ['user1_confirmed' => 0, 'user2_confirmed' => 0, 'user1_secret_correct' => 0, 'user2_secret_correct' => 0];
}

// Vérifier la réponse secrète
$stmt = $db->prepare("SELECT secret_answer FROM users WHERE id = :otherId");
$stmt->execute(['otherId' => $otherUserId]);
$other = $stmt->fetch(PDO::FETCH_ASSOC);
$secretCorrect = password_verify($data['secretAnswer'], $other['secret_answer']);

// Mettre à jour les champs correspondants
$userField = ($match['user1_id'] == $user['id']) ? 'user1_confirmed' : 'user2_confirmed';
$secretField = ($match['user1_id'] == $user['id']) ? 'user1_secret_provided' : 'user2_secret_provided';
$secretCorrectField = ($match['user1_id'] == $user['id']) ? 'user1_secret_correct' : 'user2_secret_correct';

$update = "UPDATE encounters SET $userField = :hasMet, $secretField = 1, $secretCorrectField = :secretCorrect WHERE id = :encounterId";
$stmt = $db->prepare($update);
$stmt->execute([
    'hasMet' => $data['hasMet'] ? 1 : 0,
    'secretCorrect' => $secretCorrect ? 1 : 0,
    'encounterId' => $encounterId
]);

// Si la rencontre a eu lieu et la réponse correcte, on enregistre les badges
if ($data['hasMet'] && $secretCorrect && !empty($data['badges'])) {
    $badges = json_encode($data['badges']);
    $scoreIncrement = count($data['badges']) * 10;
    
    // Vérifier si une validation existe déjà pour cet utilisateur sur cette rencontre
    $check = $db->prepare("SELECT id FROM post_meeting_validations WHERE encounter_id = :encounterId AND validator_id = :validatorId");
    $check->execute(['encounterId' => $encounterId, 'validatorId' => $user['id']]);
    if (!$check->fetch()) {
        $insert = $db->prepare("INSERT INTO post_meeting_validations (encounter_id, validator_id, validated_user_id, badges, trust_score_increment) VALUES (:encounterId, :validatorId, :validatedId, :badges, :score)");
        $insert->execute([
            'encounterId' => $encounterId,
            'validatorId' => $user['id'],
            'validatedId' => $otherUserId,
            'badges' => $badges,
            'score' => $scoreIncrement
        ]);
        
        // Mettre à jour le score de l'autre utilisateur
        $db->prepare("UPDATE users SET profile_score = profile_score + :score WHERE id = :id")->execute([
            'score' => $scoreIncrement,
            'id' => $otherUserId
        ]);
    }
}

// Vérifier si les deux ont confirmé pour créer un commentaire automatique
$updatedEncounter = $db->prepare("SELECT user1_confirmed, user2_confirmed, user1_secret_correct, user2_secret_correct FROM encounters WHERE id = ?");
$updatedEncounter->execute([$encounterId]);
$enc = $updatedEncounter->fetch(PDO::FETCH_ASSOC);

if ($enc['user1_confirmed'] && $enc['user2_confirmed'] && $enc['user1_secret_correct'] && $enc['user2_secret_correct']) {
    // Vérifier si un commentaire automatique existe déjà
    $checkComment = $db->prepare("SELECT id FROM comments WHERE encounter_id = ? AND comment = 'Rencontre vérifiée avec succès'");
    $checkComment->execute([$encounterId]);
    if (!$checkComment->fetch()) {
        $db->prepare("INSERT INTO comments (author_id, target_user_id, encounter_id, comment) VALUES (?, ?, ?, 'Rencontre vérifiée avec succès')")
           ->execute([$user['id'], $otherUserId, $encounterId]);
    }
}

jsonResponse([
    'message' => 'Validation enregistrée',
    'isSecretCorrect' => $secretCorrect,
    'hasMet' => $data['hasMet']
]);
?>