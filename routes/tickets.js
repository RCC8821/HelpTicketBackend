// const express = require('express');
// const router = express.Router();
// const { Readable } = require('stream');
// const { sheets, spreadsheetId, drive } = require('../config/googleSheet');

// const TICKET_SHEET = 'Help_Ticket_FMS';
// const DOER_SHEET = 'Doer_Name';
// const LOC_SHEET = 'Location';
// const TARGET_SHEET = 'Target';
// const HISTORY_SHEET = 'Revised_History';
// const FOLDER_ID = '14ohjIcYwV3RCXvmVHGBvsqorFTuqEq0p';
// const LAST_COL = 'AZ';

// // ---------- Helpers ----------
// const cleanKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// const pad = (n) => String(n).padStart(2, '0');

// // IST time (server kahin bhi ho)
// const nowIST = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
// const fmtDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
// const fmtDateTime = (d) => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// function formatDateForSheet(val) {
//   if (!val) return '';
//   const s = String(val).trim();
//   const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
//   if (m) return `${m[3]}/${m[2]}/${m[1]}`;
//   return s;
// }

// const colLetter = (idx) => {
//   let n = idx + 1, s = '';
//   while (n > 0) {
//     const m = (n - 1) % 26;
//     s = String.fromCharCode(65 + m) + s;
//     n = Math.floor((n - 1) / 26);
//   }
//   return s;
// };

// // Lock
// let lockChain = Promise.resolve();
// const withLock = (fn) => {
//   const run = lockChain.then(fn);
//   lockChain = run.catch(() => {});
//   return run;
// };

// // Recent submissions (duplicate guard)
// const recentSubmits = new Map();

// function findColIndex(headers, aliases) {
//   if (!headers || !Array.isArray(headers)) return -1;
//   for (const alias of aliases) {
//     const t = cleanKey(alias);
//     const idx = headers.findIndex((h) => cleanKey(h) === t);
//     if (idx !== -1) return idx;
//   }
//   for (const alias of aliases) {
//     const t = cleanKey(alias);
//     if (t.length < 3) continue;
//     const idx = headers.findIndex((h) => cleanKey(h).includes(t) || t.includes(cleanKey(h)));
//     if (idx !== -1) return idx;
//   }
//   return -1;
// }

// const getVal = (row, idx) => (idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '');

// function parseSheetDate(val) {
//   if (!val) return null;
//   if (val instanceof Date && !isNaN(val.getTime())) return val;
//   let str = String(val).trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
//   if (!str) return null;

//   const match = str.match(/^(\d{1,4})[\/\.-](\d{1,4})[\/\.-](\d{1,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
//   if (match) {
//     let p1 = parseInt(match[1], 10), p2 = parseInt(match[2], 10), p3 = parseInt(match[3], 10);
//     const h = match[4] ? parseInt(match[4], 10) : 0;
//     const m = match[5] ? parseInt(match[5], 10) : 0;
//     const s = match[6] ? parseInt(match[6], 10) : 0;
//     let year, month, day;
//     if (p1 > 1000) { year = p1; month = p2 - 1; day = p3; }
//     else {
//       if (p3 < 100) p3 += 2000;
//       year = p3;
//       if (p1 > 12) { day = p1; month = p2 - 1; }
//       else if (p2 > 12) { day = p2; month = p1 - 1; }
//       else { day = p1; month = p2 - 1; }
//     }
//     const d = new Date(year, month, day, h, m, s);
//     if (!isNaN(d.getTime())) return d;
//   }
//   const dFallback = new Date(str);
//   return isNaN(dFallback.getTime()) ? null : dFallback;
// }

// // Exact header map (row 6)
// async function getHeaderMap() {
//   const res = await sheets.spreadsheets.values.get({
//     spreadsheetId,
//     range: `${TICKET_SHEET}!A6:${LAST_COL}6`,
//   });
//   const headers = (res.data.values && res.data.values[0]) || [];
//   const H = {};
//   headers.forEach((h, i) => { if (h) H[String(h).trim()] = i; });
//   return { H, colCount: Math.max(headers.length, 1) };
// }

// // Flexible set helper (Exact match ya cleaned match dono support karega)
// const setFlex = (H, rowData, headerAliases, value) => {
//   const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
//   for (const alias of aliases) {
//     // 1. Exact match
//     if (H[alias] !== undefined) {
//       rowData[H[alias]] = value;
//       return true;
//     }
//     // 2. Cleaned match
//     const targetKey = cleanKey(alias);
//     for (const key in H) {
//       if (cleanKey(key) === targetKey) {
//         rowData[H[key]] = value;
//         return true;
//       }
//     }
//   }
//   return false;
// };

// // Drive upload (Fixed Base64 & Permission Handling)
// async function saveFile(fileInput, defaultName, mimeType) {
//   if (!drive || !fileInput) {
//     console.error('❌ Drive instance missing or fileInput empty');
//     return '';
//   }
//   try {
//     // String (Base64) or Object format extract karein
//     let rawData = typeof fileInput === 'string' ? fileInput : (fileInput.data || fileInput.base64 || fileInput.url || '');
//     let fileName = (typeof fileInput === 'object' && fileInput.name) ? fileInput.name : defaultName;
//     let fileMime = (typeof fileInput === 'object' && fileInput.type) ? fileInput.type : (mimeType || 'image/jpeg');

//     if (!rawData) {
//       console.error('❌ No Base64 data found in fileInput');
//       return '';
//     }

//     // 🔥 FIX: Clean Base64 Data URI Prefix (data:image/png;base64,...)
//     const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');

//     const buffer = Buffer.from(cleanBase64, 'base64');

//     console.log(`⏳ Uploading "${fileName}" (${buffer.length} bytes) to Google Drive...`);

//     const r = await drive.files.create({
//       requestBody: { name: fileName, parents: [FOLDER_ID] },
//       media: { mimeType: fileMime, body: Readable.from(buffer) },
//       fields: 'id, webViewLink',
//       supportsAllDrives: true,
//     });

//     if (r.data && r.data.id) {
//       try {
//         await drive.permissions.create({
//           fileId: r.data.id,
//           requestBody: { role: 'reader', type: 'anyone' },
//           supportsAllDrives: true,
//         });
//       } catch (permErr) {
//         console.warn('⚠️ Permission warning:', permErr.message);
//       }
//       console.log('✅ File uploaded successfully! Link:', r.data.webViewLink);
//       return r.data.webViewLink || '';
//     }
//     return '';
//   } catch (e) {
//     console.error('❌ saveFile Error:', e.message);
//     return '';
//   }
// }

// async function getUserTargets(userName) {
//   try {
//     const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TARGET_SHEET}!A1:C100` });
//     const rows = res.data.values || [];
//     if (rows.length < 2) return { monthTarget: null, weekTarget: null };
//     const t = cleanKey(userName);
//     for (let i = 1; i < rows.length; i++) {
//       if (cleanKey(rows[i][0]) === t) {
//         const mv = rows[i][1], wv = rows[i][2];
//         return {
//           monthTarget: mv !== undefined && mv !== '' ? Number(mv) : null,
//           weekTarget: wv !== undefined && wv !== '' ? Number(wv) : null,
//         };
//       }
//     }
//   } catch (e) {}
//   return { monthTarget: null, weekTarget: null };
// }

// // ---------- 1) Dropdowns ----------
// router.get('/dropdowns', async (req, res) => {
//   try {
//     const locRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${LOC_SHEET}!A2:A1000` });
//     const doerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${DOER_SHEET}!A2:B1000` });

//     const locations = (locRes.data.values || []).flat().filter(Boolean);
//     const doers = doerRes.data.values || [];
//     const pcs = doers.filter((d) => d[1] && cleanKey(d[1]) === 'pc').map((d) => d[0]);
//     const solvers = doers.map((d) => d[0]).filter(Boolean);

//     res.json({ success: true, locations, pcs, solvers });
//   } catch (error) {
//     console.error('Dropdown Error:', error);
//     res.status(500).json({ success: false, locations: [], pcs: [], solvers: [] });
//   }
// });

// // ---------- 2) Tickets list + myStats ----------
// router.get('/', async (req, res) => {
//   const { userName, filterType } = req.query;
//   if (!userName) return res.status(400).json({ success: false, message: 'User name required' });

//   try {
//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId,
//       range: `${TICKET_SHEET}!A6:${LAST_COL}5000`,
//     });

//     const rows = response.data.values || [];
//     const emptyStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
//     if (rows.length < 2) {
//       return res.json({ success: true, data: [], counts: { action: 0, raised: 0, assigned: 0 }, myStats: emptyStats });
//     }

//     const headers = rows[0];
//     const dataRows = rows.slice(1);

//     const c = (aliases) => findColIndex(headers, aliases);
//     const colTimestamp = c(['Timestamp', 'Time', 'Date']);
//     const colTicketId = c(['Help_Ticket_No', 'Help Ticket No', 'Ticket_No']);
//     const colRaiser = c(['Raised_By', 'Raised By', 'Raiser']);
//     const colPC = c(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC']);
//     const colSolver = c(['Problem_Solver', 'Problem Solver', 'Solver', 'Doer']);
//     const colIssue = c(['Issue', 'Problem']);
//     const colLoc = c(['Location', 'Loc']);
//     const colPrio = c(['Priority']);
//     const colDate = c(['Desired_Date']);
//     const colImage = c(['Image_Upload', 'Image Upload', 'Image', 'Proof']);
//     const colStatus1 = c(['Status_1']);
//     const colRemark1 = c(['Remark_1']);
//     const colPlanned = c(['Doers_Planned_Date']);
//     const colActual = c(['Doers_Actual_Date']);
//     const colReviseCount = c(['Revise_Count']);
//     const colReviseDate = c(['Revise_Date']);
//     const colStatus2 = c(['Status_2']);
//     const colProof = c(['Proof_Upload_2', 'Proof Upload 2', 'Proof']);
//     const colRemark2 = c(['Remark_2']);
//     const colStatus3 = c(['Status_3']);
//     const colRemark3 = c(['Remark_3']);
//     const colStatus4 = c(['Status_4']);
//     const colRating = c(['Rating']);
//     const colReraise = c(['Reraise_Date']);

//     const now = nowIST();
//     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
//     const dow = todayStart.getDay();
//     const diffToMonday = dow === 0 ? 6 : dow - 1;
//     const weekStart = new Date(todayStart);
//     weekStart.setDate(todayStart.getDate() - diffToMonday);
//     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

//     const me = cleanKey(userName);
//     const counts = { action: 0, raised: 0, assigned: 0 };
//     const myStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
//     const filteredData = [];

//     dataRows.forEach((row) => {
//       const ticketId = getVal(row, colTicketId);
//       if (!ticketId) return;

//       const raiserRaw = getVal(row, colRaiser);
//       const pcRaw = getVal(row, colPC);
//       const solverRaw = getVal(row, colSolver);

//       const isRaiserMe = cleanKey(raiserRaw) === me;
//       const isPcMe = cleanKey(pcRaw) === me;
//       const isSolverMe = cleanKey(solverRaw) === me;

//       const s1 = cleanKey(getVal(row, colStatus1));
//       const s2 = cleanKey(getVal(row, colStatus2));
//       const s3 = cleanKey(getVal(row, colStatus3));
//       const s4 = cleanKey(getVal(row, colStatus4));

//       const tsDate = parseSheetDate(getVal(row, colTimestamp));
//       if (tsDate) {
//         if (isRaiserMe) {
//           if (tsDate >= weekStart) myStats.weekRaised++;
//           if (tsDate >= monthStart) myStats.monthRaised++;
//         }
//         if (isSolverMe && s2 === 'solved') {
//           if (tsDate >= weekStart) myStats.weekSolved++;
//           if (tsDate >= monthStart) myStats.monthSolved++;
//         }
//       }

//       if (s4 === 'closed' || s1 === 'reject') return;

//       const isAssignedToMe = isPcMe || isSolverMe;
//       const isActionable =
//         (isPcMe && s1 !== 'done') ||
//         (isSolverMe && s1 === 'done' && s2 !== 'solved') ||
//         (isPcMe && s2 === 'solved' && s3 !== 'verified') ||
//         (isRaiserMe && s3 === 'verified');

//       if (isActionable) counts.action++;
//       if (isRaiserMe) counts.raised++;
//       if (isAssignedToMe) counts.assigned++;

//       const include =
//         (filterType === 'action' && isActionable) ||
//         (filterType === 'raised' && isRaiserMe) ||
//         (filterType === 'assigned' && isAssignedToMe);

//       if (include) {
//         filteredData.push({
//           ticketId,
//           timestamp: getVal(row, colTimestamp),
//           issue: getVal(row, colIssue) || 'No description',
//           location: getVal(row, colLoc) || 'N/A',
//           raiser: raiserRaw || 'Unknown',
//           pc: pcRaw || 'N/A',
//           solver: solverRaw || 'Unknown',
//           priority: getVal(row, colPrio) || 'Low',
//           desiredDate: getVal(row, colDate) || '',
//           image: getVal(row, colImage),
//           status1: getVal(row, colStatus1),
//           remark1: getVal(row, colRemark1),
//           plannedDate: getVal(row, colPlanned),
//           actualDate: getVal(row, colActual),
//           reviseCount: getVal(row, colReviseCount) || '0',
//           reviseDate: getVal(row, colReviseDate),
//           status2: getVal(row, colStatus2),
//           proof: getVal(row, colProof),
//           remark2: getVal(row, colRemark2),
//           status3: getVal(row, colStatus3),
//           remark3: getVal(row, colRemark3),
//           status4: getVal(row, colStatus4),
//           rating: getVal(row, colRating),
//           reraiseDate: getVal(row, colReraise),
//         });
//       }
//     });

//     const targets = await getUserTargets(userName);
//     if (targets.monthTarget !== null) myStats.monthTarget = String(targets.monthTarget);
//     if (targets.weekTarget !== null) myStats.weekTarget = String(targets.weekTarget);

//     res.json({ success: true, data: filteredData.reverse(), counts, myStats });
//   } catch (error) {
//     console.error('Tickets Fetch Error:', error);
//     res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
//   }
// });

// // ---------- 3) Create Ticket ----------
// router.post('/create', (req, res) => {
//   const { loc, pc, solver, prio, date, issue, raisedBy, files, file } = req.body;

//   if (!loc || !issue || !pc || !solver) {
//     return res.status(400).json({ success: false, message: 'Please fill all required fields' });
//   }

//   // Duplicate guard
//   const key = [raisedBy, issue, loc, pc, solver].map((v) => String(v || '').trim()).join('|');
//   const last = recentSubmits.get(key);
//   if (last && Date.now() - last < 60000) {
//     return res.status(409).json({ success: false, message: 'Duplicate ticket detected. Please wait a minute.' });
//   }
//   recentSubmits.set(key, Date.now());
//   setTimeout(() => recentSubmits.delete(key), 65000);

//   withLock(async () => {
//     try {
//       const { H, colCount } = await getHeaderMap();
//       const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
//       if (idCol === undefined) throw new Error('Help_Ticket_No column not found in Header Row 6');
//       const idL = colLetter(idCol);

//       const idRes = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!${idL}7:${idL}5000`,
//       });
//       const idVals = idRes.data.values || [];

//       let maxNum = 0;
//       idVals.forEach((r) => {
//         const m = String((r && r[0]) || '').trim().match(/_(\d+)$/);
//         if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
//       });

//       let emptyIdx = idVals.findIndex((r) => !String((r && r[0]) || '').trim());
//       if (emptyIdx === -1) emptyIdx = idVals.length;
//       const targetRow = 7 + emptyIdx;

//       const now = nowIST();
//       const ticketId = `Help_${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)}_${String(maxNum + 1).padStart(3, '0')}`;

//       // Images Upload Processing (Handles Array or Single Object/String)
//       const inputFiles = Array.isArray(files) ? files : (files ? [files] : (file ? [file] : []));
//       const urls = [];

//       for (let i = 0; i < inputFiles.length; i++) {
//         const f = inputFiles[i];
//         const u = await saveFile(f, `${ticketId}_Issue_${i + 1}.jpg`);
//         if (u) urls.push(u);
//       }

//       console.log(`📁 Uploaded ${urls.length} file(s) for Ticket ${ticketId}:`, urls);

//       // Formulas preserve logic
//       const fRes = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!A${targetRow}:${LAST_COL}${targetRow}`,
//         valueRenderOption: 'FORMULA',
//       });
//       const existing = (fRes.data.values && fRes.data.values[0]) || [];
//       const total = Math.max(colCount, existing.length);
//       const rowData = new Array(total).fill('');

//       const set = (alias, val) => setFlex(H, rowData, alias, val);

//       set(['Timestamp', 'Time'], fmtDateTime(now));
//       set(['Help_Ticket_No', 'Help Ticket No'], ticketId);
//       set(['Location', 'Loc'], loc);
//       set(['Raised_By', 'Raised By'], raisedBy || '');
//       set(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC'], pc);
//       set(['Issue', 'Problem'], issue);
//       set(['Problem_Solver', 'Problem Solver'], solver);
//       set(['Desired_Date', 'Desired Date'], formatDateForSheet(date));
//       set(['Image_Upload', 'Image Upload', 'Image', 'Proof'], urls.join(', '));
//       set(['Priority'], prio || 'Low');
//       set(['Status_1', 'Status 1'], '');

//       // Existing Formulas retain
//       for (let i = 0; i < existing.length; i++) {
//         if (typeof existing[i] === 'string' && existing[i].startsWith('=') && !rowData[i]) {
//           rowData[i] = existing[i];
//         }
//       }

//       await sheets.spreadsheets.values.update({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!A${targetRow}:${colLetter(total - 1)}${targetRow}`,
//         valueInputOption: 'USER_ENTERED',
//         requestBody: { values: [rowData] },
//       });

//       console.log(`✅ Saved Ticket ${ticketId} at Row ${targetRow}`);
//       res.json({ success: true, message: 'Ticket raised successfully!', ticketId });
//     } catch (error) {
//       console.error('Create Ticket Error:', error);
//       recentSubmits.delete(key);
//       res.status(500).json({ success: false, message: 'Failed to create ticket: ' + error.message });
//     }
//   });
// });

// // ---------- 4) Ticket Actions ----------
// router.post('/action', (req, res) => {
//   console.log('📥 ACTION RAW BODY:', JSON.stringify(req.body, null, 2));

//   const body = req.body || {};
//   const actionType = body.actionType || body.action || '';
//   const payload = (body.payload && typeof body.payload === 'object') ? body.payload : body;
//   const ticketId = payload.ticketId || body.ticketId || payload.id || body.id || '';

//   if (!actionType || !ticketId) {
//     return res.status(400).json({
//       success: false,
//       message: 'actionType and ticketId required',
//       received: { actionType, ticketId, bodyKeys: Object.keys(body) },
//     });
//   }

//   payload.ticketId = ticketId;

//   withLock(async () => {
//     try {
//       const { H } = await getHeaderMap();
//       const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
//       const idL = colLetter(idCol);

//       const idRes = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!${idL}7:${idL}5000`,
//       });
//       const ids = (idRes.data.values || []).map((r) => String((r && r[0]) || '').trim());
//       const rowIdx = ids.indexOf(String(payload.ticketId).trim());
//       if (rowIdx === -1) return res.json({ success: false, message: 'Ticket Not Found' });
//       const row = rowIdx + 7;

//       const rowRes = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!A${row}:${LAST_COL}${row}`,
//       });
//       const rowVals = (rowRes.data.values && rowRes.data.values[0]) || [];

//       const now = nowIST();
//       const ts = fmtDateTime(now);
//       const updates = [];

//       const set = (headerAliases, value) => {
//         const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
//         for (const alias of aliases) {
//           if (H[alias] !== undefined) {
//             updates.push({ name: alias, value });
//             return;
//           }
//           const targetKey = cleanKey(alias);
//           for (const key in H) {
//             if (cleanKey(key) === targetKey) {
//               updates.push({ name: key, value });
//               return;
//             }
//           }
//         }
//       };

//       const cell = (alias) => {
//         const idx = findColIndex(Object.keys(H), Array.isArray(alias) ? alias : [alias]);
//         return (idx !== -1 && rowVals[idx] !== undefined) ? rowVals[idx] : '';
//       };

//       const lapsMinutes = (plannedName) => {
//         const p = parseSheetDate(cell(plannedName));
//         return p ? Math.round((now.getTime() - p.getTime()) / 60000) : null;
//       };

//       const logHistory = async (date, count) => {
//         try {
//           await sheets.spreadsheets.values.append({
//             spreadsheetId,
//             range: `${HISTORY_SHEET}!A1`,
//             valueInputOption: 'USER_ENTERED',
//             requestBody: { values: [[payload.ticketId, date, count]] },
//           });
//         } catch (e) { console.error('History log error:', e.message); }
//       };

//       if (actionType === 'step2') {
//         set(['Status_1', 'Status 1'], payload.status);
//         set(['Remark_1', 'Remark 1'], payload.remark || '');
//         set(['Doers_Planned_Date', 'Doers Planned Date'], formatDateForSheet(payload.nextDate));
//         set(['Actual_1', 'Actual 1'], ts);
//         const lap = lapsMinutes('Planned_1');
//         if (lap !== null) set(['check_Timelaps'], lap);
//       }
//       else if (actionType === 'step3') {
//         if (payload.subAction === 'revise') {
//           const cur = parseInt(cell('Revise_Count'), 10) || 0;
//           if (cur >= 3) return res.json({ success: false, message: 'Maximum 3 revisions allowed.' });
//           const newCount = cur + 1;
//           const rd = formatDateForSheet(payload.reviseDate);
//           set(['Revise_Count', 'Revise Count'], newCount);
//           set(['Revise_Date', 'Revise Date'], rd);
//           set(['Doers_Planned_Date', 'Doers Planned Date'], rd);
//           set(['Status_2', 'Status 2'], 'Pending Revision');
//           set(['Remark_2', 'Remark 2'], payload.remark || '');
//           await logHistory(rd, newCount);
//         } else {
//           const inputFiles = Array.isArray(payload.files) ? payload.files : (payload.files ? [payload.files] : (payload.file ? [payload.file] : []));
//           const urls = [];
//           for (let i = 0; i < inputFiles.length; i++) {
//             const u = await saveFile(inputFiles[i], `${payload.ticketId}_Proof_${i + 1}.jpg`);
//             if (u) urls.push(u);
//           }
//           set(['Doers_Actual_Date', 'Doers Actual Date'], ts);
//           set(['Status_2', 'Status 2'], 'Solved');
//           if (urls.length) set(['Proof_Upload_2', 'Proof Upload 2', 'Proof'], urls.join(', '));
//           set(['Remark_2', 'Remark 2'], payload.remark || '');
//         }
//       }
//       else if (actionType === 'step4') {
//         set(['Status_3', 'Status 3'], 'Verified');
//         set(['Remark_3', 'Remark 3'], payload.remark || '');
//         set(['Actual_3', 'Actual 3'], ts);
//         const lap = lapsMinutes('Planned_3');
//         if (lap !== null) set(['followup_Timelaps'], lap);
//       }
//       else if (actionType === 'step5') {
//         if (payload.subAction === 'close') {
//           set(['Status_4', 'Status 4'], 'Closed');
//           set(['Rating'], payload.rating);
//           set(['Actual_4', 'Actual 4'], ts);
//           const lap = lapsMinutes('Planned_4');
//           if (lap !== null) set(['final_Timelaps'], lap);
//         } else {
//           const newCount = (parseInt(cell('Revise_Count'), 10) || 0) + 1;
//           const rd = formatDateForSheet(payload.reraiseDate);
//           set(['Revise_Count', 'Revise Count'], newCount);
//           set(['Reraise_Date', 'Reraise Date'], rd);
//           set(['Doers_Planned_Date', 'Doers Planned Date'], rd);
//           set(['Status_4', 'Status 4'], 'Reraised');
//           set(['Status_2', 'Status 2'], 'Pending');
//           set(['Status_3', 'Status 3'], '');
//           set(['Revise_Date', 'Revise Date'], '');
//           await logHistory(rd, newCount);
//         }
//       }
//       else {
//         return res.status(400).json({ success: false, message: 'Unknown actionType: ' + actionType });
//       }

//       if (updates.length) {
//         await sheets.spreadsheets.values.batchUpdate({
//           spreadsheetId,
//           requestBody: {
//             valueInputOption: 'USER_ENTERED',
//             data: updates.map((u) => ({
//               range: `${TICKET_SHEET}!${colLetter(H[u.name])}${row}`,
//               values: [[u.value === undefined || u.value === null ? '' : u.value]],
//             })),
//           },
//         });
//       }

//       console.log('✅ Action success:', actionType, ticketId);
//       res.json({ success: true, message: 'Action completed successfully' });
//     } catch (error) {
//       console.error('Action Error:', error);
//       res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
//     }
//   });
// });

// module.exports = router;







const express = require('express');
const router = express.Router();
const { Readable } = require('stream');
const { sheets, spreadsheetId, drive } = require('../config/googleSheet');

const TICKET_SHEET = 'Help_Ticket_FMS';
const DOER_SHEET = 'Doer_Name';
const LOC_SHEET = 'Location';
const TARGET_SHEET = 'Target';
const HISTORY_SHEET = 'Revised_History';
const FOLDER_ID = '0ALRcS1YOamZmUk9PVA'; // Shared Drive Folder ID
const LAST_COL = 'AZ';

// ---------- Helpers ----------
const cleanKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pad = (n) => String(n).padStart(2, '0');

// IST time
const nowIST = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
const fmtDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateTime = (d) => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function formatDateForSheet(val) {
  if (!val) return '';
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

const colLetter = (idx) => {
  let n = idx + 1, s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Lock
let lockChain = Promise.resolve();
const withLock = (fn) => {
  const run = lockChain.then(fn);
  lockChain = run.catch(() => {});
  return run;
};

// Recent submissions (duplicate guard)
const recentSubmits = new Map();

function findColIndex(headers, aliases) {
  if (!headers || !Array.isArray(headers)) return -1;
  for (const alias of aliases) {
    const t = cleanKey(alias);
    const idx = headers.findIndex((h) => cleanKey(h) === t);
    if (idx !== -1) return idx;
  }
  for (const alias of aliases) {
    const t = cleanKey(alias);
    if (t.length < 3) continue;
    const idx = headers.findIndex((h) => cleanKey(h).includes(t) || t.includes(cleanKey(h)));
    if (idx !== -1) return idx;
  }
  return -1;
}

const getVal = (row, idx) => (idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '');

function parseSheetDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  let str = String(val).trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  if (!str) return null;

  const match = str.match(/^(\d{1,4})[\/\.-](\d{1,4})[\/\.-](\d{1,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    let p1 = parseInt(match[1], 10), p2 = parseInt(match[2], 10), p3 = parseInt(match[3], 10);
    const h = match[4] ? parseInt(match[4], 10) : 0;
    const m = match[5] ? parseInt(match[5], 10) : 0;
    const s = match[6] ? parseInt(match[6], 10) : 0;
    let year, month, day;
    if (p1 > 1000) { year = p1; month = p2 - 1; day = p3; }
    else {
      if (p3 < 100) p3 += 2000;
      year = p3;
      if (p1 > 12) { day = p1; month = p2 - 1; }
      else if (p2 > 12) { day = p2; month = p1 - 1; }
      else { day = p1; month = p2 - 1; }
    }
    const d = new Date(year, month, day, h, m, s);
    if (!isNaN(d.getTime())) return d;
  }
  const dFallback = new Date(str);
  return isNaN(dFallback.getTime()) ? null : dFallback;
}

// Exact header map (row 6)
async function getHeaderMap() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TICKET_SHEET}!A6:${LAST_COL}6`,
  });
  const headers = (res.data.values && res.data.values[0]) || [];
  const H = {};
  headers.forEach((h, i) => { if (h) H[String(h).trim()] = i; });
  return { H, colCount: Math.max(headers.length, 1) };
}

// Flexible set helper
const setFlex = (H, rowData, headerAliases, value) => {
  const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
  for (const alias of aliases) {
    if (H[alias] !== undefined) {
      rowData[H[alias]] = value;
      return true;
    }
    const targetKey = cleanKey(alias);
    for (const key in H) {
      if (cleanKey(key) === targetKey) {
        rowData[H[key]] = value;
        return true;
      }
    }
  }
  return false;
};

// 🔥 Google Drive Shared Drive Compatible Upload Function
async function saveFile(fileInput, defaultName) {
  if (!drive || !fileInput) {
    console.error('❌ Drive instance missing or fileInput empty');
    return '';
  }
  try {
    // Single string ho ya Object ({ base64, mimeType, name } ya { data, type, name })
    let rawData = typeof fileInput === 'string' 
      ? fileInput 
      : (fileInput.base64 || fileInput.data || fileInput.url || '');
      
    let fileName = (typeof fileInput === 'object' && fileInput.name) 
      ? fileInput.name 
      : defaultName;
      
    let fileMime = (typeof fileInput === 'object' && (fileInput.mimeType || fileInput.type)) 
      ? (fileInput.mimeType || fileInput.type) 
      : 'image/jpeg';

    if (!rawData) {
      console.error('❌ No Base64 data found in fileInput');
      return '';
    }

    // Base64 Data URI Prefix remove karein
    const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    console.log(`⏳ Uploading "${fileName}" (${buffer.length} bytes) to Drive...`);

    // Shared Drive Support Flags Added
    const r = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: fileMime,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
      supportsTeamDrives: true,
    });

    const fileId = r.data.id;

    if (fileId) {
      // Shared Drive Permission Set
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
          supportsTeamDrives: true,
        });
      } catch (permErr) {
        console.warn('⚠️ Permission warning:', permErr.message);
      }

      const link = r.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
      console.log('✅ File uploaded successfully! Link:', link);
      return link;
    }
    return '';
  } catch (e) {
    console.error('❌ saveFile Drive Error:', e.message);
    return '';
  }
}

async function getUserTargets(userName) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TARGET_SHEET}!A1:C100` });
    const rows = res.data.values || [];
    if (rows.length < 2) return { monthTarget: null, weekTarget: null };
    const t = cleanKey(userName);
    for (let i = 1; i < rows.length; i++) {
      if (cleanKey(rows[i][0]) === t) {
        const mv = rows[i][1], wv = rows[i][2];
        return {
          monthTarget: mv !== undefined && mv !== '' ? Number(mv) : null,
          weekTarget: wv !== undefined && wv !== '' ? Number(wv) : null,
        };
      }
    }
  } catch (e) {}
  return { monthTarget: null, weekTarget: null };
}

// ---------- 1) Dropdowns ----------
router.get('/dropdowns', async (req, res) => {
  try {
    const locRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${LOC_SHEET}!A2:A1000` });
    const doerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${DOER_SHEET}!A2:B1000` });

    const locations = (locRes.data.values || []).flat().filter(Boolean);
    const doers = doerRes.data.values || [];
    const pcs = doers.filter((d) => d[1] && cleanKey(d[1]) === 'pc').map((d) => d[0]);
    const solvers = doers.map((d) => d[0]).filter(Boolean);

    res.json({ success: true, locations, pcs, solvers });
  } catch (error) {
    console.error('Dropdown Error:', error);
    res.status(500).json({ success: false, locations: [], pcs: [], solvers: [] });
  }
});

// ---------- 2) Tickets list + myStats ----------
router.get('/', async (req, res) => {
  const { userName, filterType } = req.query;
  if (!userName) return res.status(400).json({ success: false, message: 'User name required' });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TICKET_SHEET}!A6:${LAST_COL}5000`,
    });

    const rows = response.data.values || [];
    const emptyStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
    if (rows.length < 2) {
      return res.json({ success: true, data: [], counts: { action: 0, raised: 0, assigned: 0 }, myStats: emptyStats });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const c = (aliases) => findColIndex(headers, aliases);
    const colTimestamp = c(['Timestamp', 'Time', 'Date']);
    const colTicketId = c(['Help_Ticket_No', 'Help Ticket No', 'Ticket_No']);
    const colRaiser = c(['Raised_By', 'Raised By', 'Raiser']);
    const colPC = c(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC']);
    const colSolver = c(['Problem_Solver', 'Problem Solver', 'Solver', 'Doer']);
    const colIssue = c(['Issue', 'Problem']);
    const colLoc = c(['Location', 'Loc']);
    const colPrio = c(['Priority']);
    const colDate = c(['Desired_Date']);
    const colImage = c(['Image_Upload', 'Image Upload', 'Image', 'Proof']);
    const colStatus1 = c(['Status_1']);
    const colRemark1 = c(['Remark_1']);
    const colPlanned = c(['Doers_Planned_Date']);
    const colActual = c(['Doers_Actual_Date']);
    const colReviseCount = c(['Revise_Count']);
    const colReviseDate = c(['Revise_Date']);
    const colStatus2 = c(['Status_2']);
    const colProof = c(['Proof_Upload_2', 'Proof Upload 2', 'Proof']);
    const colRemark2 = c(['Remark_2']);
    const colStatus3 = c(['Status_3']);
    const colRemark3 = c(['Remark_3']);
    const colStatus4 = c(['Status_4']);
    const colRating = c(['Rating']);
    const colReraise = c(['Reraise_Date']);

    const now = nowIST();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dow = todayStart.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - diffToMonday);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const me = cleanKey(userName);
    const counts = { action: 0, raised: 0, assigned: 0 };
    const myStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
    const filteredData = [];

    dataRows.forEach((row) => {
      const ticketId = getVal(row, colTicketId);
      if (!ticketId) return;

      const raiserRaw = getVal(row, colRaiser);
      const pcRaw = getVal(row, colPC);
      const solverRaw = getVal(row, colSolver);

      const isRaiserMe = cleanKey(raiserRaw) === me;
      const isPcMe = cleanKey(pcRaw) === me;
      const isSolverMe = cleanKey(solverRaw) === me;

      const s1 = cleanKey(getVal(row, colStatus1));
      const s2 = cleanKey(getVal(row, colStatus2));
      const s3 = cleanKey(getVal(row, colStatus3));
      const s4 = cleanKey(getVal(row, colStatus4));

      const tsDate = parseSheetDate(getVal(row, colTimestamp));
      if (tsDate) {
        if (isRaiserMe) {
          if (tsDate >= weekStart) myStats.weekRaised++;
          if (tsDate >= monthStart) myStats.monthRaised++;
        }
        if (isSolverMe && s2 === 'solved') {
          if (tsDate >= weekStart) myStats.weekSolved++;
          if (tsDate >= monthStart) myStats.monthSolved++;
        }
      }

      if (s4 === 'closed' || s1 === 'reject') return;

      const isAssignedToMe = isPcMe || isSolverMe;
      const isActionable =
        (isPcMe && s1 !== 'done') ||
        (isSolverMe && s1 === 'done' && s2 !== 'solved') ||
        (isPcMe && s2 === 'solved' && s3 !== 'verified') ||
        (isRaiserMe && s3 === 'verified');

      if (isActionable) counts.action++;
      if (isRaiserMe) counts.raised++;
      if (isAssignedToMe) counts.assigned++;

      const include =
        (filterType === 'action' && isActionable) ||
        (filterType === 'raised' && isRaiserMe) ||
        (filterType === 'assigned' && isAssignedToMe);

      if (include) {
        filteredData.push({
          ticketId,
          timestamp: getVal(row, colTimestamp),
          issue: getVal(row, colIssue) || 'No description',
          location: getVal(row, colLoc) || 'N/A',
          raiser: raiserRaw || 'Unknown',
          pc: pcRaw || 'N/A',
          solver: solverRaw || 'Unknown',
          priority: getVal(row, colPrio) || 'Low',
          desiredDate: getVal(row, colDate) || '',
          image: getVal(row, colImage),
          status1: getVal(row, colStatus1),
          remark1: getVal(row, colRemark1),
          plannedDate: getVal(row, colPlanned),
          actualDate: getVal(row, colActual),
          reviseCount: getVal(row, colReviseCount) || '0',
          reviseDate: getVal(row, colReviseDate),
          status2: getVal(row, colStatus2),
          proof: getVal(row, colProof),
          remark2: getVal(row, colRemark2),
          status3: getVal(row, colStatus3),
          remark3: getVal(row, colRemark3),
          status4: getVal(row, colStatus4),
          rating: getVal(row, colRating),
          reraiseDate: getVal(row, colReraise),
        });
      }
    });

    const targets = await getUserTargets(userName);
    if (targets.monthTarget !== null) myStats.monthTarget = String(targets.monthTarget);
    if (targets.weekTarget !== null) myStats.weekTarget = String(targets.weekTarget);

    res.json({ success: true, data: filteredData.reverse(), counts, myStats });
  } catch (error) {
    console.error('Tickets Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

// ---------- 3) Create Ticket ----------
router.post('/create', (req, res) => {
  const { loc, pc, solver, prio, date, issue, raisedBy, files, file, image } = req.body;

  if (!loc || !issue || !pc || !solver) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields' });
  }

  // Duplicate guard
  const key = [raisedBy, issue, loc, pc, solver].map((v) => String(v || '').trim()).join('|');
  const last = recentSubmits.get(key);
  if (last && Date.now() - last < 60000) {
    return res.status(409).json({ success: false, message: 'Duplicate ticket detected. Please wait a minute.' });
  }
  recentSubmits.set(key, Date.now());
  setTimeout(() => recentSubmits.delete(key), 65000);

  withLock(async () => {
    try {
      const { H, colCount } = await getHeaderMap();
      const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
      if (idCol === undefined) throw new Error('Help_Ticket_No column not found in Header Row 6');
      const idL = colLetter(idCol);

      const idRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!${idL}7:${idL}5000`,
      });
      const idVals = idRes.data.values || [];

      let maxNum = 0;
      idVals.forEach((r) => {
        const m = String((r && r[0]) || '').trim().match(/_(\d+)$/);
        if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
      });

      let emptyIdx = idVals.findIndex((r) => !String((r && r[0]) || '').trim());
      if (emptyIdx === -1) emptyIdx = idVals.length;
      const targetRow = 7 + emptyIdx;

      const now = nowIST();
      const ticketId = `Help_${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)}_${String(maxNum + 1).padStart(3, '0')}`;

      // Image Extraction (Support files, file, image, payload formats)
      const inputFiles = Array.isArray(files) ? files : (files ? [files] : (file ? [file] : (image ? [image] : [])));
      const urls = [];

      for (let i = 0; i < inputFiles.length; i++) {
        const f = inputFiles[i];
        const u = await saveFile(f, `${ticketId}_Issue_${i + 1}.jpg`);
        if (u) urls.push(u);
      }

      console.log(`📁 Saved ${urls.length} file URL(s) for ${ticketId}:`, urls);

      // Formulas preserve logic
      const fRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!A${targetRow}:${LAST_COL}${targetRow}`,
        valueRenderOption: 'FORMULA',
      });
      const existing = (fRes.data.values && fRes.data.values[0]) || [];
      const total = Math.max(colCount, existing.length);
      const rowData = new Array(total).fill('');

      const set = (alias, val) => setFlex(H, rowData, alias, val);

      set(['Timestamp', 'Time'], fmtDateTime(now));
      set(['Help_Ticket_No', 'Help Ticket No'], ticketId);
      set(['Location', 'Loc'], loc);
      set(['Raised_By', 'Raised By'], raisedBy || '');
      set(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC'], pc);
      set(['Issue', 'Problem'], issue);
      set(['Problem_Solver', 'Problem Solver'], solver);
      set(['Desired_Date', 'Desired Date'], formatDateForSheet(date));
      set(['Image_Upload', 'Image Upload', 'Image', 'Proof'], urls.join(', '));
      set(['Priority'], prio || 'Low');
      set(['Status_1', 'Status 1'], '');

      // Existing Formulas retain
      for (let i = 0; i < existing.length; i++) {
        if (typeof existing[i] === 'string' && existing[i].startsWith('=') && !rowData[i]) {
          rowData[i] = existing[i];
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TICKET_SHEET}!A${targetRow}:${colLetter(total - 1)}${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      console.log(`✅ Ticket ${ticketId} saved to Google Sheet Row ${targetRow}`);
      res.json({ success: true, message: 'Ticket raised successfully!', ticketId });
    } catch (error) {
      console.error('Create Ticket Error:', error);
      recentSubmits.delete(key);
      res.status(500).json({ success: false, message: 'Failed to create ticket: ' + error.message });
    }
  });
});

// ---------- 4) Ticket Actions ----------
router.post('/action', (req, res) => {
  console.log('📥 ACTION RAW BODY:', JSON.stringify(req.body, null, 2));

  const body = req.body || {};
  const actionType = body.actionType || body.action || '';
  const payload = (body.payload && typeof body.payload === 'object') ? body.payload : body;
  const ticketId = payload.ticketId || body.ticketId || payload.id || body.id || '';

  if (!actionType || !ticketId) {
    return res.status(400).json({
      success: false,
      message: 'actionType and ticketId required',
      received: { actionType, ticketId, bodyKeys: Object.keys(body) },
    });
  }

  payload.ticketId = ticketId;

  withLock(async () => {
    try {
      const { H } = await getHeaderMap();
      const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
      const idL = colLetter(idCol);

      const idRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!${idL}7:${idL}5000`,
      });
      const ids = (idRes.data.values || []).map((r) => String((r && r[0]) || '').trim());
      const rowIdx = ids.indexOf(String(payload.ticketId).trim());
      if (rowIdx === -1) return res.json({ success: false, message: 'Ticket Not Found' });
      const row = rowIdx + 7;

      const rowRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!A${row}:${LAST_COL}${row}`,
      });
      const rowVals = (rowRes.data.values && rowRes.data.values[0]) || [];

      const now = nowIST();
      const ts = fmtDateTime(now);
      const updates = [];

      const set = (headerAliases, value) => {
        const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
        for (const alias of aliases) {
          if (H[alias] !== undefined) {
            updates.push({ name: alias, value });
            return;
          }
          const targetKey = cleanKey(alias);
          for (const key in H) {
            if (cleanKey(key) === targetKey) {
              updates.push({ name: key, value });
              return;
            }
          }
        }
      };

      const cell = (alias) => {
        const idx = findColIndex(Object.keys(H), Array.isArray(alias) ? alias : [alias]);
        return (idx !== -1 && rowVals[idx] !== undefined) ? rowVals[idx] : '';
      };

      const lapsMinutes = (plannedName) => {
        const p = parseSheetDate(cell(plannedName));
        return p ? Math.round((now.getTime() - p.getTime()) / 60000) : null;
      };

      const logHistory = async (date, count) => {
        try {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${HISTORY_SHEET}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[payload.ticketId, date, count]] },
          });
        } catch (e) { console.error('History log error:', e.message); }
      };

      if (actionType === 'step2') {
        set(['Status_1', 'Status 1'], payload.status);
        set(['Remark_1', 'Remark 1'], payload.remark || '');
        set(['Doers_Planned_Date', 'Doers Planned Date'], formatDateForSheet(payload.nextDate));
        set(['Actual_1', 'Actual 1'], ts);
        const lap = lapsMinutes('Planned_1');
        if (lap !== null) set(['check_Timelaps'], lap);
      }
      else if (actionType === 'step3') {
        if (payload.subAction === 'revise') {
          const cur = parseInt(cell('Revise_Count'), 10) || 0;
          if (cur >= 3) return res.json({ success: false, message: 'Maximum 3 revisions allowed.' });
          const newCount = cur + 1;
          const rd = formatDateForSheet(payload.reviseDate);
          set(['Revise_Count', 'Revise Count'], newCount);
          set(['Revise_Date', 'Revise Date'], rd);
          set(['Doers_Planned_Date', 'Doers Planned Date'], rd);
          set(['Status_2', 'Status 2'], 'Pending Revision');
          set(['Remark_2', 'Remark 2'], payload.remark || '');
          await logHistory(rd, newCount);
        } else {
          const inputFiles = Array.isArray(payload.files) ? payload.files : (payload.files ? [payload.files] : (payload.file ? [payload.file] : (payload.image ? [payload.image] : [])));
          const urls = [];
          for (let i = 0; i < inputFiles.length; i++) {
            const u = await saveFile(inputFiles[i], `${payload.ticketId}_Proof_${i + 1}.jpg`);
            if (u) urls.push(u);
          }
          set(['Doers_Actual_Date', 'Doers Actual Date'], ts);
          set(['Status_2', 'Status 2'], 'Solved');
          if (urls.length) set(['Proof_Upload_2', 'Proof Upload 2', 'Proof'], urls.join(', '));
          set(['Remark_2', 'Remark 2'], payload.remark || '');
        }
      }
      else if (actionType === 'step4') {
        set(['Status_3', 'Status 3'], 'Verified');
        set(['Remark_3', 'Remark 3'], payload.remark || '');
        set(['Actual_3', 'Actual 3'], ts);
        const lap = lapsMinutes('Planned_3');
        if (lap !== null) set(['followup_Timelaps'], lap);
      }
      else if (actionType === 'step5') {
        if (payload.subAction === 'close') {
          set(['Status_4', 'Status 4'], 'Closed');
          set(['Rating'], payload.rating);
          set(['Actual_4', 'Actual 4'], ts);
          const lap = lapsMinutes('Planned_4');
          if (lap !== null) set(['final_Timelaps'], lap);
        } else {
          const newCount = (parseInt(cell('Revise_Count'), 10) || 0) + 1;
          const rd = formatDateForSheet(payload.reraiseDate);
          set(['Revise_Count', 'Revise Count'], newCount);
          set(['Reraise_Date', 'Reraise Date'], rd);
          set(['Doers_Planned_Date', 'Doers Planned Date'], rd);
          set(['Status_4', 'Status 4'], 'Reraised');
          set(['Status_2', 'Status 2'], 'Pending');
          set(['Status_3', 'Status 3'], '');
          set(['Revise_Date', 'Revise Date'], '');
          await logHistory(rd, newCount);
        }
      }
      else {
        return res.status(400).json({ success: false, message: 'Unknown actionType: ' + actionType });
      }

      if (updates.length) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updates.map((u) => ({
              range: `${TICKET_SHEET}!${colLetter(H[u.name])}${row}`,
              values: [[u.value === undefined || u.value === null ? '' : u.value]],
            })),
          },
        });
      }

      console.log('✅ Action success:', actionType, ticketId);
      res.json({ success: true, message: 'Action completed successfully' });
    } catch (error) {
      console.error('Action Error:', error);
      res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
  });
});

module.exports = router;