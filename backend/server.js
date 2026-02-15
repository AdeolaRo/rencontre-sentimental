const express = require('express');
const cors = require('cors');
// Changement de bcrypt à bcryptjs
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
require('dotenv').config();


const app = express();


// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Configuration de Multer pour les uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Routes

// 1. Inscription
app.post('/api/register', async (req, res) => {
    try {
        const {
            email, password, firstName, lastName, birthDate, gender,
            city, department, title, description, secretQuestion, secretAnswer
        } = req.body;
        
        // Vérifier si l'email existe déjà
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedSecretAnswer = await bcrypt.hash(secretAnswer, 10);
        
        // Insérer l'utilisateur
        const [result] = await pool.execute(
            `INSERT INTO users 
            (email, password_hash, first_name, last_name, birth_date, gender, 
             city, department, title, description, secret_question, secret_answer) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, firstName, lastName, birthDate, gender,
             city, department, title, description, secretQuestion, hashedSecretAnswer]
        );
        
        // Créer un token JWT
        const token = jwt.sign(
            { userId: result.insertId, email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            userId: result.insertId,
            user: { id: result.insertId, email, firstName, lastName }
        });
        
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 2. Connexion
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Récupérer l'utilisateur
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        const user = users[0];
        
        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        // Créer un token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
        
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 3. Récupérer les profils pour le matching
app.get('/api/profiles/matching', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Exclure l'utilisateur actuel et les matchs existants
        const [profiles] = await pool.execute(`
            SELECT u.id, u.first_name, u.last_name, u.city, u.department, 
                   u.title, u.description, u.profile_score,
                   up.photo_url as main_photo
            FROM users u
            LEFT JOIN user_photos up ON u.id = up.user_id AND up.is_main = TRUE
            WHERE u.id != ?
              AND u.id NOT IN (
                  SELECT user2_id FROM matches WHERE user1_id = ?
                  UNION
                  SELECT user1_id FROM matches WHERE user2_id = ?
              )
            ORDER BY RAND()
            LIMIT 10
        `, [userId, userId, userId]);
        
        res.json(profiles);
        
    } catch (error) {
        console.error('Erreur matching profiles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 4. Upload de photo
app.post('/api/profiles/photo', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { isMain } = req.body;
        const photoUrl = `/uploads/${req.file.filename}`;
        
        if (isMain) {
            await pool.execute(
                'UPDATE user_photos SET is_main = FALSE WHERE user_id = ?',
                [userId]
            );
        }
        
        await pool.execute(
            'INSERT INTO user_photos (user_id, photo_url, is_main) VALUES (?, ?, ?)',
            [userId, photoUrl, isMain || false]
        );
        
        res.json({ success: true, photoUrl });
        
    } catch (error) {
        console.error('Erreur upload photo:', error);
        res.status(500).json({ error: 'Erreur upload' });
    }
});

// 5. Créer un match
app.post('/api/matches', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetUserId } = req.body;
        
        // Vérifier si le match existe déjà
        const [existing] = await pool.execute(
            `SELECT id FROM matches 
             WHERE (user1_id = ? AND user2_id = ?) 
                OR (user1_id = ? AND user2_id = ?)`,
            [userId, targetUserId, targetUserId, userId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Match déjà existant' });
        }
        
        // Créer le match
        await pool.execute(
            'INSERT INTO matches (user1_id, user2_id, status) VALUES (?, ?, ?)',
            [userId, targetUserId, 'pending']
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Erreur création match:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 6. Explorer les profils
app.get('/api/profiles/explore', authenticateToken, async (req, res) => {
    try {
        const { department, city, page = 1 } = req.query;
        const userId = req.user.userId;
        const limit = 12;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT u.id, u.first_name, u.last_name, u.city, u.department, 
                   u.title, u.description, u.profile_score,
                   up.photo_url as main_photo,
                   COUNT(*) OVER() as total_count
            FROM users u
            LEFT JOIN user_photos up ON u.id = up.user_id AND up.is_main = TRUE
            WHERE u.id != ?
        `;
        
        const params = [userId];
        
        if (department) {
            query += ' AND u.department LIKE ?';
            params.push(`%${department}%`);
        }
        
        if (city) {
            query += ' AND u.city LIKE ?';
            params.push(`%${city}%`);
        }
        
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [profiles] = await pool.execute(query, params);
        
        const total = profiles.length > 0 ? profiles[0].total_count : 0;
        
        // Retirer total_count de chaque profil
        const cleanProfiles = profiles.map(p => {
            const { total_count, ...profile } = p;
            return profile;
        });
        
        res.json({
            profiles: cleanProfiles,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
        
    } catch (error) {
        console.error('Erreur explore profiles:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 7. Détails d'un profil
app.get('/api/profiles/:id', authenticateToken, async (req, res) => {
    try {
        const profileId = req.params.id;
        
        // Récupérer les informations de l'utilisateur
        const [users] = await pool.execute(
            `SELECT u.*, 
                   q.personality, q.passions, q.music_tastes, q.lifestyle
            FROM users u
            LEFT JOIN user_questionnaire q ON u.id = q.user_id
            WHERE u.id = ?`,
            [profileId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Profil non trouvé' });
        }
        
        const user = users[0];
        
        // Récupérer les photos
        const [photos] = await pool.execute(
            'SELECT * FROM user_photos WHERE user_id = ? ORDER BY display_order',
            [profileId]
        );
        
        // Récupérer les commentaires
        const [comments] = await pool.execute(
            `SELECT c.*, u.first_name 
             FROM comments c 
             JOIN users u ON c.author_id = u.id 
             WHERE c.target_user_id = ? AND c.is_visible = TRUE 
             ORDER BY c.created_at DESC`,
            [profileId]
        );
        
        res.json({
            user,
            photos,
            comments
        });
        
    } catch (error) {
        console.error('Erreur détail profil:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 8. Valider une rencontre
app.post('/api/encounters/validate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { matchId, hasMet, secretAnswer, badges } = req.body;
        
        // Vérifier le match
        const [matches] = await pool.execute(
            'SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [matchId, userId, userId]
        );
        
        if (matches.length === 0) {
            return res.status(404).json({ error: 'Match non trouvé' });
        }
        
        const match = matches[0];
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        
        // Vérifier la réponse secrète si la rencontre a eu lieu
        if (hasMet) {
            const [users] = await pool.execute(
                'SELECT secret_answer FROM users WHERE id = ?',
                [otherUserId]
            );
            
            if (users.length > 0) {
                const validAnswer = await bcrypt.compare(secretAnswer, users[0].secret_answer);
                
                if (!validAnswer) {
                    return res.status(400).json({ error: 'Réponse secrète incorrecte' });
                }
            }
        }
        
        // Mettre à jour le score de confiance
        if (hasMet && badges && badges.length > 0) {
            const scoreIncrement = badges.length * 10; // 10 points par badge
            await pool.execute(
                'UPDATE users SET profile_score = profile_score + ? WHERE id = ?',
                [scoreIncrement, otherUserId]
            );
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Erreur validation rencontre:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 9. Vérifier l'authentification
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ authenticated: true, user: req.user });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
});