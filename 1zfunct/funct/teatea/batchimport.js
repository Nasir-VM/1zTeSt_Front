const STORAGE_KEY = "csvTableData_teaconverter";

const csvTableBody = document.getElementById("csvTableBody");

const addRowBtn = document.getElementById("addRowBtn");

const clearBtn = document.getElementById("clearBtn");

const saveDownloadBtn = document.getElementById("saveDownloadBtn");

const COLUMNS = [ "題目", "A", "B", "C", "D", "複選", "答案", "詳解" ];

function showGeminiLog(msg, type = "info") {
    const logDiv = document.getElementById("gemini-log");
    logDiv.innerHTML = type === "error" ? `<span style="color:red"><b>❌ ${msg}</b></span>` : `<span style="color:#4e72d6"><b>🔎 ${msg}</b></span>`;
}

function handlePaste(e) {
    let pasteData = e.clipboardData.getData("text");
    if (pasteData.indexOf("\t") !== -1 || pasteData.indexOf("\n") !== -1) {
        e.preventDefault();
        let rows = pasteData.split(/\r?\n/).filter(row => row.length > 0);
        let block = rows.map(row => row.split("\t"));
        let currentRow = this.parentElement.parentElement;
        let currentCol = this.parentElement.cellIndex;
        for (let j = 0; j < block[0].length; j++) {
            let cellIndex = currentCol + j;
            if (cellIndex < COLUMNS.length) {
                let input = currentRow.cells[cellIndex].querySelector("input");
                if (input) {
                    input.value = block[0][j];
                    input.dispatchEvent(new Event("input"));
                }
            }
        }
        let insertionRow = currentRow;
        for (let i = 1; i < block.length; i++) {
            let newRow = document.createElement("tr");
            for (let j = 0; j < COLUMNS.length; j++) {
                let td = document.createElement("td");
                let input = document.createElement("input");
                input.type = "text";
                if (j < block[i].length) {
                    input.value = block[i][j];
                }
                input.addEventListener("input", updateLocalStorageCSV);
                input.addEventListener("paste", handlePaste);
                if (j === 0) {
                    input.classList.add("question-input");
                    input.addEventListener("dblclick", e => {
                        Swal.fire({
                            title: "完整題目",
                            html: e.target.value,
                            width: "600px"
                        });
                    });
                }
                td.appendChild(input);
                newRow.appendChild(td);
            }
            let tdAction = document.createElement("td");
            let delBtn = document.createElement("button");
            delBtn.textContent = "刪除";
            delBtn.className = "btn btn-danger btn-sm";
            delBtn.addEventListener("click", function() {
                newRow.remove();
                updateLocalStorageCSV();
            });
            tdAction.appendChild(delBtn);
            newRow.appendChild(tdAction);
            if (insertionRow.nextSibling) {
                insertionRow.parentNode.insertBefore(newRow, insertionRow.nextSibling);
            } else {
                insertionRow.parentNode.appendChild(newRow);
            }
            insertionRow = newRow;
        }
        updateLocalStorageCSV();
    }
}

function addRow(rowData = [ "", "", "", "", "", "", "", "" ]) {
    const tr = document.createElement("tr");
    for (let i = 0; i < COLUMNS.length; i++) {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.value = rowData[i] || "";
        input.addEventListener("input", updateLocalStorageCSV);
        input.addEventListener("paste", handlePaste);
        if (i === 0) {
            input.classList.add("question-input");
            input.addEventListener("dblclick", e => {
                Swal.fire({
                    title: "完整題目",
                    html: e.target.value,
                    width: "600px"
                });
            });
        }
        td.appendChild(input);
        tr.appendChild(td);
    }
    const tdAction = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "刪除";
    delBtn.className = "btn btn-danger btn-sm";
    delBtn.addEventListener("click", function() {
        tr.remove();
        updateLocalStorageCSV();
    });
    tdAction.appendChild(delBtn);
    tr.appendChild(tdAction);
    csvTableBody.appendChild(tr);
    updateLocalStorageCSV();
}

function updateLocalStorageCSV() {
    const rows = [];
    const trs = csvTableBody.querySelectorAll("tr");
    trs.forEach(tr => {
        const rowData = [];
        for (let i = 0; i < COLUMNS.length; i++) {
            const input = tr.cells[i].querySelector("input");
            rowData.push(input ? input.value : "");
        }
        rows.push(rowData);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function tableDataToCSV() {
    const rows = [];
    rows.push(COLUMNS);
    const trs = csvTableBody.querySelectorAll("tr");
    trs.forEach(tr => {
        const rowData = [];
        for (let i = 0; i < COLUMNS.length; i++) {
            const input = tr.cells[i].querySelector("input");
            rowData.push(input ? input.value : "");
        }
        rows.push(rowData);
    });
    return rows.map(r => r.map(escapeCSVCell).join(",")).join("\n");
}

function escapeCSVCell(cell) {
    if (cell.includes('"') || cell.includes(",") || cell.includes("\n")) {
        return '"' + cell.replace(/"/g, '""') + '"';
    }
    return cell;
}

function loadTableDataFromLocalStorage() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const rows = JSON.parse(savedData);
            if (Array.isArray(rows) && rows.length > 0) {
                csvTableBody.innerHTML = "";
                rows.forEach(rowData => {
                    addRow(rowData);
                });
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }
    csvTableBody.innerHTML = "";
    addRow();
    addRow();
}

loadTableDataFromLocalStorage();

addRowBtn.addEventListener("click", () => addRow());

clearBtn.addEventListener("click", function() {
    Swal.fire({
        title: "確定清除所有內容嗎？",
        text: "這將會清除表格中的所有資料。",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "是的，清除",
        cancelButtonText: "取消"
    }).then(result => {
        if (result.isConfirmed) {
            csvTableBody.innerHTML = "";
            localStorage.removeItem(STORAGE_KEY);
            addRow();
            addRow();
            Swal.fire({
                icon: "success",
                title: "內容已清除",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
});

saveDownloadBtn.addEventListener("click", function() {
    updateLocalStorageCSV();
    const csvContent = tableDataToCSV();
    const lines = csvContent.split("\n");
    if (lines.length <= 1) {
        Swal.fire({
            icon: "error",
            title: "內容為空",
            text: "請先編輯表格，再進行保存下載。"
        });
        return;
    }
    Swal.fire({
        title: "輸入要命名的名稱",
        input: "text",
        inputPlaceholder: "想要取甚麼呢？",
        showCancelButton: true,
        confirmButtonText: "保存並下載",
        preConfirm: fileName => {
            if (!fileName) {
                Swal.showValidationMessage("請輸入檔案名稱");
            }
            return fileName;
        }
    }).then(result => {
        if (result.isConfirmed) {
            let fileName = result.value;
            if (!fileName.toLowerCase().endsWith(".csv")) {
                fileName += ".csv";
            }
            const blob = new Blob([ new Uint8Array([ 239, 187, 191 ]), csvContent ], {
                type: "text/csv;charset=utf-8;"
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            Swal.fire({
                icon: "success",
                title: "檔案已下載",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
});

const geminiBtn = document.getElementById("gemini-analyze-btn");

const geminiLoading = document.getElementById("gemini-loading");

const rawInput = document.getElementById("rawQuestionsInput");

geminiBtn.addEventListener("click", async () => {
    if (!apiKey) {
        Swal.fire({
            icon: "warning",
            html: '請先設定 Gemini API Key！<br>到 <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a> 申請並填入 gemini-csv.js。'
        });
        return;
    }
    let rawText = rawInput.value.trim();
    if (!rawText) {
        Swal.fire({
            icon: "info",
            title: "請先輸入題目資料",
            text: "可貼上多題，格式不限，1zTeSt AI 會自動分析。"
        });
        return;
    }
    geminiBtn.disabled = true;
    geminiLoading.style.display = "";
    showGeminiLog("題目分析中...請稍候");
    try {
        let prompt = `\n你是一個專門處理題庫的 AI。使用者會給你亂序的題目內容，可能包含多題，格式很亂！可能選項的表示是 (1) (2) (3) (4)、A. B. C. D.、1234、甲乙丙等，答案也可能在題目下方或夾雜在一起。\n請幫我解析，並以 JSON 輸出每一題，欄位如下：\n\n[\n  {\n    "題目": "",\n    "A": "",\n    "B": "",\n    "C": "",\n    "D": "",\n    "複選": "0",\n    "答案": "",\n    "詳解": ""\n  }\n]\n\n- "題目": 只要題目主文，不要選項與答案字眼。\n- "A/B/C/D": 分別填入選項短句，沒有就空字串。\n- "複選": 若為複選請填 "1"，否則 "0"。\n- "答案": 填正確答案的選項 (單選如 "A"，複選如 "A/C")。若能推論請補上。\n- "詳解": 有詳解就填，沒有就空字串。\n\n請盡量推論出合理的選項與答案。\n如果某題格式無法解析，請略過，不要亂填。\n只回傳 JSON 陣列，不要有多餘解釋。\n原始題目如下：\n${rawText}\n    `.trim();
        let res = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [ {
                    parts: [ {
                        text: prompt
                    } ]
                } ]
            })
        });
        if (res.status === 503) {
            throw new Error("API OverLoad （Google當機） 異常");
        }
        let data = await res.json();
        let answer = data.candidates && data.candidates[0].content.parts[0].text ? data.candidates[0].content.parts[0].text : "";
        if (!answer) throw new Error("Gemini 沒有回應或 API Key 錯誤");
        answer = answer.trim().replace(/^```json/i, "").replace(/```$/, "").trim();
        let parsed = JSON.parse(answer);
        if (!Array.isArray(parsed)) throw new Error("AI 回傳格式錯誤");
        csvTableBody.innerHTML = "";
        let count = 0;
        parsed.forEach(obj => {
            let row = [ obj["題目"] || "", obj["A"] || "", obj["B"] || "", obj["C"] || "", obj["D"] || "", obj["複選"] || "0", obj["答案"] || "", obj["詳解"] || "" ];
            if (row[0]) {
                addRow(row);
                count++;
            }
        });
        showGeminiLog(`解析完成，共 ${count} 題。請檢查、補充、微調後再下載！`);
        if (count === 0) {
            Swal.fire({
                icon: "warning",
                title: "沒解析出任何題目",
                text: "請檢查你的題目格式，或手動輸入。"
            });
        }
    } catch (err) {
        showGeminiLog("解析失敗！" + err.message, "error");
        Swal.fire({
            icon: "error",
            title: "AI 解析失敗",
            text: err.message
        });
    } finally {
        geminiBtn.disabled = false;
        geminiLoading.style.display = "none";
        updateLocalStorageCSV();
    }
});