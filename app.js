const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");
const storageKey = "astrid_saved_jobs";

const activateTab = (tabName) => {
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tab === tabName);
  });

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabName);
  });
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.tabTarget;
    if (target) activateTab(target);
  });
});

const cards = document.querySelectorAll(".job-card");
const saveButton = document.querySelector("[data-save]");
const savedJobsList = document.getElementById("saved-jobs-list");
const savedJobsMap = new Map();
let activeJobId = "";

try {
  const raw = localStorage.getItem(storageKey);
  const parsed = raw ? JSON.parse(raw) : [];
  parsed.forEach((item) => savedJobsMap.set(item.id, item));
} catch (_err) {
  // ignore storage parsing issues
}

const detail = {
  title: document.getElementById("detail-title"),
  company: document.getElementById("detail-company"),
  location: document.getElementById("detail-location"),
  pay: document.getElementById("detail-pay"),
  summary: document.getElementById("detail-summary"),
  bullets: document.getElementById("detail-bullets"),
};

const persistSavedJobs = () => {
  localStorage.setItem(storageKey, JSON.stringify(Array.from(savedJobsMap.values())));
};

const renderSavedJobs = () => {
  if (!savedJobsList) return;
  savedJobsList.innerHTML = "";

  const items = Array.from(savedJobsMap.values()).reverse();
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "saved-empty";
    empty.textContent = "No saved jobs yet.";
    savedJobsList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.title}</strong><span>${item.company} · ${item.location}</span>`;
    savedJobsList.appendChild(li);
  });
};

const refreshSaveButtonState = () => {
  if (!saveButton || !activeJobId) return;
  const isSaved = savedJobsMap.has(activeJobId);
  saveButton.classList.toggle("active", isSaved);
  saveButton.textContent = isSaved ? "Saved" : "Save";
};

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
    activeJobId = card.dataset.title || "";

    detail.title.textContent = card.dataset.title || "";
    detail.company.textContent = card.dataset.company || "";
    detail.location.textContent = card.dataset.location || "";
    detail.pay.textContent = card.dataset.pay || "";
    detail.summary.textContent = card.dataset.summary || "";

    const bullets = (card.dataset.bullets || "").split("|").filter(Boolean);
    detail.bullets.innerHTML = "";
    bullets.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      detail.bullets.appendChild(li);
    });

    refreshSaveButtonState();
  });
});

if (saveButton) {
  saveButton.addEventListener("click", () => {
    if (!activeJobId) return;

    if (savedJobsMap.has(activeJobId)) {
      savedJobsMap.delete(activeJobId);
    } else {
      savedJobsMap.set(activeJobId, {
        id: activeJobId,
        title: detail.title.textContent || "",
        company: detail.company.textContent || "",
        location: detail.location.textContent || "",
      });
    }

    persistSavedJobs();
    renderSavedJobs();
    refreshSaveButtonState();
  });
}

const markReadButton = document.querySelector("[data-mark-read]");

if (markReadButton) {
  markReadButton.addEventListener("click", () => {
    document.querySelectorAll(".notice.unread").forEach((item) => {
      item.classList.remove("unread");
    });
  });
}

const selectedCard = document.querySelector(".job-card.active");
if (selectedCard) {
  activeJobId = selectedCard.dataset.title || "";
}
renderSavedJobs();
refreshSaveButtonState();
