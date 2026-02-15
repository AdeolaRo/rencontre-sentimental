<?php
require_once 'database.php';

function getUserFromToken() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        return false;
    }
    $auth_header = $headers['Authorization'];
    $token = str_replace('Bearer ', '', $auth_header);
    
    // Simple token decoding (pour démo, utilisez JWT en production)
    $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $token));
    $data = json_decode($payload, true);
    if (!$data || !isset($data['id']) || $data['exp'] < time()) {
        return false;
    }
    return $data;
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

function errorResponse($message, $status = 400) {
    jsonResponse(['error' => $message], $status);
}

function uploadPhoto($file, $userId) {
    $target_dir = "../frontend/uploads/";
    if (!file_exists($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    
    $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array($ext, $allowed)) {
        return ['success' => false, 'error' => 'Format non autorisé'];
    }
    
    $new_name = $userId . '_' . time() . '.' . $ext;
    $target_file = $target_dir . $new_name;
    
    if (move_uploaded_file($file["tmp_name"], $target_file)) {
        return ['success' => true, 'path' => 'uploads/' . $new_name];
    }
    return ['success' => false, 'error' => 'Erreur upload'];
}

function generateToken($userId, $email) {
    $payload = json_encode([
        'id' => $userId,
        'email' => $email,
        'exp' => time() + 7*24*3600
    ]);
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
}
?>