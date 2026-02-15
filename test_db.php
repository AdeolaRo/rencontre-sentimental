<?php
require_once 'config/database.php';
$db = (new Database())->getConnection();
if ($db) {
    echo "Connexion réussie !";
} else {
    echo "Échec de connexion";
}
?>
