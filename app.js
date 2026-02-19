const reactionButtons = document.querySelectorAll("[data-react]");

reactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const count = button.querySelector("span");
    const current = Number(count?.textContent ?? "0");
    const active = button.classList.toggle("active");
    if (count) count.textContent = String(active ? current + 1 : current - 1);
  });
});
