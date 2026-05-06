let modules = [];
let saveTimer = null;

const STORAGE_KEY = "ludicoreSoundModules";

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  }, 250);
}

function normalizeUrl(url = "") {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getPlatform(url = "") {
  const value = url.toLowerCase();
  const platforms = [
    { key: "youtube", name: "YouTube", logo: "▶", match: ["youtube.com", "youtu.be", "music.youtube.com"] },
    { key: "spotify", name: "Spotify", logo: "♬", match: ["spotify.com", "open.spotify.com"] },
    { key: "soundcloud", name: "SoundCloud", logo: "☁", match: ["soundcloud.com"] },
    { key: "deezer", name: "Deezer", logo: "▦", match: ["deezer.com"] },
    { key: "apple", name: "Apple Music", logo: "", match: ["music.apple.com", "itunes.apple.com"] },
    { key: "bandcamp", name: "Bandcamp", logo: "B", match: ["bandcamp.com"] },
    { key: "twitch", name: "Twitch", logo: "T", match: ["twitch.tv"] },
    { key: "vimeo", name: "Vimeo", logo: "V", match: ["vimeo.com"] }
  ];

  return platforms.find(platform => platform.match.some(domain => value.includes(domain))) || {
    key: "generic",
    name: value ? "Lien web" : "Lien",
    logo: "🔗"
  };
}

function getYouTubeThumbnail(url = "") {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/#]+)/i);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function countLinks() {
  return modules.reduce((total, mod) => total + (mod.links || []).filter(link => link && link.trim()).length, 0);
}

function addModule() {
  modules.push({ name: "", desc: "", links: [""] });
  render();
}

function deleteModule(index) {
  if (!confirm("Supprimer ce module audio ?")) return;
  modules.splice(index, 1);
  render();
}

function addLink(index) {
  modules[index].links.push("");
  render();
}

function deleteLink(moduleIndex, linkIndex) {
  modules[moduleIndex].links.splice(linkIndex, 1);
  render();
}

function updateModule(index, field, value) {
  modules[index][field] = value;
  updateStats();
  scheduleSave();
}

function updateLink(moduleIndex, linkIndex, value) {
  modules[moduleIndex].links[linkIndex] = value;
  updatePlatformPreview(moduleIndex, linkIndex, value);
  updateStats();
  scheduleSave();
}

function updateStats() {
  const moduleCount = document.getElementById("moduleCount");
  const linkCount = document.getElementById("linkCount");
  if (moduleCount) moduleCount.textContent = modules.length;
  if (linkCount) linkCount.textContent = countLinks();
}

function platformBadgeHTML(link) {
  const platform = getPlatform(link);
  return `
    <span class="platform-badge platform-${platform.key}">
      <span class="platform-logo">${escapeHTML(platform.logo)}</span>
      <span>${escapeHTML(platform.name)}</span>
    </span>
  `;
}

function updatePlatformPreview(moduleIndex, linkIndex, value) {
  const linkCard = document.querySelector(`[data-link-id="${moduleIndex}-${linkIndex}"]`);
  if (!linkCard) return;

  const badge = linkCard.querySelector(".platform-host");
  const previewHost = linkCard.querySelector(".preview-host");
  if (badge) badge.innerHTML = platformBadgeHTML(value);

  const thumb = getYouTubeThumbnail(value);
  if (previewHost) {
    previewHost.innerHTML = thumb ? `<div class="preview"><img src="${thumb}" alt="Miniature YouTube"></div>` : "";
  }
}

function openLink(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return;
  window.open(normalized, "_blank", "noopener,noreferrer");
}

function render() {
  const container = document.getElementById("modules");
  const emptyTemplate = document.getElementById("emptyTemplate");
  container.innerHTML = "";

  if (!modules.length) {
    container.appendChild(emptyTemplate.content.cloneNode(true));
    updateStats();
    scheduleSave();
    return;
  }

  modules.forEach((mod, moduleIndex) => {
    const div = document.createElement("section");
    div.className = "module";

    const links = (mod.links || []).map((link, linkIndex) => {
      const safeLink = escapeHTML(link);
      const thumb = getYouTubeThumbnail(link);
      return `
        <div class="link" data-link-id="${moduleIndex}-${linkIndex}">
          <div class="link-top">
            <span class="platform-host">${platformBadgeHTML(link)}</span>
            <input type="text" placeholder="Colle un lien YouTube, Spotify, SoundCloud..." value="${safeLink}" oninput="updateLink(${moduleIndex}, ${linkIndex}, this.value)">
            <button type="button" class="icon-link-btn" onclick="openLink(modules[${moduleIndex}].links[${linkIndex}])" title="Ouvrir le lien">↗</button>
            <button type="button" class="icon-link-btn delete-btn" onclick="deleteLink(${moduleIndex}, ${linkIndex})" title="Supprimer le lien">×</button>
          </div>
          <div class="preview-host">${thumb ? `<div class="preview"><img src="${thumb}" alt="Miniature YouTube"></div>` : ""}</div>
        </div>
      `;
    }).join("");

    div.innerHTML = `
      <div class="module-head">
        <div class="module-icon">♫</div>
        <div class="module-fields">
          <input type="text" placeholder="Nom du module : Combat, Exploration, Boss..." value="${escapeHTML(mod.name || "")}" oninput="updateModule(${moduleIndex}, 'name', this.value)">
          <textarea placeholder="Description : ambiance, moment du jeu, consignes d'utilisation..." oninput="updateModule(${moduleIndex}, 'desc', this.value)">${escapeHTML(mod.desc || "")}</textarea>
        </div>
      </div>

      <div class="links-list">${links || ""}</div>

      <div class="module-actions">
        <button type="button" onclick="addLink(${moduleIndex})">+ Ajouter un lien</button>
        <button type="button" class="delete-btn" onclick="deleteModule(${moduleIndex})">Supprimer le module</button>
      </div>
    `;

    container.appendChild(div);
  });

  updateStats();
  scheduleSave();
}

function exportJSON() {
  const data = JSON.stringify(modules, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bande-son-ludicore.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Format invalide");
      modules = imported.map(mod => ({
        name: mod.name || "",
        desc: mod.desc || "",
        links: Array.isArray(mod.links) ? mod.links : []
      }));
      render();
    } catch (error) {
      alert("Import impossible : le fichier JSON ne correspond pas au format attendu.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  function checkPageBreak(neededHeight) {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  }

  function addWrappedText(text, x, maxWidth, lineHeight, options = {}) {
    if (!text || !text.trim()) return;
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
      checkPageBreak(lineHeight + 2);
      doc.text(line, x, y, options);
      y += lineHeight;
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(31, 42, 55);
  doc.text("Bande son - Ludicore Studio", margin, y);
  y += 10;

  modules.forEach((mod, idx) => {
    checkPageBreak(18);
    doc.setFillColor(47, 111, 237);
    doc.roundedRect(margin, y - 6, contentWidth, 12, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(mod.name || `Module ${idx + 1}`, margin + 4, y + 1);
    y += 12;

    if (mod.desc && mod.desc.trim()) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(98, 113, 134);
      addWrappedText(mod.desc, margin + 2, contentWidth - 4, 5.5);
      y += 2;
    }

    (mod.links || []).forEach((link, linkIndex) => {
      if (!link || !link.trim()) return;
      const platform = getPlatform(link);
      const linkLines = doc.splitTextToSize(link, contentWidth - 18);
      const boxHeight = 12 + linkLines.length * 5;
      checkPageBreak(boxHeight + 4);

      doc.setFillColor(240, 246, 255);
      doc.setDrawColor(200, 212, 229);
      doc.roundedRect(margin, y - 1, contentWidth, boxHeight, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(47, 111, 237);
      doc.text(`${platform.name} • Lien ${linkIndex + 1}`, margin + 4, y + 5);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(31, 42, 55);
      linkLines.forEach(line => {
        doc.text(line, margin + 4, y);
        y += 5;
      });
      y += 4;
    });

    y += 6;
  });

  doc.save("bande-son-ludicore.pdf");
}

window.onload = () => {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("modules");
  if (saved) {
    try {
      modules = JSON.parse(saved);
    } catch (error) {
      modules = [];
    }
  }
  render();
};
