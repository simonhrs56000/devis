/****************************************************************
 * DEVIS NETTOYAGE — Backend Google Apps Script
 * À coller dans le Google Sheet (Extensions > Apps Script).
 *
 * Rôle : servir le catalogue à l'application mobile, et recevoir
 * les devis que les téléphones envoient quand ils retrouvent du réseau.
 * L'application, elle, est hébergée à part et fonctionne hors connexion.
 *
 * Onglets : REGLAGES, CATALOGUE, COMMERCIAUX, DEVIS, LIGNES
 ****************************************************************/

var SH = {
  REGLAGES: 'REGLAGES',
  CATALOGUE: 'CATALOGUE',
  COMMERCIAUX: 'COMMERCIAUX',
  DEVIS: 'DEVIS',
  LIGNES: 'LIGNES'
};

/* ============================ MENU ============================ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Devis')
    .addItem('1. Initialiser le fichier', 'initialiser')
    .addItem('2. Afficher l\'adresse de synchronisation', 'afficherLien')
    .addItem('3. Vérifier les codes des commerciaux', 'verifierCodes')
    .addItem('4. Proposer un code conforme', 'proposerCode')
    .addItem('5. Tester (devis fictif)', 'testerDevis')
    .addItem('6. Mettre à jour la structure du fichier', 'majStructure')
    .addItem('7. Charger la grille de prix', 'chargerGrillePrix')
    .addToUi();
}

function afficherLien() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url
    ? 'Adresse à coller dans le fichier config.js de l\'application :\n\n' + url
    : 'Pas encore déployé : Déployer > Nouveau déploiement > Application Web.');
}

/* ===================== CODES DES COMMERCIAUX =====================
   Règle : au moins 4 caractères, dont un chiffre et un caractère spécial.
   L'application refuse tout code qui ne la respecte pas.               */

function codeConforme_(c) {
  c = String(c);
  return c.length >= 4 && /[0-9]/.test(c) && /[^A-Za-z0-9]/.test(c);
}

/** Surligne les codes non conformes dans l'onglet COMMERCIAUX. */
function verifierCodes() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SH.COMMERCIAUX);
  if (!sh || sh.getLastRow() < 2) return;
  var n = sh.getLastRow() - 1;
  var plage = sh.getRange(2, 3, n, 1);
  var codes = plage.getValues();
  var fonds = [], mauvais = [];
  codes.forEach(function (r, i) {
    var ok = codeConforme_(r[0]);
    fonds.push([ok ? null : '#fde2e1']);
    if (!ok) mauvais.push(sh.getRange(i + 2, 1).getValue() + ' (ligne ' + (i + 2) + ')');
  });
  plage.setBackgrounds(fonds);
  SpreadsheetApp.getUi().alert(mauvais.length
    ? 'Codes à corriger (4 caractères minimum, dont un chiffre et un caractère spécial) :\n\n• ' +
      mauvais.join('\n• ') + '\n\nCes commerciaux ne pourront pas se connecter tant que leur code n\'est pas conforme.'
    : 'Tous les codes respectent la règle.');
}

/** Génère un code conforme, facile à dicter au téléphone. */
function proposerCode() {
  SpreadsheetApp.getUi().alert('Code proposé : ' + genererCode_() +
    '\n\nCopie-le dans la colonne CODE du commercial concerné, puis transmets-le lui.');
}

function genererCode_() {
  var lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // sans I ni O, pour éviter les confusions
  var chiffres = '23456789';
  var speciaux = '!?*#&-+';
  function pioche(s) { return s.charAt(Math.floor(Math.random() * s.length)); }
  var c = [pioche(lettres), pioche(lettres).toLowerCase(), pioche(chiffres), pioche(speciaux), pioche(chiffres)];
  return c.join('');
}

/* ======================= INITIALISATION ======================= */

function initialiser() {
  var ss = SpreadsheetApp.getActive();

  creerOnglet_(ss, SH.REGLAGES, ['CLE', 'VALEUR', 'COMMENTAIRE']);
  creerOnglet_(ss, SH.CATALOGUE, ['CATEGORIE', 'DESIGNATION', 'DETAIL', 'UNITE', 'PU_HT', 'TVA', 'TYPE', 'ACTIF']);
  creerOnglet_(ss, SH.COMMERCIAUX, ['NOM', 'EMAIL', 'CODE', 'ACTIF']);
  creerOnglet_(ss, SH.DEVIS, ENTETES_DEVIS_);
  creerOnglet_(ss, SH.LIGNES, ENTETES_LIGNES_);

  var reg = ss.getSheetByName(SH.REGLAGES);
  if (reg.getLastRow() < 2) {
    reg.getRange(2, 1, REGLAGES_DEFAUT_.length, 3).setValues(REGLAGES_DEFAUT_);
    reg.setColumnWidth(1, 190); reg.setColumnWidth(2, 340); reg.setColumnWidth(3, 330);
  }
  if (!String(lireReglages_().sel_codes || '').trim()) {
    ecrireReglage_('sel_codes', Utilities.getUuid());
  }

  var cat = ss.getSheetByName(SH.CATALOGUE);
  if (cat.getLastRow() < 2) {
    cat.getRange(2, 1, CATALOGUE_DEFAUT_.length, 8).setValues(CATALOGUE_DEFAUT_);
    cat.setColumnWidth(2, 260); cat.setColumnWidth(3, 300);
  }

  var com = ss.getSheetByName(SH.COMMERCIAUX);
  if (com.getLastRow() < 2) com.getRange(2, 1, 1, 4).setValues([['Commercial 1', '', genererCode_(), 'OUI']]);

  SpreadsheetApp.getUi().alert(
    'Fichier initialisé.\n\n' +
    '1) REGLAGES : tes infos de société (elles s\'impriment sur le devis).\n' +
    '2) CATALOGUE : tes prestations et tes prix.\n' +
    '3) COMMERCIAUX : un par ligne, avec son code personnel\n   (4 caractères minimum, dont un chiffre et un caractère spécial).\n\n' +
    'Ensuite : Déployer > Nouveau déploiement > Application Web ' +
    '(exécuter en tant que Moi, accès Tout le monde).'
  );
}

function creerOnglet_(ss, nom, entetes) {
  var sh = ss.getSheetByName(nom) || ss.insertSheet(nom);
  if (sh.getLastRow() === 0 || String(sh.getRange(1, 1).getValue()).trim() === '') {
    sh.getRange(1, 1, 1, entetes.length).setValues([entetes])
      .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

var ENTETES_DEVIS_ = [
  'NUMERO', 'DATE', 'COMMERCIAL', 'CLIENT', 'TYPE_CLIENT', 'SIRET_CLIENT', 'TVA_CLIENT',
  'CONTACT', 'TELEPHONE', 'EMAIL', 'ADRESSE', 'CP', 'VILLE',
  'TOTAL_HT_PONCTUEL', 'TOTAL_HT_MENSUEL', 'TOTAL_HT', 'TOTAL_TVA', 'TOTAL_TTC',
  'REMISE_PCT', 'STATUT', 'SIGNE', 'SIGNATAIRE', 'VALIDITE', 'LIEN_PDF', 'PHOTOS', 'NOTES',
  'RECU_LE', 'ID_APPAREIL', 'ID_DEVIS', 'OBJET', 'LOGEMENT_PLUS_2_ANS', 'TAUX_TVA'
];

var ENTETES_LIGNES_ = [
  'NUMERO', 'ORDRE', 'CATEGORIE', 'REFERENCE', 'DESIGNATION', 'DETAIL', 'QTE', 'UNITE',
  'PU_HT', 'REMISE_PCT', 'TYPE', 'TVA', 'TOTAL_HT'
];

/**
 * Ajoute ce qui manque à un fichier déjà en service, sans toucher aux données :
 * les colonnes client professionnel, et les réglages apparus après coup.
 * Appelée automatiquement à chaque devis reçu — elle ne fait rien si tout est là.
 */
function majStructure() {
  majStructure_();
  SpreadsheetApp.getUi().alert('Structure à jour.');
}

function majStructure_() {
  var ss = SpreadsheetApp.getActive();
  var shD = ss.getSheetByName(SH.DEVIS);
  if (shD && shD.getLastColumn() > 0) {
    var en = shD.getRange(1, 1, 1, shD.getLastColumn()).getValues()[0]
      .map(function (x) { return String(x).trim(); });
    if (en.indexOf('TYPE_CLIENT') < 0) {
      var apres = en.indexOf('CLIENT') >= 0 ? en.indexOf('CLIENT') + 1 : shD.getLastColumn();
      shD.insertColumnsAfter(apres, 3);
      shD.getRange(1, apres + 1, 1, 3)
        .setValues([['TYPE_CLIENT', 'SIRET_CLIENT', 'TVA_CLIENT']])
        .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
      en = shD.getRange(1, 1, 1, shD.getLastColumn()).getValues()[0]
        .map(function (x) { return String(x).trim(); });
    }
    // toute colonne prévue et encore absente est ajoutée à la fin,
    // sans jamais déplacer celles qui portent déjà des données
    ENTETES_DEVIS_.forEach(function (h) {
      if (en.indexOf(h) >= 0) return;
      var c = shD.getLastColumn() + 1;
      shD.getRange(1, c).setValue(h)
        .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
      en.push(h);
    });
  }
  var shL = ss.getSheetByName(SH.LIGNES);
  if (shL && shL.getLastColumn() > 0) {
    var enL = shL.getRange(1, 1, 1, shL.getLastColumn()).getValues()[0]
      .map(function (x) { return String(x).trim(); });
    ENTETES_LIGNES_.forEach(function (h) {
      if (enL.indexOf(h) >= 0) return;
      var c = shL.getLastColumn() + 1;
      shL.getRange(1, c).setValue(h)
        .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
      enL.push(h);
    });
  }

  var reg = lireReglages_(), shR = ss.getSheetByName(SH.REGLAGES);
  if (shR) {
    REGLAGES_DEFAUT_.forEach(function (r) {
      if (!(r[0] in reg)) shR.appendRow(r);
    });
    // Réglages d'identité laissés vides : on y met la valeur par défaut.
    // Volontairement limité à cette liste, pour ne jamais réécrire un texte vidé exprès.
    var aRemplir = ['societe_tel', 'societe_email', 'societe_site', 'societe_capital',
                    'banque_nom', 'banque_iban', 'banque_bic', 'conditions_paiement',
                    'paiement_pct', 'clause_reserve', 'mentions_penalites'];
    REGLAGES_DEFAUT_.forEach(function (r) {
      if (aRemplir.indexOf(r[0]) < 0) return;
      if (String(reg[r[0]] === undefined ? '' : reg[r[0]]).trim() !== '') return;
      ecrireReglage_(r[0], r[1]);
    });
  }
}

var REGLAGES_DEFAUT_ = [
  ['societe_nom', 'MA SOCIETE DE NETTOYAGE', 'Nom imprimé en haut du devis'],
  ['societe_forme', 'SARL au capital de 0 €', 'Forme juridique + capital'],
  ['societe_adresse', '1 rue Exemple', ''],
  ['societe_cp_ville', '56000 Vannes', ''],
  ['societe_tel', '+33 6 73 35 76 05', ''],
  ['societe_email', 'breizhbrillance@gmail.com', ''],
  ['societe_site', 'breizhbrillance.fr', 'Site imprimé sous l\'e-mail'],
  ['societe_capital', '1 818 €', 'Imprimé sous le SIRET'],
  ['societe_siret', '000 000 000 00000', 'Obligatoire sur un devis'],
  ['societe_tva', 'FR69991595711', 'N° TVA intracommunautaire — à faire confirmer par le comptable'],
  ['societe_rcs', 'RCS Vannes 000 000 000', ''],
  ['tva_defaut', '20', 'Taux de TVA par défaut en %'],
  ['validite_jours', '30', 'Durée de validité du devis en jours'],
  ['conditions_reglement', 'Paiement à 30 jours à réception de facture. Pénalités de retard : 3 fois le taux d\'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.', 'Bas de devis'],
  ['mentions_bas', 'Devis gratuit. Il doit être retourné daté et signé avec la mention « Bon pour accord ».', 'Bas de devis'],
  ['mentions_particulier', 'Contrat conclu hors établissement : le client particulier dispose d\'un délai de rétractation de 14 jours à compter de la signature (art. L221-18 du Code de la consommation), sans motif ni pénalité. À faire valider par votre conseil.', 'Imprimé uniquement sur les devis aux particuliers'],
  ['prefixe_devis', 'DEV', 'Numéro : DEV-2026-KL-0001 (KL = initiales du commercial)'],
  ['dossier_racine_id', '', 'Dossier Drive racine — rempli automatiquement'],
  ['email_copie', '', 'Adresse qui reçoit une copie de chaque devis'],
  ['banque_nom', 'CMB Saint Avé', 'Coordonnées bancaires imprimées sur le devis'],
  ['banque_iban', 'FR76 1558 9569 3900 1258 9684 096', ''],
  ['banque_bic', 'CMBRFR2BXXX', ''],
  ['paiement_pct', '100', 'Part à régler — « 100 % soit 1 210,83 € : … »'],
  ['conditions_paiement', 'Paiement comptant.', 'Suite de la ligne ci-dessus'],
  ['clause_reserve', 'CLAUSE DE RÉSERVE DE PROPRIÉTÉ : Conformément à la loi 80.335 du 12 mai 1980, nous réservons la propriété des produits et marchandises, objets des présents débits, jusqu\'au paiement de l\'intégralité du prix et de ses accessoires. En cas de non paiement total ou partiel du prix de l\'échéance pour quelque cause que ce soit, de convention expresse, nous nous réservons la faculté, sans formalités, de reprendre matériellement possession de ces produits ou marchandises à vos frais, risques et périls.', 'Bas de page'],
  ['mentions_penalites', 'Pénalité de retard : 3 fois le taux d\'intérêt légal après date d\'échéance. Escompte pour règlement anticipé : 0 % (sauf condition particulière définie dans les conditions de règlement). Le montant de l\'indemnité forfaitaire pour frais de recouvrement prévue au douzième alinéa de l\'article L441-6 est fixé à 40 euros en matière commerciale.', 'Bas de page'],
  ['mentions_credit_impot', '', 'Crédit d\'impôt services à la personne — à ne remplir qu\'une fois la déclaration SAP obtenue'],
  ['sel_codes', '', 'Généré automatiquement — ne pas modifier']
];

var CATALOGUE_DEFAUT_ = [
  ['Remise en état des sols', 'Nettoyage approfondi des plinthes et angles', '', 'm2', 0.20, 10, 'PONCTUEL', 'OUI'],
  ['Remise en état des sols', 'Aspiration complète des sols', '', 'm2', 0.40, 10, 'PONCTUEL', 'OUI'],
  ['Remise en état des sols', 'Décapage des sols au décapant laitance', '', 'm2', 0.50, 10, 'PONCTUEL', 'OUI'],
  ['Remise en état des sols', 'Lavage humide et désinfection des sols', '', 'm2', 0.45, 10, 'PONCTUEL', 'OUI'],
  ['Nettoyage des vitrages et menuiseries', 'Nettoyage des vitrages intérieurs/extérieurs', '', 'm2', 8, 10, 'PONCTUEL', 'OUI'],
  ['Nettoyage des vitrages et menuiseries', 'Nettoyage complet des menuiseries, cadres et rails', '', 'm2', 4, 10, 'PONCTUEL', 'OUI'],
  ['Nettoyage des vitrages et menuiseries', 'Nettoyage des volets roulants', '', 'm2', 2, 10, 'PONCTUEL', 'OUI'],
  ['Remise en état de la cuisine', 'Nettoyage intérieur de la cuisine', '', 'forfait', 30, 10, 'PONCTUEL', 'OUI'],
  ['Remise en état de la cuisine', 'Nettoyage extérieur de la cuisine', '', 'forfait', 20, 10, 'PONCTUEL', 'OUI'],
  ['Chambres et pièces diverses', 'Nettoyage intérieur/extérieur des étagères, meubles, moulures et surfaces en relief', '', 'pièce(s)', 10, 10, 'PONCTUEL', 'OUI'],
  ['Nettoyage des sanitaires et pièces d\'eau', 'Nettoyage et désinfection WC et lavabos', '', 'pièce(s)', 40, 10, 'PONCTUEL', 'OUI'],
  ['Nettoyage des sanitaires et pièces d\'eau', 'Nettoyage robinetteries et faïences', '', 'pièce(s)', 15, 10, 'PONCTUEL', 'OUI'],
  ['Nettoyage des sanitaires et pièces d\'eau', 'Nettoyage parois vitrées', '', 'pièce(s)', 30, 10, 'PONCTUEL', 'OUI'],
  ['Finitions générales et livraison', 'Contrôle qualité et reprises générales', '', 'forfait', 10, 10, 'PONCTUEL', 'OUI']
];

/** Remplace le contenu du CATALOGUE par la grille de prix de référence. */
function chargerGrillePrix() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert('Remplacer le catalogue ?',
    'Les ' + CATALOGUE_DEFAUT_.length + ' prestations de la grille de prix vont remplacer le contenu ' +
    'actuel de l\'onglet CATALOGUE.\n\nLes anciennes lignes seront effacées (annulable par Ctrl+Z ' +
    'ou par l\'historique des versions du classeur).\n\nContinuer ?', ui.ButtonSet.YES_NO);
  if (rep !== ui.Button.YES) return;

  var sh = SpreadsheetApp.getActive().getSheetByName(SH.CATALOGUE);
  if (!sh) return ui.alert('Onglet CATALOGUE introuvable. Lance d\'abord « 1. Initialiser le fichier ».');
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 8).clearContent();
  sh.getRange(2, 1, CATALOGUE_DEFAUT_.length, 8).setValues(CATALOGUE_DEFAUT_);
  sh.setColumnWidth(1, 250); sh.setColumnWidth(2, 340); sh.setColumnWidth(3, 200);
  ui.alert(CATALOGUE_DEFAUT_.length + ' prestations chargées.\n\n' +
    'Le taux de TVA indiqué ici n\'est qu\'une valeur de repli : sur le terrain, ' +
    'l\'application applique 20 % pour un professionnel, 10 % ou 20 % pour un particulier ' +
    'selon l\'âge du logement.');
}

/* ============================ API ============================ */

function reponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET : ne publie plus rien.
 * Le catalogue, les réglages et la liste des commerciaux ne sortent qu'après
 * vérification du nom et du code, par POST. Avant, l'adresse — qui est publique,
 * puisqu'elle figure dans l'application — laissait lire les empreintes des codes
 * et le grain de sel qui sert à les calculer : de quoi retrouver un code court
 * en quelques secondes hors ligne.
 */
function doGet(e) {
  return reponse_({ ok: true, service: 'devis', message: 'Service en ligne. Identification requise.' });
}

/** Nom comparé sans tenir compte de la casse, des accents ni des espaces en trop. */
function normNom_(s) {
  s = String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  return s.replace(/[àáâäã]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
          .replace(/[òóôöõ]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c');
}

function trouverCommercial_(nom) {
  var n = normNom_(nom), out = null;
  lireCommerciaux_().forEach(function (c) { if (normNom_(c.nom) === n) out = c; });
  return out;
}

/**
 * Freine les essais répétés sur un même nom : 10 échecs par quart d'heure.
 * Sans ça, l'adresse étant publique, un code court se teste en ligne.
 */
function essaisRestants_(nom) {
  var cache = CacheService.getScriptCache();
  var cle = 'essais_' + normNom_(nom);
  return { cache: cache, cle: cle, n: Number(cache.get(cle) || 0) };
}
function noterEchec_(nom) {
  var e = essaisRestants_(nom);
  e.cache.put(e.cle, String(e.n + 1), 900);
}
function tropDEssais_(nom) {
  return essaisRestants_(nom).n >= 10;
}

/** Ce que l'application reçoit une fois le commercial reconnu. */
function config_() {
  var reg = lireReglages_();
  delete reg.sel_codes;
  delete reg.dossier_racine_id;
  delete reg.dossier_drive_id;
  delete reg.email_copie;
  return {
    maj: new Date().toISOString(),
    compteurs: compteurs_(),    // dernier numéro par commercial : évite qu'un
    reglages: reg,              // téléphone réinstallé reparte à 0001
    catalogue: lireCatalogue_()
  };
}

/** POST {action:'sync', nom, code, devis, pdf(base64)} */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse(e.postData.contents);
    var actions = ['connexion', 'config', 'sync', 'photo'];
    if (actions.indexOf(d.action) < 0) return reponse_({ ok: false, erreur: 'action inconnue' });

    // Un seul et même refus, que le nom soit inconnu ou le code faux.
    if (tropDEssais_(d.nom)) {
      return reponse_({ ok: false, refus: true, erreur: 'Trop d\'essais. Réessaie dans un quart d\'heure.' });
    }
    var com = trouverCommercial_(d.nom);
    if (!com || (com.code && String(d.code || '') !== com.code)) {
      noterEchec_(d.nom);
      return reponse_({ ok: false, refus: true, erreur: 'Nom ou code incorrect' });
    }

    if (d.action === 'connexion') {
      return reponse_({ ok: true, nom: com.nom, config: config_() });
    }
    if (d.action === 'config') return reponse_({ ok: true, config: config_() });
    if (d.action === 'photo') return reponse_(enregistrerPhoto_(d));

    lock.waitLock(30000);
    var res = enregistrer_(d, com);
    return reponse_(res);
  } catch (err) {
    return reponse_({ ok: false, erreur: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/** Plus grand numéro déjà utilisé, par série (préfixe + année + initiales). */
function compteurs_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SH.DEVIS);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
    var m = String(r[0]).match(/^(.+)-(\d+)$/);          // tout sauf les 4 derniers chiffres
    if (!m) return;
    var serie = m[1], n = Number(m[2]);
    if (!out[serie] || n > out[serie]) out[serie] = n;
  });
  return out;
}

function enregistrer_(d, com) {
  var ss = SpreadsheetApp.getActive();
  var reg = lireReglages_();
  var devis = d.devis;
  var shD = ss.getSheetByName(SH.DEVIS);
  var renumerote = '';

  majStructure_();      // colonnes client professionnel ajoutées si le fichier est antérieur

  // On repère les colonnes par leur nom : le fichier peut évoluer sans casser le code.
  var en = shD.getRange(1, 1, 1, shD.getLastColumn()).getValues()[0]
    .map(function (x) { return String(x).trim(); });
  var col = {};
  en.forEach(function (h, i) { if (h) col[h] = i; });

  if (shD.getLastRow() > 1) {
    var lignes = shD.getRange(2, 1, shD.getLastRow() - 1, en.length).getValues();

    // 1. déjà reçu ? on compare l'identifiant unique du devis, pas son numéro
    //    (un téléphone réinstallé peut réémettre le même numéro pour un autre devis)
    for (var i = 0; i < lignes.length; i++) {
      if (d.id && col.ID_DEVIS != null && String(lignes[i][col.ID_DEVIS]) === String(d.id)) {
        return { ok: true, doublon: true, numero: String(lignes[i][col.NUMERO]),
                 pdfUrl: String(lignes[i][col.LIEN_PDF] || '') };
      }
    }

    // 2. numéro déjà pris par un AUTRE devis -> on en attribue un libre
    var pris = {};
    lignes.forEach(function (r) { pris[String(r[0])] = true; });
    if (pris[String(devis.numero)]) {
      var m = String(devis.numero).match(/^(.+)-(\d+)$/);
      if (m) {
        var serie = m[1], n = Number(m[2]);
        while (pris[serie + '-' + ('000' + n).slice(-4)]) n++;
        renumerote = devis.numero;
        devis.numero = serie + '-' + ('000' + n).slice(-4);
      } else {
        renumerote = devis.numero;
        devis.numero = devis.numero + '-B';
      }
    }
  }

  // PDF reçu du téléphone -> Drive
  var lienPdf = '', blob = null;
  if (d.pdf) {
    blob = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf',
      d.nomFichier || ('Devis ' + devis.numero + '.pdf'));
    lienPdf = dossierDevis_(reg, new Date(devis.date), devis.commercial).createFile(blob).getUrl();
  }

  var c = devis.client || {}, t = devis.totaux || {};
  var v = {
    NUMERO: devis.numero, DATE: new Date(devis.date), COMMERCIAL: devis.commercial,
    CLIENT: c.societe || c.contact || '',
    TYPE_CLIENT: String(c.type || '').toUpperCase() === 'PART' ? 'PARTICULIER' : 'PROFESSIONNEL',
    SIRET_CLIENT: c.siret || '', TVA_CLIENT: c.tva || '',
    CONTACT: c.contact || '', TELEPHONE: c.tel || '', EMAIL: c.email || '',
    ADRESSE: c.adresse || '', CP: c.cp || '', VILLE: c.ville || '',
    TOTAL_HT_PONCTUEL: t.htPonctuel || 0, TOTAL_HT_MENSUEL: t.htMensuel || 0,
    TOTAL_HT: t.ht || 0, TOTAL_TVA: t.tva || 0, TOTAL_TTC: t.ttc || 0,
    REMISE_PCT: devis.remise || 0,
    STATUT: devis.signature ? 'SIGNE' : 'EN ATTENTE',
    SIGNE: devis.signature ? 'OUI' : 'NON',
    SIGNATAIRE: devis.signataire || '', VALIDITE: new Date(devis.validite), LIEN_PDF: lienPdf,
    NOTES: (devis.notes || '') +
      (renumerote ? ' [numéro d\'origine sur le PDF du client : ' + renumerote + ']' : ''),
    RECU_LE: new Date(), ID_APPAREIL: d.appareil || '', ID_DEVIS: d.id || '',
    OBJET: devis.objet || '',
    LOGEMENT_PLUS_2_ANS: (c.plus2ans === true ? 'OUI' : (c.plus2ans === false ? 'NON' : '')),
    TAUX_TVA: tauxPrincipal_(devis)
  };
  shD.appendRow(en.map(function (h) { return v.hasOwnProperty(h) ? v[h] : ''; }));

  var shL = ss.getSheetByName(SH.LIGNES);
  var enL = shL.getRange(1, 1, 1, shL.getLastColumn()).getValues()[0]
    .map(function (x) { return String(x).trim(); });
  var rows = (devis.lignes || []).map(function (l, idx) {
    var vl = {
      NUMERO: devis.numero, ORDRE: idx + 1, CATEGORIE: l.categorie || '',
      REFERENCE: l.reference || '', DESIGNATION: l.designation || '', DETAIL: l.detail || '',
      QTE: Number(l.qte) || 0, UNITE: l.unite || '', PU_HT: Number(l.pu) || 0,
      REMISE_PCT: Number(l.rem) || 0, TYPE: l.type || 'PONCTUEL', TVA: Number(l.tva) || 0,
      TOTAL_HT: montantLigne_(l)
    };
    return enL.map(function (h) { return vl.hasOwnProperty(h) ? vl[h] : ''; });
  });
  if (rows.length) shL.getRange(shL.getLastRow() + 1, 1, rows.length, enL.length).setValues(rows);

  // e-mails
  try {
    var pj = blob ? [blob] : [];
    var copie = [];
    if (com.email) copie.push(com.email);
    if (reg.email_copie) copie.push(String(reg.email_copie));
    if (d.envoyerClient && c.email) {
      MailApp.sendEmail({
        to: c.email, cc: copie.join(','),
        subject: 'Devis ' + devis.numero + ' — ' + (reg.societe_nom || ''),
        name: String(reg.societe_nom || 'Devis'),
        replyTo: com.email || String(reg.societe_email || ''),
        htmlBody: corpsMail_(devis, reg), attachments: pj
      });
    } else if (copie.length) {
      MailApp.sendEmail({
        to: copie.join(','),
        subject: 'Devis ' + devis.numero + ' — ' + (c.societe || c.contact || ''),
        name: String(reg.societe_nom || 'Devis'),
        htmlBody: 'Devis enregistré par ' + devis.commercial + '.<br>Montant : ' +
                  eur_(t.ttc) + ' TTC.<br>' + (lienPdf ? '<a href="' + lienPdf + '">Ouvrir le PDF</a>' : ''),
        attachments: pj
      });
    }
  } catch (eMail) { /* un mail raté ne doit pas faire échouer la synchro */ }

  return { ok: true, doublon: false, numero: devis.numero, pdfUrl: lienPdf,
           renumerote: renumerote || undefined };
}

/**
 * Photo prise sur le site, rangée dans le même dossier que le PDF du devis.
 * Elle arrive après le devis, dans un appel séparé : une photo lourde qui
 * n'arrive pas ne doit jamais bloquer l'enregistrement du devis lui-même.
 */
function enregistrerPhoto_(d) {
  if (!d.image) return { ok: false, erreur: 'photo vide' };
  var reg = lireReglages_();
  var dossier = dossierDevis_(reg, new Date(d.date), d.commercial);

  var n = Number(d.index) || 1;
  var nom = 'Devis-' + String(d.numero || 'sans-numero') + '-photo-' +
            ('0' + n).slice(-2) + '.jpg';

  // déjà reçue ? (l'appareil peut réessayer après une coupure de réseau)
  var it = dossier.getFilesByName(nom);
  if (it.hasNext()) return { ok: true, doublon: true, url: it.next().getUrl() };

  var blob = Utilities.newBlob(Utilities.base64Decode(d.image), 'image/jpeg', nom);
  var f = dossier.createFile(blob);
  noterPhotos_(d.numero, dossier);
  return { ok: true, url: f.getUrl() };
}

/** Compte les photos rattachées à un devis et l'écrit dans la colonne PHOTOS. */
function noterPhotos_(numero, dossier) {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(SH.DEVIS);
    if (!sh || sh.getLastRow() < 2) return;
    var en = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(function (x) { return String(x).trim(); });
    var cNum = en.indexOf('NUMERO'), cPh = en.indexOf('PHOTOS');
    if (cNum < 0 || cPh < 0) return;

    var n = 0, it = dossier.getFiles();
    while (it.hasNext()) {
      if (it.next().getName().indexOf('Devis-' + numero + '-photo-') === 0) n++;
    }
    var nums = sh.getRange(2, cNum + 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < nums.length; i++) {
      if (String(nums[i][0]) === String(numero)) {
        sh.getRange(i + 2, cPh + 1).setValue(n + ' photo' + (n > 1 ? 's' : ''));
        return;
      }
    }
  } catch (e) { /* le comptage ne doit jamais faire échouer l'envoi */ }
}

/* ========================== LECTURES ========================== */

function lireReglages_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SH.REGLAGES);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (String(r[0]).trim()) out[String(r[0]).trim()] = r[1];
  });
  return out;
}

function lireCatalogue_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SH.CATALOGUE);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues()
    .filter(function (r) { return String(r[1]).trim() && String(r[7]).toUpperCase() !== 'NON'; })
    .map(function (r) {
      return {
        categorie: String(r[0] || 'Divers'), designation: String(r[1]),
        detail: String(r[2] || ''), unite: String(r[3] || ''),
        pu: Number(r[4]) || 0, tva: Number(r[5]) || 20,
        type: String(r[6] || '').toUpperCase() === 'MENSUEL' ? 'MENSUEL' : 'PONCTUEL'
      };
    });
}

function lireCommerciaux_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SH.COMMERCIAUX);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(function (r) { return String(r[0]).trim() && String(r[3]).toUpperCase() !== 'NON'; })
    .map(function (r) {
      return { nom: String(r[0]).trim(), email: String(r[1] || '').trim(), code: String(r[2] || '').trim() };
    });
}

function ecrireReglage_(cle, valeur) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SH.REGLAGES);
  for (var i = 2; i <= sh.getLastRow(); i++) {
    if (String(sh.getRange(i, 1).getValue()).trim() === cle) { sh.getRange(i, 2).setValue(valeur); return; }
  }
  sh.appendRow([cle, valeur, '']);
}

var MOIS_ = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
             'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Le dossier racine de l'archivage (créé au besoin, puis mémorisé). */
function racineDevis_(reg) {
  var id = String(reg.dossier_racine_id || '').trim();
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var it = DriveApp.getFoldersByName('DEVIS NETTOYAGE');
  var racine = it.hasNext() ? it.next() : DriveApp.createFolder('DEVIS NETTOYAGE');
  ecrireReglage_('dossier_racine_id', racine.getId());
  return racine;
}

function sousDossier_(parent, nom) {
  nom = String(nom || '').trim() || 'Sans nom';
  var it = parent.getFoldersByName(nom);
  return it.hasNext() ? it.next() : parent.createFolder(nom);
}

/**
 * Rangement : DEVIS NETTOYAGE / 2026 / 09 - septembre / SIMON H /
 * Le classement suit la DATE DU DEVIS, pas celle de la réception : un devis
 * signé hors connexion le 30 et remonté le 1er reste dans le bon mois.
 */
function dossierDevis_(reg, date, commercial) {
  var d = (date instanceof Date && !isNaN(date)) ? date : new Date();
  var dossier = racineDevis_(reg);
  dossier = sousDossier_(dossier, String(d.getFullYear()));
  dossier = sousDossier_(dossier, ('0' + (d.getMonth() + 1)).slice(-2) + ' - ' + MOIS_[d.getMonth()]);
  dossier = sousDossier_(dossier, commercial || 'Sans commercial');
  return dossier;
}

/** Montant HT d'une ligne, remise de ligne déduite. */
function montantLigne_(l) {
  return Math.round((Number(l.qte) || 0) * (Number(l.pu) || 0) *
                    (1 - (Number(l.rem) || 0) / 100) * 100) / 100;
}

/** Taux de TVA le plus représenté dans le devis, pour la colonne de suivi. */
function tauxPrincipal_(devis) {
  var par = {}, meilleur = '', max = -1;
  (devis.lignes || []).forEach(function (l) {
    var t = Number(l.tva) || 0;
    par[t] = (par[t] || 0) + montantLigne_(l);
    if (par[t] > max) { max = par[t]; meilleur = t; }
  });
  return meilleur === '' ? '' : meilleur + ' %';
}

function eur_(n) {
  var v = (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).split('.');
  return v[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + v[1] + ' €';
}

function corpsMail_(devis, reg) {
  var d = new Date(devis.validite);
  var fr = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  return '<p>Bonjour ' + String((devis.client || {}).contact || '') + ',</p>' +
    '<p>Veuillez trouver ci-joint le devis <strong>' + devis.numero + '</strong> d\'un montant de <strong>' +
    eur_((devis.totaux || {}).ttc) + ' TTC</strong>, valable jusqu\'au ' + fr + '.</p>' +
    '<p>Je reste à votre disposition.</p><p>' + devis.commercial + '<br>' +
    String(reg.societe_nom || '') + '<br>' + String(reg.societe_tel || '') + '</p>';
}

/* ====================== TEST DEPUIS L'ÉDITEUR ====================== */

function testerDevis() {
  var com = lireCommerciaux_()[0];
  var res = enregistrer_({
    nom: com.nom, code: com.code, appareil: 'test-editeur', envoyerClient: false,
    devis: {
      numero: 'TEST-' + new Date().getTime(), date: new Date(), validite: new Date(Date.now() + 30 * 864e5),
      commercial: com.nom,
      client: { type: 'PRO', societe: 'TEST SARL', siret: '000 000 000 00000', tva: 'FR00000000000',
                contact: 'Jean Test', tel: '0600000000', email: '', adresse: '2 rue du Test', cp: '56000', ville: 'Vannes' },
      lignes: [{ categorie: 'Bureaux', designation: 'Nettoyage de bureaux', detail: '3 passages/semaine', qte: 120, unite: 'm²/mois', pu: 1.2, tva: 20, type: 'MENSUEL' }],
      remise: 0, notes: 'Devis de test', signature: '', signataire: '',
      totaux: { htPonctuel: 0, htMensuel: 144, ht: 144, tva: 28.8, ttc: 172.8 }
    }
  }, com);
  Logger.log(res);
  SpreadsheetApp.getUi().alert('Test terminé : ' + JSON.stringify(res) +
    '\n\nPense à supprimer la ligne de test dans les onglets DEVIS et LIGNES.');
}
