# Mise à jour v10 — deux étapes

Les deux sont nécessaires : l'appli envoie les photos, le script doit savoir les recevoir.

## 1. L'application (GitHub)

Déposer tous les fichiers de ce dossier dans le dépôt `devis`, en remplaçant les
existants. Comptez une à trois minutes avant que la mise en ligne soit effective.

Sur les téléphones : ouvrir l'appli **deux fois**. La première met la nouvelle
version en cache, la seconde l'affiche. Rien à réinstaller, l'icône ne change pas,
les devis en attente restent en place.

## 2. Le script du classeur (Apps Script)

1. Ouvrir le classeur **DEVIS BB** → menu *Extensions* → *Apps Script*.
2. Tout sélectionner dans `Code.gs` (Ctrl+A) et coller le contenu du `Code.gs` de ce dossier.
3. Ctrl+S pour enregistrer.
4. *Déployer* → *Gérer les déploiements* → crayon → Version : **Nouvelle version** → *Déployer*.
   L'adresse ne change pas, il n'y a rien à modifier dans l'application.
5. Revenir au classeur, l'actualiser, puis menu *Devis* → *6. Mettre à jour la structure du fichier*.

Tant que l'étape 2 n'est pas faite, les devis continuent d'arriver normalement,
mais les photos restent en attente sur les téléphones et repartiront toutes seules
une fois le script à jour.

## Ce qui change

- **Raison sociale tapée, fiche complétée** : l'annuaire public des entreprises
  renvoie la raison sociale exacte, le SIRET, le n° de TVA et l'adresse du siège.
  Sans réseau, la saisie manuelle fonctionne comme avant.
- **Répertoire clients** : tout client déjà devisé sur l'appareil remonte en
  autocomplétion. Entièrement local, donc actif hors connexion.
- **Dupliquer un devis** (bouton ⧉ dans « Mes devis ») : reprend le client et
  toutes les lignes dans un nouveau devis.
- **Calculette de surface** (bouton m² à côté de la quantité) : une ligne par
  pièce, longueur × largeur, l'appli additionne et reporte le total. Le détail
  des pièces se recopie dans la ligne du devis.
- **Prestations récemment utilisées** en haut du catalogue.
- **Total en HT** dans la barre du bas pour un client professionnel, en TTC pour
  un particulier.
- **Photos du site** (jusqu'à 12 par devis) : réduites dans le téléphone, envoyées
  après le devis et rangées dans son dossier Drive. Elles ne figurent pas sur le
  PDF remis au client.

## Colonne ajoutée

`PHOTOS` dans l'onglet DEVIS, remplie automatiquement au fil des envois.
