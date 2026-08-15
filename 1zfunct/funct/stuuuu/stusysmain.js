AOS.init({
    duration: 800,
    easing: "ease-in-out",
    once: true,
    mirror: false
});

const mainFirebaseConfig = {
    apiKey: "",
    authDomain: "iamnasirlin.firebaseapp.com",
    databaseURL: "https://iamnasirlin-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "iamnasirlin",
    storageBucket: "iamnasirlin.firebasestorage.app",
    messagingSenderId: "725940977300",
    appId: "1:725940977300:web:698531b7de8af3b5e87e81",
    measurementId: "G-NJ4BQV6DMG"
};

if (typeof Logger === "undefined") {
    console.log("日誌系統未載入");
    window.Logger = {
        setUser: function() {},
        clearUser: function() {},
        log: function() {},
        logRegisterAttempt: function() {},
        logLoginFail: function() {},
        logTeacherSearch: function() {},
        logQuizStart: function() {},
        logQuizSubmit: function() {}
    };
}

const mainApp = firebase.initializeApp(mainFirebaseConfig);

const mainDB = firebase.database(mainApp);

const db = mainDB;

const auth = firebase.auth();

let selectedTeacher = "";

const menuToggle = document.getElementById("mobile-menu");

const navLinks = document.getElementById("nav-links");

const openAuthBtn = document.getElementById("open-login");

const errorMessageDiv = document.getElementById("error-message");

const authLinks = document.getElementById("auth-links");

const editProfileLink = document.getElementById("edit-profile-link");

const logoutBtn = document.getElementById("logout");

const openEditProfileBtn = document.getElementById("open-edit-profile");

const editProfileModal = document.getElementById("editProfileModal");

const closeEditProfileBtn = document.getElementById("close-edit-profile");

const editErrorDiv = document.getElementById("edit-error-message");

const editProfileForm = document.getElementById("editProfileForm");

const teacherEmailInput = document.getElementById("teacherEmailInput");

const loadQuizBtn = document.getElementById("loadQuizBtn");

const chapterSelectContainer = document.getElementById("chapterSelectContainer");

const chapterSelect = document.getElementById("chapterSelect");

const quizSectionQuestions = document.getElementById("quiz-section-questions");

const timerDisplayQ = document.getElementById("timerQ");

const questionCountQ = document.getElementById("questionCountQ");

const progressBarFillQ = document.getElementById("progressBarFillQ");

const allQuestionsContainer = document.getElementById("allQuestionsContainer");

const submitAllQuestionsBtn = document.getElementById("submitAllQuestionsBtn");

const quizSectionVocab = document.getElementById("quiz-section-vocab");

const timerDisplayV = document.getElementById("timerV");

const questionCountV = document.getElementById("questionCountV");

const progressBarFillV = document.getElementById("progressBarFillV");

const singleVocabQuestionContainer = document.getElementById("singleVocabQuestionContainer");

const nextVocabQuestionBtn = document.getElementById("nextVocabQuestionBtn");

const submitVocabQuizBtn = document.getElementById("submitVocabQuizBtn");

const resultSection = document.getElementById("result-section");

const scoreDisplay = document.getElementById("scoreDisplay");

const reviewContainer = document.getElementById("review-container");

const elements = {
    home: document.getElementById("home"),
    loggedIn: document.getElementById("logged-in"),
    userName: document.getElementById("user-name")
};

function showMainSection(sectionToShow) {
    if (sectionToShow === "home") {
        elements.home.style.display = "flex";
        elements.loggedIn.style.display = "none";
    } else if (sectionToShow === "loggedIn") {
        elements.home.style.display = "none";
        elements.loggedIn.style.display = "block";
    }
}

function showQuizSection(sectionToShow) {
    quizSectionQuestions.style.display = "none";
    quizSectionVocab.style.display = "none";
    resultSection.style.display = "none";
    if (sectionToShow === "quizQuestions") {
        quizSectionQuestions.style.display = "block";
    } else if (sectionToShow === "quizVocab") {
        quizSectionVocab.style.display = "block";
    } else if (sectionToShow === "result") {
        resultSection.style.display = "block";
    }
}

function hideAllQuizSections() {
    quizSectionQuestions.style.display = "none";
    quizSectionVocab.style.display = "none";
    resultSection.style.display = "none";
}

function resetQuizState() {
    hideAllQuizSections();
}

let chaptersData = [];

let allQuestions = [];

let generalTimer = null;

let generalSeconds = 0;

let vocabTimer = null;

let vocabSeconds = 0;

let currentVocabIndex = 0;

let userAnswersVocab = [];

let hasSubmitted = false;

let isRetryMode = false;

document.addEventListener("DOMContentLoaded", () => {
    const loadingOverlay = document.getElementById("loading-overlay");
    const cachedEmail = getUserSession();
    if (cachedEmail) {
        updateNavLinks(true);
        showMainSection("loggedIn");
        elements.userName.textContent = "載入中...";
    }
    auth.onAuthStateChanged(user => {
        if (user) {
            const email = user.email;
            setUserSession(email);
            updateNavLinks(true);
            showMainSection("loggedIn");
            const sanitizedEmail = sanitizeEmail(email);
            db.ref(`1zTeStsys/Studentaccount/${sanitizedEmail}`).once("value").then(snap => {
                if (!snap.exists()) {
                    db.ref(`1zTeStsys/Studentaccount/${sanitizedEmail}`).set({
                        email: email,
                        stunum: "",
                        name: ""
                    });
                    promptEditProfile();
                } else {
                    const userData = snap.val();
                    elements.userName.textContent = userData.name || "學生";
                    if (!userData.stunum || !userData.name) {
                        promptEditProfile();
                    }
                }
            });
        } else {
            clearUserSession();
            updateNavLinks(false);
            showMainSection("home");
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
    const savedTeacherEmail = localStorage.getItem("teacherEmail");
    if (savedTeacherEmail) {
        document.getElementById("teacherEmailInput").value = savedTeacherEmail;
    }
});

function promptEditProfile() {
    Swal.fire({
        icon: "warning",
        title: "完善個人資料",
        text: "請填寫您的學號和姓名以完成註冊。",
        confirmButtonText: "前往完善",
        allowOutsideClick: false
    }).then(() => {
        openEditProfileModal();
    });
}

menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    menuToggle.classList.toggle("active");
    const expanded = menuToggle.classList.contains("active");
    menuToggle.setAttribute("aria-expanded", expanded);
});

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

window.addEventListener("click", e => {
    if (e.target === editProfileModal) {
        closeEditProfile();
    }
});

function sanitizeEmail(email) {
    return email.replace(/[.#$/]/g, ",");
}

function setUserSession(email) {
    localStorage.setItem("loggedInUser", email);
}

function getUserSession() {
    return localStorage.getItem("loggedInUser");
}

function clearUserSession() {
    localStorage.removeItem("loggedInUser");
}

function updateNavLinks(isLoggedIn) {
    if (isLoggedIn) {
        authLinks.style.display = "flex";
        editProfileLink.style.display = "block";
    } else {
        authLinks.style.display = "none";
        editProfileLink.style.display = "none";
    }
}

logoutBtn.addEventListener("click", e => {
    e.preventDefault();
    Swal.fire({
        title: "確定要登出嗎？",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "是的，登出",
        cancelButtonText: "取消"
    }).then(result => {
        if (result.isConfirmed) {
            auth.signOut().then(() => {
                Swal.fire({
                    icon: "success",
                    title: "已登出",
                    showConfirmButton: false,
                    timer: 1500
                });
            });
        }
    });
});

openEditProfileBtn.addEventListener("click", e => {
    e.preventDefault();
    openEditProfileModal();
});

function openEditProfileModal() {
    const userEmail = getUserSession();
    if (!userEmail) return;
    editErrorDiv.innerHTML = "";
    editProfileForm.reset();
    const sanitizedEmail = sanitizeEmail(userEmail);
    db.ref(`1zTeStsys/Studentaccount/${sanitizedEmail}/stunum`).once("value").then(snapshot => {
        if (snapshot.exists()) {
            document.getElementById("edit-stunum").value = snapshot.val();
        }
    });
    db.ref(`1zTeStsys/Studentaccount/${sanitizedEmail}/name`).once("value").then(snapshot => {
        if (snapshot.exists()) {
            document.getElementById("edit-name").value = snapshot.val();
        }
    });
    editProfileModal.style.display = "flex";
    editProfileModal.setAttribute("aria-hidden", "false");
}

function closeEditProfile() {
    editProfileModal.style.display = "none";
    editProfileModal.setAttribute("aria-hidden", "true");
}

closeEditProfileBtn.addEventListener("click", closeEditProfile);

editProfileForm.addEventListener("submit", e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const email = user.email;
    const sanitizedEmail = sanitizeEmail(email);
    const newPassword = (document.getElementById("edit-password")?.value || "").trim();
    const newStunum = document.getElementById("edit-stunum").value.trim();
    const newName = document.getElementById("edit-name").value.trim();
    if (!newStunum) {
        editErrorDiv.innerHTML = "學生學號不可為空！";
        return;
    }
    if (!newName) {
        editErrorDiv.innerHTML = "學生姓名不可為空！";
        return;
    }
    const updates = [];
    const accountPromise = db.ref(`1zTeStsys/Studentaccount/${sanitizedEmail}`).update({
        stunum: newStunum,
        name: newName
    });
    updates.push(accountPromise);
    if (newPassword) {
        updates.push(user.updatePassword(newPassword));
    }
    Promise.all(updates).then(() => {
        Swal.fire({
            icon: "success",
            title: "資料已更新",
            showConfirmButton: false,
            timer: 1500
        }).then(() => {
            closeEditProfile();
            document.getElementById("user-name").textContent = newName;
        });
    }).catch(error => {
        editErrorDiv.innerHTML = "更新失敗 (若修改密碼需近期登入過)：" + error.message;
    });
});

loadQuizBtn.addEventListener("click", async e => {
    e.preventDefault();
    const teacherEmail = teacherEmailInput.value.trim().toLowerCase();
    if (!teacherEmail) {
        Swal.fire({
            icon: "warning",
            title: "輸入錯誤",
            text: "請輸入老師的信箱。"
        });
        return;
    }
    Swal.fire({
        title: "我在讀取中ㄛ...",
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    loadQuizBtn.disabled = true;
    try {
        localStorage.setItem("teacherEmail", teacherEmail);
        selectedTeacher = sanitizeEmail(teacherEmail);
        const snapshot = await db.ref(`1zTeStsys/Teacheraccount/${selectedTeacher}`).once("value");
        if (!snapshot.exists()) {
            Swal.fire({
                icon: "error",
                title: "教師不存在",
                text: "找不到老師。"
            });
            return;
        }
        await loadChapters(selectedTeacher);
        Swal.close();
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "錯誤",
            text: "檢查教師帳號失敗。"
        });
    } finally {
        loadQuizBtn.disabled = false;
    }
});

function loadChapters(teacherId) {
    chaptersData = [];
    chapterSelect.innerHTML = '<option value="">-- 選擇章節 --</option>';
    quizSectionQuestions.style.display = "none";
    quizSectionVocab.style.display = "none";
    resultSection.style.display = "none";
    clearInterval(generalTimer);
    clearInterval(vocabTimer);
    timerDisplayQ.textContent = "時長：00:00";
    timerDisplayV.textContent = "時長：00:00";
    progressBarFillQ.style.width = "0%";
    progressBarFillV.style.width = "0%";
    hasSubmitted = false;
    isRetryMode = false;
    const questionPromise = db.ref(`Teacherquestion/${teacherId}/chapters`).once("value").then(snap => {
        const data = snap.val() || {};
        Object.keys(data).forEach(chKey => {
            if (data[chKey].open === true) {
                chaptersData.push({
                    key: chKey,
                    source: "question",
                    name: data[chKey].name
                });
            }
        });
    });
    const vocabPromise = db.ref(`1zTeStsys/Teacheraccount/${teacherId}/TeacherVocabulary/chapters`).once("value").then(snap => {
        const data = snap.val() || {};
        Object.keys(data).forEach(chKey => {
            if (data[chKey].open === true) {
                chaptersData.push({
                    key: chKey,
                    source: "vocabulary",
                    name: data[chKey].name
                });
            }
        });
    });
    Promise.all([ questionPromise, vocabPromise ]).then(() => {
        if (chaptersData.length === 0) {
            Swal.fire({
                icon: "info",
                title: "目前沒有開放測驗的章節"
            });
            return;
        }
        chaptersData.forEach(ch => {
            const opt = document.createElement("option");
            opt.value = ch.source + "|||" + ch.key;
            opt.textContent = ch.name;
            chapterSelect.appendChild(opt);
        });
        chapterSelectContainer.style.display = "flex";
    });
}

chapterSelect.addEventListener("change", () => {
    const val = chapterSelect.value;
    hasSubmitted = false;
    isRetryMode = false;
    if (!val) {
        hideAllQuizSections();
        clearInterval(generalTimer);
        clearInterval(vocabTimer);
        timerDisplayQ.textContent = "時長：00:00";
        timerDisplayV.textContent = "時長：00:00";
        progressBarFillQ.style.width = "0%";
        progressBarFillV.style.width = "0%";
        return;
    }
    const subjectName = chapterSelect.options[chapterSelect.selectedIndex].text;
    const [source, chKey] = val.split("|||");
    loadQuestions(source, chKey);
});

async function loadQuestions(source, chKey) {
    quizSectionQuestions.style.display = "none";
    quizSectionVocab.style.display = "none";
    resultSection.style.display = "none";
    clearInterval(generalTimer);
    clearInterval(vocabTimer);
    timerDisplayQ.textContent = "時長：00:00";
    timerDisplayV.textContent = "時長：00:00";
    progressBarFillQ.style.width = "0%";
    progressBarFillV.style.width = "0%";
    hasSubmitted = false;
    isRetryMode = false;
    allQuestions = [];
    let path, limitPath;
    if (source === "question") {
        path = `Teacherquestion/${selectedTeacher}/chapters/${chKey}/questions`;
        limitPath = `Teacherquestion/${selectedTeacher}/chapters/${chKey}/limit`;
    } else {
        path = `1zTeStsys/Teacheraccount/${selectedTeacher}/TeacherVocabulary/chapters/${chKey}/vocab`;
        limitPath = `1zTeStsys/Teacheraccount/${selectedTeacher}/TeacherVocabulary/chapters/${chKey}/limit`;
    }
    let limit = 0;
    try {
        const limitSnap = await db.ref(limitPath).once("value");
        if (limitSnap.exists()) {
            limit = parseInt(limitSnap.val(), 10) || 0;
        }
    } catch (e) {
        limit = 0;
    }
    try {
        const snap = await db.ref(path).once("value");
        if (!snap.exists()) {
            Swal.fire({
                icon: "info",
                title: "無題目資料",
                text: "此章節目前沒有任何題目。"
            });
            return;
        }
        const data = snap.val();
        const rawArr = [];
        Object.keys(data).forEach(k => rawArr.push(data[k]));
        if (source === "question") {
            rawArr.forEach(q => {
                const optionKeys = Object.keys(q).filter(key => /^[A-Z]$/.test(key));
                const options = optionKeys.map(key => q[key]).filter(opt => opt);
                const correctArr = Array.isArray(q.answer) ? q.answer.map(ansKey => q[ansKey]).filter(ans => ans) : [ q[q.answer] ].filter(ans => ans);
                allQuestions.push({
                    question: q.question,
                    options: options,
                    correctAnswers: correctArr,
                    isMultiple: Array.isArray(q.answer),
                    explanation: q.explanation || ""
                });
            });
            if (limit > 0 && limit < allQuestions.length) {
                shuffleArray(allQuestions);
                allQuestions = allQuestions.slice(0, limit);
            }
            showAllAtOnce();
        } else {
            const allChinese = rawArr.map(x => x.vocchinese).filter(x => x);
            rawArr.forEach(v => {
                const eng = v.voceng;
                const correctC = v.vocchinese;
                let distractors = allChinese.filter(cc => cc !== correctC);
                shuffleArray(distractors);
                distractors = distractors.slice(0, 2);
                const opts = [ correctC, ...distractors ];
                shuffleArray(opts);
                allQuestions.push({
                    question: eng,
                    options: opts,
                    correctAnswers: [ correctC ],
                    isMultiple: false,
                    explanation: v.explanation || ""
                });
            });
            if (limit > 0 && limit < allQuestions.length) {
                shuffleArray(allQuestions);
                allQuestions = allQuestions.slice(0, limit);
            }
            showSingleVocab();
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: "error",
            title: "錯誤",
            text: "載入題目時發生錯誤。"
        });
    }
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [ arr[j], arr[i] ];
    }
}

function formatContent(txt) {
    if (!txt) return "";
    const imgRegex = /(https?:\/\/(?:i\.imgur\.com|i\.meee\.com\.tw)\/\S+)/gi;
    const parts = txt.split(imgRegex);
    let res = "";
    parts.forEach(part => {
        const testRegex = /^https?:\/\/(?:i\.imgur\.com|i\.meee\.com\.tw)\/\S+$/i;
        if (testRegex.test(part)) {
            res += `<img src="${part}" alt="圖片" style="max-width:100%; margin:10px 0;">`;
        } else {
            if (part && part.trim() !== "") {
                res += `<span>${part}</span>`;
            }
        }
    });
    return res;
}

function showAllAtOnce() {
    showQuizSection("quizQuestions");
    allQuestionsContainer.innerHTML = "";
    clearInterval(vocabTimer);
    generalSeconds = 0;
    clearInterval(generalTimer);
    questionCountQ.textContent = `共 ${allQuestions.length} 題`;
    progressBarFillQ.style.width = "0%";
    allQuestions.forEach((q, idx) => {
        const block = document.createElement("div");
        block.classList.add("question-block");
        block.innerHTML = `\n            <div class="q-title">第 ${idx + 1} 題：${formatContent(q.question)}</div>\n            <div class="question-options" data-qindex="${idx}"></div>\n        `;
        const optsDiv = block.querySelector(".question-options");
        q.options.forEach(opt => {
            const label = document.createElement("label");
            if (q.isMultiple) {
                label.innerHTML = `\n                    <input type="checkbox" name="q_${idx}" value="${opt}">\n                    <span>${formatContent(opt)}</span>\n                `;
            } else {
                label.innerHTML = `\n                    <input type="radio" name="q_${idx}" value="${opt}">\n                    <span>${formatContent(opt)}</span>\n                `;
            }
            optsDiv.appendChild(label);
        });
        allQuestionsContainer.appendChild(block);
    });
    const allInputs = allQuestionsContainer.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    allInputs.forEach(input => {
        input.addEventListener("change", () => {
            const questionName = input.name;
            const sameQuestionLabels = allQuestionsContainer.querySelectorAll(`input[name="${questionName}"]`);
            if (input.type === "radio") {
                sameQuestionLabels.forEach(r => {
                    r.parentElement.classList.remove("selected-answer");
                });
                if (input.checked) {
                    input.parentElement.classList.add("selected-answer");
                }
            } else if (input.type === "checkbox") {
                if (input.checked) {
                    input.parentElement.classList.add("selected-answer");
                } else {
                    input.parentElement.classList.remove("selected-answer");
                }
            }
        });
    });
    generalTimer = setInterval(() => {
        generalSeconds++;
        const mm = String(Math.floor(generalSeconds / 60)).padStart(2, "0");
        const ss = String(generalSeconds % 60).padStart(2, "0");
        timerDisplayQ.textContent = `時長：${mm}:${ss}`;
    }, 1e3);
}

submitAllQuestionsBtn.addEventListener("click", () => {
    if (hasSubmitted) {
        Swal.fire({
            icon: "info",
            title: "已提交",
            text: "您已經提交過測驗。"
        });
        return;
    }
    let answered = 0;
    let unanswered = 0;
    allQuestions.forEach((q, idx) => {
        if (q.isMultiple) {
            const checkboxes = document.querySelectorAll(`input[name="q_${idx}"]:checked`);
            if (checkboxes.length > 0) {
                answered++;
            } else {
                unanswered++;
            }
        } else {
            const selected = document.querySelector(`input[name="q_${idx}"]:checked`);
            if (selected) answered++; else unanswered++;
        }
    });
    Swal.fire({
        title: "確定要提交嗎？",
        html: `您已作答 <strong>${answered}</strong> 題，未作答 <strong>${unanswered}</strong> 題。`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "確定提交",
        cancelButtonText: "取消"
    }).then(result => {
        if (result.isConfirmed) {
            clearInterval(generalTimer);
            calculateAllAtOnceResult();
        }
    });
});

function calculateAllAtOnceResult() {
    let correctCount = 0;
    const blocks = allQuestionsContainer.querySelectorAll(".question-block");
    const userAnsArr = [];
    blocks.forEach((blk, i) => {
        const optsDiv = blk.querySelector(".question-options");
        const qindex = parseInt(optsDiv.getAttribute("data-qindex"), 10);
        const qData = allQuestions[qindex];
        if (qData.isMultiple) {
            const checkedBoxes = optsDiv.querySelectorAll(`input[name="q_${qindex}"]:checked`);
            const chosenArr = [];
            checkedBoxes.forEach(c => chosenArr.push(c.value));
            userAnsArr.push(chosenArr);
            if (arraysEqualSet(chosenArr, qData.correctAnswers)) {
                correctCount++;
            }
        } else {
            const radios = optsDiv.querySelectorAll(`input[name="q_${qindex}"]:checked`);
            let chosenVal = null;
            radios.forEach(r => {
                if (r.checked) chosenVal = r.value;
            });
            userAnsArr.push(chosenVal);
            if (chosenVal && qData.correctAnswers.includes(chosenVal)) {
                correctCount++;
            }
        }
    });
    console.log("用戶答案:", userAnsArr);
    console.log("正確數量:", correctCount);
    const score = Math.round(correctCount / allQuestions.length * 100);
    scoreDisplay.innerHTML = `您的分數：<strong>${score}</strong>`;
    generateReview(allQuestions, userAnsArr);
    showQuizSection("result");
    progressBarFillQ.style.width = "100%";
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    if (!isRetryMode) {
        submitScore(score, generalSeconds, "question", userAnsArr);
    }
    hasSubmitted = true;
}

function arraysEqualSet(a, b) {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    if (setA.size !== setB.size) return false;
    for (let val of setA) {
        if (!setB.has(val)) return false;
    }
    return true;
}

function showSingleVocab() {
    showQuizSection("quizVocab");
    singleVocabQuestionContainer.innerHTML = "";
    clearInterval(generalTimer);
    vocabSeconds = 0;
    clearInterval(vocabTimer);
    questionCountV.textContent = `共 ${allQuestions.length} 題`;
    progressBarFillV.style.width = "0%";
    currentVocabIndex = 0;
    userAnswersVocab = Array(allQuestions.length).fill(null);
    vocabTimer = setInterval(() => {
        vocabSeconds++;
        const mm = String(Math.floor(vocabSeconds / 60)).padStart(2, "0");
        const ss = String(vocabSeconds % 60).padStart(2, "0");
        timerDisplayV.textContent = `時長：${mm}:${ss}`;
    }, 1e3);
    renderVocabQuestion(0);
}

function renderVocabQuestion(idx) {
    singleVocabQuestionContainer.innerHTML = "";
    if (idx < 0 || idx >= allQuestions.length) return;
    const qData = allQuestions[idx];
    const qDiv = document.createElement("div");
    qDiv.classList.add("single-question");
    qDiv.innerHTML = `<p>${formatContent(qData.question)}</p>\n        <div class="options"></div>\n    `;
    const optsDiv = qDiv.querySelector(".options");
    qData.options.forEach(opt => {
        const label = document.createElement("label");
        label.innerHTML = `\n            <input type="radio" name="vOption" value="${opt}">\n            <span>${formatContent(opt)}</span>\n        `;
        optsDiv.appendChild(label);
    });
    singleVocabQuestionContainer.appendChild(qDiv);
    const savedAns = userAnswersVocab[idx];
    if (savedAns) {
        const radios = optsDiv.querySelectorAll(`input[name="vOption"][value="${savedAns}"]`);
        radios.forEach(r => {
            if (r.value === savedAns) {
                r.checked = true;
                r.parentElement.classList.add("selected-answer");
            }
        });
    }
    const currentRadioInputs = singleVocabQuestionContainer.querySelectorAll('input[name="vOption"]');
    currentRadioInputs.forEach(radio => {
        radio.addEventListener("change", () => {
            currentRadioInputs.forEach(r => {
                r.parentElement.classList.remove("selected-answer");
            });
            if (radio.checked) {
                radio.parentElement.classList.add("selected-answer");
            }
        });
    });
    const pct = idx / allQuestions.length * 100;
    progressBarFillV.style.width = `${pct}%`;
    if (idx === allQuestions.length - 1) {
        nextVocabQuestionBtn.style.display = "none";
        submitVocabQuizBtn.style.display = "inline-block";
    } else {
        nextVocabQuestionBtn.style.display = "inline-block";
        submitVocabQuizBtn.style.display = "none";
    }
}

nextVocabQuestionBtn.addEventListener("click", () => {
    if (hasSubmitted) {
        Swal.fire({
            icon: "info",
            title: "已提交",
            text: "您已經提交過測驗。"
        });
        return;
    }
    saveVocabAnswer();
    if (currentVocabIndex < allQuestions.length - 1) {
        currentVocabIndex++;
        renderVocabQuestion(currentVocabIndex);
    }
});

submitVocabQuizBtn.addEventListener("click", () => {
    if (hasSubmitted) {
        Swal.fire({
            icon: "info",
            title: "已提交",
            text: "您已經提交過測驗。"
        });
        return;
    }
    let answered = 0;
    let unanswered = 0;
    userAnswersVocab.forEach(ans => {
        if (ans) {
            answered++;
        } else {
            unanswered++;
        }
    });
    Swal.fire({
        title: "確定要提交嗎？",
        html: `您已作答 <strong>${answered}</strong> 題，未作答 <strong>${unanswered}</strong> 題。`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "確定提交",
        cancelButtonText: "取消"
    }).then(result => {
        if (result.isConfirmed) {
            saveVocabAnswer();
            clearInterval(vocabTimer);
            calculateVocabResult();
        }
    });
});

function saveVocabAnswer() {
    const radios = singleVocabQuestionContainer.querySelectorAll('input[name="vOption"]');
    let chosen = null;
    radios.forEach(r => {
        if (r.checked) chosen = r.value;
    });
    userAnswersVocab[currentVocabIndex] = chosen;
}

function calculateVocabResult() {
    let correctCount = 0;
    for (let i = 0; i < allQuestions.length; i++) {
        const correctArr = allQuestions[i].correctAnswers;
        const userAns = userAnswersVocab[i];
        if (userAns && correctArr.includes(userAns)) {
            correctCount++;
        }
    }
    const score = Math.round(correctCount / allQuestions.length * 100);
    scoreDisplay.innerHTML = `您的分數：<strong>${score}</strong>`;
    generateReview(allQuestions, userAnswersVocab);
    showQuizSection("result");
    progressBarFillV.style.width = "100%";
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    if (!isRetryMode) {
        submitScore(score, vocabSeconds, "vocabulary", userAnswersVocab);
    }
    hasSubmitted = true;
}

function generateReview(questionsArr, userAnsArr) {
    const reviewSection = document.getElementById("review-section");
    const reviewContainer = document.getElementById("review-container");
    reviewContainer.innerHTML = "";
    let wrongIndices = [];
    for (let i = 0; i < questionsArr.length; i++) {
        const q = questionsArr[i];
        const userAns = userAnsArr[i];
        const correctArr = q.correctAnswers;
        let isWrong = false;
        let isCorrect = false;
        if (q.isMultiple) {
            if (userAns && Array.isArray(userAns) && userAns.length > 0) {
                isCorrect = arraysEqualSet(userAns, correctArr);
            }
        } else {
            if (userAns) {
                isCorrect = correctArr.includes(userAns);
            }
        }
        if (!isCorrect) isWrong = true;
        const item = document.createElement("div");
        item.classList.add("review-item");
        item.setAttribute("data-index", i);
        let title = `<strong>題目 ${i + 1}:</strong> ${formatContent(q.question)}`;
        if (isCorrect) {
            title += ` <span style="color:green;">（正確）</span>`;
        }
        item.innerHTML = `<p>${title}</p>`;
        if (q.options && q.options.length > 0) {
            let optsHTML = `<div class="all-options">`;
            q.options.forEach((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                let optHTML = `${letter}. ${formatContent(opt)}`;
                if (isWrong) {
                    if (q.isMultiple) {
                        if (Array.isArray(userAns) && userAns.includes(opt) && !correctArr.includes(opt)) {
                            optHTML += ` <span style="color:red;">（錯誤）</span>`;
                        }
                    } else {
                        if (userAns === opt && !correctArr.includes(opt)) {
                            optHTML += ` <span style="color:red;">（錯誤）</span>`;
                        }
                    }
                    if (correctArr.includes(opt)) {
                        optHTML = `<mark style="background: #fffb91">${optHTML}</mark>`;
                    }
                }
                optsHTML += `<span class="option-item">${optHTML}</span><br>`;
            });
            optsHTML += `</div>`;
            item.innerHTML += optsHTML;
        }
        if (isWrong) {
            if (q.isMultiple) {
                if (!(userAns && Array.isArray(userAns) && userAns.length > 0)) {
                    item.innerHTML += `<p style="color:red">您未作答！</p>`;
                }
            } else {
                if (!userAns) {
                    item.innerHTML += `<p style="color:red">您未作答！</p>`;
                }
            }
        }
        if (q.explanation && q.explanation.trim() !== "") {
            item.innerHTML += `\n                <div class="explanation">\n                    <span class="explanation-title">詳解：</span>\n                    <span>${formatContent(q.explanation)}</span>\n                </div>\n            `;
        }
        if (isWrong) {
            item.classList.add("wrong-question");
            wrongIndices.push(i);
        }
        reviewContainer.appendChild(item);
    }
    if (!document.getElementById("showOnlyWrongQ")) {
        const showWrongOnlyCheckbox = document.createElement("label");
        showWrongOnlyCheckbox.style.marginRight = "1rem";
        showWrongOnlyCheckbox.innerHTML = `<input type="checkbox" id="showOnlyWrongQ"> 只顯示錯誤題目`;
        reviewSection.insertBefore(showWrongOnlyCheckbox, reviewContainer);
        reviewSection.querySelector("#showOnlyWrongQ").addEventListener("change", function() {
            const checked = this.checked;
            const allItems = reviewContainer.querySelectorAll(".review-item");
            allItems.forEach(item => {
                if (checked) {
                    if (!item.classList.contains("wrong-question")) {
                        item.style.display = "none";
                    } else {
                        item.style.display = "";
                    }
                } else {
                    item.style.display = "";
                }
            });
        });
    }
    if (!document.getElementById("retryWrongBtn")) {
        const retryWrongBtn = document.createElement("button");
        retryWrongBtn.textContent = "重新測驗錯誤題目";
        retryWrongBtn.className = "btn btn-danger";
        retryWrongBtn.id = "retryWrongBtn";
        retryWrongBtn.style.marginLeft = "1rem";
        retryWrongBtn.style.marginBottom = "1rem";
        reviewSection.insertBefore(retryWrongBtn, reviewContainer);
        retryWrongBtn.addEventListener("click", () => {
            retryWrongQuestions(questionsArr, userAnsArr);
        });
    }
    window.lastReviewQuestions = {
        questionsArr: questionsArr.slice(),
        userAnsArr: userAnsArr.slice()
    };
}

function retryWrongQuestions(fullQuestionsArr, fullUserAnsArr) {
    let wrongIndices = [];
    for (let i = 0; i < fullQuestionsArr.length; i++) {
        const q = fullQuestionsArr[i];
        const userAns = fullUserAnsArr[i];
        const correctArr = q.correctAnswers;
        let isWrong = false;
        if (q.isMultiple) {
            if (userAns && Array.isArray(userAns) && userAns.length > 0) {
                const isCorrect = arraysEqualSet(userAns, correctArr);
                if (!isCorrect) {
                    isWrong = true;
                }
            } else {
                isWrong = true;
            }
        } else {
            if (userAns) {
                const isCorrect = correctArr.includes(userAns);
                if (!isCorrect) {
                    isWrong = true;
                }
            } else {
                isWrong = true;
            }
        }
        if (isWrong) {
            wrongIndices.push(i);
        }
    }
    if (wrongIndices.length === 0) {
        Swal.fire({
            icon: "success",
            title: "恭喜",
            text: "沒有錯題可重測嘻嘻！"
        });
        return;
    }
    isRetryMode = true;
    hasSubmitted = false;
    let retryQuestions = wrongIndices.map(idx => fullQuestionsArr[idx]);
    allQuestions = retryQuestions;
    quizSectionQuestions.style.display = "block";
    quizSectionVocab.style.display = "none";
    resultSection.style.display = "none";
    allQuestionsContainer.innerHTML = "";
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    clearInterval(generalTimer);
    generalSeconds = 0;
    questionCountQ.textContent = `錯題共 ${allQuestions.length} 題`;
    progressBarFillQ.style.width = "0%";
    allQuestions.forEach((q, idx) => {
        const block = document.createElement("div");
        block.classList.add("question-block");
        block.innerHTML = `\n            <div class="q-title">第 ${idx + 1} 題：${formatContent(q.question)}</div>\n            <div class="question-options" data-qindex="${idx}"></div>\n        `;
        const optsDiv = block.querySelector(".question-options");
        q.options.forEach(opt => {
            const label = document.createElement("label");
            if (q.isMultiple) {
                label.innerHTML = `\n                    <input type="checkbox" name="q_${idx}" value="${opt}">\n                    <span>${formatContent(opt)}</span>\n                `;
            } else {
                label.innerHTML = `\n                    <input type="radio" name="q_${idx}" value="${opt}">\n                    <span>${formatContent(opt)}</span>\n                `;
            }
            optsDiv.appendChild(label);
        });
        allQuestionsContainer.appendChild(block);
    });
    const allInputs = allQuestionsContainer.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    allInputs.forEach(input => {
        input.addEventListener("change", () => {
            const questionName = input.name;
            const sameQuestionLabels = allQuestionsContainer.querySelectorAll(`input[name="${questionName}"]`);
            if (input.type === "radio") {
                sameQuestionLabels.forEach(r => {
                    r.parentElement.classList.remove("selected-answer");
                });
                if (input.checked) {
                    input.parentElement.classList.add("selected-answer");
                }
            } else if (input.type === "checkbox") {
                if (input.checked) {
                    input.parentElement.classList.add("selected-answer");
                } else {
                    input.parentElement.classList.remove("selected-answer");
                }
            }
        });
    });
    generalTimer = setInterval(() => {
        generalSeconds++;
        const mm = String(Math.floor(generalSeconds / 60)).padStart(2, "0");
        const ss = String(generalSeconds % 60).padStart(2, "0");
        timerDisplayQ.textContent = `時長：${mm}:${ss}`;
    }, 1e3);
}

function submitScore(score, usedSeconds, source, userAnsArr) {
    const studentEmail = getUserSession();
    if (!studentEmail) return;
    const sanEmail = sanitizeEmail(studentEmail);
    const subjectName = chapterSelect.options[chapterSelect.selectedIndex].text;
    db.ref(`1zTeStsys/Studentaccount/${sanEmail}`).once("value").then(snap => {
        if (!snap.exists()) {
            Swal.fire({
                icon: "error",
                title: "錯誤",
                text: "無法獲取學生資料。"
            });
            return;
        }
        const sData = snap.val();
        const studentName = sData.name || "匿名";
        const studentStunum = sData.stunum || "未知";
        const now = new Date;
        const curDate = now.toLocaleString();
        const mm = String(Math.floor(usedSeconds / 60)).padStart(2, "0");
        const ss = String(usedSeconds % 60).padStart(2, "0");
        const timestr = `${mm}:${ss}`;
        const [src, chapKey] = chapterSelect.value.split("|||");
        const scoreData = {
            Studentaccount: studentEmail,
            chapterId: chapKey,
            data: curDate,
            name: studentName,
            stuscore: String(score),
            time: timestr
        };
        db.ref(`1zTeStsys/Teacheraccount/${selectedTeacher}/Teacherscores`).push(scoreData).then(() => {
            Swal.fire({
                icon: "success",
                title: "測驗完成",
                text: "您的成績已提交！"
            });
        }).catch(err => {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "提交失敗",
                text: "成績提交時發生錯誤。"
            });
        });
    });
}

setInterval(detectDevTools, 50);

function submitQuiz() {
    if (quizSectionQuestions.style.display === "block") {
        submitAllQuestionsBtn.click();
    }
    if (quizSectionVocab.style.display === "block") {
        submitVocabQuizBtn.click();
    }
}

document.addEventListener("copy", e => {
    e.preventDefault();
});

document.addEventListener("contextmenu", e => {
    e.preventDefault();
});

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

setInterval(detectDevTools, 50);

document.addEventListener("keydown", e => {
    if (e.key === "F12") {
        e.preventDefault();
        window.location.href = "about:blank";
    }
});

document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        alert("專心測驗");
    }
});