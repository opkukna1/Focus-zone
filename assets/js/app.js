window.__gssLoaded = true;
// Global Storage
let finalReportData = {};
let isExcelReady = false;
let isFormReady = false;

// --- 1. Navigation Logic ---
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        const menuEl = e.currentTarget;
        menuEl.classList.add('active');
        
        const targetId = menuEl.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        if (typeof gssDrawer === 'function') gssDrawer(false); else document.getElementById('sidebar').classList.remove('open');
    });
});



// --- Excel se form auto-fill ---
const AUTO_FIELDS = {
    last_cash:       "input_last_cash",
    Closing_balance: "input_Closing_balance",
    p_l:             "input_p_l",
    hissa:           "input_hissa",
    amanat:          "input_amanat",
    Vamanat:         "input_Vamanat"
};
const AUTO_LABELS = { last_cash: "Last Cash", Closing_balance: "Closing Balance", p_l: "Current Year P&L", hissa: "Hissa Rashi", amanat: "Amanat Sadasya", Vamanat: "Amanat Vyavasthapak" };

function extractFields(d) {
    const out = {};
    const num = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? null : n; };
    const find = (rows, nameKey, amtKey, re, skipRe) => {
        for (const r of (rows || [])) {
            const name = String(r[nameKey] || "");
            if (re.test(name) && !(skipRe && skipRe.test(name)) && num(r[amtKey]) !== null) return num(r[amtKey]).toFixed(2);
        }
        return null;
    };
    const inc = d.income_items, pnl = d.pnl_items, bs = d.bs_items;
    out.last_cash = find(inc, "income_name", "income_amount", /opening\s*balance|प्रारं?म?्?भिक\s*रोकड़|प्रारम्भिक\s*रोकड़/i);
    out.Closing_balance = find(inc, "expense_name", "expense_amount", /closing\s*balance|अं?न्?तिम\s*रोकड/i);
    out.p_l = find(pnl, "exp_details", "exp_amount", /net\s*(profit|loss)|शुद्ध\s*(लाभ|हानि)|वर्ष\s*के\s*लिए\s*(लाभ|हानि)/i)
           || find(pnl, "inc_details", "inc_amount", /net\s*(profit|loss)|शुद्ध\s*(लाभ|हानि)|वर्ष\s*के\s*लिए\s*(लाभ|हानि)/i);
    // लाभ / हानि ka type: row ke label se
    const plRe = /net\s*(profit|loss)|शुद्ध\s*(लाभ|हानि)|वर्ष\s*के\s*लिए\s*(लाभ|हानि)/i;
    const plRow = [].concat((pnl || []).map(r => r.exp_details), (pnl || []).map(r => r.inc_details)).find(n => plRe.test(String(n || "")));
    if (plRow) out.pl_type = /हानि|loss/i.test(plRow) ? "हानि" : "लाभ";
    const lastRow = (bs || []).map(r => String(r.liability_name || "")).find(n => /गत\s*(लाभ|हानि)/.test(n));
    if (lastRow) {
        out.last_pl_type = /हानि/.test(lastRow) ? "हानि" : "लाभ";
        out.last_p_l = find(bs, "liability_name", "liability_amount", /गत\s*(लाभ|हानि)/);
    }
    out.hissa = find(bs, "liability_name", "liability_amount", /share\s*capital|हिस्सा\s*(पूंजी|राशि)/i);
    out.Vamanat = find(bs, "liability_name", "liability_amount", /(deposit|अमानत).*(manager|व्यवस्थापक)|(manager|व्यवस्थापक).*(deposit|अमानत)/i);
    out.amanat = find(bs, "liability_name", "liability_amount", /deposit|अमानत/i, /manager|व्यवस्थापक/i);
    return out;
}

const ALL_FORM_KEYS = ["Samiti_Name","Punjiyan_Number","date","Auditor","Gat_Auditor","Vyavasthapak","Member","Village","category","Committee_Meetings_Count","Turnover","auditfee","vetan","hissa","amanat","Vamanat","Closing_balance","last_cash","p_l","last_p_l","pl_type","last_pl_type","Est_Exp_Current","Est_Exp_Last"];
const AMOUNT_KEYS = ["auditfee","vetan","hissa","amanat","Vamanat","Closing_balance","last_cash","p_l","last_p_l","Est_Exp_Current","Est_Exp_Last"];

// 'प्रोफाइल' sheet: col A = code, col C = value
function readProfile(json) {
    const out = {};
    for (const row of json) {
        const key = String(row[0] || "").trim();
        if (!ALL_FORM_KEYS.includes(key)) continue;
        let v = row[2];
        if (v === undefined || v === null || v === "") continue;
        if (v instanceof Date) {
            const dd = String(v.getDate()).padStart(2, '0'), mm = String(v.getMonth() + 1).padStart(2, '0');
            v = dd + "." + mm + "." + v.getFullYear();
        } else if (AMOUNT_KEYS.includes(key)) {
            const n = parseFloat(String(v).replace(/,/g, ''));
            if (!isNaN(n)) v = n.toFixed(2);
        } else if (typeof v === 'number') {
            v = String(Math.round(v * 100) / 100);
        }
        out[key] = String(v).trim();
    }
    return out;
}

function autoFillForm(d, profile) {
    profile = profile || {};
    const fallback = extractFields(d), filled = [], manual = [];
    for (const key of ALL_FORM_KEYS) {
        const el = document.getElementById("input_" + key);
        if (!el) continue;
        const val = profile[key] !== undefined ? profile[key] : fallback[key];
        if (val !== null && val !== undefined && val !== "") {
            // user ne portal par haath se likha ho to overwrite na karein
            if (el.value === "" || el.dataset.auto === "1") {
                el.value = val; el.dataset.auto = "1"; el.classList.add('autofilled'); filled.push(el.closest('.form-group').querySelector('label').innerText);
            }
        } else if (el.value === "") manual.push(el.closest('.form-group').querySelector('label').innerText);
    }
    return { filled, manual };
}
document.querySelectorAll('#gssForm input').forEach(i => i.addEventListener('input', () => { i.dataset.auto = "0"; i.classList.remove('autofilled'); }));

// --- 2. Excel Upload & Parsing ---
const excelInput = document.getElementById('excelFile');
const uploadFeedback = document.getElementById('uploadFeedback');
const dataCheck = document.getElementById('dataCheck');

excelInput?.addEventListener('click', function() { this.value = ''; });
excelInput?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') {
        uploadFeedback.innerHTML = '<span style="color:red;">❌ Excel library load nahi hui (internet/CDN check karein) aur page reload karein.</span>';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});
            
            const norm = s => String(s).toLowerCase().replace(/[\s_]/g, '');
            const isEmpty = c => c === undefined || c === null || c === "";
            const fmt = (key, v) => {
                if (!/amount/.test(key)) return v;
                if (typeof v === 'number') return v.toFixed(2);
                const t = String(v).trim();
                if (/^-?[\d,]+(\.\d+)?$/.test(t)) return parseFloat(t.replace(/,/g, '')).toFixed(2);   // "587,139.25" -> "587139.25"
                return v;
            };

            // Har table ke liye supported sheet layouts (pehla jo mile wahi use hoga)
            const LAYOUTS = {
                income: { keys: ["income_name","income_amount","expense_name","expense_amount"], options: [
                    { names: ["आय व्यय"], start: "auto", cols: [0,1,2,3], stop: true },
                    { names: ["R&P","RP","Receipts&Payments"], start: 4, cols: [0,3,5,8], stop: true } ] },
                trading: { keys: ["purchase_name","purchase_amount","sale_name","sale_amount"], optional: true, options: [
                    { names: ["व्यापार खाता"], start: "auto", cols: [0,1,2,3], stop: true },
                    { names: ["Trading"], start: 5, cols: [0,1,3,4], stop: true } ] },
                pnl: { keys: ["exp_details","exp_amount","inc_details","inc_amount"], options: [
                    { names: ["लाभ हानि"], start: "auto", cols: [0,1,2,3], stop: true },
                    { names: ["P&L","PL","ProfitLoss","Profit&Loss"], start: 5, cols: [0,1,3,4], stop: true } ] },
                bs: { keys: ["liability_name","liability_amount_prev","liability_amount","asset_name","asset_amount_prev","asset_amount"], options: [
                    { names: ["तुलन पत्र"], start: "auto", cols: [0,1,2,3,4,5], stop: true },
                    { names: ["BalanceSheet","Balance Sheet"], start: 5, cols: [0,-1,1,3,-1,4], stop: true } ] }
            };

            const mapRows = (json, keys, opt) => {
                const objects = [];
                let startRow = opt.start;
                if (startRow === "auto") {
                    // header row = pehli row (pehli 8 me) jisme 'राशि' / 'Amount' / '31.03' likha ho; data uske agle row se
                    startRow = 4;
                    for (let h = 0; h < Math.min(json.length, 8); h++) {
                        const cells = json[h] || [];
                        const dateCols = cells.filter(c => /^\s*31\.03\.\d{4}\s*$/.test(String(c))).length;
                        if (cells.some(c => /राशि|amount/i.test(String(c))) || dateCols >= 2) { startRow = h + 1; break; }
                    }
                }
                for (let i = startRow; i < json.length; i++) {
                    const row = json[i];
                    if (!row || !row.some(c => !isEmpty(c))) {
                        if (opt.stop && objects.length) break;   // data ke baad khali row = table khatam
                        continue;
                    }
                    const obj = {};
                    keys.forEach((key, k) => {
                        const ci = opt.cols[k];
                        const v = ci >= 0 ? row[ci] : "";
                        obj[key] = (isEmpty(v) || v === "NaN") ? "" : fmt(key, v);
                    });
                    objects.push(obj);
                    const first = String(row[0] === undefined ? "" : row[0]).trim().toLowerCase();
                    if (opt.stop && (first === "total" || first === "योग")) break;
                }
                return objects;
            };

            const missing = [];
            const used = [];
            const targetKey = { income: "income_items", trading: "trading_items", pnl: "pnl_items", bs: "bs_items" };
            for (const t of Object.keys(LAYOUTS)) {
                const cfg = LAYOUTS[t];
                let found = false;
                for (const opt of cfg.options) {
                    const sheetName = workbook.SheetNames.find(n => opt.names.map(norm).includes(norm(n)));
                    if (sheetName) {
                        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1, blankrows: true, defval: ""});
                        finalReportData[targetKey[t]] = mapRows(json, cfg.keys, opt);
                        used.push(sheetName + " (" + finalReportData[targetKey[t]].length + " rows)");
                        found = true; break;
                    }
                }
                if (!found) { finalReportData[targetKey[t]] = []; if (!cfg.optional) missing.push(cfg.options.map(o => o.names[0]).join(" / ")); }
            }
            if (missing.length) { uploadFeedback.innerHTML = `<span style="color:red;">❌ ये sheets नहीं मिलीं: ${missing.join(' | ')}<br>Excel में मिली sheets: ${workbook.SheetNames.join(', ')}</span>`; return; }
            const profileSheet = workbook.SheetNames.find(n => ['प्रोफाइल','profile'].includes(norm(n)));
            const profile = profileSheet ? readProfile(XLSX.utils.sheet_to_json(workbook.Sheets[profileSheet], {header: 1, blankrows: false, defval: ""})) : {};
            const af = autoFillForm(finalReportData, profile);
            uploadFeedback.innerHTML = `<span style="color: var(--success);">✅ Excel loaded: ${used.join(', ')}.</span>` +
                (af.filled.length ? `<br><span style="color: var(--success);">✍️ Auto-fill hua (${af.filled.length}): ${af.filled.join(', ')}</span>` : '') +
                (af.manual.length ? `<br><span style="color:#854d0e;">✋ Excel me nahi mila, 'Edit Profile' me bharein: ${af.manual.join(', ')}</span>` : '') +
                ``;
            document.getElementById('statusText').innerText = "Excel Data Loaded";
            document.getElementById('statusText').className = "status-badge success";
            
            isExcelReady = true;
            dataCheck.innerText = "✅";
            checkReadyState();

        } catch (error) {
            uploadFeedback.innerHTML = `<span style="color: red;">❌ Error parsing Excel: ${error.message}</span>`;
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
});

// --- 3. Form Save Logic ---
const formCheck = document.getElementById('formCheck');
document.getElementById('saveDataBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const inputs = document.querySelectorAll('#gssForm input');
    inputs.forEach(input => {
        finalReportData[input.dataset.key] = input.value || "";
    });
    // Template-safe aliases (no spaces / & in tag names)
    finalReportData.Closing_balance = finalReportData["Closing balance"];
    finalReportData.p_l = finalReportData["p&l"];
    finalReportData.last_p_l = finalReportData["last p&l"];
    finalReportData.last_cash = finalReportData["last cash"];

    // --- लाभ / हानि apne aap: राशि positive, शब्द type ke hisaab se ---
    const parseAmt = v => {
        const t = String(v || "").trim();
        const neg = /^\(.*\)$/.test(t) || /^[-−]/.test(t);
        const n = parseFloat(t.replace(/[(),\s₹−-]/g, ""));
        return { has: t !== "" && !isNaN(n), n: isNaN(n) ? 0 : Math.abs(n), neg };
    };
    const typeOf = (v, neg) => /हानि|loss|नुकसान/i.test(String(v || "")) ? "हानि" : (/लाभ|profit|मुनाफा/i.test(String(v || "")) ? "लाभ" : (neg ? "हानि" : "लाभ"));
    const cur = parseAmt(finalReportData["p&l"]);
    const curType = typeOf(finalReportData.pl_type, cur.neg);
    finalReportData.pl_word = curType;
    finalReportData.p_l = cur.has ? cur.n.toFixed(2) : "";
    finalReportData.profit_amt = cur.has ? (curType === "लाभ" ? cur.n.toFixed(2) : "0.00") : "";
    finalReportData.loss_amt = cur.has ? (curType === "हानि" ? cur.n.toFixed(2) : "0.00") : "";
    const last = parseAmt(finalReportData["last p&l"]);
    const lastType = typeOf(finalReportData.last_pl_type, last.neg);
    finalReportData.last_pl_word = lastType;
    finalReportData.last_pl_verb = lastType === "हानि" ? "रही" : "रहा";
    finalReportData.last_p_l = last.has ? last.n.toFixed(2) : "";
    
    isFormReady = true;
    formCheck.innerText = "✅";
    alert("Profile Data Saved Successfully! You can now Generate the Report.");
    checkReadyState();
});

function checkReadyState() {
    if(isExcelReady && isFormReady) {
        document.getElementById('generateDocBtn').disabled = false;
    }
}

// --- 4. Word Document Generation (FIXED) ---
document.getElementById('generateDocBtn')?.addEventListener('click', () => {
    if (!isExcelReady || !isFormReady) {
        alert("Please complete both Excel upload and Profile Form.");
        return;
    }

    const templateUrl = "templates/gss/report-template.docx";

    fetch(templateUrl)
        .then(response => {
            if (!response.ok) throw new Error("Could not find Word Template. Ensure it is uploaded at templates/gss/report-template.docx");
            return response.arrayBuffer();
        })
        .then(content => {
            if (content.byteLength < 100) throw new Error("Word template khali/corrupt hai (" + content.byteLength + " bytes). Sahi .docx upload karein.");
            // डायरेक्ट PizZip और docxtemplater का इस्तेमाल
            const zip = new window.PizZip(content);
            const doc = new window.docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{{', end: '}}' },
                nullGetter: () => "",
            });

            doc.render(finalReportData);

            const out = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            
            const samitiName = finalReportData["Samiti_Name"] ? finalReportData["Samiti_Name"].replace(/ /g, "_") : "Report";
            
            window.saveAs(out, `GSS_Audit_${samitiName}.docx`);
        })
        .catch(error => {
            let msg = error.message;
            if (error.properties && error.properties.errors) {
                msg = error.properties.errors.map(er => er.properties.explanation || er.message).join("\n");
            }
            alert("Generation Error: " + msg);
            console.error(error);
        });
});
