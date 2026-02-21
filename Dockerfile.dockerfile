# Dockerfile
FROM php:8.1-apache

# Installer les extensions PHP nécessaires
RUN docker-php-ext-install pdo pdo_mysql

# Activer mod_rewrite pour Apache
RUN a2enmod rewrite

# Créer le répertoire uploads
RUN mkdir -p /var/www/html/uploads

# Copier les fichiers du projet dans le conteneur
COPY . /var/www/html/

# Définir le répertoire de travail
WORKDIR /var/www/html/

# Donner les permissions nécessaires
RUN chown -R www-data:www-data /var/www/html/ \
    && chmod -R 755 /var/www/html/backend \
    && chmod -R 777 /var/www/html/uploads