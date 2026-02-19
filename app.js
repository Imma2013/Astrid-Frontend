const reactionButtons = document.querySelectorAll("[data-react]");
const followButton = document.querySelector("[data-follow]");

reactionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const count = button.querySelector("span");
    const current = Number(count?.textContent ?? "0");
    const active = button.classList.toggle("active");
    if (count) count.textContent = String(active ? current + 1 : current - 1);
  });
});

if (followButton) {
  followButton.addEventListener("click", () => {
    const active = followButton.classList.toggle("active");
    followButton.textContent = active ? "Following" : "Follow";
  });
}