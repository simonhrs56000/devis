# Devis nettoyage — application hors connexion

Un commercial ouvre l'application sur son téléphone, même sans réseau : il choisit les prestations
dans ton catalogue, le client signe à l'écran, le PDF est fabriqué **dans le téléphone** et peut être
remis tout de suite. Dès que le téléphone recapte, le devis part tout seul dans ton Google Sheet et
le PDF dans ton Drive.

Deux briques à installer, une fois pour toutes :

| Brique | Où | Rôle |
|---|---|---|
| Google Sheet + script | ton compte Google | catalogue, tarifs, historique, PDF archivés, envoi des e-mails |
| L'application | hébergement gratuit (GitHub Pages) | ce que les commerciaux ouvrent sur leur téléphone |

---

> **État au 25/09/2026 : les parties A et B sont faites.**
> Classeur « DEVIS BB » initialisé, script déployé, application en ligne à l'adresse
> **https://simonhrs56000.github.io/devis/** (dépôt `simonhrs56000/devis`).
> Un devis de test a parcouru toute la chaîne avec succès, puis a été retiré du classeur.
> Il reste la **partie C** : installer l'application sur les téléphones, et remplir
> REGLAGES / CATALOGUE / COMMERCIAUX.

## Partie A — Le Google Sheet (fait)

1. [sheets.new](https://sheets.new) → renomme le fichier **DEVIS — NETTOYAGE**.
2. **Extensions → Apps Script**. Dans `Code.gs`, efface tout et colle le contenu du fichier **Code.gs** fourni. **Ctrl+S**.
3. Reviens sur le Sheet, recharge la page : un menu **Devis** apparaît → **1. Initialiser le fichier**.
   Google demande une autorisation : *Autoriser → ton compte → Paramètres avancés → Accéder à… → Autoriser*
   (l'écran « application non vérifiée » est normal, c'est ton propre script). Relance **Devis → 1. Initialiser**.
4. Remplis les trois onglets :
   - **REGLAGES** : nom, adresse, SIRET, TVA intracom, conditions de règlement, validité. C'est ce qui s'imprime sur le devis.
   - **CATALOGUE** : une prestation par ligne. `TYPE` = `PONCTUEL` ou `MENSUEL` (contrat récurrent). `ACTIF` = `NON` pour masquer sans supprimer.
   - **COMMERCIAUX** : `NOM | EMAIL | CODE | ACTIF`. Le code (4 chiffres) évite qu'un devis parte au nom de quelqu'un d'autre ; l'e-mail reçoit une copie de chaque devis de ce commercial.
5. **Déployer → Nouveau déploiement → Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde** ← indispensable, sinon les téléphones ne peuvent rien envoyer
   - **Déployer**, puis copie l'**URL de l'application Web** (elle finit par `/exec`).
   Tu la retrouveras par le menu **Devis → 2. Afficher l'adresse de synchronisation**.

---

## Partie B — Mettre l'application en ligne (fait)

GitHub Pages : gratuit, sans publicité, adresse fixe en `https` — c'est ce qui permet à l'application
de s'installer sur le téléphone et de fonctionner hors connexion.

1. Crée un compte sur [github.com](https://github.com) (gratuit).
2. **New repository** : nom `devis`, coché **Public**, puis **Create repository**.
3. `config.js` contient déjà l'adresse de ton déploiement : rien à modifier.
4. Sur la page du dépôt : **Add file → Upload files**, dépose **tous** les fichiers du dossier
   *sauf* `Code.gs` et `INSTALLATION.md` :

   ```
   index.html   app.js   pdf.js   config.js   police.js   jspdf.umd.min.js
   sw.js   manifest.webmanifest   icon-192.png   icon-512.png
   ```

   puis **Commit changes**.
5. **Settings → Pages** : *Source* = `Deploy from a branch`, *Branch* = `main` et `/ (root)` → **Save**.
6. Attends 1 à 2 minutes : l'adresse `https://TON-COMPTE.github.io/devis/` s'affiche en haut de cette page.
   Ouvre-la : tu dois voir « Première utilisation » puis, après le téléchargement du catalogue, l'écran d'identification.

---

## Partie C — Installer sur les téléphones (2 min par commercial)

Envoie l'adresse **https://simonhrs56000.github.io/devis/** à chaque commercial. Sur son téléphone, **avec du réseau** :

- **iPhone** : ouvrir dans **Safari** → bouton Partager → *Sur l'écran d'accueil*.
- **Android** : ouvrir dans **Chrome** → menu ⋮ → *Ajouter à l'écran d'accueil*.

Il ouvre l'application depuis l'icône, choisit son nom et saisit son code : c'est fait une seule fois.

**Vérification à faire une fois** : mets le téléphone en mode avion, ouvre l'application, crée un devis
de test. Tout doit fonctionner et le bandeau jaune afficher « Hors connexion — tout fonctionne ».
Repasse en ligne : le devis part tout seul et apparaît dans le Sheet.

---

## Au quotidien

**Côté commercial**

1. Client → prestations (catalogue ou ligne libre) → total TTC toujours visible en bas → remise éventuelle.
2. *Faire signer le client* : l'écran passe en plein écran, le client signe au doigt.
3. *Enregistrer le devis*. Le numéro est attribué immédiatement, même sans réseau
   (`DEV-2026-KLG-0007` : année + initiales du commercial + compteur).
4. *Envoyer / partager le PDF* : WhatsApp, e-mail, AirDrop, impression — le PDF est déjà dans le téléphone.
5. *Mes devis* : la liste de ses devis, avec un point orange tant qu'un devis n'est pas encore remonté.

**Côté bureau**

- Onglet `DEVIS` : un devis par ligne, montant, commercial, statut, lien vers le PDF.
- Onglet `LIGNES` : le détail vendu, pour analyser les prix réellement pratiqués (tableau croisé dynamique direct).
- Drive → `DEVIS NETTOYAGE / <année>` : tous les PDF.
- Le PDF archivé est **exactement** celui que le client a signé : c'est le téléphone qui l'envoie, pas une reconstitution.

**Changer un prix** : tu modifies l'onglet `CATALOGUE`. Chaque téléphone récupère la nouvelle version à sa
prochaine ouverture avec du réseau (ou via *Mes devis → actualiser*). Rien à réinstaller.

**Modifier l'application** (si je te livre une nouvelle version) : tu remplaces les fichiers sur GitHub
et tu incrémentes `VERSION` en haut de `sw.js` (`devis-v1` → `devis-v2`). Les téléphones se mettent à jour seuls.

---

## Bon à savoir

- **Sécurité** : l'adresse de l'application est publique ; le code commercial est vérifié à l'enregistrement
  et re-vérifié par le Sheet à l'arrivée. C'est un garde-fou contre les erreurs, pas un coffre-fort.
  Si tu veux un vrai verrou d'accès, on peut ajouter un code d'entrée à l'ouverture.
- **E-mails** : 100 par jour avec un Gmail gratuit, 1 500 avec Google Workspace.
- **Stockage sur le téléphone** : les devis et leurs PDF restent dans le téléphone (quelques dizaines de Ko
  par devis) même après synchronisation, pour pouvoir les repartager.
- **Numérotation** : chaque commercial a sa propre série grâce à ses initiales, ce qui évite tout doublon
  entre appareils travaillant hors connexion. Le Sheet refuse un devis déjà reçu, donc pas de double envoi.
- **Composants libres inclus** : jsPDF (licence MIT) pour le PDF, Liberation Sans (SIL Open Font License)
  pour que les accents, le `€` et les `m²` s'affichent pareil sur tous les lecteurs PDF.

## La suite, quand tu m'enverras tes anciens devis

- Ta vraie grille tarifaire dans le catalogue, tes mentions légales et conditions de règlement.
- La mise en page du PDF alignée sur ce que tes clients ont l'habitude de recevoir (logo compris).
- Éventuellement : transformation d'un devis accepté en facture, relance automatique des devis sans
  réponse, photos du site jointes au devis, tableau de bord du taux de transformation par commercial.
