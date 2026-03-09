# Documentation technique MediCentral

## 1. Vue d’ensemble

- **Backend** : Django 6 + Django REST Framework + PostgreSQL/PostGIS.
- **Frontend** : Angular 21 (standalone components) + Tailwind CSS + Leaflet.
- **Objectif** : plateforme de centralisation des ressources médicales (sang, médicaments, oxygène, couveuses) avec :
  - interface publique de recherche (liste + carte),
  - interface admin structure (gestion des stocks),
  - interface super-admin (gestion des structures + audit).

---

## 2. Backend (Django / PostGIS)

- **Chemins principaux**
  - Projet Django : `backend/`
  - Paramètres : `backend/settings.py`
  - Routage API : `backend/urls.py`
  - Script de gestion : `manage.py`

### 2.1. Applications Django

- `backend/users_app/`
  - Modèle custom `User` : `backend/users_app/models.py`
    - Hérite de `AbstractUser`
    - Champ `role` (`PUBLIC`, `ADMIN_STRUCTURE`, `SUPER_ADMIN`)
      - compatibilité conservée avec l’alias historique `STRUCTURE_ADMIN`
    - Champ `structure` (liaison de l'admin structure à sa structure)
  - API : `backend/users_app/views.py` (`UserViewSet`)
  - Sérialiseur : `backend/users_app/serializers.py`

- `backend/structures_app/`
  - Modèles : `backend/structures_app/models.py`
    - `Structure` : `name`, `type` (Hôpital, Pharmacie, Banque), `address`, `contact_phone`, `is_active`, `location = PointField(geography=True, srid=4326)`
    - `Service` : ManyToMany vers `Structure`
    - `Disease` : ManyToMany vers `Service`
  - Sérialiseurs : `backend/structures_app/serializers.py`
  - Vues & recherche géo : `backend/structures_app/views.py`
    - `StructureViewSet`, `ServiceViewSet`, `DiseaseViewSet`
    - Endpoint `/api/search/` utilisant `Distance` (PostGIS)

- `backend/resources_app/`
  - Modèle `Resource` : `backend/resources_app/models.py`
    - `structure`, `resource_type` (`Sang`, `Medicament`, `Oxygene`, `Couveuse`), `name_or_group`, `quantity`, `unit`, `status` (`Disponible`, `Critique`, `Rupture`), `last_updated`
  - Sérialiseur : `backend/resources_app/serializers.py`
  - Vue : `backend/resources_app/views.py` (`ResourceViewSet`)
    - Isolation multi-structure:
      - un `ADMIN_STRUCTURE` ne voit/modifie que les ressources de sa structure
      - impossible pour un `ADMIN_STRUCTURE` de créer/modifier une ressource d'une autre structure
    - Journalisation d'audit automatique:
      - `RESOURCE_CREATED`, `RESOURCE_UPDATED`, `RESOURCE_DELETED`

- `backend/audit_app/`
  - Modèle `AuditLog` : `backend/audit_app/models.py`
    - `user`, `action`, `timestamp`, `structure`, `resource`, `metadata`
  - Sérialiseur : `backend/audit_app/serializers.py`
  - Vue read-only : `backend/audit_app/views.py` (`AuditLogViewSet`)
    - super-admin : accès global
    - admin structure : accès restreint aux logs de sa structure
    - Filtres query params : `action`, `user_id`, `structure_id`, `resource_id`

### 2.2. Configuration & base de données

- `backend/settings.py`
  - `INSTALLED_APPS` :
    - `django.contrib.gis`
    - `rest_framework`
    - `rest_framework_simplejwt`
    - `backend.users_app`, `backend.structures_app`, `backend.resources_app`, `backend.audit_app`
  - Base de données :
    - `ENGINE = "django.contrib.gis.db.backends.postgis"`
    - `NAME`, `USER`, `PASSWORD`, `HOST`, `PORT` configurés pour PostgreSQL/PostGIS.
  - Utilisateur custom :
    - `AUTH_USER_MODEL = "users_app.User"`
  - DRF :
    - `DEFAULT_AUTHENTICATION_CLASSES = ("rest_framework_simplejwt.authentication.JWTAuthentication",)`
    - `DEFAULT_PERMISSION_CLASSES = ("rest_framework.permissions.IsAuthenticatedOrReadOnly",)`

### 2.3. Endpoints API

- **Auth JWT**
  - `POST /api/auth/token/`  
    - body : `{ "username": "...", "password": "..." }`
    - réponse : `{ "access": "...", "refresh": "..." }`
  - `POST /api/auth/token/refresh/`

- **Ressources principales**
  - `GET /api/users/` (admin uniquement)
  - `GET /api/structures/`
  - `GET /api/services/`
  - `GET /api/diseases/`
  - `GET /api/resources/`
  - `GET /api/audit-logs/` (journal d’audit, scope selon le rôle)

- **Recherche géographique (crucial)**
  - `GET /api/search/?lat=<latitude>&lng=<longitude>&radius_km=<rayon>&limit=<n>`
  - Alternative sans GPS : `GET /api/search/?city=<ville>&...`
  - Traitement :
    - création d’un `Point(lng, lat, srid=4326)`
    - filtre spatial par rayon (`distance_lte`) pour éviter les scans complets
    - `annotate(distance=Distance("location", user_location))`
    - tri par distance croissante
    - limitation du nombre de résultats (borné côté serveur)
    - fallback ville : coordonnées connues + inférence à partir des structures enregistrées
  - Réponse (par structure) :
    - `id`, `name`, `type`, `address`, `contact_phone`, `is_active`
    - `location` (GeoJSON : `type`, `coordinates`)
    - `distance` (en kilomètres, prêt pour affichage frontend)
    - `distance_m` (distance brute en mètres)
    - `resources` (liste des `Resource` liées)
    - `services` (liste des `Service` + `diseases`)

#### Exemple d’appel API (curl)

```bash
curl -X GET "http://localhost:8000/api/search/?lat=3.8667&lng=11.5167" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 3. Frontend (Angular / Tailwind / Leaflet)

- Racine Angular : `frontend/`
- Fichier de build Angular CLI : `frontend/angular.json`
- Entrée : `frontend/src/main.ts`
- Config globale Angular : `frontend/src/app/app.config.ts`

### 3.1. Configuration Tailwind & styles

- `frontend/tailwind.config.cjs`
  - `content: ['./src/**/*.{html,ts}']`
  - Palette :
    - `primary: #2563EB`
    - `danger: #EF4444`
    - `oxygen: #06B6D4`
    - `success: #22C55E`
    - `background: #F4F7FA`
- `frontend/postcss.config.cjs` : plugins `tailwindcss` + `autoprefixer`.
- `frontend/proxy.conf.json` : proxy dev `/api` vers `http://localhost:8000`
- `frontend/src/styles.css`
  - `@tailwind base; @tailwind components; @tailwind utilities;`
  - définition des couleurs CSS (`--color-primary`, etc.) et fond global.

### 3.2. Architecture Angular

- `src/app/app.ts` : composant racine.
- `src/app/app.routes.ts` : définition des routes principales avec **lazy loading** :
  - `'' → redirectTo 'public/home'` (avec redirection rôle via guard)
  - `'public' → ./features/public/public.routes`
  - `'admin' → ./features/admin-structure/admin-structure.routes`
  - `'structure-admin' → ./features/admin-structure/admin-structure.routes`
  - `'super-admin' → ./features/super-admin/super-admin.routes`

- **Core**
  - `src/app/core/services/api.service.ts`
    - Service centralisé des appels HTTP vers le backend.
    - Méthode principale :
      - `searchStructures(params)` → `GET /api/search/` (query/resource/type/blood_group/availability/radius/city/coords)
  - `src/app/core/services/auth.service.ts`
    - Gestion des tokens JWT (`access` / `refresh`) + lecture du rôle dans le token.
  - `src/app/core/interceptors/jwt.interceptor.ts`
    - Ajout automatique de `Authorization: Bearer <token>` sur les appels `/api/*`.
  - `src/app/core/guards/*.guard.ts`
    - Protection des routes `/admin` (rôle `STRUCTURE_ADMIN`) et `/super-admin` (rôle `SUPER_ADMIN`).

- **Shared components**
  - `src/app/shared/components/navbar/`
    - `NavbarComponent` : logo MediCentral, barre de recherche, bouton localisation, bouton connexion.
  - `src/app/shared/components/result-card/`
    - `ResultCardComponent` : carte de résultat pour une structure (nom, distance, ressources, boutons).
  - `src/app/shared/components/map/`
    - `MapComponent` : carte Leaflet pour afficher les structures + position utilisateur.

- **Features**
  - `src/app/features/public/`
    - `home/home.component.*` : page recherche principale.
    - `results/search-results.component.*` : page résultats + carte.
    - `structure-details/structure-details.component.*` : fiche structure.
    - `login/login.component.*` : page connexion administrateur.
    - `public.routes.ts` : `/public/home`, `/public/results`, `/public/structure/:id`, `/public/login`.
  - `src/app/features/admin-structure/`
    - `auth/admin-login.component.*` : page de connexion admin (`/admin/login`).
    - `layout/admin-layout.component.*` : layout avec sidebar + topbar pour l’admin structure.
    - `resources/admin-resources-page.component.*` : page Ressources/Stocks.
    - `profile/admin-structure-profile-page.component.*` : édition infos structure.
    - `services/admin-services-page.component.*` : affectation des services à la structure.
    - `history/admin-history-page.component.*` : historique d’audit de la structure.
    - `admin-structure.routes.ts` :
      - `/admin/login` → `AdminLoginComponent`
      - `/structure-admin/*` → `AdminLayoutComponent` (dashboard/resources/profile/services/history)
  - `src/app/features/super-admin/`
    - `structures/super-admin-structures-page.component.*` : gestion des structures + audit.
    - `super-admin.routes.ts` : route `/super-admin`.

### 3.3. Chemins d’accès aux pages (URLs)

- **Interface publique**
  - `/public/home` : recherche + filtres avancés + boutons d’urgence
  - `/public/results` : résultats liste + carte
  - `/public/structure/:id` : fiche détaillée
  - `/public/login` : connexion administrateur

- **Admin structure**
  - `/admin/login`
    - Page de connexion admin avec formulaire email/mot de passe.
  - `/structure-admin/dashboard` : vue ressources/stocks
  - `/structure-admin/resources` : alias ressources/stocks
  - `/structure-admin/profile` : profil structure
  - `/structure-admin/services` : services de la structure
  - `/structure-admin/history` : historique des opérations

- **Super admin**
  - `/super-admin/dashboard`
    - Page de gestion des structures/admins + panneau d’audit récent.

---

## 4. Lancement local

### 4.1. Backend Django

```bash
cd C:\Users\Lionnel\Documents\GitHub\CentralisatioRessourceMedical
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

- Le serveur écoute par défaut sur `http://localhost:8000/`.
- La configuration sensible (clé Django, base de données, hosts) est lue depuis `.env`.
- Performance backend:
  - compression GZip activée
  - connexions DB persistantes via `DB_CONN_MAX_AGE`
  - cache recherche `/api/search` (LocMem par défaut, Redis si `REDIS_URL` configuré)
- Sous Windows avec GeoDjango/PostGIS, vérifier la présence de :
  - `GDAL_LIBRARY_PATH`
  - `GEOS_LIBRARY_PATH`
  - Exemple usuel : `C:\Program Files\GDAL\gdal.dll` et `C:\Program Files\GDAL\geos_c.dll`

### 4.2. Frontend Angular

```bash
cd C:\Users\Lionnel\Documents\GitHub\CentralisatioRessourceMedical\frontend
npm install
npm start
```

- L’application Angular est disponible sur `http://localhost:4200/`.

---

## 5. Accéder et utiliser l’API

1. **Créer un super utilisateur Django** (pour administrer et tester) :

```bash
python manage.py createsuperuser
```

2. **Obtenir un token JWT** :

```bash
curl -X POST "http://localhost:8000/api/auth/token/" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"<votre_user>\", \"password\": \"<votre_mot_de_passe>\"}"
```

3. **Utiliser le token pour interroger les endpoints** (exemple recherche géo) :

```bash
curl -X GET "http://localhost:8000/api/search/?lat=3.8667&lng=11.5167" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

4. **Consommer l’API depuis Angular** :
   - Le service `ApiService` (`src/app/core/services/api.service.ts`) est le point d’entrée.
   - Exemple d’usage (dans un composant) :

```ts
this.apiService.searchStructures(lat, lng).subscribe((results) => {
  this.results.set(results);
});
```

---

Ce fichier résume **ce qui a été implémenté**, **où se trouvent les fichiers clés**, **comment lancer les serveurs** et **comment accéder à l’API** (en direct ou depuis l’Angular app).

---

## 6. Récapitulatif des URLs des interfaces

> Toutes les URLs ci‑dessous supposent que le serveur Angular tourne sur `http://localhost:4200`.

- **Interface publique (recherche + carte)**
  - URL de recherche : `http://localhost:4200/public/home`
  - URL des résultats : `http://localhost:4200/public/results`
  - Le chemin racine `http://localhost:4200/` redirige vers `/public/home`.

- **Interface administrateur de structure**
  - Connexion admin : `http://localhost:4200/admin/login`
  - Dashboard : `http://localhost:4200/structure-admin/dashboard`
  - Ressources/Stocks : `http://localhost:4200/structure-admin/resources`
  - Profil : `http://localhost:4200/structure-admin/profile`
  - Services : `http://localhost:4200/structure-admin/services`
  - Historique : `http://localhost:4200/structure-admin/history`

- **Interface super‑admin (gestion des structures + audit)**
  - URL : `http://localhost:4200/super-admin/dashboard`

- **Backend Django / API**
  - Racine API : `http://localhost:8000/api/`
  - Exemples :
    - Recherche géographique : `http://localhost:8000/api/search/?lat=3.8667&lng=11.5167`
    - Recherche par ville : `http://localhost:8000/api/search/?city=Yaounde&resource=blood`
    - Structures : `http://localhost:8000/api/structures/`
    - Ressources : `http://localhost:8000/api/resources/`
    - Audit : `http://localhost:8000/api/audit-logs/`



