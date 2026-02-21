<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Content-Type: application/json');

require_once '../../config/functions.php';

$user = getUserFromToken();
if (!$user) errorResponse('Non autorisé', 401);

$db = (new Database())->getConnection();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['type']) && $_GET['type'] === 'matching') {
            $department = $_GET['department'] ?? null;
            $city = $_GET['city'] ?? null;
            
            $sql = "SELECT u.*, 
                    MAX(up.photo_url) as main_photo, 
                    COUNT(DISTINCT pmv.id) as validation_count 
                    FROM users u 
                    LEFT JOIN user_photos up ON u.id = up.user_id AND up.is_main = 1 
                    LEFT JOIN post_meeting_validations pmv ON u.id = pmv.validated_user_id 
                    WHERE u.id != :uid 
                    AND NOT EXISTS (SELECT 1 FROM matches m WHERE (m.user1_id = :uid AND m.user2_id = u.id) OR (m.user2_id = :uid AND m.user1_id = u.id))";
            $params = ['uid' => $user['id']];
            if ($department) { $sql .= " AND u.department = :dept"; $params['dept'] = $department; }
            if ($city) { $sql .= " AND u.city = :city"; $params['city'] = $city; }
            $sql .= " GROUP BY u.id ORDER BY u.profile_score DESC LIMIT 20";
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse($profiles);
        }
        elseif (isset($_GET['type']) && $_GET['type'] === 'explore') {
            $search = $_GET['search'] ?? '';
            $department = $_GET['department'] ?? '';
            $city = $_GET['city'] ?? '';
            $page = (int)($_GET['page'] ?? 1);
            $limit = 20;
            $offset = ($page - 1) * $limit;
            
            $sql = "SELECT u.*, up.photo_url as main_photo FROM users u
                    LEFT JOIN user_photos up ON u.id = up.user_id AND up.is_main = 1
                    WHERE u.id != :uid";
            $params = ['uid' => $user['id']];
            if (!empty($search)) {
                $sql .= " AND (u.first_name LIKE :search OR u.last_name LIKE :search OR u.title LIKE :search)";
                $params['search'] = "%$search%";
            }
            if (!empty($department)) {
                $sql .= " AND u.department = :dept";
                $params['dept'] = $department;
            }
            if (!empty($city)) {
                $sql .= " AND u.city = :city";
                $params['city'] = $city;
            }
            $sql .= " ORDER BY u.profile_score DESC LIMIT :limit OFFSET :offset";
            
            $stmt = $db->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue(":$k", $v);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Total
            $countSql = "SELECT COUNT(*) as total FROM users WHERE id != :uid";
            $countParams = ['uid' => $user['id']];
            if (!empty($search)) {
                $countSql .= " AND (first_name LIKE :search OR last_name LIKE :search OR title LIKE :search)";
                $countParams['search'] = "%$search%";
            }
            if (!empty($department)) {
                $countSql .= " AND department = :dept";
                $countParams['dept'] = $department;
            }
            if (!empty($city)) {
                $countSql .= " AND city = :city";
                $countParams['city'] = $city;
            }
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($countParams);
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            jsonResponse(['profiles' => $profiles, 'total' => $total, 'page' => $page, 'totalPages' => ceil($total / $limit)]);
        }
        elseif (isset($_GET['id'])) {
            $profileId = $_GET['id'];
            $stmt = $db->prepare("SELECT u.*, q.* FROM users u LEFT JOIN user_questionnaire q ON u.id = q.user_id WHERE u.id = ?");
            $stmt->execute([$profileId]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$profile) errorResponse('Profil non trouvé', 404);
            
            $photosStmt = $db->prepare("SELECT * FROM user_photos WHERE user_id = ? ORDER BY display_order");
            $photosStmt->execute([$profileId]);
            $photos = $photosStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $commentsStmt = $db->prepare("SELECT c.*, u.first_name, u.last_name FROM comments c JOIN users u ON c.author_id = u.id WHERE c.target_user_id = ? AND c.is_visible = 1 ORDER BY c.created_at DESC");
            $commentsStmt->execute([$profileId]);
            $comments = $commentsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(['user' => $profile, 'photos' => $photos, 'comments' => $comments]);
        }
        else {
            // Mon profil
            $stmt = $db->prepare("SELECT u.*, q.* FROM users u LEFT JOIN user_questionnaire q ON u.id = q.user_id WHERE u.id = ?");
            $stmt->execute([$user['id']]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $photosStmt = $db->prepare("SELECT * FROM user_photos WHERE user_id = ? ORDER BY display_order");
            $photosStmt->execute([$user['id']]);
            $photos = $photosStmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(['user' => $profile, 'photos' => $photos]);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        // Mise à jour des champs de base
        $stmt = $db->prepare("UPDATE users SET first_name=?, last_name=?, city=?, department=?, title=?, description=?, emploi=?, looking_for=?, taille=?, enfant=?, alcool=?, cigarette=?, sexualite=?, animaux=?, centre_interet=? WHERE id=?");
        $stmt->execute([
            $data['firstName'],
            $data['lastName'],
            $data['city'],
            $data['department'],
            $data['title'],
            $data['description'] ?? '',
            $data['emploi'] ?? null,
            $data['looking_for'] ?? 'rencontres',
            $data['taille'] ?? null,
            $data['enfant'] ?? 'non',
            $data['alcool'] ?? 'occasionnellement',
            $data['cigarette'] ?? 'jamais',
            $data['sexualite'] ?? null,
            $data['animaux'] ?? null,
            $data['centre_interet'] ?? null,
            $user['id']
        ]);
        
        // Mise à jour du questionnaire
        if (isset($data['personality']) || isset($data['passions']) || isset($data['music_tastes']) || isset($data['style'])) {
            $check = $db->prepare("SELECT id FROM user_questionnaire WHERE user_id=?");
            $check->execute([$user['id']]);
            if ($check->fetch()) {
                $qStmt = $db->prepare("UPDATE user_questionnaire SET personality=?, passions=?, music_tastes=?, style=? WHERE user_id=?");
                $qStmt->execute([
                    $data['personality'] ?? '',
                    $data['passions'] ?? '',
                    $data['music_tastes'] ?? '',
                    $data['style'] ?? '',
                    $user['id']
                ]);
            } else {
                $qStmt = $db->prepare("INSERT INTO user_questionnaire (user_id, personality, passions, music_tastes, style) VALUES (?,?,?,?,?)");
                $qStmt->execute([
                    $user['id'],
                    $data['personality'] ?? '',
                    $data['passions'] ?? '',
                    $data['music_tastes'] ?? '',
                    $data['style'] ?? ''
                ]);
            }
        }
        jsonResponse(['message' => 'Profil mis à jour']);
        break;
        
    default:
        errorResponse('Méthode non autorisée', 405);
}
?>