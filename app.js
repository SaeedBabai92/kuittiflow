// app.js
// KuittiFlow – dev branch
// Vastuu: UI-flow + paikallinen tallennus (localStorage). Backend tehdään omassa branchissa.

(function () {
    "use strict";

    // ===== DOM refs =====
    var sections = document.querySelectorAll(".section");
    var navButtons = document.querySelectorAll(".nav button");

    var receiptInput = document.getElementById("receiptPhotoInput");
    var scanBtn = document.getElementById("scanBtn");
    var scanBtnTop = document.getElementById("scanBtnTop");

    var previewCard = document.getElementById("photoPreviewCard");
    var previewImg = document.getElementById("photoPreviewImg");
    var previewMeta = document.getElementById("photoPreviewMeta");

    var receiptList = document.getElementById("receiptList");

    var kpiWeek = document.getElementById("kpiWeek");
    var kpiWeekHint = document.getElementById("kpiWeekHint");
    var kpiMonth = document.getElementById("kpiMonth");
    var kpiMonthHint = document.getElementById("kpiMonthHint");

    var goCompareBtn = document.getElementById("goCompareBtn");
    var resetBtn = document.getElementById("resetBtn");
    var seedBtn = document.getElementById("seedBtn");

    var compareMode = document.getElementById("compareMode");
    var leftLabel = document.getElementById("leftLabel");
    var rightLabel = document.getElementById("rightLabel");
    var leftValue = document.getElementById("leftValue");
    var rightValue = document.getElementById("rightValue");
    var leftHint = document.getElementById("leftHint");
    var rightHint = document.getElementById("rightHint");
    var diffValue = document.getElementById("diffValue");

    var quickModeToggle = document.getElementById("quickModeToggle");

    // ===== Storage keys =====
    var STORAGE_RECEIPTS = "kuittiflow.receipts.v1";
    var STORAGE_QUICKMODE = "kuittiflow.quickMode.v1";

    // ===== State =====
    var state = {
        compareMode: "week",
        quickMode: true
    };

    // ===== Helpers =====
    function euro(amount) {
        // amount in number
        var fixed = (Math.round(amount * 100) / 100).toFixed(2);
        // Finnish formatting: decimal comma
        return fixed.replace(".", ",") + " €";
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function loadReceipts() {
        try {
            var raw = localStorage.getItem(STORAGE_RECEIPTS);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveReceipts(list) {
        localStorage.setItem(STORAGE_RECEIPTS, JSON.stringify(list));
    }

    function getWeekStart(d) {
        // Monday as start of week (ISO-ish)
        var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var day = date.getDay(); // 0=Sun ... 6=Sat
        var diff = (day === 0 ? -6 : 1) - day; // move to Monday
        date.setDate(date.getDate() + diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function isSameWeek(a, b) {
        return getWeekStart(a).getTime() === getWeekStart(b).getTime();
    }

    function isSameMonth(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    }

    function showSection(targetId) {
        for (var i = 0; i < sections.length; i++) {
            var s = sections[i];
            s.classList.toggle("active", s.id === targetId);
        }
        for (var j = 0; j < navButtons.length; j++) {
            var btn = navButtons[j];
            btn.classList.toggle("active", btn.dataset.target === targetId);
        }
    }

    function setToggle(el, on) {
        if (!el) return;
        el.classList.toggle("on", !!on);
    }

    // ===== Render =====
    function renderReceiptList(receipts) {
        if (!receiptList) return;

        if (!receipts.length) {
            receiptList.innerHTML = '<div class="muted">Ei kuitteja. Paina “Skannaa kuitti (kamera)”.</div>';
            return;
        }

        var html = "";
        for (var i = 0; i < receipts.length; i++) {
            var r = receipts[i];
            var dt = new Date(r.createdAt);
            var dateStr = dt.toLocaleDateString("fi-FI");
            html +=
                '<div class="row">' +
                '  <div class="left">' +
                '    <div class="shop">' + escapeHtml(r.merchant) + '</div>' +
                '    <div class="date">' + dateStr + '</div>' +
                '  </div>' +
                '  <div class="amount">' + euro(r.amount) + '</div>' +
                '</div>';
        }
        receiptList.innerHTML = html;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderKpis(receipts) {
        var today = new Date();

        var weekSum = 0, weekCount = 0;
        var monthSum = 0, monthCount = 0;

        for (var i = 0; i < receipts.length; i++) {
            var r = receipts[i];
            var dt = new Date(r.createdAt);

            if (isSameWeek(dt, today)) {
                weekSum += r.amount;
                weekCount++;
            }
            if (isSameMonth(dt, today)) {
                monthSum += r.amount;
                monthCount++;
            }
        }

        if (kpiWeek) kpiWeek.textContent = euro(weekSum);
        if (kpiWeekHint) kpiWeekHint.textContent = weekCount + " kuittia";

        if (kpiMonth) kpiMonth.textContent = euro(monthSum);
        if (kpiMonthHint) kpiMonthHint.textContent = monthCount + " kuittia";
    }

    function renderCompare(receipts) {
        // Tässä branchissa pidetään vertailu yksinkertaisena:
        // A = edellinen jakso, B = nykyinen jakso.
        var today = new Date();

        var aStart, bStart;
        var aEnd, bEnd;

        if (state.compareMode === "week") {
            bStart = getWeekStart(today);
            aStart = new Date(bStart.getTime());
            aStart.setDate(aStart.getDate() - 7);

            bEnd = new Date(bStart.getTime()); bEnd.setDate(bEnd.getDate() + 7);
            aEnd = new Date(aStart.getTime()); aEnd.setDate(aEnd.getDate() + 7);

            if (leftLabel) leftLabel.textContent = "Edellinen viikko";
            if (rightLabel) rightLabel.textContent = "Tämä viikko";
        } else {
            // month
            bStart = new Date(today.getFullYear(), today.getMonth(), 1);
            aStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

            bEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            aEnd = new Date(today.getFullYear(), today.getMonth(), 1);

            if (leftLabel) leftLabel.textContent = "Edellinen kuukausi";
            if (rightLabel) rightLabel.textContent = "Tämä kuukausi";
        }

        var aSum = 0, aCount = 0;
        var bSum = 0, bCount = 0;

        for (var i = 0; i < receipts.length; i++) {
            var r = receipts[i];
            var dt = new Date(r.createdAt);

            if (dt >= aStart && dt < aEnd) { aSum += r.amount; aCount++; }
            if (dt >= bStart && dt < bEnd) { bSum += r.amount; bCount++; }
        }

        if (leftValue) leftValue.textContent = euro(aSum);
        if (rightValue) rightValue.textContent = euro(bSum);
        if (leftHint) leftHint.textContent = aCount + " kuittia";
        if (rightHint) rightHint.textContent = bCount + " kuittia";

        var diff = bSum - aSum;
        if (diffValue) diffValue.textContent = euro(diff);
    }

    function renderAll() {
        var receipts = loadReceipts();
        // newest first
        receipts.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        receipts = receipts.slice(0, 10);

        renderKpis(receipts);
        renderReceiptList(receipts);
        renderCompare(receipts);
    }

    // ===== Actions =====
    function openCamera() {
        if (!receiptInput) return;
        receiptInput.click();
    }

    function addReceiptFromPhoto(dataUrl) {
        // Tässä branchissa emme tee OCR:ää, joten luodaan placeholder kuitti.
        // Merchant + amount voidaan myöhemmin korvata OCR-tuloksilla.
        var receipts = loadReceipts();

        var newReceipt = {
            id: "r_" + Date.now(),
            createdAt: nowIso(),
            merchant: "Tuntematon kauppa",
            amount: 0.00,
            photoDataUrl: dataUrl
        };

        receipts.push(newReceipt);
        saveReceipts(receipts);

        // Preview UI
        if (previewImg) previewImg.src = dataUrl;
        if (previewMeta) {
            previewMeta.textContent =
                "Tallennettu: " +
                new Date(newReceipt.createdAt).toLocaleDateString("fi-FI") +
                " · Summa 0,00 € (OCR myöhemmin)";
        }
        if (previewCard) previewCard.style.display = "block";

        renderAll();

        // Quick mode: pysy etusivulla (default), muuten voisi hypätä vertailuun
        if (!state.quickMode) {
            showSection("compare");
        }
    }

    function resetAll() {
        localStorage.removeItem(STORAGE_RECEIPTS);
        if (previewCard) previewCard.style.display = "none";
        renderAll();
    }

    function seedDemo() {
        var receipts = loadReceipts();
        var base = new Date();

        function push(daysAgo, amount, merchant) {
            var d = new Date(base.getTime());
            d.setDate(d.getDate() - daysAgo);
            receipts.push({
                id: "seed_" + Date.now() + "_" + daysAgo,
                createdAt: d.toISOString(),
                merchant: merchant,
                amount: amount,
                photoDataUrl: null
            });
        }

        push(1, 12.40, "K-Market");
        push(2, 5.90, "Lidl");
        push(4, 27.10, "Prisma");
        push(9, 8.25, "Alepa");
        push(16, 44.80, "Tokmanni");

        saveReceipts(receipts);
        renderAll();
    }

    // ===== Wire up events =====
    for (var i = 0; i < navButtons.length; i++) {
        navButtons[i].addEventListener("click", function () {
            showSection(this.dataset.target);
        });
    }

    if (goCompareBtn) {
        goCompareBtn.addEventListener("click", function () {
            showSection("compare");
        });
    }

    if (scanBtn) scanBtn.addEventListener("click", openCamera);
    if (scanBtnTop) scanBtnTop.addEventListener("click", openCamera);

    if (receiptInput) {
        receiptInput.addEventListener("change", function () {
            var file = this.files && this.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (e) {
                addReceiptFromPhoto(e.target.result);
            };
            reader.readAsDataURL(file);

            // mahdollistaa saman kuvan valinnan uudelleen
            receiptInput.value = "";
        });
    }

    if (resetBtn) resetBtn.addEventListener("click", resetAll);
    if (seedBtn) seedBtn.addEventListener("click", seedDemo);

    // Compare pills
    if (compareMode) {
        compareMode.addEventListener("click", function (e) {
            var target = e.target;
            if (!target || !target.classList.contains("pill")) return;

            var mode = target.getAttribute("data-mode");
            if (mode !== "week" && mode !== "month") return;

            state.compareMode = mode;

            var pills = compareMode.querySelectorAll(".pill");
            for (var k = 0; k < pills.length; k++) {
                pills[k].classList.toggle("active", pills[k].getAttribute("data-mode") === mode);
            }

            renderAll();
        });
    }

    // Quick mode toggle
    try {
        var savedQuick = localStorage.getItem(STORAGE_QUICKMODE);
        if (savedQuick === "0") state.quickMode = false;
    } catch (e) { /* ignore */ }
    setToggle(quickModeToggle, state.quickMode);

    if (quickModeToggle) {
        quickModeToggle.addEventListener("click", function () {
            state.quickMode = !state.quickMode;
            setToggle(quickModeToggle, state.quickMode);
            localStorage.setItem(STORAGE_QUICKMODE, state.quickMode ? "1" : "0");
        });
    }

    // ===== Init =====
    showSection("home");
    renderAll();

})();
