// app.js
// KuittiMVP – dev branch
// Vastuu: näkymien vaihto + perusrakenne

(function () {
    "use strict";

    const sections = document.querySelectorAll(".section");
    const navButtons = document.querySelectorAll(".nav button");

    function showSection(targetId) {
        sections.forEach(section => {
            section.classList.toggle("active", section.id === targetId);
        });

        navButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.target === targetId);
        });
    }

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const target = button.dataset.target;
            showSection(target);
        });
    });

    // Default view
    showSection("home");

})();
