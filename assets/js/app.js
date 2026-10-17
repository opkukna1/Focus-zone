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
            const workbook = XLSX.read(data, {type: 'array'});
            
            const norm = s => String(s).toLowerCase().replace(/[\s_]/g, '');
            const isEmpty = c => c === undefined || c === null || c === "";
            const fmt = (key, v) => (typeof v === 'number' && /amount/.test(key)) ? v.toFixed(2) : v;

            // Har table ke liye supported sheet layouts (pehla jo mile wahi use hoga)
            const LAYOUTS = {
                income: { keys: ["income_name","income_amount","expense_name","expense_amount"], options: [
                    { names: ["आय व्यय"], start: 3, cols: [0,1,2,3], stop: false },
                    { names: ["R&P","RP","Receipts&Payments"], start: 4, cols: [0,3,5,8], stop: true } ] },
                trading: { keys: ["purchase_name","purchase_amount","sale_name","sale_amount"], optional: true, options: [
                    { names: ["व्यापार खाता"], start: 3, cols: [0,1,2,3], stop: false },
                    { names: ["Trading"], start: 5, cols: [0,1,3,4], stop: true } ] },
                pnl: { keys: ["exp_details","exp_amount","inc_details","inc_amount"], options: [
                    { names: ["लाभ हानि"], start: 3, cols: [0,1,2,3], stop: false },
                    { names: ["P&L","PL","ProfitLoss","Profit&Loss"], start: 5, cols: [0,1,3,4], stop: true } ] },
                bs: { keys: ["liability_name","liability_amount_prev","liability_amount","asset_name","asset_amount_prev","asset_amount"], options: [
                    { names: ["तुलन पत्र"], start: 3, cols: [0,1,2,3,4,5], stop: false },
                    { names: ["BalanceSheet","Balance Sheet"], start: 5, cols: [0,-1,1,3,-1,4], stop: true } ] }
            };

            const mapRows = (json, keys, opt) => {
                const objects = [];
                for (let i = opt.start; i < json.length; i++) {
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
            uploadFeedback.innerHTML = `<span style="color: var(--success);">✅ Excel loaded: ${used.join(', ')}. Ab 'Edit Profile' par jayein.</span>`;
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
