(function () {
  const cfg = window.WEDDING_CONFIG || {};

  const namesEl = document.getElementById("couple-names");
  if (namesEl && cfg.names?.length) {
    namesEl.innerHTML = cfg.names.map((n) => escapeHtml(n)).join("<br />");
  }

  const tgLink = document.getElementById("telegram-link");
  const tgHint = document.getElementById("telegram-hint");
  if (cfg.telegramUrl) {
    tgLink.href = cfg.telegramUrl;
    if (tgHint) tgHint.style.display = "none";
  } else {
    tgLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (tgHint) tgHint.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const weddingTarget = new Date(cfg.weddingDate || "2026-09-12T15:30:00+03:00");
  const countdownEl = document.getElementById("countdown");

  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, weddingTarget - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    countdownEl.innerHTML = [
      ["days", days, "дней"],
      ["hours", hours, "часов"],
      ["minutes", minutes, "мин"],
      ["seconds", seconds, "сек"],
    ]
      .map(
        ([, val, label]) =>
          `<div class="countdown__item"><span class="countdown__value">${val}</span><span class="countdown__label">${label}</span></div>`
      )
      .join("");
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  const audio = document.getElementById("bg-music");
  const musicBtn = document.getElementById("music-toggle");
  const musicLabel = document.getElementById("music-label");
  const musicHelp = document.getElementById("music-help");
  const MUSIC_SRC = "/audio/na-beregu-neba-instrumental.mp3";
  let musicOn = false;

  if (audio) {
    audio.src = MUSIC_SRC;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.load();
  }

  async function toggleMusic() {
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      musicOn = false;
      musicLabel.textContent = "Включить музыку";
      musicBtn.setAttribute("aria-pressed", "false");
      return;
    }
    try {
      if (!audio.src || !audio.src.includes("na-beregu-neba")) {
        audio.src = MUSIC_SRC;
        audio.load();
      }
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      musicOn = true;
      musicLabel.textContent = "Выключить музыку";
      musicBtn.setAttribute("aria-pressed", "true");
      if (musicHelp) musicHelp.classList.remove("visible");
    } catch (err) {
      musicLabel.textContent = "Не удалось включить музыку";
      if (musicHelp) {
        musicHelp.textContent =
          "Нажмите кнопку ещё раз. Если не помогло — проверьте, что звук на телефоне не выключен.";
        musicHelp.classList.add("visible");
      }
    }
  }

  musicBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMusic();
  });

  const form = document.getElementById("guest-form");
  const successEl = document.getElementById("form-success");
  const errorEl = document.getElementById("form-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    successEl.classList.remove("visible");
    errorEl.classList.remove("visible");

    const fullName = form.fullName.value;
    const attending = form.attending.value;
    const companions = form.companions.value;
    const drinks = [...form.querySelectorAll('input[name="drinks"]:checked')].map((el) => el.value);
    const message = form.message.value;

    if (!fullName.trim()) {
      showError("Укажите имя и фамилию");
      return;
    }
    if (!attending) {
      showError("Отметьте, будете ли вы на празднике");
      return;
    }
    if (drinks.length === 0) {
      showError("Выберите хотя бы один напиток");
      return;
    }

    try {
      const res = await fetch("/api/anketa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, attending, companions, drinks, message }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || "Не удалось отправить. Попробуйте позже.");
        return;
      }
      form.reset();
      successEl.classList.add("visible");
    } catch {
      showError("Нет связи с сервером. Проверьте, что сайт запущен.");
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("visible");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".section").forEach((el) => observer.observe(el));
})();
