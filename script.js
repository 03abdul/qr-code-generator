// Use UTF-8 so non-ASCII text encodes correctly.
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

const $ = (sel) => document.querySelector(sel);
const form = $("#form");
const canvas = $("#canvas");
const result = $("#result");
const errorBox = $("#error");
const statusBox = $("#status");

let mode = "url";
let current = null; // { qr, fg, bg }

/* ---------- Input normalization ---------- */

// Turn "amazon.com" into "https://amazon.com"; leave other text/schemes alone.
function normalizeText(input) {
    const text = input.trim();
    if (!text) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/\s]+\.[a-z]{2,}:\d+/i.test(text)) {
        return text; // already has a scheme (http:, mailto:, tel:, ...)
    }
    if (/^(www\.)?[^\s/@]+\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(text)) {
        return "https://" + text;
    }
    return text;
}

function escapeWifi(s) {
    return s.replace(/([\\;,:"])/g, "\\$1");
}

function buildPayload() {
    if (mode === "wifi") {
        const ssid = $("#ssid").value;
        if (!ssid) return { error: "Please enter the network name." };
        const sec = $("#wifisec").value;
        const pass = $("#wifipass").value;
        if (sec !== "nopass" && !pass) return { error: "Please enter the password." };
        const p = sec === "nopass" ? "" : `P:${escapeWifi(pass)};`;
        return { text: `WIFI:T:${sec};S:${escapeWifi(ssid)};${p};` };
    }
    const text = normalizeText($("#textfield").value);
    if (!text) return { error: "Please enter a web address or some text." };
    return { text };
}

/* ---------- Rendering ---------- */

function render(text) {
    const qr = qrcode(0, $("#ecl").value);
    qr.addData(text);
    qr.make();
    current = { qr, fg: $("#fg").value, bg: $("#bg").value };
    drawCanvas(canvas, qr, current.fg, current.bg, 240);
}

function drawCanvas(cv, qr, fg, bg, size) {
    const n = qr.getModuleCount();
    const margin = 4; // quiet zone, in modules
    const cell = Math.max(1, Math.floor(size / (n + margin * 2)));
    const px = cell * (n + margin * 2);
    cv.width = cv.height = px;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = fg;
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
    }
}

function svgString({ qr, fg, bg }) {
    const n = qr.getModuleCount();
    const m = 4;
    const size = n + m * 2;
    let d = "";
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
        `<rect width="${size}" height="${size}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}

/* ---------- UI helpers ---------- */

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
}

let statusTimer;
function setStatus(message, persist) {
    statusBox.textContent = message;
    clearTimeout(statusTimer);
    if (!persist) statusTimer = setTimeout(() => (statusBox.textContent = contrastWarning()), 2500);
}

function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Events ---------- */

// WCAG-style contrast ratio between two #rrggbb colors.
function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastWarning() {
    const a = luminance($("#fg").value);
    const b = luminance($("#bg").value);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 3) return "Low contrast: this code may not scan. Pick a darker color on a lighter background.";
    if (a > b) return "Light-on-dark codes don't scan with some apps. Test before using.";
    return "";
}

// quiet = live preview: don't show "empty input" errors while typing.
function generate(quiet) {
    const { text, error } = buildPayload();
    if (error) {
        result.hidden = true;
        showError(quiet ? "" : error);
        return;
    }
    showError("");
    try {
        render(text);
        result.hidden = false;
        setStatus(contrastWarning(), true);
        try { localStorage.setItem("qr-last", $("#textfield").value); } catch {}
    } catch {
        result.hidden = true;
        showError("That's too long to fit in a QR code. Try shorter text or lower error correction.");
    }
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    generate(false);
});

// Live preview, debounced.
let previewTimer;
form.addEventListener("input", () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => generate(true), 250);
});

document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        mode = tab.dataset.mode;
        document.querySelectorAll(".tab").forEach((t) => {
            const on = t === tab;
            t.classList.toggle("active", on);
            t.setAttribute("aria-pressed", on);
        });
        $("#panel-url").hidden = mode !== "url";
        $("#panel-wifi").hidden = mode !== "wifi";
        showError("");
        result.hidden = true;
    });
});

$("#dl-png").addEventListener("click", () => {
    const big = document.createElement("canvas");
    drawCanvas(big, current.qr, current.fg, current.bg, 1000);
    big.toBlob((b) => saveBlob(b, "qr-code.png"));
});

$("#dl-svg").addEventListener("click", () => {
    saveBlob(new Blob([svgString(current)], { type: "image/svg+xml" }), "qr-code.svg");
});

$("#copy").addEventListener("click", async () => {
    try {
        const blob = await new Promise((res) => canvas.toBlob(res));
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("Copied to clipboard");
    } catch {
        setStatus("Copy not supported in this browser");
    }
});

// Restore last input.
try {
    const last = localStorage.getItem("qr-last");
    if (last) {
        $("#textfield").value = last;
        generate(true);
    }
} catch {}
