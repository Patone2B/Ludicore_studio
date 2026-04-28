// MODE SOMBRE
const btn = document.getElementById("themeToggle");

btn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  btn.textContent = document.body.classList.contains("dark")
    ? "☀️ Mode clair"
    : "🌙 Mode sombre";
});

// FADE-IN SCROLL
const elements = document.querySelectorAll(".fade-in");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
});

elements.forEach(el => observer.observe(el));
