# Instructions pour continuer le développement de l'application

IMPORTANT

Ce projet est déjà partiellement développé.

Certaines fonctionnalités backend et frontend existent déjà.

NE PAS recréer l'application depuis zéro.

L'objectif est de compléter et améliorer l'application existante en ajoutant les fonctionnalités décrites ci-dessous.

---

# Objectif de l'application

Créer une application permettant aux utilisateurs de trouver rapidement des ressources médicales proches :

- hôpitaux
- pharmacies
- banques de sang


L'application doit utiliser la géolocalisation pour afficher les structures les plus proches.

---

# Maquettes UI à reproduire

Les interfaces doivent être reproduites en se basant sur les images dans :

/docs/maquettes

Images disponibles :

![/images/image1_recherche.png](<docs/maquettes/WhatsApp Image 2026-03-04 at 12.42.24.jpeg>)

Cette image représente :
La page de recherche principale.

![/images/image2_resultats_carte.png](<docs/maquettes/WhatsApp Image 2026-03-04 at 12.39.13.jpeg>)

Cette image représente :
La page des résultats avec carte et liste des structures.

Respecter :

- la disposition
- les boutons
- les cartes
- la structure générale

---

# Page 1 : Recherche

La page de recherche doit être simplifiée.

Contenu :

Titre :

"Trouver une aide médicale proche"

Champ principal :

Que recherchez-vous ?

Exemples :

- hôpital
- pharmacie
-banque de sang



Bouton :

Rechercher

---

# Filtres avancés

Les filtres ne doivent pas apparaître directement.

Créer une section :

Filtres avancés (repliable)

Filtres disponibles :

Type de structure :

- hôpital
- pharmacie
- banque de sang

Ressources disponibles :

- sang
- oxygène
- medicament
- couveuse

Filtre groupe sanguin :

- A+
- A-
- B+
- B-
- AB+
- AB-
- O+
- O-

Disponibilité :

Afficher uniquement les ressources disponibles

Rayon de recherche :

- 5 km
- 10 km
- 25 km
- 50 km

---

# Boutons d'urgence

Sur la page principale ajouter des boutons d'accès rapide :

Besoin de sang

medicament

oxygene



Chaque bouton lance automatiquement une recherche avec les filtres correspondants.

Exemple :

Besoin de sang
→ ressource = blood



---

# Page 2 : Résultats + Carte

Cette page doit reproduire la maquette :

![/images/image2_resultats_carte.png](<docs/maquettes/WhatsApp Image 2026-03-04 at 12.39.13.jpeg>)

Structure :

Barre supérieure :

Bouton retour

Champ recherche

Bouton filtres

Le bouton retour renvoie à la page de recherche.

---

# Layout principal

La page est divisée en deux colonnes :

Gauche :

Liste des structures médicales

Droite :

Carte interactive

---

# Carte des structures

Chaque structure doit apparaître sous forme de carte contenant :

Nom de la structure

Distance

Ressources disponibles

Statut de disponibilité

exactement comme tu vois sur l'image
Bouton :

Voir détails

---

# Carte interactive

La carte doit :

se centrer sur la position de l'utilisateur

afficher les structures sous forme de marqueurs

Lorsqu'on clique sur un marqueur afficher une popup contenant :

Nom de la structure

Distance

Ressources disponibles

Bouton :

Voir détails

Bouton :

Itinéraire

Le bouton itinéraire ouvre Google Maps.

---

# Géolocalisation

Lorsque l'utilisateur clique sur rechercher :

Demander l'autorisation de géolocalisation.

Si accepté :

utiliser latitude et longitude pour chercher les structures proches.

Si refusé :

permettre la recherche par ville.

---

# Mise à jour de position

Si l'utilisateur se déplace :

mettre à jour les résultats uniquement si la position change de plus de 200 mètres.

---

# API de recherche

Endpoint :

GET /api/search

Paramètres :

query

resource

blood_group

availability

radius

latitude

longitude

Exemple :

/api/search?resource=blood&blood_group=O+&availability=true&lat=36.75&lng=3.05

Réponse attendue :

id

name

type

distance

resources

blood_groups

availability

latitude

longitude

---

# Administration des structures médicales

Implémenter un système d'administration pour les structures.

Chaque structure doit pouvoir avoir un compte administrateur.

Un administrateur de structure peut :

mettre à jour les ressources disponibles

mettre à jour la disponibilité

mettre à jour les groupes sanguins

mettre à jour les informations de la structure

voici a quoi ressemble le dashboard de la structure d'un admin de l'opital ![alt text](<docs/maquettes/WhatsApp Image 2026-03-04 at 12.40.15.jpeg>)
---

# Modèles base de données

Structure médicale :

id

name

type

address

phone

latitude

longitude

---

# Ressources

id

structure_id

resource_type

availability

blood_group (optionnel)

---

# Interface administrateur

Créer un espace admin pour les structures permettant :

gestion des ressources

mise à jour disponibilité

mise à jour groupes sanguins

modification informations structure


---

# Composants Frontend attendus

HomeComponent

SearchResultsComponent

FilterPanelComponent

StructureCardComponent

MapComponent

---

# Résultat final attendu

L'utilisateur doit pouvoir :

rechercher une ressource médicale

voir les structures proches

voir les résultats sur une carte

filtrer les résultats

ouvrir l'itinéraire vers la structure

accéder rapidement aux urgences


ne casse pas le l'application