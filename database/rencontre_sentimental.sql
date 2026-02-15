-- database/rencontre_sentimental.sql

CREATE DATABASE IF NOT EXISTS rencontre_sentimental;
USE rencontre_sentimental;

-- Table des utilisateurs
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('homme', 'femme', 'autre') NOT NULL,
    city VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    profile_score INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    secret_question VARCHAR(500) NOT NULL,
    secret_answer VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des photos utilisateur
CREATE TABLE user_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des réponses au questionnaire
CREATE TABLE user_questionnaire (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    personality TEXT,
    preferences TEXT,
    style TEXT,
    music_tastes TEXT,
    passions TEXT,
    lifestyle TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des matchs
CREATE TABLE matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des rencontres
CREATE TABLE encounters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    user1_confirmed BOOLEAN DEFAULT FALSE,
    user2_confirmed BOOLEAN DEFAULT FALSE,
    user1_secret_provided BOOLEAN DEFAULT FALSE,
    user2_secret_provided BOOLEAN DEFAULT FALSE,
    user1_secret_correct BOOLEAN DEFAULT FALSE,
    user2_secret_correct BOOLEAN DEFAULT FALSE,
    meeting_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- Table des validations post-rencontre
CREATE TABLE post_meeting_validations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    encounter_id INT NOT NULL,
    validator_id INT NOT NULL,
    validated_user_id INT NOT NULL,
    badges JSON,
    trust_score_increment INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
    FOREIGN KEY (validator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (validated_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des commentaires
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    author_id INT NOT NULL,
    target_user_id INT NOT NULL,
    encounter_id INT NOT NULL,
    comment TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

-- Table des certifications de profil
CREATE TABLE profile_certifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    certification_type VARCHAR(100),
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verification_data JSON,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insérer quelques données de test
INSERT INTO users (email, password_hash, first_name, last_name, birth_date, gender, city, department, title, description, secret_question, secret_answer) VALUES
('test1@example.com', '$2b$10$TestHash12345678901234567890', 'Alice', 'Dupont', '1990-05-15', 'femme', 'Paris', '75', 'Aventurière passionnée', 'J\'aime les voyages et la découverte de nouvelles cultures', 'Quel est votre film préféré ?', '$2b$10$TestAnswerHash1234567890'),
('test2@example.com', '$2b$10$TestHash12345678901234567891', 'Bob', 'Martin', '1985-08-22', 'homme', 'Lyon', '69', 'Sportif et ambitieux', 'Fan de sports extrêmes et de bonne cuisine', 'Nom de votre premier animal de compagnie ?', '$2b$10$TestAnswerHash1234567891');