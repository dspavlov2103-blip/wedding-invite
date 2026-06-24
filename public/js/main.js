(function () {
  const cfg = window.WEDDING_CONFIG || {};

  const namesEl = document.getElementById("couple-names");
  if (namesEl && cfg.names?.length >= 2) {
    namesEl.innerHTML = `${escapeHtml(cfg.names[0])}<br />и<br />${escapeHtml(cfg.names[1])}`;
  } else if (namesEl && cfg.names?.length) {
    namesEl.innerHTML = cfg.names.map((n) => escapeHtml(n)).join("<br />");
  }

  const venuePhoto = document.getElementById("venue-photo");
  if (venuePhoto && cfg.venuePhoto) {
    venuePhoto.src = cfg.venuePhoto;
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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, weddingTarget - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const items = [
      { val: days, label: "дней" },
      { val: hours, label: "часов" },
      { val: minutes, label: "минут" },
      { val: seconds, label: "секунд" },
    ];

    countdownEl.innerHTML = items
      .map((item, i) => {
        const block = `<div class="countdown__item"><span class="countdown__value">${pad2(item.val)}</span><span class="countdown__label">${item.label}</span></div>`;
        return i < items.length - 1 ? block + '<span class="countdown__sep" aria-hidden="true">·</span>' : block;
      })
      .join("");
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  const audio = document.getElementById("bg-music");
  const MUSIC_SRC = "/audio/na-beregu-neba-instrumental.mp3";
  let musicStarted = false;

  if (audio) {
    audio.src = MUSIC_SRC;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.loop = true;
    audio.load();
  }

  async function startMusic() {
    if (!audio || musicStarted) return;
    try {
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      musicStarted = true;
    } catch {
      // Браузер может заблокировать автозапуск — попробуем при первом касании.
    }
  }

  if (audio) {
    audio.addEventListener("canplaythrough", startMusic, { once: true });
  }
  startMusic();

  ["touchstart", "pointerdown", "click", "scroll", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, startMusic, { passive: true });
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
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".section, .footer").forEach((el) => observer.observe(el));
})();
