<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Content-Type: application/json');

require_once '../../config/functions.php';

$user = getUserFromToken();
if (!$user) errorResponse('Non autorisé', 401);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Méthode non autorisée', 405);

$db = (new Database())->getConnection();

// Récupérer tous les matchs où l'utilisateur est impliqué
$query = "SELECT m.*, 
                 u1.first_name as user1_name, u1.last_name as user1_last, u1.city as user1_city,
                 u2.first_name as user2_name, u2.last_name as user2_last, u2.city as user2_city,
                 up.photo_url as other_photo
          FROM matches m
          LEFT JOIN users u1 ON m.user1_id = u1.id
          LEFT JOIN users u2 ON m.user2_id = u2.id
          LEFT JOIN user_photos up ON (up.user_id = (CASE WHEN m.user1_id = :uid THEN m.user2_id ELSE m.user1_id END) AND up.is_main = 1)
          WHERE m.user1_id = :uid OR m.user2_id = :uid
          ORDER BY m.created_at DESC";

$stmt = $db->prepare($query);
$stmt->execute(['uid' => $user['id']]);
$matches = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Pour chaque match, déterminer l'autre utilisateur et si on peut valider
$result = [];
foreach ($matches as $match) {
    $otherId = ($match['user1_id'] == $user['id']) ? $match['user2_id'] : $match['user1_id'];
    $otherName = ($match['user1_id'] == $user['id']) ? $match['user2_name'] . ' ' . $match['user2_last'] : $match['user1_name'] . ' ' . $match['user1_last'];
    
    // Vérifier s'il existe déjà une rencontre validée pour ce match
    $encStmt = $db->prepare("SELECT id, user1_confirmed, user2_confirmed FROM encounters WHERE match_id = ?");
    $encStmt->execute([$match['id']]);
    $encounter = $encStmt->fetch(PDO::FETCH_ASSOC);
    
    $canValidate = false;
    $alreadyValidated = false;
    if ($encounter) {
        // Si les deux ont confirmé, c'est déjà validé
        if ($encounter['user1_confirmed'] && $encounter['user2_confirmed']) {
            $alreadyValidated = true;
        } else {
            // Sinon, l'utilisateur peut encore valider si ce n'est pas déjà fait
            $userConfirmedField = ($match['user1_id'] == $user['id']) ? 'user1_confirmed' : 'user2_confirmed';
            $canValidate = !$encounter[$userConfirmedField];
        }
    } else {
        $canValidate = true; // Pas encore de rencontre, on peut initier
    }
    
    $result[] = [
        'matchId' => $match['id'],
        'otherUserId' => $otherId,
        'otherName' => $otherName,
        'otherPhoto' => $match['other_photo'] ?? 'uploads/default-avatar.jpg',
        'status' => $match['status'],
        'createdAt' => $match['created_at'],
        'canValidate' => $canValidate,
        'alreadyValidated' => $alreadyValidated
    ];
}

jsonResponse($result);
?>