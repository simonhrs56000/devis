# Mise à jour v20 — deux étapes

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
6. Menu *Devis* → *7. Charger la grille de prix* pour remplacer le catalogue de démonstration
   par les 14 prestations du devis POLLARD.

Tant que l'étape 2 n'est pas faite, les devis continuent d'arriver normalement,
mais les photos restent en attente sur les téléphones et repartiront toutes seules
une fois le script à jour.

## Écran d'information à chaque connexion

Après chaque connexion, avant d'accéder aux devis, le commercial voit le texte
d'information sur le journal et doit appuyer sur **« J'ai lu et j'accepte »**.
L'acceptation part dans le journal, horodatée, avec la version du texte lu.

Un rechargement de page ne le redemande pas : c'est la même session. Une
nouvelle ouverture de l'application, si — puisque la connexion est à refaire.

Deux réglages :

- `texte_information` — le texte affiché. `{mois}` y est remplacé par la durée
  de conservation, pour que les deux ne se contredisent jamais.
- `version_information` — à incrémenter dès que tu changes le texte. Chacun
  devra alors l'accepter de nouveau, et le journal gardera trace de quelle
  version a été acceptée, par qui et quand.

Si `texte_information` est vide, l'écran ne s'affiche pas.

**Ce n'est pas un consentement, et c'est voulu.** Un salarié ne peut pas refuser
un dispositif de suivi légitime ; l'obligation de l'employeur est de l'informer.
Le bouton acte donc une prise de connaissance, pas une autorisation — d'où le
libellé. Cela ne te dispense pas de l'information écrite initiale (note de
service ou avenant) : l'écran en apporte la preuve renouvelée à chaque session.

## Journal des actions — nouvel onglet JOURNAL

Chaque geste est horodaté et versé dans l'onglet JOURNAL du classeur :

| Colonne | Contenu |
|---|---|
| HORODATAGE | moment où le classeur a reçu la ligne |
| MOMENT | moment où l'action a eu lieu sur l'appareil |
| COMMERCIAL | qui |
| ACTION | connexion, devis créé, signature client, photos ajoutées… |
| DETAIL | client et montant, nombre de photos, motif |
| NUMERO | devis concerné |
| APPAREIL | identifiant du téléphone |
| SOURCE | APPAREIL ou SERVEUR |

Actions suivies côté téléphone : CONNEXION, CONNEXION REFUSEE, DECONNEXION,
DEVIS CREE, SIGNATURE CLIENT, PHOTOS AJOUTEES, PHOTO RETIREE, PDF PARTAGE,
DEVIS DUPLIQUE, RENVOI DEMANDE, PURGE LOCALE.

Côté serveur : CONNEXION VALIDEE, CODE REFUSE, DEVIS RECU, PHOTO RECUE.

**La colonne SOURCE est importante.** Les lignes APPAREIL sont ce que le
téléphone déclare avoir fait : elles fonctionnent hors connexion et partent à la
synchronisation suivante, mais c'est l'appareil qui les écrit. Les lignes
SERVEUR sont ce que le classeur constate lui-même à la réception et ne dépendent
d'aucun téléphone. En cas de litige, ce sont celles-là qui font foi.

Les événements survenus hors connexion sont conservés sur l'appareil et versés
dès le retour du réseau, par paquets de 200.

### Conservation et information des salariés

Réglage `journal_retention_mois`, **6 mois** par défaut, et un menu
*Devis → 8. Purger le journal des actions* qui efface ce qui dépasse.

⚠ Un journal qui trace l'activité de tes salariés est un traitement de données
personnelles. Tu dois **informer chaque commercial** de son existence, de ce
qu'il enregistre, de la durée de conservation et de la raison d'être du
dispositif — par écrit, par exemple dans un avenant ou une note de service. La
CNIL recommande une conservation limitée, d'où les 6 mois par défaut. Un
dispositif non déclaré aux intéressés est inopposable en cas de litige.

## Mentions obligatoires sur le devis

Ajoutées à l'en-tête, à partir de données déjà présentes dans REGLAGES :
**forme juridique et capital** (« SARL au capital de 1 818 € ») et
**immatriculation RCS**. Le capital n'est pas répété s'il figure déjà dans la
forme juridique.

Nouveau champ **Date ou délai d'intervention** sur l'écran de validation : un
devis doit indiquer quand la prestation sera exécutée. Il s'imprime sous
« Établi par », et arrive dans la colonne DELAI du classeur.

La mention que le client recopie avant de signer devient un réglage
(`mention_manuscrite`, « Bon pour accord » par défaut). Pour des travaux de
remise en état chez un particulier, la formule d'usage est
« Devis reçu avant l'exécution des travaux » — à toi de voir avec ton conseil.

### Devis aux particuliers uniquement

- **Formulaire de rétractation** en dernière page, prêt à détacher, prérempli
  avec le numéro de devis, la date, le nom et l'adresse du client. Un contrat
  signé au domicile est conclu hors établissement et doit en être accompagné.
  Se désactive par le réglage `bordereau_retractation` = NON.
- **Médiateur de la consommation** en bas de page, dès que le réglage
  `mediateur` est rempli. Tu dois adhérer à un médiateur et l'indiquer : c'est
  une obligation face à un consommateur.

### Les deux types de devis

- **Assurance RC professionnelle** en bas de page, dès que le réglage
  `assurance_rc` est rempli : assureur, adresse, couverture géographique.

Ces deux derniers réglages sont **volontairement vides** : remplis-les avec tes
informations réelles, rien ne s'imprimera tant qu'ils le sont.

⚠ Je ne suis pas juriste. Ces ajouts couvrent les mentions habituelles d'un devis
de prestation de services, mais fais valider l'ensemble par ton comptable ou ton
conseil avant de t'y fier.

## Bouton Retour sur « Mes devis » et sur les photos

Ces deux écrans étaient des impasses : une fois dedans, plus moyen de revenir au
devis en cours. La barre du bas y affiche maintenant un bouton **Retour**, à la
même place que dans le reste du parcours, et il sait d'où l'on vient :

- « Mes devis » ouvert depuis les prestations → retour aux prestations
- « Mes devis » ouvert depuis l'écran de fin → retour à l'écran de fin
- les photos d'un devis → retour à « Mes devis », puis à l'étape d'origine

Sur ces écrans, la barre ne montre que le Retour : ni totaux ni « Continuer »,
qui n'auraient pas de sens là.

## ⚠ L'adresse de synchronisation ne publie plus rien

C'est le point important de cette version. Jusqu'ici, appeler l'adresse du script
dans un navigateur renvoyait le catalogue, les réglages, la liste des commerciaux,
**l'empreinte de chaque code et le grain de sel servant à la calculer**. Avec ces
deux derniers éléments, retrouver un code de 4 ou 5 caractères prend quelques
secondes hors ligne — et permettait ensuite d'écrire dans le classeur, dans le
Drive, et d'envoyer des e-mails depuis le compte Google de la société.

Désormais l'adresse ne répond plus qu'un accusé de service. Le catalogue, les
tarifs et les réglages ne sortent qu'après vérification du nom et du code, par
POST. Le serveur bloque aussi un nom après dix échecs en un quart d'heure.

**Conséquence sur les téléphones** : la toute première connexion d'un appareil
(ou d'un nouveau commercial sur un appareil existant) demande du réseau. Le
téléphone garde ensuite de quoi vérifier le code tout seul, avec un grain de sel
qui lui est propre et qui n'a jamais circulé ; les connexions suivantes se font
hors ligne comme avant.

## Purge automatique à 30 jours

Un devis parti au bureau est effacé du téléphone au bout d'un mois : il est dans
le classeur et son PDF dans le Drive. Un téléphone égaré emporte donc au plus un
mois d'activité.

Jamais touché, quel que soit l'âge : un devis pas encore synchronisé, et un devis
dont une photo attend encore de partir.

À savoir : l'autocomplétion des clients se nourrit des devis présents sur
l'appareil. Elle ne couvre donc plus que le dernier mois. Dis-moi si tu préfères
garder les coordonnées clients au-delà.

## Sécurité de la connexion

Le nom du commercial se **tape**, il n'est plus choisi dans une liste : la liste
des commerciaux n'apparaît plus sur les téléphones. La comparaison ignore la
casse, les accents et les espaces en trop — « simon lg » suffit.

La connexion ne survit plus à la fermeture de l'application. Elle tient pendant
toute la session, y compris quand l'appli passe en arrière-plan, quand le
téléphone se met en veille ou quand la page se recharge ; elle se referme dès que
l'application est fermée pour de bon.

En cas d'échec, un seul message — « Nom ou code incorrect » — qu'il s'agisse du
nom ou du code : un téléphone perdu ne permet pas de découvrir qui travaille
chez BB. Au bout de trois échecs, il faut attendre 10 secondes entre deux essais,
puis une minute au bout de six.

Les devis déjà enregistrés partent au bureau même sans que personne soit
connecté : la synchronisation n'attend pas la reconnexion.

## Le devis reprend ton format

Mise en page calquée sur le devis Henrri : titre du devis en haut à droite, bloc
émetteur à gauche et client à droite, tableau *Référence / Désignation / Quantité /
Unité / PU Vente / % Rem / TVA / Montant HT*, prestations **regroupées par poste
avec un sous-total**, bloc bleu des totaux, conditions de paiement, coordonnées
bancaires et mentions légales en bas de chaque page.

Quand toutes les lignes d'un poste portent la même quantité, elle s'affiche dans
le titre du poste — « NETTOYAGE DES VITRAGES ET MENUISERIES ( 35 m2 ) ».

### TVA

La règle est appliquée automatiquement :

- client professionnel → 20 %
- particulier, logement de moins de deux ans → 20 %
- particulier, logement de plus de deux ans → 10 %

L'application pose la question de l'âge du logement pour un particulier et refuse
de continuer tant qu'elle n'a pas la réponse. Le taux reste modifiable ligne par
ligne pour les cas particuliers.

Le taux inscrit dans le CATALOGUE n'est qu'une valeur de repli : c'est le devis
qui décide.

### Remise

Elle est désormais **par ligne** (colonne % Rem), comme sur ton modèle. La remise
globale a disparu de l'écran de validation.

### Objet du devis

Nouveau champ en haut de l'écran Prestations : il s'imprime en titre
(« DEVIS - NETTOYAGE MAISON FIN DE CHANTIER »).

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
- **Photos du site**, étape à part, une fois le devis signé et enregistré :
  dans « Mes devis », bouton *Photos* sur la ligne du devis (ou, juste après la
  signature, *Ajouter des photos du site*). Jusqu'à 12 par devis, réduites dans
  le téléphone, rangées dans le dossier Drive du devis. Elles ne figurent jamais
  sur le PDF remis au client. Prises hors connexion, elles partent au retour du
  réseau. Une photo déjà envoyée ne peut plus être retirée depuis le téléphone.

## Combien de temps les données restent sur le téléphone

L'application n'efface jamais rien d'elle-même : un devis signé hors connexion
reste sur l'appareil jusqu'à ce qu'il parte, et l'historique est conservé.
La seule limite vient du téléphone lui-même.

- **Android** : rien n'est effacé tant que le commercial ne vide pas les données
  du navigateur ou ne désinstalle pas l'application.
- **iPhone** : l'application **doit être installée sur l'écran d'accueil**.
  Ouverte comme un simple onglet Safari, iOS efface ses données après 7 jours
  sans ouverture. Installée sur l'écran d'accueil, elle n'est pas concernée.
  Supprimer l'icône supprime aussi les devis non envoyés.

L'application demande au téléphone de marquer son stockage comme permanent,
ce qui la protège aussi des nettoyages automatiques quand la mémoire se remplit.

Une fois une photo rangée dans Drive, le téléphone n'en garde qu'une vignette :
l'application reste légère même après des centaines de devis.

## Colonnes ajoutées

Onglet DEVIS : `PHOTOS`, `OBJET`, `LOGEMENT_PLUS_2_ANS`, `TAUX_TVA`.
Onglet LIGNES : `REFERENCE` et `REMISE_PCT`.

## Réglages ajoutés

`societe_site`, `societe_capital`, `banque_nom`, `banque_iban`, `banque_bic`,
`paiement_pct`, `conditions_paiement`, `clause_reserve`, `mentions_penalites`,
`mentions_credit_impot`.

Les réglages d'identité laissés vides (téléphone, e-mail) sont complétés
automatiquement par *6. Mettre à jour la structure du fichier*.

`mentions_credit_impot` est volontairement **vide** : le crédit d'impôt services à
la personne suppose une déclaration SAP. Ne remplis cette ligne qu'une fois la
déclaration obtenue, le texte s'imprimera alors sur les devis aux particuliers.

## À vérifier

Le n° de TVA imprimé sur le devis POLLARD (FR74939266573) ne correspond pas au
SIRET de BREIZH BRILLANCE (991 595 711 000 11), dont le n° serait FR69 991 595 711.
Celui présent dans le classeur (FR88991595711) a une clé de contrôle fausse.
J'ai mis FR69991595711 comme valeur de repli, mais c'est à faire confirmer par
ton comptable.
