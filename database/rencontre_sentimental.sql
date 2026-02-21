-- database/rencontre_sentimental.sql
CREATE DATABASE IF NOT EXISTS rencontre_sentimental;
USE rencontre_sentimental;

-- Table des utilisateurs enrichie
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('homme','femme','autre') NOT NULL,
    city VARCHAR(100) NOT NULL,
    department VARCHAR(10) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Nouveaux champs
    emploi VARCHAR(255),
    looking_for ENUM('rencontres','discussion','histoire sérieuse') DEFAULT 'rencontres',
    taille VARCHAR(50),
    enfant ENUM('oui','non','peut-être plus tard') DEFAULT 'non',
    alcool ENUM('jamais','occasionnellement','souvent') DEFAULT 'occasionnellement',
    cigarette ENUM('jamais','occasionnellement','souvent') DEFAULT 'jamais',
    sexualite VARCHAR(50),
    animaux VARCHAR(50),
    centre_interet TEXT,
    
    profile_score INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    secret_question VARCHAR(500) NOT NULL,
    secret_answer VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des photos (max 8)
CREATE TABLE user_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table du questionnaire (personnalité, passions, musique, style)
CREATE TABLE user_questionnaire (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    personality TEXT,
    passions TEXT,
    music_tastes TEXT,
    style TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des matchs
CREATE TABLE matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    status ENUM('pending','accepted','rejected') DEFAULT 'pending',
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

-- Table des validations post-rencontre (badges)
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

-- Table des commentaires (post-rencontre)
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

-- Table des likes
CREATE TABLE likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    type ENUM('like','dislike') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (from_user_id, to_user_id)
);

-- Table des départements
CREATE TABLE departments (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Table des villes
CREATE TABLE cities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_code VARCHAR(10),
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (department_code) REFERENCES departments(code)
);

-- Insertion des départements (liste complète)
INSERT INTO departments (code, name) VALUES
('01','Ain'), ('02','Aisne'), ('03','Allier'), ('04','Alpes-de-Haute-Provence'), ('05','Hautes-Alpes'),
('06','Alpes-Maritimes'), ('07','Ardèche'), ('08','Ardennes'), ('09','Ariège'), ('10','Aube'),
('11','Aude'), ('12','Aveyron'), ('13','Bouches-du-Rhône'), ('14','Calvados'), ('15','Cantal'),
('16','Charente'), ('17','Charente-Maritime'), ('18','Cher'), ('19','Corrèze'), ('2A','Corse-du-Sud'),
('2B','Haute-Corse'), ('21','Côte-d\'Or'), ('22','Côtes-d\'Armor'), ('23','Creuse'), ('24','Dordogne'),
('25','Doubs'), ('26','Drôme'), ('27','Eure'), ('28','Eure-et-Loir'), ('29','Finistère'),
('30','Gard'), ('31','Haute-Garonne'), ('32','Gers'), ('33','Gironde'), ('34','Hérault'),
('35','Ille-et-Vilaine'), ('36','Indre'), ('37','Indre-et-Loire'), ('38','Isère'), ('39','Jura'),
('40','Landes'), ('41','Loir-et-Cher'), ('42','Loire'), ('43','Haute-Loire'), ('44','Loire-Atlantique'),
('45','Loiret'), ('46','Lot'), ('47','Lot-et-Garonne'), ('48','Lozère'), ('49','Maine-et-Loire'),
('50','Manche'), ('51','Marne'), ('52','Haute-Marne'), ('53','Mayenne'), ('54','Meurthe-et-Moselle'),
('55','Meuse'), ('56','Morbihan'), ('57','Moselle'), ('58','Nièvre'), ('59','Nord'),
('60','Oise'), ('61','Orne'), ('62','Pas-de-Calais'), ('63','Puy-de-Dôme'), ('64','Pyrénées-Atlantiques'),
('65','Hautes-Pyrénées'), ('66','Pyrénées-Orientales'), ('67','Bas-Rhin'), ('68','Haut-Rhin'), ('69','Rhône'),
('70','Haute-Saône'), ('71','Saône-et-Loire'), ('72','Sarthe'), ('73','Savoie'), ('74','Haute-Savoie'),
('75','Paris'), ('76','Seine-Maritime'), ('77','Seine-et-Marne'), ('78','Yvelines'), ('79','Deux-Sèvres'),
('80','Somme'), ('81','Tarn'), ('82','Tarn-et-Garonne'), ('83','Var'), ('84','Vaucluse'),
('85','Vendée'), ('86','Vienne'), ('87','Haute-Vienne'), ('88','Vosges'), ('89','Yonne'),
('90','Territoire de Belfort'), ('91','Essonne'), ('92','Hauts-de-Seine'), ('93','Seine-Saint-Denis'),
('94','Val-de-Marne'), ('95','Val-d\'Oise'), ('971','Guadeloupe'), ('972','Martinique'), ('973','Guyane'),
('974','La Réunion'), ('976','Mayotte');

-- Insertion de quelques villes (exemple, à compléter)
INSERT INTO cities (department_code, name) VALUES
('75','Paris'), ('13','Marseille'), ('69','Lyon'), ('31','Toulouse'), ('06','Nice'),
('44','Nantes'), ('34','Montpellier'), ('67','Strasbourg'), ('33','Bordeaux'), ('59','Lille');