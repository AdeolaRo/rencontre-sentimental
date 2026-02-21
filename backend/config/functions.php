<?php
// backend/config/functions.php
// Désactiver l'affichage des erreurs pour la production
error_reporting(0);
ini_set('display_errors', 0);

class Database {
    private $host = 'sentimental_db'; // Nom du service Docker
    private $dbname = 'rencontre_sentimental';
    private $user = 'sentimental_user'; // Utilisateur créé dans Docker Compose
    private $pass = 'sentimental_pass'; // Mot de passe de l'utilisateur
    private $pdo;

    public function getConnection() {
        if (!$this->pdo) {
            $this->pdo = new PDO("mysql:host=$this->host;dbname=$this->dbname;charset=utf8", $this->user, $this->pass);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }
        return $this->pdo;
    }
}

function errorResponse($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function generateToken($userId, $email) {
    // Pour simplifier, on retourne un token simple (à remplacer par JWT en production)
    return base64_encode(json_encode(['id' => $userId, 'email' => $email, 'exp' => time() + 3600 * 24]));
}

function getUserFromToken() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) return null;
    $token = str_replace('Bearer ', '', $headers['Authorization']);
    $data = json_decode(base64_decode($token), true);
    if (!$data || $data['exp'] < time()) return null;
    return $data;
}

function uploadPhoto($file, $userId) {
    // Use absolute path to the project root uploads directory
    $targetDir = dirname(__DIR__, 2) . '/uploads/';
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . "_" . $userId . "." . $extension;
    $targetFile = $targetDir . $filename;
    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        return ['success' => true, 'path' => 'uploads/' . $filename];
    }
    return ['success' => false, 'error' => 'Erreur upload: ' . error_get_last()['message']];
}
?>