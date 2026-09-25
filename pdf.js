/* Génération du devis en PDF, directement dans l'appareil (fonctionne sans réseau).
   Dépend de jspdf.umd.min.js et police.js — aucun appel réseau. */

var PDF = (function () {

  var M = 12;            // marge gauche/droite (mm)
  var W = 210, H = 297;  // A4
  var R = W - M;         // bord droit
  var F = 'LibSans';     // police intégrée au PDF
  var GRIS = [107, 114, 128], NOIR = [17, 24, 39], TRAIT = [226, 229, 234];
  var MARQUE = [0, 76, 146];        // bleu du logo
  var BLEU = MARQUE;

  function eur(n) {
    var v = (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).split('.');
    return v[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + v[1] + ' €';
  }
  function dateFr(d) {
    d = new Date(d);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }
  function txt(s) { return String(s == null ? '' : s).replace(/ /g, ' '); }

  function construire(devis, reg) {
    var doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });

    doc.addFileToVFS('LibSans.ttf', POLICE.regular);
    doc.addFont('LibSans.ttf', F, 'normal');
    doc.addFileToVFS('LibSans-Bold.ttf', POLICE.bold);
    doc.addFont('LibSans-Bold.ttf', F, 'bold');

    function police(style, taille, couleur) {
      doc.setFont(F, style).setFontSize(taille);
      var c = couleur || NOIR;
      doc.setTextColor(c[0], c[1], c[2]);
    }
    function couper(s, largeur) { return doc.splitTextToSize(txt(s), largeur); }

    var y;

    /* ---------- en-tête société ---------- */
    var logoOk = false;
    if (typeof LOGO !== 'undefined' && LOGO) {
      try {
        var p = doc.getImageProperties(LOGO);
        var hL = 21, wL = hL * p.width / p.height;      // logo calé sur 21 mm de haut
        if (wL > 55) { wL = 55; hL = wL * p.height / p.width; }
        doc.addImage(LOGO, 'PNG', M, 12, wL, hL);
        logoOk = true;
      } catch (e) { logoOk = false; }
    }
    if (!logoOk) {
      police('bold', 15, MARQUE);
      doc.text(txt(reg.societe_nom).toUpperCase(), M, 20);
    }

    police('normal', 8, GRIS);
    y = logoOk ? 38 : 25;
    [reg.societe_forme, reg.societe_adresse, reg.societe_cp_ville,
     txt(reg.societe_tel).trim() ? 'Tél. ' + txt(reg.societe_tel) : '', reg.societe_email]
      .forEach(function (l) { if (txt(l).trim()) { doc.text(txt(l), M, y); y += 4; } });
    var basGauche = y;

    police('bold', 20, MARQUE);
    doc.text('DEVIS', R, 20, { align: 'right' });
    police('normal', 8.5, GRIS);
    y = 26;
    ['N° ' + txt(devis.numero),
     'Date : ' + dateFr(devis.date),
     'Valable jusqu\'au : ' + dateFr(devis.validite),
     'Établi par : ' + txt(devis.commercial)
    ].forEach(function (l) { doc.text(l, R, y, { align: 'right' }); y += 4.2; });

    /* ---------- bloc client ---------- */
    var c = devis.client || {};
    var xC = 112, wC = R - xC;
    var lignesC = [];
    if (txt(c.societe).trim()) lignesC.push({ t: txt(c.societe), b: true });
    if (txt(c.contact).trim()) lignesC.push({ t: txt(c.contact) });
    if (txt(c.adresse).trim()) lignesC.push({ t: txt(c.adresse) });
    if ((txt(c.cp) + txt(c.ville)).trim()) lignesC.push({ t: (txt(c.cp) + ' ' + txt(c.ville)).trim() });
    if (txt(c.tel).trim()) lignesC.push({ t: 'Tél. ' + txt(c.tel) });
    if (txt(c.email).trim()) lignesC.push({ t: txt(c.email) });

    var yC = y + 2;          // le cadre client vit dans la colonne de droite,
                              // il n'a pas à descendre sous le bloc société
    var hC = 8 + lignesC.length * 4.1;
    doc.setDrawColor(213, 216, 222).setLineWidth(0.2).roundedRect(xC, yC, wC, hC, 1.5, 1.5);
    police('normal', 6.5, GRIS);
    doc.text('CLIENT', xC + 3, yC + 4.5);
    var yL = yC + 8.6;
    lignesC.forEach(function (l) {
      police(l.b ? 'bold' : 'normal', 9);
      doc.text(couper(l.t, wC - 6)[0], xC + 3, yL);
      yL += 4.1;
    });

    /* ---------- tableau des prestations ---------- */
    var COL = { des: M, desL: 84, qte: 110, uni: 120, pu: 152, tva: 170, tot: R };
    var yT = Math.max(yC + hC, basGauche) + 6;

    function enTete(yy) {
      doc.setFillColor(MARQUE[0], MARQUE[1], MARQUE[2]).rect(M, yy, R - M, 7, 'F');
      police('bold', 7, [255, 255, 255]);
      doc.text('DÉSIGNATION', COL.des + 2, yy + 4.6);
      doc.text('QTÉ', COL.qte, yy + 4.6, { align: 'right' });
      doc.text('UNITÉ', COL.uni, yy + 4.6);
      doc.text('P.U. HT', COL.pu, yy + 4.6, { align: 'right' });
      doc.text('TVA', COL.tva, yy + 4.6, { align: 'right' });
      doc.text('TOTAL HT', COL.tot - 2, yy + 4.6, { align: 'right' });
      return yy + 7;
    }
    y = enTete(yT);

    var coef = 1 - (Number(devis.remise) || 0) / 100;
    (devis.lignes || []).forEach(function (l) {
      police('bold', 9);
      var des = couper(l.designation || '(sans désignation)', COL.desL);
      police('normal', 7.5);
      var det = txt(l.detail).trim() ? couper(l.detail, COL.desL) : [];
      var mensuel = String(l.type).toUpperCase() === 'MENSUEL';
      var h = 4.4 + des.length * 4 + (det.length ? det.length * 3.3 + 0.4 : 0) + (mensuel ? 3.8 : 0) + 1.8;

      if (y + h > 252) { doc.addPage(); y = enTete(18); }

      var yy = y + 4.8;
      police('bold', 9);
      doc.text(des, COL.des + 2, yy);
      var yb = yy + (des.length - 1) * 4;              // ligne de base du dernier titre
      if (det.length) {
        police('normal', 7.5, GRIS);
        doc.text(det, COL.des + 2, yb + 3.6);
        yb += 0.6 + det.length * 3.3;
      }
      if (mensuel) {
        police('normal', 7, BLEU);
        doc.text('Prestation récurrente — montant mensuel', COL.des + 2, yb + 3.8);
      }

      police('normal', 9);
      doc.text(String(Number(l.qte) || 0), COL.qte, yy, { align: 'right' });
      doc.text(couper(l.unite, 28)[0] || '', COL.uni, yy);
      doc.text(eur(l.pu), COL.pu, yy, { align: 'right' });
      doc.text((Number(l.tva) || 0) + ' %', COL.tva, yy, { align: 'right' });
      police('bold', 9);
      doc.text(eur((Number(l.qte) || 0) * (Number(l.pu) || 0) * coef), COL.tot - 2, yy, { align: 'right' });

      y += h;
      doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]).setLineWidth(0.15).line(M, y, R, y);
    });

    /* ---------- totaux ---------- */
    var t = devis.totaux;
    if (y > 238) { doc.addPage(); y = 18; }
    var xT = 118;
    y += 7;
    function ligneTot(lib, val, gras) {
      police(gras ? 'bold' : 'normal', gras ? 11 : 9, gras ? NOIR : GRIS);
      doc.text(lib, xT, y);
      police(gras ? 'bold' : 'normal', gras ? 11 : 9);
      doc.text(val, R, y, { align: 'right' });
      y += gras ? 7 : 5;
    }
    if (t.htPonctuel) ligneTot('Total HT prestations ponctuelles', eur(t.htPonctuel));
    if (t.htMensuel) ligneTot('Total HT mensuel (récurrent)', eur(t.htMensuel));
    if (devis.remise) ligneTot('Remise appliquée', devis.remise + ' %');
    ligneTot('Total HT', eur(t.ht));
    ligneTot('TVA', eur(t.tva));
    doc.setDrawColor(MARQUE[0], MARQUE[1], MARQUE[2]).setLineWidth(0.5).line(xT, y - 2.5, R, y - 2.5);
    y += 2;
    ligneTot('TOTAL TTC', eur(t.ttc), true);

    if (t.htMensuel) {
      police('normal', 7, GRIS);
      var note = t.htPonctuel
        ? 'Le total comprend ' + eur(t.htPonctuel) + ' HT d\'interventions ponctuelles et ' +
          eur(t.htMensuel) + ' HT par mois au titre des prestations récurrentes, facturées mensuellement.'
        : 'Montants mensuels, facturés chaque mois pendant la durée du contrat.';
      var nl = couper(note, R - xT);
      doc.text(nl, xT, y);
      y += nl.length * 3.2;
    }

    /* ---------- précisions ---------- */
    if (txt(devis.notes).trim()) {
      y += 6;
      police('normal', 8.5);
      var nn = couper(devis.notes, R - M - 8);
      var hN = 12 + nn.length * 4;
      if (y + hN > 258) { doc.addPage(); y = 18; }
      doc.setFillColor(246, 247, 249).roundedRect(M, y, R - M, hN, 1.5, 1.5, 'F');
      police('bold', 8);
      doc.text('Précisions :', M + 4, y + 6);
      police('normal', 8.5);
      doc.text(nn, M + 4, y + 11);
      y += hN;
    }

    /* ---------- signature ---------- */
    y += 7;
    var hS = 32, xS = 112, wS = R - xS;
    if (y + hS > 271) { doc.addPage(); y = 18; }
    doc.setDrawColor(213, 216, 222).setLineWidth(0.2).roundedRect(xS, y, wS, hS, 1.5, 1.5);
    police('normal', 6.8, GRIS);
    if (devis.signature) {
      doc.text('Bon pour accord — ' + txt(devis.signataire || c.contact || ''), xS + 3, y + 5);
      doc.text('Le ' + dateFr(devis.date), xS + 3, y + 8.6);
      try { doc.addImage(devis.signature, 'PNG', xS + 3, y + 10, wS - 6, hS - 13, undefined, 'FAST'); } catch (e) {}
    } else {
      doc.text('Date, signature du client précédée de la mention', xS + 3, y + 5);
      doc.text('« Bon pour accord »', xS + 3, y + 8.6);
    }

    /* ---------- pied de page sur toutes les pages ---------- */
    var idSoc = [txt(reg.societe_nom), txt(reg.societe_forme),
      txt(reg.societe_siret).trim() ? 'SIRET ' + txt(reg.societe_siret) : '',
      txt(reg.societe_tva).trim() ? 'TVA ' + txt(reg.societe_tva) : '',
      txt(reg.societe_rcs)].filter(function (x) { return x.trim(); }).join(' — ');
    var pied = [txt(reg.mentions_bas), txt(reg.conditions_reglement), idSoc]
      .filter(function (x) { return x.trim(); });

    var n = doc.getNumberOfPages();
    for (var p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setDrawColor(TRAIT[0], TRAIT[1], TRAIT[2]).setLineWidth(0.15).line(M, 274, R, 274);
      police('normal', 6.3, GRIS);
      var yp = 278;
      pied.forEach(function (bloc) {
        var ll = couper(bloc, R - M);
        doc.text(ll, M, yp);
        yp += ll.length * 2.7;
      });
      if (n > 1) doc.text('Page ' + p + '/' + n, R, 292, { align: 'right' });
    }

    return doc;
  }

  function nomFichier(devis) {
    var cl = String((devis.client || {}).societe || (devis.client || {}).contact || 'client')
      .normalize ? String((devis.client || {}).societe || (devis.client || {}).contact || 'client')
        .normalize('NFD').replace(/[̀-ͯ]/g, '') : 'client';
    cl = cl.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
    return 'Devis-' + devis.numero + (cl ? '-' + cl : '') + '.pdf';
  }

  return {
    doc: construire,
    blob: function (devis, reg) { return construire(devis, reg).output('blob'); },
    base64: function (devis, reg) {
      var s = construire(devis, reg).output('datauristring');
      return s.substring(s.indexOf(',') + 1);
    },
    nomFichier: nomFichier,
    eur: eur,
    dateFr: dateFr
  };
})();
