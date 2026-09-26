# v23 — le résultat du rendez-vous, et tout ce qui en découle

Le devis est imprimé et signé sur place, sur le papier. L'application ne peut pas
le deviner : le commercial le dit en un appui, et à partir de cette seule réponse
le classeur fabrique le reste — la liste à refacturer dans Henrri, les chiffres,
et les rappels du matin.

---

## Ce qui change pour le commercial

**Après avoir enregistré un devis**, l'écran de fin pose une question : *Résultat du
rendez-vous ?* Trois réponses.

| Réponse | Ce qui se passe |
|---|---|
| **Signé sur place** | L'écran « Photographier le devis signé » s'ouvre tout de suite. C'est cette photo qui fait preuve. |
| **Le client réfléchit** | Une date de relance, proposée à 7 jours. Le commercial reçoit un rappel le jour venu. |
| **Refusé** | Une raison en un appui : trop cher, concurrent, pas le bon moment, pas le besoin, autre. |

Rien n'est obligatoire sur le moment : la réponse peut être donnée ou corrigée plus
tard depuis **Mes devis**, où chaque devis porte désormais une pastille — `SIGNÉ`,
`À RELANCER`, `REFUSÉ`, ou `À RENSEIGNER` tant que personne n'a répondu.

En haut de **Mes devis**, un encadré **À faire** résume ce qui traîne : les relances
du jour, les devis sans résultat, les devis signés dont la photo du papier manque.

La signature à l'écran reste possible, mais elle n'est plus mise en avant : le papier
signé est la règle.

## Ce qui change pour toi, dans le classeur

**Onglet `A FACTURER`** — une ligne par devis signé, avec tout ce qu'il faut pour le
resaisir dans Henrri : client, SIRET, n° de TVA, adresse, taux, totaux HT / TVA / TTC,
les prestations écrites en clair (`50 m² × Vitrerie extérieure — 3 € HT − 10 % = 135 € HT`),
le lien du PDF et le lien de la photo du devis signé. Une case **FACTURE** à cocher
quand c'est fait : elle est conservée d'un rafraîchissement à l'autre. C'est la seule
colonne à remplir à la main.

**Onglet `TABLEAU DE BORD`** — devisé, signé, taux de transformation, récurrent mensuel
signé, le tout par commercial et par mois, plus le classement des motifs de refus.
Des valeurs, pas des formules : rien ne casse si une ligne bouge.

**Onglet `DEVIS`** — cinq colonnes de plus : `MOTIF_REFUS`, `RELANCE_LE`, `DATE_STATUT`,
`PREUVE_SIGNATURE`, et `STATUT` devient une liste déroulante (`REMIS`, `SIGNE`,
`A RELANCER`, `REFUSE`, `EXPIRE`) — tu peux corriger un état à la main sans faute de frappe.
À la réception, un devis est `REMIS` : il a été laissé au client, on ne sait pas encore.

**Rappel quotidien** (menu 10) — chaque matin vers 7 h : les devis périmés passent en
`EXPIRE`, les deux onglets de suivi sont reconstruits, et chaque commercial reçoit un
message **seulement s'il a quelque chose à faire**. Une fois par semaine, tu reçois le
récapitulatif. **Aucun message n'est jamais envoyé à un client** — c'est le commercial
qui appelle.

---

## À faire, dans cet ordre

**1. Le script d'abord** (sinon l'application enverra des résultats que le classeur ne
comprend pas encore ; ce n'est pas grave, elle réessaiera, mais autant éviter).

- Ouvre le classeur → Extensions → Apps Script
- Remplace tout le contenu par le nouveau `Code.gs`, enregistre
- **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**
  (l'adresse ne change pas, `config.js` reste tel quel)
- Reviens au classeur, recharge la page, puis dans le menu **Devis** :
  - `6. Mettre à jour la structure du fichier`
  - `9. Rafraîchir « À facturer » et le tableau de bord`
  - `10. Activer le rappel quotidien aux commerciaux` — Google demandera une
    autorisation pour l'envoi d'e-mails, c'est normal

**2. L'application ensuite** — sur GitHub, remplace `index.html`, `app.js` et `sw.js`.
`config.js` n'a pas bougé : ne le touche pas.

**3. Deux réglages à vérifier** dans l'onglet `REGLAGES` :
- `recap_email` — qui reçoit le récapitulatif hebdomadaire (rempli automatiquement)
- `rappel_sans_resultat_jours` — au bout de combien de jours on relance le commercial
  qui n'a pas dit ce qu'un devis est devenu (2 par défaut)

---

## Vérifié avant livraison

- 17 contrôles sur l'application, dans un vrai navigateur : le parcours complet, les
  trois réponses, la correction d'une réponse, la photo du devis signé, le retour en
  arrière, les pastilles, l'encadré À faire, le journal.
- 30 contrôles sur le script, sur un classeur simulé : `A FACTURER` (seuls les signés,
  totaux justes, prestations lisibles, case cochée conservée), l'expiration (un devis
  signé ou refusé n'est jamais touché), les rappels (rien ne part chez un client), le
  tableau de bord, et le refus propre d'un devis inconnu ou d'un résultat inconnu.
- Les contrôles des versions précédentes repassent au vert.

## Ce qui reste de ton côté

- `assurance_rc` et `mediateur` dans `REGLAGES` (obligatoires sur un devis à un particulier)
- Informer les commerciaux par écrit du journal des actions — je peux te rédiger la note
- Faire confirmer `FR69991595711` par ton comptable
- `mentions_credit_impot` seulement une fois la déclaration SAP faite
