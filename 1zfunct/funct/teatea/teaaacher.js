const firebaseConfigMain = {
    apiKey: "",
    authDomain: "iamnasirlin.firebaseapp.com",
    databaseURL: "https://iamnasirlin-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "iamnasirlin",
    storageBucket: "iamnasirlin.firebasestorage.app",
    messagingSenderId: "725940977300",
    appId: "1:725940977300:web:698531b7de8af3b5e87e81",
    measurementId: "G-NJ4BQV6DMG"
};

firebase.initializeApp(firebaseConfigMain);

const dbMain = firebase.database();

const auth = firebase.auth();

let dbTeacherQuestion = null;

function getTeacherQuestionDB(email) {
    return dbMain;
}

AOS.init({
    duration: 800,
    easing: "ease-in-out",
    once: true,
    mirror: false
});

const menuToggle = document.getElementById("mobile-menu");

const navLinks = document.getElementById("nav-links");

menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    menuToggle.classList.toggle("active");
    const expanded = menuToggle.classList.contains("active");
    menuToggle.setAttribute("aria-expanded", expanded);
});

document.addEventListener("click", e => {
    if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        menuToggle.classList.remove("active");
        navLinks.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
    }
});

const openAuthBtn = document.getElementById("open-login");

if (openAuthBtn) {
    openAuthBtn.addEventListener("click", () => {
        const provider = new firebase.auth.GoogleAuthProvider;
        auth.signInWithPopup(provider).then(result => {}).catch(error => {
            Swal.fire({
                icon: "error",
                title: "登入失敗",
                text: error.message
            });
        });
    });
}

function setCookie(name, value, expires) {
    const date = new Date(expires);
    const expiresStr = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value}; ${expiresStr}; path=/`;
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(cname) === 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function sanitizeEmail(email) {
    return email.replace(/[.#$/]/g, ",");
}

function setUserSession(email) {
    const expirationTime = (new Date).getTime() + 12 * 60 * 60 * 1e3;
    const sessionData = {
        email: email,
        expiresAt: expirationTime
    };
    const sessionDataStr = JSON.stringify(sessionData);
    localStorage.setItem("loggedInTeacher", sessionDataStr);
    const expirationDate = new Date(expirationTime);
    setCookie("loggedInTeacher", sessionDataStr, expirationDate);
}

function getUserSession() {
    let sessionData = localStorage.getItem("loggedInTeacher");
    if (!sessionData) {
        sessionData = getCookie("loggedInTeacher");
        if (sessionData) {
            localStorage.setItem("loggedInTeacher", sessionData);
        }
    }
    if (!sessionData) return null;
    try {
        const {email: email, expiresAt: expiresAt} = JSON.parse(sessionData);
        const currentTime = (new Date).getTime();
        if (currentTime > expiresAt) {
            clearUserSession();
            return null;
        }
        return email;
    } catch (error) {
        clearUserSession();
        return null;
    }
}

function clearUserSession() {
    localStorage.removeItem("loggedInTeacher");
    deleteCookie("loggedInTeacher");
}

function updateNavLinks(isLoggedIn) {
    const authLinks = document.getElementById("auth-links");
    const openAuthBtn = document.getElementById("open-login");
    if (isLoggedIn) {
        authLinks.style.display = "flex";
        openAuthBtn.style.display = "none";
    } else {
        authLinks.style.display = "none";
        openAuthBtn.style.display = "block";
    }
}

const logoutBtn = document.getElementById("logout");

logoutBtn.addEventListener("click", e => {
    e.preventDefault();
    auth.signOut().then(() => {
        Swal.fire({
            icon: "success",
            title: "已登出",
            showConfirmButton: false,
            timer: 1500,
            zIndex: 3e3
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const loadingOverlay = document.getElementById("loading-overlay");
    const cachedEmail = getUserSession();
    if (cachedEmail) {
        dbTeacherQuestion = getTeacherQuestionDB(cachedEmail);
        updateNavLinks(true);
        document.getElementById("home").style.display = "none";
        document.getElementById("adminContent").style.display = "block";
        showQuestionBankPage();
    }
    auth.onAuthStateChanged(user => {
        if (user) {
            const email = user.email;
            setUserSession(email);
            dbTeacherQuestion = getTeacherQuestionDB(email);
            updateNavLinks(true);
            document.getElementById("home").style.display = "none";
            document.getElementById("adminContent").style.display = "block";
            const sEmail = sanitizeEmail(email);
            dbMain.ref("1zTeStsys/Teacheraccount/" + sEmail).once("value").then(snap => {
                if (!snap.exists()) {
                    dbMain.ref("1zTeStsys/Teacheraccount/" + sEmail).set({
                        email: email
                    });
                }
            });
            if (!cachedEmail) {
                showQuestionBankPage();
            }
        } else {
            clearUserSession();
            updateNavLinks(false);
            document.getElementById("home").style.display = "flex";
            document.getElementById("adminContent").style.display = "none";
        }
        if (loadingOverlay) {
            setTimeout(() => {
                loadingOverlay.style.opacity = "0";
                setTimeout(() => {
                    loadingOverlay.style.display = "none";
                }, 300);
            }, cachedEmail ? 50 : 300);
        }
    });
});

const questionBankLink = document.getElementById("question-bank");

const scoreManagementLink = document.getElementById("score-management");

const csvConverterLink = document.getElementById("csv-converter");

questionBankLink.addEventListener("click", e => {
    e.preventDefault();
    showQuestionBankPage();
});

scoreManagementLink.addEventListener("click", e => {
    e.preventDefault();
    showScoreManagementPage();
});

csvConverterLink.addEventListener("click", e => {
    e.preventDefault();
    showCSVConverterSection();
});

function showQuestionBankPage() {
    document.getElementById("chapter-management-section").style.display = "block";
    document.getElementById("question-bank-section").style.display = "block";
    document.getElementById("score-management-section").style.display = "none";
    document.getElementById("csvGeneratorSection").style.display = "none";
    loadChapters().then(() => {
        mergeChaptersData();
        renderChaptersTable(chaptersData);
        renderChapterSelect(mergedChaptersData);
        renderScoreChapterFilter(mergedChaptersData);
    });
}

function showScoreManagementPage() {
    document.getElementById("chapter-management-section").style.display = "none";
    document.getElementById("question-bank-section").style.display = "none";
    document.getElementById("csvGeneratorSection").style.display = "none";
    document.getElementById("score-management-section").style.display = "block";
    loadScores();
}

function showCSVConverterSection() {
    document.getElementById("chapter-management-section").style.display = "none";
    document.getElementById("question-bank-section").style.display = "none";
    document.getElementById("score-management-section").style.display = "none";
    document.getElementById("csvGeneratorSection").style.display = "block";
}

function backToMenu() {
    showQuestionBankPage();
}

let questionsCache = {};

window.questionCache = {};

function parseCSV(csvText) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        if (insideQuotes) {
            if (char === '"') {
                if (csvText[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    insideQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
            } else if (char === ",") {
                row.push(field);
                field = "";
            } else if (char === "\n") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            } else if (char === "\r") {} else {
                field += char;
            }
        }
    }
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function downloadTemplate() {
    let csv = "題目,A,B,C,D,複選,答案,詳解\n";
    csv += "範例題目,選項A,選項B,選項C,選項D,0,A,範例詳解\n";
    csv += "複選範例,選項A,選項B,選項C,選項D,1,A/C,複選詳解\n";
    csv = "\ufeff" + csv;
    const blob = new Blob([ csv ], {
        type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "批次匯入題目範本.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openBatchImportModal() {
    const chId = document.getElementById("chapterSelect").value;
    if (!chId) {
        Swal.fire({
            icon: "warning",
            title: "請先選擇章節",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    document.getElementById("csvFileInput").value = "";
    const modal = new bootstrap.Modal(document.getElementById("batchImportModal"));
    modal.show();
}

document.getElementById("batchImportForm").addEventListener("submit", e => {
    e.preventDefault();
    const file = document.getElementById("csvFileInput").files[0];
    if (!file) {
        Swal.fire({
            icon: "warning",
            title: "請選擇 CSV 檔案",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    const reader = new FileReader;
    reader.onload = ev => {
        parseCSVAndImport(ev.target.result);
    };
    reader.readAsText(file, "UTF-8");
});

function parseCSVAndImport(csvData) {
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
    const chId = document.getElementById("chapterSelect").value;
    if (!chId) return;
    const sEmail = sanitizeEmail(user);
    let rows = parseCSV(csvData);
    if (rows.length > 0) {
        const headerRow = rows[0].map(cell => cell.trim());
        if (headerRow.includes("題目") && headerRow.includes("複選")) {
            rows.shift();
        }
    }
    const importPromises = [];
    const refPath = dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters/${chId}/questions`);
    rows.forEach(cols => {
        if (cols.length < 7) return;
        const question = (cols[0] || "").trim();
        const A = (cols[1] || "").trim();
        const B = (cols[2] || "").trim();
        const C = (cols[3] || "").trim();
        const D = (cols[4] || "").trim();
        const multiRaw = (cols[5] || "").trim().toUpperCase();
        const ansRaw = (cols[6] || "").trim();
        const explanation = (cols[7] || "").trim() || "";
        if (!question || !A || !B || !ansRaw) {
            return;
        }
        let isMulti = false;
        if (multiRaw === "1" || multiRaw === "Y") {
            isMulti = true;
        }
        let answer;
        if (isMulti) {
            answer = ansRaw.split("/").map(a => a.trim()).filter(x => x);
            if (answer.length === 0) return;
        } else {
            answer = ansRaw;
        }
        const newQ = {
            question: question,
            A: A,
            B: B,
            C: C,
            D: D,
            answer: answer,
            explanation: explanation
        };
        importPromises.push(refPath.push(newQ));
    });
    Promise.all(importPromises).then(() => {
        Swal.fire({
            icon: "success",
            title: `成功匯入 ${importPromises.length} 筆題目！`
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById("batchImportModal")).hide();
            delete questionsCache[chId];
            loadQuestions();
        });
    }).catch(err => {
        console.error("批次匯入題目失敗:", err);
        Swal.fire({
            icon: "error",
            title: "批次匯入失敗",
            text: err.message,
            timer: 2e3,
            showConfirmButton: false
        });
    });
}

const encodedSrc = "dGVhY2NhaS5qcw==";

const scriptSrc = atob(encodedSrc);

const script = document.createElement("script");

script.src = scriptSrc;

document.body.appendChild(script);

function detectDevTools() {
    const threshold = 160;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
        const isDevToolsOpen = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
        if (isDevToolsOpen) {
            window.location.href = "about:blank";
        }
    }
}

document.addEventListener("keydown", e => {
    if (e.key === "F12") {
        e.preventDefault();
        window.location.href = "about:blank";
    }
});

document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "info",
                title: "專心測驗",
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
});

setInterval(detectDevTools, 50);