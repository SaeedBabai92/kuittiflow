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
    // ===== Scan flow (camera -> preview) =====

    const receiptInput = document.getElementById("receiptPhotoInput");
    const scanBtn = document.getElementById("scanBtn");
    const scanBtnTop = document.getElementById("scanBtnTop");

    const previewCard = document.getElementById("photoPreviewCard");
    const previewImg = document.getElementById("photoPreviewImg");
    const previewMeta = document.getElementById("photoPreviewMeta");

    // Avaa kamera (file input)
    function openCamera() {
        receiptInput.click();
    }

    scanBtn.addEventListener("click", openCamera);
    scanBtnTop.addEventListener("click", openCamera);

    // Kun kuva on valittu
    receiptInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (e) {
            previewImg.src = e.target.result;
            previewMeta.textContent =
                "Skannattu: " +
                new Date().toLocaleDateString("fi-FI") +
                " · Summa lisätään myöhemmin";

            previewCard.style.display = "block";
        };

        reader.readAsDataURL(file);
    });

})();

