let chaptersData = {};

let mergedChaptersData = {};

function loadChapters() {
    const user = getUserSession();
    if (!user || !dbMain) return Promise.resolve();
    const sEmail = sanitizeEmail(user);
    return dbMain.ref("Teacherquestion/" + sEmail + "/chapters").once("value").then(snap => {
        chaptersData = snap.val() || {};
    }).catch(err => {
        console.error("載入章節失敗:", err);
        Swal.fire({
            icon: "error",
            title: "載入章節失敗",
            text: "請稍後再試。",
            timer: 2e3,
            showConfirmButton: false
        });
    });
}

function mergeChaptersData() {
    mergedChaptersData = {
        ...chaptersData
    };
}

function renderChaptersTable(data) {
    const tbody = document.getElementById("chaptersTableBody");
    tbody.innerHTML = "";
    const chapterKeys = Object.keys(data);
    if (chapterKeys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">目前沒有任何章節。</td></tr>`;
        return;
    }
    chapterKeys.forEach(key => {
        const ch = data[key];
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = ch.name;
        tr.appendChild(nameTd);
        const limitTd = document.createElement("td");
        limitTd.textContent = ch.limit ? ch.limit : 0;
        tr.appendChild(limitTd);
        const openTd = document.createElement("td");
        const isOpen = ch.open === true;
        const openBtn = document.createElement("button");
        openBtn.className = "admin-btn btn-toggle btn-sm";
        openBtn.textContent = isOpen ? "已開放" : "關閉中";
        if (!isOpen) {
            openBtn.classList.add("closed");
        }
        openBtn.onclick = () => toggleChapterOpen(key, isOpen);
        openTd.appendChild(openBtn);
        tr.appendChild(openTd);
        const actionsTd = document.createElement("td");
        actionsTd.className = "actions";
        const editBtn = document.createElement("button");
        editBtn.className = "admin-btn btn-edit btn-sm";
        editBtn.textContent = "編輯";
        editBtn.onclick = () => openEditChapterModalFn(key, ch);
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "admin-btn btn-delete btn-sm";
        deleteBtn.textContent = "刪除";
        deleteBtn.onclick = () => deleteChapter(key);
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
    });
}

function renderChapterSelect(data) {
    const sel = document.getElementById("chapterSelect");
    sel.innerHTML = `<option value="">--選擇章節--</option>`;
    Object.keys(data).forEach(key => {
        const ch = data[key];
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = ch.name;
        sel.appendChild(opt);
    });
}

function renderScoreChapterFilter(data) {
    const sel = document.getElementById("scoreChapterFilter");
    sel.innerHTML = `<option value="">--所有章節--</option>`;
    Object.keys(data).forEach(k => {
        const ch = data[k];
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = ch.name;
        sel.appendChild(opt);
    });
}

function toggleChapterOpen(chId, current) {
    const user = getUserSession();
    if (!user) return;
    const sEmail = sanitizeEmail(user);
    const newVal = !current;
    const path = `Teacherquestion/${sEmail}/chapters/${chId}`;
    dbTeacherQuestion.ref(path).update({
        open: newVal
    }).then(() => {
        loadChapters().then(() => {
            mergeChaptersData();
            renderChaptersTable(chaptersData);
            renderChapterSelect(mergedChaptersData);
            renderScoreChapterFilter(mergedChaptersData);
        });
    }).catch(err => {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "操作失敗",
            text: "請稍後再試。",
            timer: 2e3,
            showConfirmButton: false
        });
    });
}

function openAddChapterModal() {
    const modal = new bootstrap.Modal(document.getElementById("addChapterModal"));
    modal.show();
}

document.getElementById("addChapterForm").addEventListener("submit", e => {
    e.preventDefault();
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
    const sEmail = sanitizeEmail(user);
    const chName = document.getElementById("chapterName").value.trim();
    const chLimitRaw = document.getElementById("chapterLimit").value.trim();
    const chLimit = chLimitRaw ? parseInt(chLimitRaw, 10) : 0;
    if (!chName) {
        Swal.fire({
            icon: "warning",
            title: "請填寫章節名稱",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    const newCh = {
        name: chName,
        questions: {},
        open: false,
        limit: chLimit
    };
    const refPath = dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters`);
    refPath.push(newCh).then(() => {
        Swal.fire({
            icon: "success",
            title: "章節已成功新增！",
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById("addChapterModal")).hide();
            document.getElementById("addChapterForm").reset();
            loadChapters().then(() => {
                mergeChaptersData();
                renderChaptersTable(chaptersData);
                renderChapterSelect(mergedChaptersData);
                renderScoreChapterFilter(mergedChaptersData);
            });
        });
    }).catch(err => {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "新增章節失敗",
            text: err.message,
            timer: 2e3,
            showConfirmButton: false
        });
    });
});

function openEditChapterModalFn(chId, chData) {
    document.getElementById("editChapterId").value = chId;
    document.getElementById("editChapterName").value = chData.name;
    document.getElementById("editChapterLimit").value = chData.limit ? chData.limit : 0;
    const modal = new bootstrap.Modal(document.getElementById("editChapterModal"));
    modal.show();
}

document.getElementById("editChapterForm").addEventListener("submit", e => {
    e.preventDefault();
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
    const sEmail = sanitizeEmail(user);
    const chId = document.getElementById("editChapterId").value;
    const chName = document.getElementById("editChapterName").value.trim();
    const chLimitRaw = document.getElementById("editChapterLimit").value.trim();
    const chLimit = chLimitRaw ? parseInt(chLimitRaw, 10) : 0;
    if (!chName) {
        Swal.fire({
            icon: "warning",
            title: "請填寫章節名稱",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    const path = `Teacherquestion/${sEmail}/chapters/${chId}`;
    dbTeacherQuestion.ref(path).update({
        name: chName,
        limit: chLimit
    }).then(() => {
        Swal.fire({
            icon: "success",
            title: "章節已成功更新！",
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById("editChapterModal")).hide();
            document.getElementById("editChapterForm").reset();
            loadChapters().then(() => {
                mergeChaptersData();
                renderChaptersTable(chaptersData);
                renderChapterSelect(mergedChaptersData);
                renderScoreChapterFilter(mergedChaptersData);
            });
        });
    }).catch(err => {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "更新章節失敗",
            text: err.message,
            timer: 2e3,
            showConfirmButton: false
        });
    });
});

function deleteChapter(chId) {
    Swal.fire({
        title: "確定要刪除此章節嗎？",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "是的，刪除",
        cancelButtonText: "取消"
    }).then(res => {
        if (res.isConfirmed) {
            const user = getUserSession();
            if (!user) return;
            const sEmail = sanitizeEmail(user);
            const path = `Teacherquestion/${sEmail}/chapters/${chId}`;
            dbTeacherQuestion.ref(path).remove().then(() => {
                Swal.fire({
                    icon: "success",
                    title: "刪除成功",
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    loadChapters().then(() => {
                        mergeChaptersData();
                        renderChaptersTable(chaptersData);
                        renderChapterSelect(mergedChaptersData);
                        renderScoreChapterFilter(mergedChaptersData);
                    });
                    document.getElementById("questionsTableBody").innerHTML = "";
                    document.getElementById("chapterSelect").value = "";
                });
            }).catch(err => {
                console.error(err);
                Swal.fire({
                    icon: "error",
                    title: "刪除章節失敗",
                    text: err.message,
                    timer: 2e3,
                    showConfirmButton: false
                });
            });
        }
    });
}

function getTeacherQuestionDB(email) {
    return dbMain;
}

function loadQuestions() {
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
    const chapterId = document.getElementById("chapterSelect").value;
    if (!chapterId) {
        document.getElementById("questionsTableBody").innerHTML = "";
        return;
    }
    if (questionsCache[chapterId]) {
        renderQuestionsTable(questionsCache[chapterId]);
        return;
    }
    const sEmail = sanitizeEmail(user);
    dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters/${chapterId}/questions`).once("value").then(snap => {
        const data = snap.val();
        questionsCache[chapterId] = data;
        renderQuestionsTable(data);
    }).catch(err => {
        console.error("載入題目失敗:", err);
        Swal.fire({
            icon: "error",
            title: "載入題目失敗",
            text: "請稍後再試。",
            timer: 2e3,
            showConfirmButton: false
        });
    });
}

function renderQuestionsTable(data) {
    const tbody = document.getElementById("questionsTableBody");
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">目前沒有任何題目。</td></tr>';
        return;
    }
    let html = "";
    window.questionCache = {};
    Object.keys(data).forEach(key => {
        const q = data[key];
        window.questionCache[key] = q;
        const escapedQ = escapeForOnclick(q.question);
        const escapedA = escapeForOnclick(q.A);
        const escapedB = escapeForOnclick(q.B);
        const escapedC = escapeForOnclick(q.C);
        const escapedD = escapeForOnclick(q.D);
        const escapedExp = escapeForOnclick(q.explanation);
        html += `<tr data-qid="${key}">`;
        html += `<td onclick="openViewContentModal('${escapedQ}')">${formatContent(q.question)}</td>`;
        html += `<td onclick="openViewContentModal('${escapedA}')">${formatContent(q.A)}</td>`;
        html += `<td onclick="openViewContentModal('${escapedB}')">${formatContent(q.B)}</td>`;
        html += `<td onclick="openViewContentModal('${escapedC}')">${formatContent(q.C)}</td>`;
        html += `<td onclick="openViewContentModal('${escapedD}')">${formatContent(q.D)}</td>`;
        let answerText = Array.isArray(q.answer) ? q.answer.join("/") : q.answer || "";
        html += `<td>${answerText}</td>`;
        html += `<td onclick="openViewContentModal('${escapedExp}')">${formatContent(q.explanation)}</td>`;
        html += `<td class="actions">`;
        html += `<button class="admin-btn btn-edit btn-sm" onclick="openEditQuestionModalWrapper('${key}')">編輯</button>`;
        html += `<button class="admin-btn btn-delete btn-sm" onclick="deleteQuestion('${key}')">刪除</button>`;
        html += `</td>`;
        html += `</tr>`;
    });
    tbody.innerHTML = html;
}

function escapeForOnclick(text) {
    if (!text) return "";
    return JSON.stringify(text).slice(1, -1).replace(/'/g, "\\'");
}

function openEditQuestionModalWrapper(qId) {
    const qData = window.questionCache[qId];
    openEditQuestionModal(qId, qData);
}

function openAddQuestionModal() {
    const chapterId = document.getElementById("chapterSelect").value;
    if (!chapterId) {
        Swal.fire({
            icon: "warning",
            title: "請先選擇一個章節",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    document.getElementById("addQuestionForm").reset();
    document.getElementById("addSingleAnswerDiv").style.display = "block";
    document.getElementById("addMultipleAnswerDiv").style.display = "none";
    document.getElementById("isMultipleChoice").checked = false;
    const modal = new bootstrap.Modal(document.getElementById("addModal"));
    modal.show();
}

document.getElementById("isMultipleChoice").addEventListener("change", function() {
    if (this.checked) {
        document.getElementById("addSingleAnswerDiv").style.display = "none";
        document.getElementById("addMultipleAnswerDiv").style.display = "block";
    } else {
        document.getElementById("addSingleAnswerDiv").style.display = "block";
        document.getElementById("addMultipleAnswerDiv").style.display = "none";
    }
});

document.getElementById("addQuestionForm").addEventListener("submit", e => {
    e.preventDefault();
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
    const sEmail = sanitizeEmail(user);
    const chapterId = document.getElementById("chapterSelect").value;
    if (!chapterId) {
        Swal.fire({
            icon: "warning",
            title: "請先選擇章節！",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    const question = document.getElementById("addQuestion").value.trim();
    const A = document.getElementById("addOptionA").value.trim();
    const B = document.getElementById("addOptionB").value.trim();
    const C = document.getElementById("addOptionC").value.trim();
    const D = document.getElementById("addOptionD").value.trim();
    const multiple = document.getElementById("isMultipleChoice").checked;
    let answer;
    if (multiple) {
        const selected = [];
        if (document.getElementById("addMultiA").checked) selected.push("A");
        if (document.getElementById("addMultiB").checked) selected.push("B");
        if (document.getElementById("addMultiC").checked) selected.push("C");
        if (document.getElementById("addMultiD").checked) selected.push("D");
        if (selected.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "請至少勾選一個正解",
                timer: 1500,
                showConfirmButton: false
            });
            return;
        }
        answer = selected;
    } else {
        answer = document.getElementById("addSingleAnswerSelect").value;
    }
    const explanation = document.getElementById("addExplanation").value.trim();
    if (!question || !A || !B) {
        Swal.fire({
            icon: "warning",
            title: "題目、選項 A 和 B 不可為空",
            timer: 1500,
            showConfirmButton: false
        });
        return;
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
    dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters/${chapterId}/questions`).push(newQ).then(() => {
        Swal.fire({
            icon: "success",
            title: "新增成功",
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById("addModal")).hide();
            delete questionsCache[chapterId];
            loadQuestions();
        });
    }).catch(err => {
        console.error("新增題目失敗:", err);
        Swal.fire({
            icon: "error",
            title: "新增題目失敗",
            text: err.message,
            timer: 2e3,
            showConfirmButton: false
        });
    });
});

function openEditQuestionModal(qId, qData) {
    const chapterId = document.getElementById("chapterSelect").value;
    document.getElementById("editChapterId").value = chapterId;
    document.getElementById("editQuestionId").value = qId;
    document.getElementById("editQuestion").value = qData.question || "";
    document.getElementById("editOptionA").value = qData.A || "";
    document.getElementById("editOptionB").value = qData.B || "";
    document.getElementById("editOptionC").value = qData.C || "";
    document.getElementById("editOptionD").value = qData.D || "";
    [ "editMultiA", "editMultiB", "editMultiC", "editMultiD" ].forEach(id => {
        document.getElementById(id).checked = false;
    });
    const editMultiple = Array.isArray(qData.answer);
    const editIsMultipleChoice = document.getElementById("editIsMultipleChoice");
    const singleDiv = document.getElementById("editSingleAnswerDiv");
    const multiDiv = document.getElementById("editMultipleAnswerDiv");
    if (editMultiple) {
        editIsMultipleChoice.checked = true;
        singleDiv.style.display = "none";
        multiDiv.style.display = "block";
        const arrAns = qData.answer;
        if (arrAns.includes("A")) document.getElementById("editMultiA").checked = true;
        if (arrAns.includes("B")) document.getElementById("editMultiB").checked = true;
        if (arrAns.includes("C")) document.getElementById("editMultiC").checked = true;
        if (arrAns.includes("D")) document.getElementById("editMultiD").checked = true;
    } else {
        editIsMultipleChoice.checked = false;
        singleDiv.style.display = "block";
        multiDiv.style.display = "none";
        document.getElementById("editSingleAnswerSelect").value = qData.answer || "A";
    }
    document.getElementById("editExplanation").value = qData.explanation || "";
    const modal = new bootstrap.Modal(document.getElementById("editModal"));
    modal.show();
}

document.getElementById("editIsMultipleChoice").addEventListener("change", function() {
    if (this.checked) {
        document.getElementById("editSingleAnswerDiv").style.display = "none";
        document.getElementById("editMultipleAnswerDiv").style.display = "block";
    } else {
        document.getElementById("editSingleAnswerDiv").style.display = "block";
        document.getElementById("editMultipleAnswerDiv").style.display = "none";
    }
});

document.getElementById("editQuestionForm").addEventListener("submit", e => {
    e.preventDefault();
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
    const sEmail = sanitizeEmail(user);
    const chId = document.getElementById("editChapterId").value;
    const qId = document.getElementById("editQuestionId").value;
    const question = document.getElementById("editQuestion").value.trim();
    const A = document.getElementById("editOptionA").value.trim();
    const B = document.getElementById("editOptionB").value.trim();
    const C = document.getElementById("editOptionC").value.trim();
    const D = document.getElementById("editOptionD").value.trim();
    const isMulti = document.getElementById("editIsMultipleChoice").checked;
    let answer;
    if (isMulti) {
        const selected = [];
        if (document.getElementById("editMultiA").checked) selected.push("A");
        if (document.getElementById("editMultiB").checked) selected.push("B");
        if (document.getElementById("editMultiC").checked) selected.push("C");
        if (document.getElementById("editMultiD").checked) selected.push("D");
        if (selected.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "請至少勾選一個正解",
                timer: 1500,
                showConfirmButton: false
            });
            return;
        }
        answer = selected;
    } else {
        answer = document.getElementById("editSingleAnswerSelect").value;
    }
    const explanation = document.getElementById("editExplanation").value.trim();
    if (!question || !A || !B) {
        Swal.fire({
            icon: "warning",
            title: "資料不可為空",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    const updateQ = {
        question: question,
        A: A,
        B: B,
        C: C,
        D: D,
        answer: answer,
        explanation: explanation
    };
    dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters/${chId}/questions/${qId}`).set(updateQ).then(() => {
        Swal.fire({
            icon: "success",
            title: "更新成功",
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
            delete questionsCache[chId];
            loadQuestions();
        });
    }).catch(err => {
        console.error("更新題目失敗:", err);
        Swal.fire({
            icon: "error",
            title: "更新題目失敗",
            text: err.message,
            timer: 2e3,
            showConfirmButton: false
        });
    });
});

function deleteQuestion(qId) {
    Swal.fire({
        title: "確定要刪除此題目嗎？",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "是的，刪除",
        cancelButtonText: "取消"
    }).then(res => {
        if (res.isConfirmed) {
            const user = getUserSession();
            if (!user || !dbTeacherQuestion) return;
            const sEmail = sanitizeEmail(user);
            const chId = document.getElementById("chapterSelect").value;
            dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters/${chId}/questions/${qId}`).remove().then(() => {
                Swal.fire({
                    icon: "success",
                    title: "刪除成功",
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    delete questionsCache[chId];
                    loadQuestions();
                });
            }).catch(err => {
                console.error("刪除題目失敗:", err);
                Swal.fire({
                    icon: "error",
                    title: "刪除題目失敗",
                    text: err.message,
                    timer: 2e3,
                    showConfirmButton: false
                });
            });
        }
    });
}

function openViewContentModal(content) {
    document.getElementById("viewContentBody").innerHTML = formatContent(content);
    const modal = new bootstrap.Modal(document.getElementById("viewContentModal"));
    modal.show();
}

function formatContent(text) {
    if (!text) return "";
    const imgRegex = /(https?:\/\/(?:i\.imgur\.com|i\.meee\.com\.tw)\/[a-zA-Z0-9]+(?:\\.(?:jpg|jpeg|png|gif))?)/;
    const parts = text.split(imgRegex);
    let html = "";
    parts.forEach((part, index) => {
        if (!part) {
            return;
        }
        if (index % 2 === 1) {
            html += `<img src="${part}" alt="圖片" class="img-fluid mb-2" />`;
        } else {
            if (part.trim() !== "") {
                html += `<span>${part}</span>`;
            }
        }
    });
    return html;
}

function exportToCSV() {
    const user = getUserSession();
    if (!user || !dbTeacherQuestion) return;
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
    const sEmail = sanitizeEmail(user);
    dbTeacherQuestion.ref(`Teacherquestion/${sEmail}/chapters/${chId}/questions`).once("value").then(snap => {
        const data = snap.val();
        if (!data) {
            Swal.fire({
                icon: "info",
                title: "沒有題目可匯出",
                timer: 1500,
                showConfirmButton: false
            });
            return;
        }
        let csv = "題目,A,B,C,D,複選,答案,詳解\n";
        Object.keys(data).forEach(k => {
            const q = data[k];
            const isMulti = Array.isArray(q.answer);
            const multiFlag = isMulti ? "1" : "0";
            const answerStr = isMulti ? q.answer.join("/") : q.answer || "";
            const row = [ `"${(q.question || "").replace(/"/g, '""')}"`, `"${(q.A || "").replace(/"/g, '""')}"`, `"${(q.B || "").replace(/"/g, '""')}"`, `"${(q.C || "").replace(/"/g, '""')}"`, `"${(q.D || "").replace(/"/g, '""')}"`, `${multiFlag}`, `"${answerStr.replace(/"/g, '""')}"`, `"${(q.explanation || "").replace(/"/g, '""')}"` ].join(",");
            csv += row + "\n";
        });
        csv = "\ufeff" + csv;
        const blob = new Blob([ csv ], {
            type: "text/csv;charset=utf-8;"
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `chapter_${chId}_questions.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        console.error("匯出題目失敗:", err);
        Swal.fire({
            icon: "error",
            title: "匯出失敗",
            text: err.message,
            timer: 2e3,
            showConfirmButton: false
        });
    });
}

let allScores = [];

let filteredScores = [];

let scoresSortDirections = [ 1, 0, 0, 0, 0, 0, 0 ];

function pad(n) {
    return n < 10 ? "0" + n : n;
}

function formatScoreDate(dateString) {
    if (!dateString) return "";
    let d = new Date(dateString);
    if (isNaN(d.getTime()) && typeof dateString === "string") {
        d = new Date(dateString.replace(/-/g, "/"));
    }
    if (isNaN(d.getTime()) && typeof dateString === "string") {
        const match = dateString.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
        if (match) {
            d = new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);
        }
    }
    if (isNaN(d.getTime())) return dateString;
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    let day = d.getDate();
    let hour = d.getHours();
    let minute = d.getMinutes();
    let second = d.getSeconds();
    let period = hour < 12 ? "上午" : "下午";
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    return `${year}/${pad(month)}/${pad(day)} ${period}${pad(hour12)}:${pad(minute)}:${pad(second)}`;
}

function getScoreDateForFilter(dateSource) {
    if (!dateSource) return null;
    let d = new Date(dateSource);
    if (isNaN(d.getTime()) && typeof dateSource === "string") {
        d = new Date(dateSource.replace(/-/g, "/"));
    }
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
    }
    if (typeof dateSource === "string") {
        const match = dateSource.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
        if (match) {
            return `${match[1]}/${pad(parseInt(match[2]))}/${pad(parseInt(match[3]))}`;
        }
    }
    return null;
}

function populateDateFilter() {
    const dateFilterSelect = document.getElementById("scoreDateFilter");
    if (!dateFilterSelect) return;
    while (dateFilterSelect.options.length > 2) {
        dateFilterSelect.remove(2);
    }
    const rawDates = allScores.map(s => getScoreDateForFilter(s.data || s.timestamp));
    const uniqueDates = [ ...new Set(rawDates.filter(d => d !== null)) ];
    uniqueDates.sort().reverse();
    if (uniqueDates.length === 0) {
        console.warn("警告：沒有解析出任何有效日期");
    }
    uniqueDates.forEach(dateStr => {
        const option = document.createElement("option");
        option.value = dateStr;
        option.textContent = dateStr;
        dateFilterSelect.appendChild(option);
    });
}

async function loadScores() {
    const user = getUserSession();
    if (!user || !dbMain) return;
    const sEmail = sanitizeEmail(user);
    const tbody = document.getElementById("scoresTableBody");
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">資料載入中...</td></tr>';
    if (Object.keys(mergedChaptersData).length === 0) {
        await loadChapters();
        mergeChaptersData();
    }
    dbMain.ref(`1zTeStsys/Teacheraccount/${sEmail}/Teacherscores`).once("value").then(async snap => {
        const data = snap.val() || {};
        let scores = Object.keys(data).map(k => data[k]);
        await Promise.all(scores.map(async s => {
            if ((!s.stunum || s.stunum === "") && s.Studentaccount) {
                const sanEmail = sanitizeEmail(s.Studentaccount);
                try {
                    const stuSnap = await dbMain.ref(`1zTeStsys/Studentaccount/${sanEmail}/stunum`).once("value");
                    s.stunum = stuSnap.exists() ? stuSnap.val() : "";
                } catch (e) {
                    s.stunum = "";
                }
            }
        }));
        scores.sort((a, b) => {
            const da = getScoreDateForFilter(a.data || a.timestamp);
            const db = getScoreDateForFilter(b.data || b.timestamp);
            if (!da) return 1;
            if (!db) return -1;
            return da < db ? 1 : -1;
        });
        allScores = scores;
        populateDateFilter();
        const dateSelect = document.getElementById("scoreDateFilter");
        if (dateSelect) dateSelect.value = "";
        updateScoreSortIndicators(0, 1);
        filterAndSearchScores();
    }).catch(err => {
        console.error("載入成績失敗:", err);
        Swal.fire({
            icon: "error",
            title: "載入成績失敗",
            text: "請檢查網路或稍後再試。",
            timer: 2e3,
            showConfirmButton: false
        });
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">載入失敗</td></tr>';
    });
}

function filterAndSearchScores() {
    const chId = document.getElementById("scoreChapterFilter").value;
    const dateFilter = document.getElementById("scoreDateFilter").value;
    const keyword = document.getElementById("scoreSearchInput").value.toLowerCase().trim();
    const todayStr = getScoreDateForFilter(new Date);
    filteredScores = allScores.filter(s => {
        let matchChapter = true;
        let matchDate = true;
        let matchSearch = true;
        if (chId) {
            matchChapter = s.chapterId === chId;
        }
        if (dateFilter) {
            const scoreDateStr = getScoreDateForFilter(s.data || s.timestamp);
            if (dateFilter === "today") {
                matchDate = scoreDateStr === todayStr;
            } else {
                matchDate = scoreDateStr === dateFilter;
            }
        }
        if (keyword) {
            const name = (s.name || "").toLowerCase();
            const email = (s.Studentaccount || "").toLowerCase();
            const stunum = (s.stunum || "").toLowerCase();
            matchSearch = name.includes(keyword) || email.includes(keyword) || stunum.includes(keyword);
        }
        return matchChapter && matchDate && matchSearch;
    });
    renderScoresTable();
}

function renderScoresTable() {
    const tbody = document.getElementById("scoresTableBody");
    tbody.innerHTML = "";
    if (filteredScores.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.className = "text-center";
        const dateFilterVal = document.getElementById("scoreDateFilter").value;
        let msg = "目前沒有任何符合條件的成績資料。";
        if (dateFilterVal === "today") msg = "今日尚未有測驗資料。";
        td.textContent = msg;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    filteredScores.forEach(s => {
        const tr = document.createElement("tr");
        const dateTd = document.createElement("td");
        let dateStr = s.data || "";
        if (!dateStr && s.timestamp) {
            dateStr = formatScoreDate(new Date(s.timestamp));
        } else {
            dateStr = formatScoreDate(s.data);
        }
        dateTd.textContent = dateStr;
        tr.appendChild(dateTd);
        const chTd = document.createElement("td");
        let chDisplay = "";
        if (s.chapterId && mergedChaptersData[s.chapterId]) {
            chDisplay = mergedChaptersData[s.chapterId].name;
        } else {
            if (s.quizType === "question") chDisplay = "題庫測驗"; else if (s.quizType === "vocab") chDisplay = "單字測驗"; else chDisplay = s.quizType || "";
        }
        chTd.textContent = chDisplay;
        tr.appendChild(chTd);
        const timeTd = document.createElement("td");
        let tVal = s.time || s.timeTaken || "";
        if (tVal && !String(tVal).includes(":")) {
            const sec = parseInt(tVal);
            if (!isNaN(sec)) {
                const mm = String(Math.floor(sec / 60)).padStart(2, "0");
                const ss = String(sec % 60).padStart(2, "0");
                tVal = `${mm}:${ss}`;
            }
        }
        timeTd.textContent = tVal;
        tr.appendChild(timeTd);
        const nameTd = document.createElement("td");
        nameTd.textContent = s.name || "";
        tr.appendChild(nameTd);
        const mailTd = document.createElement("td");
        mailTd.textContent = s.Studentaccount || s.email || "";
        tr.appendChild(mailTd);
        const stunumTd = document.createElement("td");
        stunumTd.textContent = s.stunum || "";
        tr.appendChild(stunumTd);
        const scoreTd = document.createElement("td");
        let scoreVal = s.stuscore || s.score || "";
        scoreTd.textContent = String(scoreVal).replace("/100", "");
        tr.appendChild(scoreTd);
        tbody.appendChild(tr);
    });
}

function sortScores(colIndex, isNumeric) {
    scoresSortDirections[colIndex] = 1 - scoresSortDirections[colIndex];
    const dir = scoresSortDirections[colIndex];
    filteredScores.sort((a, b) => {
        let valA = getScoreValue(a, colIndex);
        let valB = getScoreValue(b, colIndex);
        if (colIndex === 0) {
            valA = a.data || "";
            valB = b.data || "";
            const dA = new Date(valA.replace(/-/g, "/"));
            const dB = new Date(valB.replace(/-/g, "/"));
            if (!isNaN(dA.getTime()) && !isNaN(dB.getTime())) {
                return dir === 0 ? dA - dB : dB - dA;
            }
        }
        if (isNumeric) {
            const na = parseFloat(valA) || 0;
            const nb = parseFloat(valB) || 0;
            return dir === 0 ? na - nb : nb - na;
        } else {
            valA = String(valA);
            valB = String(valB);
            return dir === 0 ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
    });
    updateScoreSortIndicators(colIndex, dir);
    renderScoresTable();
}

function getScoreValue(s, idx) {
    switch (idx) {
      case 0:
        if (s.data) return formatScoreDate(s.data);
        if (s.timestamp) return formatScoreDate(new Date(s.timestamp));
        return "";

      case 1:
        if (s.chapterId && mergedChaptersData[s.chapterId]) return mergedChaptersData[s.chapterId].name;
        if (s.quizType === "question") return "題庫測驗";
        if (s.quizType === "vocab") return "單字測驗";
        return s.quizType || "";

      case 2:
        let tv = s.time || s.timeTaken || 0;
        if (typeof tv === "string" && String(tv).includes(":")) {
            const parts = String(tv).split(":");
            return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
        }
        return parseInt(tv) || 0;

      case 3:
        return s.name || "";

      case 4:
        return s.Studentaccount || s.email || "";

      case 5:
        return s.stunum || "";

      case 6:
        const val = s.stuscore || s.score || "";
        return parseFloat(String(val).replace("/100", "")) || 0;

      default:
        return "";
    }
}

function updateScoreSortIndicators(activeIdx, dir) {
    for (let i = 0; i < 7; i++) {
        const span = document.getElementById(`scores-sort-${i}`);
        if (!span) continue;
        if (i === activeIdx) {
            span.textContent = dir === 0 ? "↑" : "↓";
        } else {
            span.textContent = "";
        }
    }
}

function exportScoresToCSV() {
    if (filteredScores.length === 0) {
        Swal.fire({
            icon: "info",
            title: "沒有成績可匯出",
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    let csv = "測驗日期,測驗章節,測驗時長,測驗者姓名,測驗者信箱,測驗者學號,分數\n";
    filteredScores.forEach(s => {
        let chapterName = "";
        if (s.chapterId && mergedChaptersData[s.chapterId]) {
            chapterName = mergedChaptersData[s.chapterId].name;
        } else {
            if (s.quizType === "question") chapterName = "題庫測驗"; else if (s.quizType === "vocab") chapterName = "單字測驗"; else chapterName = s.quizType || "";
        }
        let formattedDate = "";
        if (s.data) formattedDate = formatScoreDate(s.data); else if (s.timestamp) formattedDate = formatScoreDate(new Date(s.timestamp));
        let timeVal = s.time || s.timeTaken || "";
        if (timeVal && !String(timeVal).includes(":")) {
            const sec = parseInt(timeVal);
            if (!isNaN(sec)) {
                const mm = String(Math.floor(sec / 60)).padStart(2, "0");
                const ss = String(sec % 60).padStart(2, "0");
                timeVal = `${mm}:${ss}`;
            }
        }
        const emailVal = s.Studentaccount || s.email || "";
        const scoreVal = String(s.stuscore || s.score || "").replace("/100", "");
        const row = [ `"${(formattedDate || "").replace(/"/g, '""')}"`, `"${chapterName.replace(/"/g, '""')}"`, `"${String(timeVal).replace(/"/g, '""')}"`, `"${(s.name || "").replace(/"/g, '""')}"`, `"${emailVal.replace(/"/g, '""')}"`, `"${(s.stunum || "").replace(/"/g, '""')}"`, `"${scoreVal.replace(/"/g, '""')}"` ].join(",");
        csv += row + "\n";
    });
    csv = "\ufeff" + csv;
    const blob = new Blob([ csv ], {
        type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "teacher_scores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}