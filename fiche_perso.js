/* ════════════════════════════════════════
   RPG CHARACTER SHEET — script.js
   ════════════════════════════════════════ */

/* ─── STATE ─── */
const sheets = [
  {
    name: '', prenom: '', age: '', sexe: '', race: '',
    classe: 'Guerrier', niveau: '1',
    arme: 'Épée longue', or: '50', argent: '20', alignement: 'Neutre Bon',
    backstory: '', traits: '', defauts: '', ideaux: '', liens: '',
    for: '10', dex: '10', con: '10', int: '10', sag: '10', cha: '10',
    hp: '', hpmax: '', mana: '', manamax: '', initiative: '', ca: '',
    vitesse: '30 pi', inspiration: '0',
    maladresses: '', competences: '', langues: '',
    inventaire: Array(12).fill(''),
    pdv1: '', pdv2: '', pdv3: '', pdv4: '', pdv5: '',
    imgData: null
  },
  {
    name: '', prenom: '', age: '', sexe: '', race: '',
    classe: 'Mage', niveau: '1',
    arme: 'Bâton runique', or: '20', argent: '10', alignement: 'Loyal Neutre',
    backstory: '', traits: '', defauts: '', ideaux: '', liens: '',
    for: '8', dex: '12', con: '10', int: '16', sag: '12', cha: '10',
    hp: '', hpmax: '', mana: '', manamax: '', initiative: '', ca: '',
    vitesse: '30 pi', inspiration: '0',
    maladresses: '', competences: '', langues: '',
    inventaire: Array(12).fill(''),
    pdv1: '', pdv2: '', pdv3: '', pdv4: '', pdv5: '',
    imgData: null
  },
  {
    name: '', prenom: '', age: '', sexe: '', race: '',
    classe: 'Rôdeur', niveau: '1',
    arme: 'Arc court', or: '35', argent: '15', alignement: 'Chaotique Bon',
    backstory: '', traits: '', defauts: '', ideaux: '', liens: '',
    for: '12', dex: '15', con: '12', int: '10', sag: '13', cha: '9',
    hp: '', hpmax: '', mana: '', manamax: '', initiative: '', ca: '',
    vitesse: '35 pi', inspiration: '0',
    maladresses: '', competences: '', langues: '',
    inventaire: Array(12).fill(''),
    pdv1: '', pdv2: '', pdv3: '', pdv4: '', pdv5: '',
    imgData: null
  }
];

let currentSheet = 0;
let currentLayout = 1;

/* ─── HELPERS ─── */

/** Escape HTML special chars for safe innerHTML injection */
function escH(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Return D&D-style modifier string from a stat value */
function mod(v) {
  const n = parseInt(v) || 10;
  const m = Math.floor((n - 10) / 2);
  return (m >= 0 ? '+' : '') + m;
}

/** Show a temporary toast notification */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ─── THEME SWITCHER ─── */
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.body.className = '';
    if (btn.dataset.theme !== 'parchment') {
      document.body.classList.add('theme-' + btn.dataset.theme);
    }
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ─── LAYOUT SELECTOR ─── */
function selectLayout(n) {
  currentLayout = n;
  document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.layout-card[data-layout="${n}"]`).classList.add('selected');
  document.getElementById('sheetsWrapper').className = `sheets-wrapper layout-${n}`;
}

/* ─── THUMBNAIL UPDATE ─── */
function updateThumb(idx) {
  const s = sheets[idx];
  const fullName = [s.prenom, s.name].filter(Boolean).join(' ') || 'Nom du personnage';

  document.getElementById('tname' + idx).textContent = fullName;
  document.getElementById('tag' + idx).textContent = s.classe || '—';
  document.getElementById('tstats' + idx).innerHTML =
    `<span class="stat-pill">Race: ${s.race || '—'}</span>
     <span class="stat-pill">Âge: ${s.age || '—'}</span>
     <span class="stat-pill">Or: ${s.or || '—'}</span>`;

  if (s.imgData) {
    const el = document.getElementById('img' + idx + '-thumb');
    if (el) {
      el.outerHTML = `<img id="img${idx}-thumb" class="sheet-thumb-img" src="${s.imgData}" alt="avatar ${idx}">`;
    }
  }
}

/* ─── BUILD SHEET HTML ─── */
function buildSheet(idx) {
  const s = sheets[idx];
  const lClass  = `sheet-layout-${currentLayout}`;
  const colFull = currentLayout !== 2 ? ' col-full' : '';

  const classOptions = ['Guerrier','Paladin','Rôdeur','Mage','Sorcier','Clerc','Druide',
    'Roublard','Barde','Moine','Barbare','Artificier']
    .map(c => `<option ${s.classe === c ? 'selected' : ''}>${c}</option>`).join('');

  const raceOptions = ['Humain','Elfe','Nain','Halfelin','Gnome','Demi-Elfe','Demi-Orque',
    'Tieflin','Aasimar','Draconide','Sylvanien','Goliath','Tabaxi']
    .map(r => `<option ${s.race === r ? 'selected' : ''}>${r}</option>`).join('');

  const alignOptions = ['Loyal Bon','Neutre Bon','Chaotique Bon','Loyal Neutre','Vrai Neutre',
    'Chaotique Neutre','Loyal Mauvais','Neutre Mauvais','Chaotique Mauvais']
    .map(a => `<option ${s.alignement === a ? 'selected' : ''}>${a}</option>`).join('');

  const invSlots = s.inventaire.map((item, i) =>
    `<div class="inv-slot">
       <input placeholder="Objet ${i + 1}" value="${escH(item)}"
              oninput="sheets[${idx}].inventaire[${i}]=this.value">
     </div>`
  ).join('');

  const statAttrs  = ['for', 'dex', 'con', 'int', 'sag', 'cha'];
  const statLabels = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
  const statBoxes  = statAttrs.map((attr, ai) =>
    `<div class="stat-box">
       <div class="stat-box-label">${statLabels[ai]}</div>
       <input class="stat-box-value" type="number" min="1" max="30"
              value="${escH(s[attr])}"
              oninput="sheets[${idx}]['${attr}']=this.value;
                       this.nextElementSibling.textContent='('+mod(this.value)+')'">
       <div class="stat-box-mod">(${mod(s[attr])})</div>
     </div>`
  ).join('');

  const avatarHTML = s.imgData
    ? `<img src="${s.imgData}" alt="avatar">`
    : `<div class="avatar-placeholder">📷<br>Image<br>du perso</div>`;

  return `
  <div class="character-sheet ${lClass}">

    <!-- HEADER -->
    <div class="cs-header">
      <div class="cs-header-left">
        <div class="cs-header-title">✦ Fiche de Personnage ${ ['I','II','III'][idx] } ✦</div>
        <input class="cs-name-input" placeholder="Nom de famille"
               value="${escH(s.name)}"
               oninput="sheets[${idx}].name=this.value;updateThumb(${idx})">
        <div style="margin-top:6px;">
          <input class="cs-name-input" style="font-size:1rem;font-weight:400;"
                 placeholder="Prénom" value="${escH(s.prenom)}"
                 oninput="sheets[${idx}].prenom=this.value;updateThumb(${idx})">
        </div>
      </div>
      <div class="cs-avatar-wrapper">
        ${avatarHTML}
        <input type="file" accept="image/*" onchange="handleAvatar(event,${idx})">
      </div>
    </div>

    <!-- BODY -->
    <div class="cs-body">

      <!-- ── COLONNE GAUCHE / IDENTITÉ ── -->
      <div>
        <div class="cs-section-title">Identité</div>
        <div class="field-group">
          <div class="field"><label>Classe</label>
            <select oninput="sheets[${idx}].classe=this.value;updateThumb(${idx})">${classOptions}</select>
          </div>
          <div class="field"><label>Niveau</label>
            <input type="number" min="1" max="20" value="${escH(s.niveau)}"
                   oninput="sheets[${idx}].niveau=this.value">
          </div>
          <div class="field"><label>Race</label>
            <select oninput="sheets[${idx}].race=this.value;updateThumb(${idx})">${raceOptions}</select>
          </div>
          <div class="field"><label>Âge</label>
            <input type="number" placeholder="25" value="${escH(s.age)}"
                   oninput="sheets[${idx}].age=this.value;updateThumb(${idx})">
          </div>
          <div class="field"><label>Sexe</label>
            <input placeholder="—" value="${escH(s.sexe)}"
                   oninput="sheets[${idx}].sexe=this.value">
          </div>
          <div class="field"><label>Alignement</label>
            <select oninput="sheets[${idx}].alignement=this.value">${alignOptions}</select>
          </div>
          <div class="field"><label>Arme de départ</label>
            <input placeholder="Épée longue" value="${escH(s.arme)}"
                   oninput="sheets[${idx}].arme=this.value">
          </div>
          <div class="field"><label>Or (pièces)</label>
            <input type="number" placeholder="50" value="${escH(s.or)}"
                   oninput="sheets[${idx}].or=this.value;updateThumb(${idx})">
          </div>
          <div class="field"><label>Argent (pièces)</label>
            <input type="number" placeholder="20" value="${escH(s.argent)}"
                   oninput="sheets[${idx}].argent=this.value">
          </div>
          <div class="field"><label>Vitesse</label>
            <input placeholder="30 pi" value="${escH(s.vitesse)}"
                   oninput="sheets[${idx}].vitesse=this.value">
          </div>
          <div class="field"><label>Inspiration</label>
            <input type="number" placeholder="0" value="${escH(s.inspiration)}"
                   oninput="sheets[${idx}].inspiration=this.value">
          </div>
          <div class="field"><label>Langues connues</label>
            <input placeholder="Commun, Elfique…" value="${escH(s.langues)}"
                   oninput="sheets[${idx}].langues=this.value">
          </div>
        </div>

        <div class="rune-divider">⋯ ✦ ⋯</div>
        <div class="cs-section-title">Points vitaux</div>
        <div class="vitals-row">
          <div class="vital-box">
            <div class="vital-label">Points de Vie</div>
            <div class="vital-inputs">
              <input type="number" placeholder="0" value="${escH(s.hp)}"
                     oninput="sheets[${idx}].hp=this.value">
              <span class="vital-sep">/</span>
              <input type="number" placeholder="max" value="${escH(s.hpmax)}"
                     oninput="sheets[${idx}].hpmax=this.value">
            </div>
          </div>
          <div class="vital-box">
            <div class="vital-label">Mana / Sorts</div>
            <div class="vital-inputs">
              <input type="number" placeholder="0" value="${escH(s.mana)}"
                     oninput="sheets[${idx}].mana=this.value">
              <span class="vital-sep">/</span>
              <input type="number" placeholder="max" value="${escH(s.manamax)}"
                     oninput="sheets[${idx}].manamax=this.value">
            </div>
          </div>
          <div class="vital-box">
            <div class="vital-label">CA / Initiative</div>
            <div class="vital-inputs">
              <input type="number" placeholder="CA" value="${escH(s.ca)}"
                     oninput="sheets[${idx}].ca=this.value">
              <span class="vital-sep">|</span>
              <input type="number" placeholder="Init" value="${escH(s.initiative)}"
                     oninput="sheets[${idx}].initiative=this.value">
            </div>
          </div>
        </div>

        <div class="rune-divider">⋯ ✦ ⋯</div>
        <div class="cs-section-title">Caractéristiques</div>
        <div class="stats-grid">${statBoxes}</div>
        <div class="field-group" style="grid-template-columns:1fr;">
          <div class="field"><label>Compétences maîtrisées</label>
            <input placeholder="Athlétisme, Discrétion…" value="${escH(s.competences)}"
                   oninput="sheets[${idx}].competences=this.value">
          </div>
        </div>
      </div>

      <!-- ── COLONNE DROITE / HISTOIRE ── -->
      <div class="${colFull}">
        <div class="cs-section-title">Histoire &amp; Personnalité</div>
        <div class="field" style="margin-bottom:10px;">
          <label>Traits de personnalité</label>
          <textarea class="cs-textarea" style="min-height:60px;"
                    placeholder="Comment votre personnage parle, agit, se distingue…"
                    oninput="sheets[${idx}].traits=this.value">${escH(s.traits)}</textarea>
        </div>
        <div class="field-group">
          <div class="field"><label>Idéaux</label>
            <input placeholder="Ce en quoi je crois…" value="${escH(s.ideaux)}"
                   oninput="sheets[${idx}].ideaux=this.value">
          </div>
          <div class="field"><label>Liens</label>
            <input placeholder="Ce qui me tient à cœur…" value="${escH(s.liens)}"
                   oninput="sheets[${idx}].liens=this.value">
          </div>
          <div class="field"><label>Défauts</label>
            <input placeholder="Ma faiblesse…" value="${escH(s.defauts)}"
                   oninput="sheets[${idx}].defauts=this.value">
          </div>
          <div class="field"><label>Maladresses / Peurs</label>
            <input placeholder="Ma hantise…" value="${escH(s.maladresses)}"
                   oninput="sheets[${idx}].maladresses=this.value">
          </div>
        </div>
        <div class="field"><label>Backstory</label>
          <textarea class="cs-textarea"
                    placeholder="L'histoire de votre personnage, son passé, ses motivations…"
                    oninput="sheets[${idx}].backstory=this.value">${escH(s.backstory)}</textarea>
        </div>

        <div class="rune-divider">⋯ ✦ ⋯</div>
        <div class="cs-section-title">Inventaire</div>
        <div class="inventory-grid">${invSlots}</div>
        <button class="add-inv-btn" onclick="addInvSlot(${idx})">+ Ajouter un emplacement</button>

        <div class="rune-divider">⋯ ✦ ⋯</div>
        <div class="cs-section-title">Points de Vue &amp; Notes</div>
        <div class="notes-grid">
          <div class="notes-box">
            <div class="notes-box-label">Point de vue 1</div>
            <textarea placeholder="Mon point de vue sur…"
                      oninput="sheets[${idx}].pdv1=this.value">${escH(s.pdv1)}</textarea>
          </div>
          <div class="notes-box">
            <div class="notes-box-label">Point de vue 2</div>
            <textarea placeholder="Mon avis sur la faction…"
                      oninput="sheets[${idx}].pdv2=this.value">${escH(s.pdv2)}</textarea>
          </div>
          <div class="notes-box">
            <div class="notes-box-label">Relations / Alliés</div>
            <textarea placeholder="Personnages importants…"
                      oninput="sheets[${idx}].pdv3=this.value">${escH(s.pdv3)}</textarea>
          </div>
          <div class="notes-box">
            <div class="notes-box-label">Ennemis / Rivaux</div>
            <textarea placeholder="Mes ennemis jurés…"
                      oninput="sheets[${idx}].pdv4=this.value">${escH(s.pdv4)}</textarea>
          </div>
          <div class="notes-box" style="grid-column:1/-1;">
            <div class="notes-box-label">Notes libres du joueur</div>
            <textarea style="min-height:60px;"
                      placeholder="Notes de session, quêtes en cours, secrets découverts…"
                      oninput="sheets[${idx}].pdv5=this.value">${escH(s.pdv5)}</textarea>
          </div>
        </div>
      </div>

    </div><!-- /.cs-body -->
  </div><!-- /.character-sheet -->`;
}

/* ─── MODAL ─── */
function openModal(idx) {
  currentSheet = idx;
  document.getElementById('modalSheetContent').innerHTML = buildSheet(idx);
  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
  sheets.forEach((_, i) => updateThumb(i));
}

function maybeCloseModal(e) {
  if (e.target === document.getElementById('modalBackdrop')) closeModal();
}

/* ─── AVATAR ─── */
function handleAvatar(event, idx) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    sheets[idx].imgData = e.target.result;
    updateThumb(idx);
    document.getElementById('modalSheetContent').innerHTML = buildSheet(idx);
  };
  reader.readAsDataURL(file);
}

/* ─── INVENTORY ─── */
function addInvSlot(idx) {
  sheets[idx].inventaire.push('');
  document.getElementById('modalSheetContent').innerHTML = buildSheet(idx);
}

/* ─── JSON EXPORT / IMPORT ─── */
function exportJSON() {
  const s    = sheets[currentSheet];
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `fiche-${(s.name || 'personnage').toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  showToast('✦ Fiche sauvegardée en JSON');
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      Object.assign(sheets[currentSheet], data);
      document.getElementById('modalSheetContent').innerHTML = buildSheet(currentSheet);
      updateThumb(currentSheet);
      showToast('✦ Fiche importée avec succès');
    } catch {
      showToast('✗ Erreur lors de l\'import');
    }
  };
  reader.readAsText(file);
}

/* ─── PDF EXPORT ─── */
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const s   = sheets[currentSheet];
  const pw  = doc.internal.pageSize.getWidth();
  const ph  = doc.internal.pageSize.getHeight();
  const m   = 14;
  const cw  = pw - m * 2;
  let   y   = 18;

  function checkY(h) {
    if (y + h > ph - 14) { doc.addPage(); y = 18; }
  }
  function wrapText(text, x, maxW, fsize, lineH) {
    if (!text) return;
    doc.setFontSize(fsize);
    doc.splitTextToSize(String(text), maxW).forEach(l => {
      checkY(lineH + 1);
      doc.text(l, x, y);
      y += lineH;
    });
  }
  function sectionBar(title) {
    checkY(14);
    doc.setFillColor(230, 210, 175);
    doc.rect(m, y - 4, cw, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 60, 20);
    doc.text(title, m + 3, y + 1);
    y += 10;
  }

  /* Header */
  doc.setFillColor(42, 26, 14);
  doc.rect(0, 0, pw, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(201, 150, 58);
  doc.text('FEUILLE DE PERSONNAGE RPG', pw / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(180, 150, 100);
  doc.text(`${s.prenom} ${s.name} — ${s.classe} Niv.${s.niveau}`.trim(), pw / 2, 16, { align: 'center' });
  y = 28;

  /* Avatar */
  if (s.imgData) {
    try { doc.addImage(s.imgData, 'JPEG', pw - m - 35, y, 35, 30); } catch (e) { /* ignore */ }
  }

  /* Identité */
  sectionBar('IDENTITÉ');
  const idFields = [
    ['Nom', `${s.prenom} ${s.name}`], ['Classe', s.classe], ['Niveau', s.niveau],
    ['Race', s.race], ['Âge', s.age], ['Sexe', s.sexe],
    ['Alignement', s.alignement], ['Arme de départ', s.arme],
    ['Or', `${s.or} po`], ['Argent', `${s.argent} pa`],
    ['Vitesse', s.vitesse], ['Langues', s.langues]
  ];
  const halfCw = (cw - 6) / 2;
  idFields.forEach(([label, val], i) => {
    const col  = i % 2;
    const row  = Math.floor(i / 2);
    const xPos = m + col * (halfCw + 6);
    const yPos = y + row * 7;
    checkY(7);
    doc.setFont('helvetica', 'bold');   doc.setFontSize(7);  doc.setTextColor(120, 80, 30);
    doc.text(label + ':', xPos, yPos);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);  doc.setTextColor(42, 26, 14);
    doc.text(String(val || '—'), xPos + 22, yPos);
  });
  y += Math.ceil(idFields.length / 2) * 7 + 6;

  /* Caractéristiques */
  sectionBar('CARACTÉRISTIQUES');
  const attrs = [['FOR', s.for], ['DEX', s.dex], ['CON', s.con], ['INT', s.int], ['SAG', s.sag], ['CHA', s.cha]];
  const boxW  = (cw - 10) / 6;
  attrs.forEach(([label, val], i) => {
    const bx   = m + i * (boxW + 2);
    const bv   = parseInt(val) || 10;
    const bmod = Math.floor((bv - 10) / 2);
    doc.setDrawColor(150, 100, 50); doc.setLineWidth(0.4);
    doc.rect(bx, y - 4, boxW, 18);
    doc.setFont('helvetica', 'bold');   doc.setFontSize(7);  doc.setTextColor(120, 80, 30);
    doc.text(label, bx + boxW / 2, y, { align: 'center' });
    doc.setFontSize(14); doc.setTextColor(42, 26, 14);
    doc.text(String(bv), bx + boxW / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 70, 30);
    doc.text(`(${bmod >= 0 ? '+' : ''}${bmod})`, bx + boxW / 2, y + 12, { align: 'center' });
  });
  y += 22;

  /* Points vitaux */
  sectionBar('POINTS VITAUX');
  const vitals = [
    ['PV',         `${s.hp || '—'}/${s.hpmax || '—'}`],
    ['Mana',       `${s.mana || '—'}/${s.manamax || '—'}`],
    ['CA',         s.ca || '—'],
    ['Initiative', s.initiative || '—']
  ];
  vitals.forEach(([label, val], i) => {
    const xp = m + i * (cw / 4);
    doc.setFont('helvetica', 'bold');   doc.setFontSize(7);  doc.setTextColor(120, 80, 30);
    doc.text(label + ':', xp, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(42, 26, 14);
    doc.text(String(val), xp + 14, y);
  });
  y += 10;

  /* Backstory */
  if (s.backstory) {
    sectionBar('BACKSTORY');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(42, 26, 14);
    wrapText(s.backstory, m, cw, 9, 5);
    y += 4;
  }

  /* Personnalité */
  const persFields = [['Traits', s.traits], ['Idéaux', s.ideaux], ['Liens', s.liens], ['Défauts', s.defauts]];
  if (persFields.some(([, v]) => v)) {
    sectionBar('PERSONNALITÉ');
    persFields.forEach(([label, val]) => {
      if (!val) return;
      doc.setFont('helvetica', 'bold');   doc.setFontSize(8); doc.setTextColor(120, 80, 30);
      checkY(6); doc.text(label + ' :', m, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(42, 26, 14);
      wrapText(val, m + 2, cw - 2, 9, 5);
      y += 2;
    });
  }

  /* Inventaire */
  const filledInv = s.inventaire.filter(Boolean);
  if (filledInv.length > 0) {
    sectionBar('INVENTAIRE');
    const cols = 3;
    const invW = (cw - (cols - 1) * 4) / cols;
    filledInv.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      checkY(7);
      const xp = m + col * (invW + 4);
      const yp = y + row * 7;
      doc.setDrawColor(180, 140, 80); doc.setLineWidth(0.3);
      doc.rect(xp, yp - 4, invW, 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(42, 26, 14);
      const lines = doc.splitTextToSize(item, invW - 4);
      doc.text(lines[0], xp + 2, yp);
    });
    y += Math.ceil(filledInv.length / cols) * 7 + 4;
  }

  /* Points de vue */
  const pdvFields = [
    ['Point de vue 1', s.pdv1], ['Point de vue 2', s.pdv2],
    ['Relations', s.pdv3], ['Ennemis', s.pdv4], ['Notes', s.pdv5]
  ];
  if (pdvFields.some(([, v]) => v)) {
    sectionBar('POINTS DE VUE & NOTES');
    pdvFields.forEach(([label, val]) => {
      if (!val) return;
      doc.setFont('helvetica', 'bold');   doc.setFontSize(8); doc.setTextColor(120, 80, 30);
      checkY(6); doc.text(label + ' :', m, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(42, 26, 14);
      wrapText(val, m + 2, cw - 2, 9, 5);
      y += 2;
    });
  }

  /* Footer on every page */
  const numPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= numPages; p++) {
    doc.setPage(p);
    doc.setFillColor(42, 26, 14);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(160, 120, 60);
    doc.text('✦ Feuille de Personnage RPG ✦', pw / 2, ph - 4, { align: 'center' });
    doc.text(`Page ${p}/${numPages}`, pw - m, ph - 4, { align: 'right' });
  }

  const fname = `${(s.prenom || s.name || 'personnage').toLowerCase().replace(/\s+/g, '-')}-fiche.pdf`;
  doc.save(fname);
  showToast('✦ PDF exporté avec succès');
}

/* ─── WORD EXPORT ─── */
function exportWord() {
  try {
    const {
      Document, Packer, Paragraph, TextRun,
      AlignmentType, Table, TableRow, TableCell,
      WidthType, ShadingType, BorderStyle
    } = docx;

    const s = sheets[currentSheet];

    const border      = { style: BorderStyle.SINGLE, size: 1, color: '8B6914' };
    const cellBorders = { top: border, bottom: border, left: border, right: border };
    const cellM       = { top: 80, bottom: 80, left: 140, right: 140 };

    function heading(text) {
      return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 24, color: '6B3A10', font: 'Georgia' })],
        spacing: { before: 240, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9963A', space: 1 } }
      });
    }
    function field(label, value) {
      if (!value) return null;
      return new Paragraph({
        children: [
          new TextRun({ text: label + ': ', bold: true, size: 20, color: '7A5C35', font: 'Georgia' }),
          new TextRun({ text: String(value), size: 20, font: 'Georgia', color: '1A0F00' })
        ],
        spacing: { after: 60 }
      });
    }
    function para(text) {
      return new Paragraph({
        children: [new TextRun({ text: String(text || ''), size: 20, font: 'Georgia', color: '1A0F00' })],
        spacing: { after: 80 }
      });
    }

    const children = [
      new Paragraph({
        children: [new TextRun({ text: 'FEUILLE DE PERSONNAGE RPG', bold: true, size: 36, color: 'C9963A', font: 'Georgia' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `${s.prenom} ${s.name} — ${s.classe} Niveau ${s.niveau}`.trim(), size: 22, italics: true, color: '7A5C35', font: 'Georgia' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 }
      }),

      heading('Identité'),
      ...[
        ['Nom', `${s.prenom || ''} ${s.name || ''}`],
        ['Classe', s.classe], ['Niveau', s.niveau], ['Race', s.race],
        ['Âge', s.age], ['Sexe', s.sexe], ['Alignement', s.alignement],
        ['Arme de départ', s.arme],
        ['Or', s.or ? s.or + ' pièces d\'or' : null],
        ['Argent', s.argent ? s.argent + ' pièces d\'argent' : null],
        ['Vitesse', s.vitesse], ['Langues', s.langues]
      ].map(([l, v]) => field(l, v)).filter(Boolean),

      heading('Caractéristiques'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1504, 1504, 1504, 1504, 1504, 1506],
        rows: [
          new TableRow({
            children: ['FOR','DEX','CON','INT','SAG','CHA'].map(attr =>
              new TableCell({
                borders: cellBorders, margins: cellM,
                width: { size: 1504, type: WidthType.DXA },
                shading: { fill: 'F5EAD0', type: ShadingType.CLEAR },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: attr, bold: true, size: 18, color: '7A5C35', font: 'Georgia' })]
                })]
              })
            )
          }),
          new TableRow({
            children: [s.for, s.dex, s.con, s.int, s.sag, s.cha].map(v => {
              const n  = parseInt(v) || 10;
              const m2 = Math.floor((n - 10) / 2);
              return new TableCell({
                borders: cellBorders, margins: cellM,
                width: { size: 1504, type: WidthType.DXA },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(n), bold: true, size: 28, font: 'Georgia' })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `(${m2 >= 0 ? '+' : ''}${m2})`, size: 16, italics: true, color: '7A5C35', font: 'Georgia' })] })
                ]
              });
            })
          })
        ]
      }),
      new Paragraph({ spacing: { after: 200 } }),

      heading('Points Vitaux'),
      ...[
        ['Points de Vie', `${s.hp || '—'} / ${s.hpmax || '—'}`],
        ['Mana / Sorts',  `${s.mana || '—'} / ${s.manamax || '—'}`],
        ['Classe d\'Armure', s.ca],
        ['Initiative', s.initiative]
      ].map(([l, v]) => field(l, v)).filter(Boolean)
    ];

    if (s.backstory) {
      children.push(heading('Backstory'));
      s.backstory.split('\n').forEach(line => children.push(para(line)));
    }

    const persData = [
      ['Traits de personnalité', s.traits],
      ['Idéaux', s.ideaux],
      ['Liens', s.liens],
      ['Défauts', s.defauts]
    ].filter(([, v]) => v);
    if (persData.length) {
      children.push(heading('Personnalité'));
      persData.forEach(([l, v]) => children.push(field(l, v)));
    }

    const invData = s.inventaire.filter(Boolean);
    if (invData.length) {
      children.push(heading('Inventaire'));
      invData.forEach((item, i) => children.push(new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${item}`, size: 20, font: 'Georgia' })],
        spacing: { after: 60 }
      })));
    }

    const pdvData = [
      ['Point de vue 1', s.pdv1], ['Point de vue 2', s.pdv2],
      ['Relations / Alliés', s.pdv3], ['Ennemis / Rivaux', s.pdv4],
      ['Notes', s.pdv5]
    ].filter(([, v]) => v);
    if (pdvData.length) {
      children.push(heading('Points de Vue & Notes'));
      pdvData.forEach(([l, v]) => {
        children.push(field(l, v));
        v.split('\n').filter(Boolean).forEach(line => children.push(para('  ' + line)));
      });
    }

    const doc2 = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
          }
        },
        children
      }]
    });

    Packer.toBlob(doc2).then(blob => {
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `${(s.prenom || s.name || 'personnage').toLowerCase().replace(/\s+/g, '-')}-fiche.docx`;
      a.click();
      showToast('✦ Document Word exporté');
    });

  } catch (e) {
    showToast('✗ Erreur export Word : ' + e.message);
    console.error(e);
  }
}

/* ─── INIT ─── */
sheets.forEach((_, i) => updateThumb(i));
