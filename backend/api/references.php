<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json');

require_once '../config/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') errorResponse('Méthode non autorisée', 405);

$db = (new Database())->getConnection();

// Si on demande les villes d'un département
if (isset($_GET['type']) && $_GET['type'] === 'villes' && isset($_GET['departement'])) {
    $dep = $_GET['departement'];
    $stmt = $db->prepare("SELECT name FROM cities WHERE department_code = ? ORDER BY name");
    $stmt->execute([$dep]);
    $villes = $stmt->fetchAll(PDO::FETCH_COLUMN);
    jsonResponse($villes);
} else {
    // Sinon, retourner toutes les listes de référence
    // Récupérer les départements depuis la base
    $deptStmt = $db->query("SELECT code, name FROM departments ORDER BY code");
    $departements = $deptStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Listes en dur
    $personnalites = ['Introverti', 'Extraverti', 'Ambiverti', 'Analytique', 'Créatif', 'Aventurier', 'Rêveur', 'Pragmatique'];
    $styles = ['Classique', 'Décontracté', 'Sportif', 'Élégant', 'Branché', 'Bohème', 'Gothique', 'Punk', 'Hip-hop'];
    $sexualites = ['Hétérosexuel', 'Homosexuel', 'Bisexuel', 'Pansexuel', 'Asexuel', 'Autre'];
    $musiques = ['Pop', 'Rock', 'Rap', 'Electro', 'Jazz', 'Classique', 'Reggae', 'Blues', 'Metal', 'Folk', 'Variété française', 'K-pop', 'Latino', 'Techno'];
    $looking_for = ['rencontres', 'discussion', 'histoire sérieuse'];
    $enfant = ['oui', 'non', 'peut-être plus tard'];
    $alcool = ['jamais', 'occasionnellement', 'souvent'];
    $cigarette = ['jamais', 'occasionnellement', 'souvent'];
    $animaux = ['chat', 'chien', 'autre'];
    
    jsonResponse([
        'departements' => $departements,
        'personnalites' => $personnalites,
        'styles' => $styles,
        'sexualites' => $sexualites,
        'musiques' => $musiques,
        'looking_for' => $looking_for,
        'enfant' => $enfant,
        'alcool' => $alcool,
        'cigarette' => $cigarette,
        'animaux' => $animaux
    ]);
}
?>