/* Application de devis — fonctionne entièrement hors connexion.
   Les devis sont créés et mis en PDF dans l'appareil, puis envoyés
   au Google Sheet dès qu'il y a du réseau. */

/* ====================== ÉTAT ====================== */
var CFG = null;            // {reglages, catalogue, commerciaux, sel, maj}
var LIGNES = [];
var ETAPE = 1;
var DERNIER = null;        // dernier devis enregistré (pour le partage)
var EN_COURS = false;
var APPAREIL = null;

/* ====================== OUTILS ====================== */
function $(id){ return document.getElementById(id); }
function val(id){ var e=$(id); return e ? e.value.trim() : ''; }
function ech(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function eur(n){ var v=(Math.round((Number(n)||0)*100)/100).toFixed(2).split('.');
  return v[0].replace(/\B(?=(\d{3})+(?!\d))/g,' ')+','+v[1]+' €'; }
function erreur(m){ var e=$('erreur'); if(!m){e.classList.add('hide');return;}
  e.textContent=m; e.classList.remove('hide'); window.scrollTo(0,0); }

/* ---- retour immédiat quand on appuie sur un bouton ---- */

/* iOS n'applique :active que si la page écoute le toucher */
document.addEventListener('touchstart', function(){}, {passive:true});

/* Petite vibration là où c'est disponible (Android) ; ignorée ailleurs. */
function vibrer(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||8); }catch(e){} }

/* Met un bouton en « travail en cours » : rond qui tourne + libellé, et on
   empêche le double appui. libere() remet le bouton dans son état d'origine. */
function occuper(btn, texte){
  if(!btn || btn.dataset.busy) return false;
  btn.dataset.busy = '1';
  btn.dataset.avant = btn.innerHTML;
  btn.innerHTML = '<span class="spin"></span>' + (texte || 'Un instant…');
  btn.disabled = true;
  vibrer(8);
  return true;
}
function libere(btn){
  if(!btn || !btn.dataset.busy) return;
  btn.innerHTML = btn.dataset.avant || btn.innerHTML;
  btn.disabled = false;
  delete btn.dataset.busy; delete btn.dataset.avant;
}

/* Laisse le navigateur AFFICHER l'état « en cours » avant de lancer un
   traitement lourd (la fabrication du PDF fige l'écran pendant ~1 s). */
function peindre(){
  return new Promise(function(res){
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ setTimeout(res, 0); }); });
  });
}
function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k);
  if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; }
function lsj(k,v){ if(v===undefined){ try{ return JSON.parse(ls(k)||'null'); }catch(e){ return null; } }
  ls(k, JSON.stringify(v)); }

/* ====================== BASE LOCALE (IndexedDB) ====================== */
var DB = (function(){
  var db=null;
  function ouvrir(){
    return new Promise(function(res,rej){
      if(db) return res(db);
      var r = indexedDB.open('devis', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('devis',{keyPath:'id'}); };
      r.onsuccess = function(){ db=r.result; res(db); };
      r.onerror = function(){ rej(r.error); };
    });
  }
  function tx(mode,fn){
    return ouvrir().then(function(d){
      return new Promise(function(res,rej){
        var t = d.transaction('devis', mode), st = t.objectStore('devis'), out;
        out = fn(st);
        t.oncomplete = function(){ res(out && out.result !== undefined ? out.result : out); };
        t.onerror = function(){ rej(t.error); };
      });
    });
  }
  return {
    put: function(o){ return tx('readwrite', function(st){ return st.put(o); }); },
    tous: function(){ return tx('readonly', function(st){ return st.getAll(); }); },
    get: function(id){ return tx('readonly', function(st){ return st.get(id); }); },
    suppr: function(id){ return tx('readwrite', function(st){ return st.delete(id); }); }
  };
})();

/* ====================== DÉMARRAGE ====================== */
window.addEventListener('load', function(){
  APPAREIL = ls('appareil');
  if(!APPAREIL){ APPAREIL = 'app-'+Math.random().toString(36).slice(2,10); ls('appareil',APPAREIL); }

  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(function(){}); }

  initSignature();
  brancherSignature();

  if(typeof LOGO_BLANC !== 'undefined' && LOGO_BLANC){
    var lg = $('hLogo'); lg.src = LOGO_BLANC; lg.classList.remove('hide');
  }

  CFG = lsj('cfg');
  if(CFG){ alignerCompteurs(); demarrer(); if(navigator.onLine) chargerConfig(false); }
  else {
    // premier lancement : on montre l'écran d'accueil tout de suite,
    // pour ne jamais laisser l'écran vide pendant le téléchargement
    $('hSub').textContent = navigator.onLine ? 'Première installation' : 'Hors connexion';
    $('steps').classList.add('hide'); $('bar').classList.add('hide');
    montrer(0);
    if(navigator.onLine) chargerConfig(true);
  }

  window.addEventListener('online', function(){ etatReseau(); synchroniser(false); });
  window.addEventListener('offline', etatReseau);
  setInterval(function(){ if(navigator.onLine) synchroniser(false); }, 120000);
});

function demarrer(){
  $('hSub').textContent = (CFG.reglages && CFG.reglages.societe_nom) || 'Devis sur place';
  var s = $('fCommercial');
  s.innerHTML = CFG.commerciaux.map(function(c){ return '<option>'+ech(c.nom)+'</option>'; }).join('');
  var moi = lsj('moi');
  if(moi && CFG.commerciaux.some(function(c){ return c.nom===moi.nom; })){
    s.value = moi.nom; $('fCode').value = moi.code;
  } else if(moi){
    lsj('moi', null); moi = null;   // ce commercial n'existe plus dans le classeur
  }
  var b = lsj('brouillon');
  if(b && b.lignes && b.lignes.length && confirm('Un devis non terminé a été retrouvé. Le reprendre ?')) restaurer(b);
  etape(moi ? 2 : 1);
  etatReseau();
  synchroniser(false);
}

/* Le bureau a changé la liste des commerciaux, un code ou les tarifs pendant
   que l'appli tournait : on remet l'écran à jour sans attendre un redémarrage. */
function appliquerNouvelleConfig(){
  if(!CFG || !CFG.commerciaux) return;
  var noms = CFG.commerciaux.map(function(c){ return c.nom; });
  var s = $('fCommercial'), choisi = s.value;
  s.innerHTML = noms.map(function(n){ return '<option>'+ech(n)+'</option>'; }).join('');
  $('hSub').textContent = (CFG.reglages && CFG.reglages.societe_nom) || 'Devis sur place';

  var moi = lsj('moi');
  if(!moi){ if(noms.indexOf(choisi)>=0) s.value = choisi; return; }

  if(noms.indexOf(moi.nom) < 0) return reidentifier('Ta fiche a changé côté bureau.');

  // le code a-t-il été modifié dans le classeur ?
  var c = null;
  CFG.commerciaux.forEach(function(x){ if(x.nom===moi.nom) c=x; });
  sha256(moi.nom+'|'+moi.code+'|'+(CFG.sel||'')).then(function(h){
    if(c && c.empreinte && h && h !== c.empreinte) return reidentifier('Ton code a été modifié.');
    s.value = moi.nom;
  });
}

function reidentifier(raison){
  lsj('moi', null);
  $('fCode').value = '';
  if(ETAPE >= 3) return;          // devis en cours : on ne coupe rien, ce sera au prochain
  etape(1);
  erreur(raison + ' Choisis ton nom et saisis ton code.');
}

/* ====================== CONFIG (catalogue, tarifs) ====================== */
function chargerConfig(bloquant, btn){
  var ac = null;
  if(btn) occuper(btn, 'Téléchargement…');
  if(!navigator.onLine){
    if(bloquant){ $('msg0').textContent = 'Aucune connexion. Reconnecte-toi puis réessaie.'; }
    return;
  }
  if(bloquant) $('msg0').textContent = 'Téléchargement en cours…';
  var stop = null;
  if(window.AbortController){
    ac = new AbortController();
    stop = setTimeout(function(){ ac.abort(); }, 25000);   // pas d'attente sans fin
  }
  fetch(API_URL + '?action=config&t=' + Date.now(), ac ? {method:'GET', signal:ac.signal} : {method:'GET'})
    .then(function(r){ if(stop) clearTimeout(stop); return r.json(); })
    .then(function(d){
      if(!d.ok) throw new Error(d.erreur||'réponse invalide');
      CFG = d; lsj('cfg', d);
      alignerCompteurs();
      if(btn) libere(btn);
      if(bloquant){ montrer(null); demarrer(); }
      else{
        var m=$('majCat'); if(m) m.textContent = new Date(d.maj).toLocaleDateString('fr-FR');
        appliquerNouvelleConfig();   // le bureau a modifié commerciaux / codes / tarifs
      }
    })
    .catch(function(e){
      if(stop) clearTimeout(stop);
      if(btn) libere(btn);
      if(bloquant) $('msg0').textContent = 'Le catalogue n\'a pas pu être téléchargé (' +
        (e.name === 'AbortError' ? 'délai dépassé' : e.message) +
        '). Vérifie ta connexion et appuie de nouveau sur le bouton.';
    });
}

/* ====================== NAVIGATION ====================== */
function montrer(n){
  [0,1,2,3,4,5,6].forEach(function(i){ $('e'+i).classList.toggle('hide', i!==n); });
}
function etape(n){
  if(n<1) n=1;
  ETAPE=n; erreur('');
  montrer(n);
  [1,2,3,4].forEach(function(i){ $('s'+i).classList.toggle('on', i<=n); });
  $('steps').classList.toggle('hide', n>=5);
  $('bar').classList.toggle('hide', n>=5);
  $('bPrec').classList.toggle('hide', n<=1);
  $('bSuiv').textContent = n===4 ? 'Enregistrer le devis' : 'Continuer';
  $('hTitre').textContent = ['','Identification','Client','Prestations','Validation','Terminé','Mes devis'][n];
  if(n===3) rendreLignes();
  if(n===4){ calculer(); majApercuSignature(); }
  window.scrollTo(0,0);
}
function suivant(){
  if(ETAPE===1) return verifierCommercial();
  if(ETAPE===2){
    if(!val('cSociete') && !val('cContact')) return erreur('Indique au moins la société ou le nom du client.');
    sauverBrouillon(); return etape(3);
  }
  if(ETAPE===3){
    if(!LIGNES.length) return erreur('Ajoute au moins une prestation.');
    sauverBrouillon(); return etape(4);
  }
  if(ETAPE===4) return enregistrer();
}

/* ====================== IDENTIFICATION ====================== */
function sha256(s){
  if(!(window.crypto && crypto.subtle)) return Promise.resolve(null);
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function(b){
    return Array.prototype.map.call(new Uint8Array(b), function(x){
      return ('0'+x.toString(16)).slice(-2); }).join('');
  }).catch(function(){ return null; });
}
/* Règle des codes : 4 caractères minimum, au moins un chiffre et un caractère spécial. */
function codeConforme(c){
  return String(c).length >= 4 && /[0-9]/.test(c) && /[^A-Za-z0-9]/.test(c);
}

function verifierCommercial(){
  var nom = val('fCommercial'), code = val('fCode');
  if(!nom) return erreur('Choisis ton nom dans la liste.');
  if(!code) return erreur('Saisis ton code.');
  if(!codeConforme(code)) return erreur(
    'Code incomplet : au moins 4 caractères, dont un chiffre et un caractère spécial.');
  var c = null;
  CFG.commerciaux.forEach(function(x){ if(x.nom===nom) c=x; });
  if(!c) return erreur('Commercial inconnu.');
  sha256(nom+'|'+code+'|'+(CFG.sel||'')).then(function(h){
    if(c.empreinte && h && h !== c.empreinte) return erreur('Code incorrect.');
    lsj('moi', {nom:nom, code:code});
    etape(2);
  });
}

/* ====================== CATALOGUE ====================== */
function ouvrirCatalogue(){
  var d=$('dlg'); $('rech').value=''; rendreCatalogue();
  if(d.showModal) d.showModal(); else { d.setAttribute('open',''); d.style.position='fixed'; d.style.bottom='0'; d.style.zIndex='50'; }
}
function fermerCatalogue(){ var d=$('dlg'); if(d.close) d.close(); else d.removeAttribute('open'); }
function rendreCatalogue(){
  var q = $('rech').value.toLowerCase(), cats = {};
  CFG.catalogue.forEach(function(p,i){
    if(q && (p.designation+' '+p.detail+' '+p.categorie).toLowerCase().indexOf(q)<0) return;
    (cats[p.categorie]=cats[p.categorie]||[]).push({p:p,i:i});
  });
  var h='';
  Object.keys(cats).forEach(function(c){
    h += '<div class="cat">'+ech(c)+'</div>';
    cats[c].forEach(function(o){
      h += '<div class="item" onclick="ajouterCatalogue('+o.i+')">'+
           '<span class="px">'+eur(o.p.pu)+'</span><b>'+ech(o.p.designation)+'</b><span>'+
           ech(o.p.detail||'')+(o.p.unite?' · '+ech(o.p.unite):'')+
           (o.p.type==='MENSUEL'?' · mensuel':'')+'</span></div>';
    });
  });
  $('dlgB').innerHTML = h || '<div class="empty">Aucune prestation trouvée.</div>';
}
function ajouterCatalogue(i){
  var p = CFG.catalogue[i];
  LIGNES.push({categorie:p.categorie,designation:p.designation,detail:p.detail,
    qte:1,unite:p.unite,pu:p.pu,tva:p.tva,type:p.type});
  fermerCatalogue(); rendreLignes(); sauverBrouillon();
}
function ajouterLibre(){
  LIGNES.push({categorie:'Divers',designation:'',detail:'',qte:1,unite:'forfait',
    pu:0,tva:Number((CFG.reglages||{}).tva_defaut||20),type:'PONCTUEL'});
  rendreLignes(); sauverBrouillon();
  setTimeout(function(){ var i=document.querySelectorAll('.ligne input'); if(i.length) i[i.length-7].focus(); },50);
}

/* ====================== LIGNES ====================== */
function rendreLignes(){
  var c = $('lignes');
  if(!LIGNES.length){
    c.innerHTML='<div class="card"><div class="empty">Aucune prestation.<br>Ajoute une ligne depuis le catalogue.</div></div>';
    majBarre(); return;
  }
  c.innerHTML = LIGNES.map(function(l,i){
    return '<div class="ligne">'+
      '<div class="t"><div style="flex:1">'+
        '<input value="'+ech(l.designation)+'" placeholder="Désignation" oninput="setL('+i+',\'designation\',this.value)" style="font-weight:600;border:0;padding:0;font-size:15px">'+
        '<input value="'+ech(l.detail)+'" placeholder="Détail (facultatif)" oninput="setL('+i+',\'detail\',this.value)" style="border:0;padding:2px 0 0;font-size:12.5px;color:#6b7280">'+
        '<span class="chip'+(l.type==='MENSUEL'?'':' p')+'">'+(l.type==='MENSUEL'?'Mensuel récurrent':'Ponctuel')+'</span>'+
      '</div><button class="x" onclick="supprL('+i+')">Suppr.</button></div>'+
      '<div class="g">'+
        '<div><label>Quantité</label><input type="number" inputmode="decimal" step="0.01" value="'+l.qte+'" oninput="setL('+i+',\'qte\',this.value)"></div>'+
        '<div><label>Unité</label><input value="'+ech(l.unite)+'" oninput="setL('+i+',\'unite\',this.value)"></div>'+
        '<div><label>P.U. HT</label><input type="number" inputmode="decimal" step="0.01" value="'+l.pu+'" oninput="setL('+i+',\'pu\',this.value)"></div>'+
      '</div>'+
      '<div class="g">'+
        '<div><label>Type</label><select onchange="setL('+i+',\'type\',this.value)">'+
          '<option value="PONCTUEL"'+(l.type==='PONCTUEL'?' selected':'')+'>Ponctuel</option>'+
          '<option value="MENSUEL"'+(l.type==='MENSUEL'?' selected':'')+'>Mensuel</option></select></div>'+
        '<div><label>TVA %</label><input type="number" inputmode="decimal" step="0.1" value="'+l.tva+'" oninput="setL('+i+',\'tva\',this.value)"></div>'+
      '</div>'+
      '<div class="ft"><span style="color:#6b7280">Total HT ligne</span><b id="tl'+i+'">'+
        eur((Number(l.qte)||0)*(Number(l.pu)||0))+'</b></div></div>';
  }).join('');
  majBarre();
}
function setL(i,k,v){
  LIGNES[i][k] = (k==='qte'||k==='pu'||k==='tva') ? (v===''?0:Number(v)) : v;
  if(k==='type'){ rendreLignes(); }
  else{
    var l=LIGNES[i], t=$('tl'+i);
    if(t) t.textContent = eur((Number(l.qte)||0)*(Number(l.pu)||0));
    majBarre();
  }
  sauverBrouillon();
}
function supprL(i){ LIGNES.splice(i,1); rendreLignes(); sauverBrouillon(); }

/* ====================== TOTAUX ====================== */
function totaux(){
  var r = Number(val('fRemise'))||0, coef = 1-r/100;
  var t = {htPonctuel:0,htMensuel:0,ht:0,tva:0,ttc:0};
  LIGNES.forEach(function(l){
    var b = (Number(l.qte)||0)*(Number(l.pu)||0)*coef;
    if(String(l.type).toUpperCase()==='MENSUEL') t.htMensuel+=b; else t.htPonctuel+=b;
    t.tva += b*(Number(l.tva)||0)/100;
  });
  t.ht=t.htPonctuel+t.htMensuel; t.ttc=t.ht+t.tva;
  ['htPonctuel','htMensuel','ht','tva','ttc'].forEach(function(k){ t[k]=Math.round(t[k]*100)/100; });
  return t;
}
function calculer(){
  var t = totaux(), r = Number(val('fRemise'))||0, h='';
  if(t.htPonctuel) h+='<div class="tot"><span>Prestations ponctuelles HT</span><b>'+eur(t.htPonctuel)+'</b></div>';
  if(t.htMensuel)  h+='<div class="tot"><span>Abonnement mensuel HT</span><b>'+eur(t.htMensuel)+'</b></div>';
  if(r) h+='<div class="tot"><span>Remise</span><b>'+r+' %</b></div>';
  h+='<div class="tot"><span>Total HT</span><b>'+eur(t.ht)+'</b></div>';
  h+='<div class="tot"><span>TVA</span><b>'+eur(t.tva)+'</b></div>';
  h+='<div class="tot big"><span style="color:inherit">Total TTC</span><span>'+eur(t.ttc)+'</span></div>';
  $('recap').innerHTML = h;
  majBarre(); sauverBrouillon();
}
function majBarre(){
  var t = totaux();
  $('bTot').textContent = eur(t.ttc);
  $('bTotL').textContent = LIGNES.length+' ligne'+(LIGNES.length>1?'s':'')+' · TTC';
}

/* ====================== SIGNATURE ====================== */
var SIG = {cv:null, ctx:null, dessine:false, vide:true, image:''};
function initSignature(){
  SIG.cv = $('sig');
  var r = SIG.cv.getBoundingClientRect(), d = window.devicePixelRatio||1;
  SIG.cv.width = Math.max(200, Math.round(r.width*d));
  SIG.cv.height = Math.max(120, Math.round(r.height*d));
  SIG.ctx = SIG.cv.getContext('2d');
  SIG.ctx.scale(d,d);
  SIG.ctx.lineWidth=2.2; SIG.ctx.lineCap='round'; SIG.ctx.lineJoin='round'; SIG.ctx.strokeStyle='#111827';
  SIG.vide = true;
}
function signatureValide(){ return !!SIG.image; }

/* Signature en plein écran : le téléphone est tendu au client. */
function ouvrirSignature(){
  $('soNom').textContent = val('fSignataire') || (lireClient().contact || lireClient().societe || '');
  $('sigOverlay').classList.remove('hide');
  setTimeout(function(){ initSignature(); if(SIG.image) redessiner(SIG.image); }, 30);
}
function fermerSignature(valider){
  if(valider){
    SIG.image = SIG.vide ? '' : SIG.cv.toDataURL('image/png');
  }
  $('sigOverlay').classList.add('hide');
  majApercuSignature();
}
function majApercuSignature(){
  var f = !!SIG.image;
  $('sigFaite').classList.toggle('hide', !f);
  $('sigVide').classList.toggle('hide', f);
  if(f) $('sigApercu').src = SIG.image;
}
function redessiner(dataUrl){
  var img = new Image();
  img.onload = function(){
    var d = window.devicePixelRatio||1;
    SIG.ctx.drawImage(img, 0, 0, SIG.cv.width/d, SIG.cv.height/d);
    SIG.vide = false;
  };
  img.src = dataUrl;
}
function effacerTrait(){ SIG.ctx.clearRect(0,0,SIG.cv.width,SIG.cv.height); SIG.vide = true; }
function brancherSignature(){
  var cv = $('sig');
  function pos(e){ var r=cv.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  cv.addEventListener('pointerdown', function(e){ e.preventDefault(); SIG.dessine=true; SIG.vide=false;
    try{ cv.setPointerCapture(e.pointerId); }catch(err){}
    var p=pos(e); SIG.ctx.beginPath(); SIG.ctx.moveTo(p.x,p.y); });
  cv.addEventListener('pointermove', function(e){ if(!SIG.dessine) return; e.preventDefault();
    var p=pos(e); SIG.ctx.lineTo(p.x,p.y); SIG.ctx.stroke(); });
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){
    cv.addEventListener(ev, function(){ SIG.dessine=false; }); });
}
function effacerSignature(){
  if(SIG.ctx) SIG.ctx.clearRect(0,0,SIG.cv.width,SIG.cv.height);
  SIG.vide = true; SIG.image = '';
  majApercuSignature();
}

/* ====================== BROUILLON ====================== */
function lireClient(){
  return {societe:val('cSociete'),contact:val('cContact'),tel:val('cTel'),email:val('cEmail'),
          adresse:val('cAdresse'),cp:val('cCp'),ville:val('cVille')};
}
function sauverBrouillon(){
  lsj('brouillon', {client:lireClient(), lignes:LIGNES, remise:val('fRemise'), notes:val('fNotes')});
}
function restaurer(b){
  LIGNES = b.lignes||[];
  var c = b.client||{};
  ['Societe','Contact','Tel','Email','Adresse','Cp','Ville'].forEach(function(k){
    $('c'+k).value = c[k.toLowerCase()]||''; });
  $('fRemise').value = b.remise||0;
  $('fNotes').value = b.notes||'';
}

/* ====================== NUMÉROTATION LOCALE ====================== */
function initiales(nom){
  var p = String(nom).trim().split(/\s+/).map(function(m){ return m.charAt(0); }).join('');
  return (p.toUpperCase().replace(/[^A-Z]/g,'') || 'XX').slice(0,3);
}
function serieDe(nom){
  var an = new Date().getFullYear();
  return String((CFG.reglages||{}).prefixe_devis||'DEV')+'-'+an+'-'+initiales(nom);
}
function prochainNumero(nom){
  var serie = serieDe(nom), cle = 'seq_'+serie;
  var n = Number(ls(cle)||0)+1;
  ls(cle, String(n));
  return serie+'-'+('000'+n).slice(-4);
}
/* Le bureau nous dit où en est chaque série : un téléphone réinstallé
   (compteur reparti à zéro) ne réutilise pas un numéro déjà pris. */
function alignerCompteurs(){
  var c = CFG && CFG.compteurs;
  if(!c) return;
  Object.keys(c).forEach(function(serie){
    var cle = 'seq_'+serie, local = Number(ls(cle)||0), distant = Number(c[serie])||0;
    if(distant > local) ls(cle, String(distant));
  });
}

/* ====================== ENREGISTREMENT ====================== */
function enregistrer(){
  if(EN_COURS) return;
  if(ETAPE !== 4) return;                       // on n'enregistre que depuis l'écran de validation
  if(!LIGNES.length) return erreur('Ajoute au moins une prestation.');
  if(!val('cSociete') && !val('cContact')) return erreur('Indique au moins la société ou le nom du client.');
  var envoi = $('fEnvoi').checked;
  if(envoi && !val('cEmail')) return erreur('Pas d\'e-mail client : décoche l\'envoi ou renseigne l\'adresse.');
  var moi = lsj('moi');
  if(!moi) return erreur('Identifie-toi d\'abord.');

  EN_COURS = true;
  var b = $('bSuiv');
  occuper(b, 'Création du PDF…');
  // filet de sécurité : un bouton ne doit jamais rester bloqué
  var secours = setTimeout(function(){ debloquer(b); }, 30000);
  peindre().then(function(){
    try{ enregistrerSuite(b, envoi, moi, secours); }
    catch(e){ debloquer(b, secours); erreur('Erreur inattendue : ' + e.message); }
  }, function(){ debloquer(b, secours); });
}

/* Remet l'application en état, quoi qu'il arrive. */
function debloquer(b, secours){
  if(secours) clearTimeout(secours);
  EN_COURS = false;
  libere(b || $('bSuiv'));
}

function enregistrerSuite(b, envoi, moi, secours){
  try{
    var jours = Number((CFG.reglages||{}).validite_jours||30);
    var devis = {
      numero: prochainNumero(moi.nom),
      date: new Date().toISOString(),
      validite: new Date(Date.now()+jours*86400000).toISOString(),
      commercial: moi.nom,
      client: lireClient(),
      lignes: LIGNES.slice(),
      remise: Number(val('fRemise'))||0,
      notes: val('fNotes'),
      signataire: val('fSignataire'),
      signature: SIG.image || '',
      totaux: totaux()
    };
    var pdf64 = PDF.base64(devis, CFG.reglages);
    var enr = {
      id: 'd-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
      numero: devis.numero, devis: devis, pdf: pdf64,
      nomFichier: PDF.nomFichier(devis),
      envoyerClient: envoi, statut: 'attente', cree: Date.now(),
      nom: moi.nom, code: moi.code, appareil: APPAREIL, pdfUrl: ''
    };
    DERNIER = enr;
    DB.put(enr).then(function(){
      lsj('brouillon', null);
      $('okNum').textContent = devis.numero;
      $('okTot').textContent = eur(devis.totaux.ttc)+' TTC';
      $('okEtat').textContent = navigator.onLine
        ? 'Envoi au bureau en cours…'
        : 'Hors connexion : le devis part automatiquement dès que le réseau revient.';
      debloquer(b, secours);
      montrer(5); $('steps').classList.add('hide'); $('bar').classList.add('hide');
      $('hTitre').textContent='Terminé'; window.scrollTo(0,0);
      synchroniser(false);
    }, function(e){
      debloquer(b, secours);
      erreur('Le devis n\'a pas pu être enregistré sur l\'appareil : ' + (e && e.message || e));
    });
  }catch(e){
    debloquer(b, secours);
    erreur('Erreur lors de la création du PDF : '+e.message);
  }
}

/* ====================== PARTAGE DU PDF ====================== */
function b64versBlob(b64){
  var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
  for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
  return new Blob([u], {type:'application/pdf'});
}
function partager(enr){
  if(!enr || !enr.pdf) return;
  var blob = b64versBlob(enr.pdf);
  var f;
  try{ f = new File([blob], enr.nomFichier, {type:'application/pdf'}); }catch(e){ f=null; }
  if(f && navigator.canShare && navigator.canShare({files:[f]})){
    navigator.share({files:[f], title:'Devis '+enr.numero}).catch(function(){});
    return;
  }
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href=url; a.download=enr.nomFichier; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 4000);
}
function partagerDernier(btn){
  if(btn) occuper(btn, 'Préparation…');
  peindre().then(function(){ partager(DERNIER); if(btn) setTimeout(function(){ libere(btn); }, 600); });
}
function partagerId(id, btn){
  if(btn) occuper(btn, '…');
  DB.get(id).then(function(e){ partager(e); if(btn) setTimeout(function(){ libere(btn); }, 600); });
}

/* ====================== SYNCHRONISATION ====================== */
function etatReseau(nb, msg, classe){
  var d = $('reseau');
  if(msg){ d.className = classe||'att'; d.textContent = msg; return; }
  DB.tous().then(function(l){
    var att = l.filter(function(x){ return x.statut==='attente'; }).length;
    if(!navigator.onLine){
      d.className='off';
      d.textContent = 'Hors connexion — tout fonctionne' + (att? ' · '+att+' devis à envoyer' : '');
    } else if(att){
      d.className='att'; d.textContent = att+' devis en attente d\'envoi';
    } else { d.className=''; d.textContent=''; }
  });
}

var SYNC = false;
function synchroniser(manuel, btn){
  if(SYNC){ if(btn) libere(btn); return; }
  if(btn) occuper(btn, 'Envoi…');
  if(!navigator.onLine){
    if(btn) libere(btn);
    if(manuel) etatReseau(null, 'Hors connexion : impossible de synchroniser maintenant.', 'off');
    else etatReseau();
    return;
  }
  SYNC = true;                     // verrou posé tout de suite : deux appels rapprochés
  DB.tous().then(function(l){      // (retour du réseau + minuterie) n'enverraient pas deux fois
    var att = l.filter(function(x){ return x.statut==='attente'; });
    if(!att.length){ SYNC = false; if(btn) libere(btn); etatReseau(); if(ETAPE===6) rendreHistorique(); return; }
    etatReseau(null, 'Envoi de '+att.length+' devis…', 'att');
    var suite = Promise.resolve();
    att.forEach(function(enr){ suite = suite.then(function(){ return envoyer(enr); }); });
    suite.then(function(){
      SYNC = false; if(btn) libere(btn);
      etatReseau(); if(ETAPE===6) rendreHistorique(); majEtatDernier();
    }, function(){ SYNC = false; if(btn) libere(btn); etatReseau(); });
  }, function(){ SYNC = false; if(btn) libere(btn); });
}

function envoyer(enr){
  return fetch(API_URL, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},  // évite la requête preflight
    body: JSON.stringify({
      action:'sync', id:enr.id, nom:enr.nom, code:enr.code, appareil:enr.appareil,
      envoyerClient:enr.envoyerClient, devis:enr.devis, pdf:enr.pdf, nomFichier:enr.nomFichier
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(!d.ok) throw new Error(d.erreur||'refusé');
    enr.statut='envoye'; enr.pdfUrl=d.pdfUrl||''; enr.envoye=Date.now();
    if(d.numero && d.numero !== enr.numero){   // le bureau a dû renuméroter
      enr.numeroPdf = enr.numero; enr.numero = d.numero;
    }
    return DB.put(enr);
  })
  .catch(function(e){
    enr.derniereErreur = String(e.message||e);
    return DB.put(enr);
  });
}

function majEtatDernier(){
  if(!DERNIER) return;
  DB.get(DERNIER.id).then(function(e){
    if(!e) return;
    DERNIER = e;
    if($('e5').classList.contains('hide')) return;
    $('okEtat').textContent = e.statut==='envoye'
      ? 'Envoyé au bureau' + (e.envoyerClient ? ' et transmis au client.' : '.')
      : 'En attente d\'envoi' + (e.derniereErreur ? ' (' + e.derniereErreur + ')' : '') + '.';
  });
}

/* ====================== HISTORIQUE ====================== */
function ouvrirHistorique(){
  ETAPE=6; montrer(6);
  $('steps').classList.add('hide'); $('bar').classList.add('hide');
  $('hTitre').textContent='Mes devis';
  var m=$('majCat'); if(m && CFG && CFG.maj) m.textContent = new Date(CFG.maj).toLocaleDateString('fr-FR');
  rendreHistorique(); window.scrollTo(0,0);
}
function rendreHistorique(){
  DB.tous().then(function(l){
    l.sort(function(a,b){ return b.cree-a.cree; });
    if(!l.length){ $('liste').innerHTML='<div class="empty">Aucun devis pour le moment.</div>'; return; }
    $('liste').innerHTML = l.slice(0,100).map(function(e){
      var d = new Date(e.cree);
      var cl = String((e.devis.client||{}).societe || (e.devis.client||{}).contact || '—');
      return '<div class="hist"><div class="i">'+
        '<b>'+ech(cl)+'</b>'+
        '<span><span class="pt '+(e.statut==='envoye'?'pt-ok':'pt-att')+'"></span>'+
        ech(e.numero)+' · '+d.toLocaleDateString('fr-FR')+' · '+eur(e.devis.totaux.ttc)+' TTC'+
        (e.statut==='envoye'?'':' · à envoyer')+
        (e.numeroPdf?' · renuméroté (PDF client : '+ech(e.numeroPdf)+')':'')+'</span></div>'+
        '<button class="btn sec sm" onclick="partagerId(\''+e.id+'\', this)">PDF</button>'+
        '<button class="btn sec sm" title="Renvoyer au bureau" onclick="renvoyer(\''+e.id+'\', this)">⟳</button></div>';
    }).join('');
  });
}

/* Repasser un devis en file d'attente : utile si le bureau ne l'a jamais reçu.
   Aucun risque de doublon, le bureau reconnaît un devis déjà enregistré. */
function renvoyer(id, btn){
  if(btn) occuper(btn, '');
  DB.get(id).then(function(e){
    if(!e){ if(btn) libere(btn); return; }
    e.statut = 'attente'; delete e.derniereErreur;
    return DB.put(e).then(function(){ rendreHistorique(); synchroniser(true); });  // le rendu recrée le bouton
  });
}

/* ====================== NOUVEAU DEVIS ====================== */
function nouveauDevis(){
  debloquer($('bSuiv'));
  LIGNES = [];
  ['cSociete','cContact','cTel','cEmail','cAdresse','cCp','cVille','fSignataire','fNotes']
    .forEach(function(id){ $(id).value=''; });
  $('fRemise').value = 0;
  $('fEnvoi').checked = false;
  effacerSignature();
  lsj('brouillon', null);
  DERNIER = null;
  $('steps').classList.remove('hide');
  etape(2);
}
