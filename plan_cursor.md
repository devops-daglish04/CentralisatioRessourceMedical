# MASTER PLAN : MediCentral (Projet INNOVA)

**Stack Technique :** Django (Backend REST API) + PostgreSQL/PostGIS | Angular (Frontend) + Tailwind CSS + Leaflet.js

## 🎯 CONTEXTE DU PROJET

MediCentral est une plateforme web centralisant les ressources médicales (Sang, Médicaments, Oxygène, Couveuses) des structures de Yaoundé (Hôpitaux, Pharmacies, Banques de sang).

* **Objectif Public :** Permettre aux citoyens de trouver l'urgence la plus proche via géolocalisation.
* **Objectif Admin :** Permettre aux structures de gérer leurs stocks et au Super Admin de superviser l'écosystème.

---

# 🏗️ PARTIE 1 : ARCHITECTURE BACKEND (Django REST Framework & PostgreSQL)

*Directive pour Cursor : Implémente le backend de manière modulaire en créant des applications Django distinctes. Utilise PostgreSQL/PostGIS pour la gestion des données et des requêtes géographiques.*

## Étape 1.1 : Configuration & Utilisateurs (`users_app`)

* Active `django.contrib.gis` dans les applications installées (très important pour les requêtes de proximité).
* Crée un modèle `User` personnalisé héritant de `AbstractUser`.

Ajoute un champ `role` avec les choix :

```
PUBLIC
STRUCTURE_ADMIN
SUPER_ADMIN
```

Implémente l'authentification **JWT** pour sécuriser les API.

## Étape 1.2 : Modèles de Structures & Services (`structures_app`)

Crée le modèle `Structure` :

```
name
type (Hopital, Pharmacie, Banque)
address
contact_phone
is_active
location = models.PointField()
```

Le champ `location` utilise **PostGIS** pour stocker latitude et longitude.

Crée ensuite le modèle `Service` (ex: Cardiologie, Pédiatrie).

Relation :

```
Structure → Services
ManyToMany
```

Crée le modèle `Disease` (Maladie, ex: Paludisme).

Relation :

```
Service → Diseases
ManyToMany
```

## Étape 1.3 : Modèles de Ressources & Audit (`resources_app` & `audit_app`)

Crée le modèle `Resource` :

```
structure (ForeignKey)
resource_type
name_or_group
quantity
unit
status
last_updated
```

Types de ressources :

```
Sang
Medicament
Oxygene
Couveuse
```

Statuts :

```
Disponible
Critique
Rupture
```

Crée un modèle `AuditLog` pour la traçabilité à chaque modification de stock ou structure.

## Étape 1.4 : API REST

Génère :

* Serializers
* ViewSets
* Routes DRF

Endpoints principaux :

```
/api/structures/
/api/services/
/api/diseases/
/api/resources/
```

## Étape 1.5 : Recherche Géographique (CRUCIAL)

Crée un endpoint de recherche :

```
/api/search/?lat=...&lng=...
```

Fonction :

* récupérer la position GPS de l'utilisateur
* calculer la distance avec **PostGIS**
* renvoyer les structures triées de la plus proche à la plus éloignée

Utiliser :

```
from django.contrib.gis.db.models.functions import Distance
```

La réponse API doit inclure :

```
structure
distance
ressources disponibles
services
coordonnées GPS
```

---

# 🎨 PARTIE 2 : CONFIGURATION FRONTEND (Angular & Tailwind)

*Directive pour Cursor : Le code Angular doit être strictement typé, modulaire, et utiliser le Lazy Loading pour les routes.*

## Étape 2.1 : Setup Initial

Initialise **Tailwind CSS** dans Angular.

Couleurs de la charte :

```
Primaire (Bleu) : #2563EB
Urgence/Critique (Rouge) : #EF4444
Oxygène (Cyan) : #06B6D4
Succès/OK (Vert) : #22C55E
Fond (Gris clair) : #F4F7FA
```

Installe et configure :

```
leaflet
@asymmetrik/ngx-leaflet
FontAwesome 6
```

Leaflet sera utilisé pour afficher les structures sur la carte.

## Étape 2.2 : Architecture des Modules Angular

Crée la structure de dossiers suivante :

```
core/
shared/
features/
```

### core/

Contient :

```
Interceptors (JWT)
Guards
Services API (HTTP)
Auth service
```

### shared/

Composants réutilisables :

```
Navbar
Loaders
Result Cards
Map Component
Buttons
Modals
```

### features/

Modules fonctionnels :

```
public/
admin-structure/
super-admin/
```

---

# 🌍 PARTIE 3 : INTERFACE PUBLIQUE (Utilisateur)

*Directive pour Cursor : L'interface doit être un Split-Screen dynamique (Navbar en haut, Liste à gauche, Carte à droite) sans scroll global de la page.*

Utiliser :

```
h-screen
overflow-hidden
flex
grid
```

## Layout Principal

Structure :

```
Navbar (top)
Main Container

Left Panel (liste résultats)
Right Panel (carte)
```

Disposition :

```
flex
flex-row
```

Largeurs recommandées :

```
Left Panel : w-1/3
Right Panel : w-2/3
```

La page doit occuper **100% de la hauteur de l'écran**.

## Navbar

La Navbar doit contenir :

```
Logo MediCentral
Barre de recherche
Bouton localisation
Bouton connexion
```

Design :

```
fond blanc
ombre légère
alignement horizontal
hauteur fixe
```

## Liste des Résultats

Chaque structure doit être affichée dans une **carte résultat** contenant :

```
Nom de la structure
Distance
Ressources disponibles
Statut des stocks
Bouton voir sur la carte
```

Créer un composant Angular :

```
ResultCardComponent
```

## Carte Interactive

Utiliser **Leaflet.js**.

La carte doit afficher :

```
Position utilisateur
Structures proches
Marqueurs interactifs
```

Chaque popup doit afficher :

```
Nom structure
Distance
Ressources critiques
Bouton voir détail
```

## États des Ressources

Afficher visuellement les statuts :

```
Disponible → Vert
Critique → Rouge
Rupture → Gris
```

---

# 🎯 RÈGLE CRITIQUE : PIXEL PERFECT UI

Les interfaces doivent reproduire **exactement les maquettes**.

Les maquettes sont situées dans :

```
/docs/maquettes/
```

Cursor doit respecter :

```
espacements
tailles
couleurs
alignement
icônes
```

Aucune approximation visuelle n'est acceptée.

---

# ⚡ PERFORMANCE & BONNES PRATIQUES

Angular doit :

```
utiliser Lazy Loading
utiliser RxJS correctement
éviter les appels API inutiles
utiliser trackBy dans les listes
```

Tous les appels API doivent passer par :

```
core/services/api.service.ts
```

---

# 🔒 RÔLES UTILISATEURS

Utilisateur public :

```
recherche
consultation des ressources
géolocalisation
```

Structure Admin :

```
gestion du stock
mise à jour des ressources
```

Super Admin :

```
gestion des structures
supervision globale
audit des modifications
```
