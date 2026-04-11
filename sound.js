let modules = [];

function addModule() {
  modules.push({ name: "", desc: "", links: [] });
  render();
}

function addLink(index) {
  modules[index].links.push("");
  render();
}

function updateModule(index, field, value) {
  modules[index][field] = value;
}

function updateLink(mIndex, lIndex, value) {
  modules[mIndex].links[lIndex] = value;
}

function getYouTubeThumbnail(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/0.jpg`;
  }
  return null;
}

function render() {
  const container = document.getElementById("modules");
  container.innerHTML = "";

  modules.forEach((mod, i) => {
    let div = document.createElement("div");
    div.className = "module";

    div.innerHTML = `
      <input placeholder="Nom" value="${mod.name}" 
        oninput="updateModule(${i}, 'name', this.value)">
      <textarea placeholder="Description"
        oninput="updateModule(${i}, 'desc', this.value)">${mod.desc}</textarea>

      <div>
        ${mod.links.map((link, j) => {
          const thumb = getYouTubeThumbnail(link);
          return `
            <div class="link">
              <input value="${link}" 
                oninput="updateLink(${i}, ${j}, this.value)">
              ${thumb ? `<div class="preview"><img src="${thumb}"></div>` : ""}
            </div>
          `;
        }).join("")}
      </div>

      <button onclick="addLink(${i})">+ lien</button>
    `;

    container.appendChild(div);
  });

  localStorage.setItem("modules", JSON.stringify(modules));
}

function exportJSON() {
  const data = JSON.stringify(modules, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "modules.json";
  a.click();
}

function importJSON(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    modules = JSON.parse(e.target.result);
    render();
  };
  reader.readAsText(file);
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Helper: check remaining space, add page if needed
  function checkPageBreak(neededHeight) {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 20;
    }
  }

  // Helper: draw wrapped text and return new Y
  function addWrappedText(text, x, startY, maxWidth, lineHeight, options = {}) {
    if (!text || text.trim() === "") return startY;
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
      checkPageBreak(lineHeight + 2);
      doc.text(line, x, y, options);
      y += lineHeight;
    });
    return y;
  }

  modules.forEach((mod, idx) => {
    // --- Section box background ---
    const sectionStartY = y;

    // Estimate section height to draw box (we'll draw it after content)
    // Instead, draw a colored header bar for the section

    // Section header background
    checkPageBreak(12);
    doc.setFillColor(47, 111, 237); // primary blue
    doc.roundedRect(margin, y - 6, contentWidth, 11, 3, 3, "F");

    // Section title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(mod.name || `Module ${idx + 1}`, contentWidth - 8);
    doc.text(titleLines[0], margin + 4, y + 1);
    y += 10;

    // Reset text color
    doc.setTextColor(31, 42, 55);

    // Description
    if (mod.desc && mod.desc.trim() !== "") {
      checkPageBreak(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(98, 113, 134); // muted color
      addWrappedText(mod.desc, margin + 2, y, contentWidth - 4, 5.5);
      y += 2;
    }

    // Links
    if (mod.links && mod.links.length > 0) {
      mod.links.forEach((link, lIdx) => {
        if (!link || link.trim() === "") return;

        checkPageBreak(18);

        // Link box background
        doc.setFillColor(240, 246, 255);
        doc.setDrawColor(200, 212, 229);
        doc.setLineWidth(0.3);

        // Calculate link text height to size the box
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const linkLines = doc.splitTextToSize(link, contentWidth - 16);
        const boxHeight = 6 + linkLines.length * 5 + 4;

        checkPageBreak(boxHeight + 2);
        doc.roundedRect(margin, y - 1, contentWidth, boxHeight, 3, 3, "FD");

        // Link label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(47, 111, 237);
        doc.text(`Lien ${lIdx + 1}`, margin + 4, y + 4);
        y += 6;

        // Link URL (wrapped, stays inside box)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(31, 42, 55);
        linkLines.forEach(line => {
          doc.text(line, margin + 4, y);
          y += 5;
        });

        y += 3; // padding after box
      });
    }

    // Space between modules
    y += 8;

    // Separator line between modules (except last)
    if (idx < modules.length - 1) {
      checkPageBreak(4);
      doc.setDrawColor(217, 226, 239);
      doc.setLineWidth(0.4);
      doc.line(margin, y - 4, pageWidth - margin, y - 4);
    }
  });

  doc.save("modules.pdf");
}

window.onload = () => {
  const saved = localStorage.getItem("modules");
  if (saved) {
    modules = JSON.parse(saved);
  }
  render();
};
