const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");

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

const detail = {
  title: document.getElementById("detail-title"),
  company: document.getElementById("detail-company"),
  location: document.getElementById("detail-location"),
  pay: document.getElementById("detail-pay"),
  summary: document.getElementById("detail-summary"),
  bullets: document.getElementById("detail-bullets"),
};

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

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
  });
});

if (saveButton) {
  saveButton.addEventListener("click", () => {
    const active = saveButton.classList.toggle("active");
    saveButton.textContent = active ? "Saved" : "Save";
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
