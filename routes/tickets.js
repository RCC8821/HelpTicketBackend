

// const express = require('express');
// const router = express.Router();
// const { Readable } = require('stream');
// const { sheets, spreadsheetId, drive } = require('../config/googleSheet');
// const NodeCache = require('node-cache');

// const appCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// const TICKET_SHEET = 'Help_Ticket_FMS';
// const DOER_SHEET = 'Doer_Name';
// const LOC_SHEET = 'Location';
// const TARGET_SHEET = 'Target';
// const HISTORY_SHEET = 'Revised_History';
// const FOLDER_ID = '0ALRcS1YOamZmUk9PVA';
// const LAST_COL = 'AZ';
// const MAX_ROW = 20000; 

// const CACHE_KEYS = {
//   TICKETS_RAW: 'raw_tickets_rows',
//   DROPDOWNS: 'dropdowns_data',
//   TARGETS: 'user_targets_raw'
// };

// const cleanKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// const pad = (n) => String(n).padStart(2, '0');
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

// let lockChain = Promise.resolve();
// const withLock = (fn) => {
//   const run = lockChain.then(fn);
//   lockChain = run.catch(() => {});
//   return run;
// };

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

// const setFlex = (H, rowData, headerAliases, value) => {
//   const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
//   for (const alias of aliases) {
//     if (H[alias] !== undefined) {
//       rowData[H[alias]] = value;
//       return true;
//     }
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

// async function saveFile(fileInput, defaultName) {
//   if (!drive || !fileInput) return '';
//   try {
//     let rawData = typeof fileInput === 'string' ? fileInput : (fileInput.base64 || fileInput.data || fileInput.url || '');
//     let fileName = (typeof fileInput === 'object' && fileInput.name) ? fileInput.name : defaultName;
//     let fileMime = (typeof fileInput === 'object' && (fileInput.mimeType || fileInput.type)) ? (fileInput.mimeType || fileInput.type) : 'image/jpeg';
//     if (!rawData) return '';

//     const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');
//     const buffer = Buffer.from(cleanBase64, 'base64');

//     const r = await drive.files.create({
//       requestBody: { name: fileName, parents: [FOLDER_ID] },
//       media: { mimeType: fileMime, body: Readable.from(buffer) },
//       fields: 'id, webViewLink, webContentLink',
//       supportsAllDrives: true,
//       supportsTeamDrives: true,
//     });

//     const fileId = r.data.id;
//     if (fileId) {
//       try {
//         await drive.permissions.create({
//           fileId: fileId,
//           requestBody: { role: 'reader', type: 'anyone' },
//           supportsAllDrives: true,
//           supportsTeamDrives: true,
//         });
//       } catch (permErr) {}
//       return r.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
//     }
//     return '';
//   } catch (e) {
//     return '';
//   }
// }

// // ✅ FIXED: Week Target = Column B (Target column). Naam na mile to null.
// async function getUserTargets(userName) {
//   try {
//     let rows;
//     if (appCache.has(CACHE_KEYS.TARGETS)) {
//       rows = appCache.get(CACHE_KEYS.TARGETS);
//     } else {
//       const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TARGET_SHEET}!A1:C200` });
//       rows = res.data.values || [];
//       appCache.set(CACHE_KEYS.TARGETS, rows, 600);
//     }

//     if (rows.length < 2) return { monthTarget: null, weekTarget: null };

//     const t = cleanKey(userName);
//     for (let i = 1; i < rows.length; i++) {
//       const rowName = cleanKey(rows[i][0]);
//       if (rowName && rowName === t) {
//         const targetVal = rows[i][1]; // ✅ Column B = Target (monthly target hi week target hoga)
//         const num = targetVal !== undefined && targetVal !== '' ? Number(targetVal) : null;
//         return {
//           monthTarget: num,
//           weekTarget: num  // ✅ Dono me same value
//         };
//       }
//     }
//   } catch (e) {
//     console.error('getUserTargets error:', e);
//   }
//   return { monthTarget: null, weekTarget: null };
// }

// router.get('/dropdowns', async (req, res) => {
//   try {
//     if (appCache.has(CACHE_KEYS.DROPDOWNS)) return res.json(appCache.get(CACHE_KEYS.DROPDOWNS));
//     const locRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${LOC_SHEET}!A2:A1000` });
//     const doerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${DOER_SHEET}!A2:B1000` });
//     const locations = (locRes.data.values || []).flat().filter(Boolean);
//     const doers = doerRes.data.values || [];
//     const pcs = doers.filter((d) => d[1] && cleanKey(d[1]) === 'pc').map((d) => d[0]);
//     const solvers = doers.map((d) => d[0]).filter(Boolean);
//     const dropdownResponse = { success: true, locations, pcs, solvers };
//     appCache.set(CACHE_KEYS.DROPDOWNS, dropdownResponse, 3600);
//     res.json(dropdownResponse);
//   } catch (error) {
//     res.status(500).json({ success: false, locations: [], pcs: [], solvers: [] });
//   }
// });

// // ---------- Tickets list + myStats ----------
// router.get('/', async (req, res) => {
//   const { userName, filterType } = req.query;
//   if (!userName) return res.status(400).json({ success: false, message: 'User name required' });

//   try {
//     let rows;
//     if (appCache.has(CACHE_KEYS.TICKETS_RAW) && req.query.force !== 'true') {
//       rows = appCache.get(CACHE_KEYS.TICKETS_RAW);
//     } else {
//       const response = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!A6:${LAST_COL}20000`,
//         valueRenderOption: 'FORMATTED_VALUE',
//       });
//       rows = response.data.values || [];
//       appCache.set(CACHE_KEYS.TICKETS_RAW, rows, 300);
//     }

//     const emptyStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
//     if (rows.length < 2) {
//       return res.json({ success: true, data: [], counts: { action: 0, raised: 0, assigned: 0, revised: 0 }, myStats: emptyStats });
//     }

//     const headers = rows[0];
//     const dataRows = rows.slice(1);
//     const c = (aliases) => findColIndex(headers, aliases);

//     const cols = {
//       Timestamp: c(['Timestamp', 'Time', 'Date']),
//       TicketId: c(['Help_Ticket_No', 'Help Ticket No', 'Ticket_No']),
//       Raiser: c(['Raised_By', 'Raised By', 'Raiser']),
//       PC: c(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC']),
//       Solver: c(['Problem_Solver', 'Problem Solver', 'Solver', 'Doer']),
//       Issue: c(['Issue', 'Problem']),
//       Loc: c(['Location', 'Loc']),
//       Prio: c(['Priority']),
//       Date: c(['Desired_Date']),
//       Image: c(['Image_Upload', 'Image Upload', 'Image', 'Proof']),
//       Status1: c(['Status_1']),
//       Remark1: c(['Remark_1']),
//       DoersPlannedDate: c(['Doers_Planned_Date']),
//       Planned1: c(['Planned_1']),
//       Planned3: c(['Planned_3']),
//       Planned4: c(['Planned_4']),
//       Actual: c(['Doers_Actual_Date']),
//       Actual3: c(['Actual_3', 'Actual 3']),   // ✅ NEW
//       ReviseCount: c(['Revise_Count']),
//       ReviseDate: c(['Revise_Date']),
//       Status2: c(['Status_2']),
//       Proof: c(['Proof_Upload_2', 'Proof Upload 2', 'Proof']),
//       Remark2: c(['Remark_2']),
//       Status3: c(['Status_3']),
//       Remark3: c(['Remark_3']),
//       Status4: c(['Status_4']),
//       Rating: c(['Rating']),
//       Reraise: c(['Reraise_Date']),
//       TimeLapsP: c(['check_Timelaps', 'Timelaps', 'P'])
//     };

//     const now = nowIST();
//     const weekStart = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)));
//     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

//     const me = cleanKey(userName);
//     const counts = { action: 0, raised: 0, assigned: 0, revised: 0 };
//     const myStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
//     const filteredData = [];

//     dataRows.forEach((row) => {
//       const ticketId = getVal(row, cols.TicketId);
//       if (!ticketId) return;

//       const raiserRaw = getVal(row, cols.Raiser);
//       const pcRaw = getVal(row, cols.PC);
//       const solverRaw = getVal(row, cols.Solver);

//       const isRaiserMe = cleanKey(raiserRaw) === me;
//       const isPcMe = cleanKey(pcRaw) === me;
//       const isSolverMe = cleanKey(solverRaw) === me;
//       const isMyTicket = isPcMe || isSolverMe || isRaiserMe;

//       const s1 = cleanKey(getVal(row, cols.Status1));
//       const s2 = cleanKey(getVal(row, cols.Status2));
//       const s3 = cleanKey(getVal(row, cols.Status3));
//       const s4 = cleanKey(getVal(row, cols.Status4));

//       const tsDate = parseSheetDate(getVal(row, cols.Timestamp));
//       if (tsDate) {
//         if (isRaiserMe) { if (tsDate >= weekStart) myStats.weekRaised++; if (tsDate >= monthStart) myStats.monthRaised++; }
//         if (isSolverMe && s2 === 'solved') { if (tsDate >= weekStart) myStats.weekSolved++; if (tsDate >= monthStart) myStats.monthSolved++; }
//       }

//       if (s4 === 'closed' || s1 === 'reject') return;

//       const isAssignedToMe = isPcMe || isSolverMe;

//       const isActionable =
//         (isPcMe && s1 !== 'done') ||
//         (isSolverMe && s1 === 'done' && s2 !== 'solved') ||
//         (isPcMe && s2 === 'solved' && s3 !== 'verified') ||
//         (isRaiserMe && s3 === 'verified');

//       const isRevisedTab = isMyTicket && (s2 === 'pendingrevision' || s2.includes('revision'));

//       if (isActionable) counts.action++;
//       if (isRaiserMe) counts.raised++;
//       if (isAssignedToMe) counts.assigned++;
//       if (isRevisedTab) counts.revised++;

//       const include =
//         (filterType === 'action' && isActionable) ||
//         (filterType === 'raised' && isRaiserMe) ||
//         (filterType === 'assigned' && isAssignedToMe) ||
//         (filterType === 'revised' && isRevisedTab);

//       if (include) {
//         filteredData.push({
//           ticketId,
//           timestamp: getVal(row, cols.Timestamp),
//           issue: getVal(row, cols.Issue) || 'No description',
//           location: getVal(row, cols.Loc) || 'N/A',
//           raiser: raiserRaw || 'Unknown',
//           pc: pcRaw || 'N/A',
//           solver: solverRaw || 'Unknown',
//           priority: getVal(row, cols.Prio) || 'Low',
//           desiredDate: getVal(row, cols.Date) || '',
//           image: getVal(row, cols.Image),
//           status1: getVal(row, cols.Status1),
//           remark1: getVal(row, cols.Remark1),
//           plannedDate: getVal(row, cols.DoersPlannedDate),
//           planned1: getVal(row, cols.Planned1),
//           planned3: getVal(row, cols.Planned3),
//           planned4: getVal(row, cols.Planned4),
//           actualDate: getVal(row, cols.Actual),
//           actual3: getVal(row, cols.Actual3),        // ✅ NEW
//           reviseCount: getVal(row, cols.ReviseCount) || '0',
//           reviseDate: getVal(row, cols.ReviseDate),
//           status2: getVal(row, cols.Status2),
//           proof: getVal(row, cols.Proof),
//           remark2: getVal(row, cols.Remark2),
//           status3: getVal(row, cols.Status3),
//           remark3: getVal(row, cols.Remark3),
//           status4: getVal(row, cols.Status4),
//           rating: getVal(row, cols.Rating),
//           reraiseDate: getVal(row, cols.Reraise),
//           sheetTimeLeft: getVal(row, cols.TimeLapsP),
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

// // router.post('/create', (req, res) => {
// //   const { loc, pc, solver, prio, date, issue, raisedBy, files, file, image } = req.body;
// //   if (!loc || !issue || !pc || !solver) return res.status(400).json({ success: false, message: 'Please fill all required fields' });

// //   const key = [raisedBy, issue, loc, pc, solver].map((v) => String(v || '').trim()).join('|');
// //   const last = recentSubmits.get(key);
// //   if (last && Date.now() - last < 60000) return res.status(409).json({ success: false, message: 'Duplicate ticket detected.' });
// //   recentSubmits.set(key, Date.now());
// //   setTimeout(() => recentSubmits.delete(key), 65000);

// //   withLock(async () => {
// //     try {
// //       const { H, colCount } = await getHeaderMap();
// //       const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
// //       const idL = colLetter(idCol);
// //       const idRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TICKET_SHEET}!${idL}7:${idL}5000` });
// //       const idVals = idRes.data.values || [];

// //       let maxNum = 0;
// //       idVals.forEach((r) => { const m = String((r && r[0]) || '').trim().match(/_(\d+)$/); if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; } });

// //       let emptyIdx = idVals.findIndex((r) => !String((r && r[0]) || '').trim());
// //       if (emptyIdx === -1) emptyIdx = idVals.length;
// //       const targetRow = 7 + emptyIdx;

// //       const now = nowIST();
// //       const ticketId = `Help_${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)}_${String(maxNum + 1).padStart(3, '0')}`;

// //       const inputFiles = Array.isArray(files) ? files : (files ? [files] : (file ? [file] : (image ? [image] : [])));
// //       const urls = [];
// //       for (let i = 0; i < inputFiles.length; i++) {
// //         const u = await saveFile(inputFiles[i], `${ticketId}_Issue_${i + 1}.jpg`);
// //         if (u) urls.push(u);
// //       }

// //       const fRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TICKET_SHEET}!A${targetRow}:${LAST_COL}${targetRow}`, valueRenderOption: 'FORMULA' });
// //       const existing = (fRes.data.values && fRes.data.values[0]) || [];
// //       const total = Math.max(colCount, existing.length);
// //       const rowData = new Array(total).fill('');

// //       const set = (alias, val) => setFlex(H, rowData, alias, val);
// //       set(['Timestamp', 'Time'], fmtDateTime(now));
// //       set(['Help_Ticket_No', 'Help Ticket No'], ticketId);
// //       set(['Location', 'Loc'], loc);
// //       set(['Raised_By', 'Raised By'], raisedBy || '');
// //       set(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC'], pc);
// //       set(['Issue', 'Problem'], issue);
// //       set(['Problem_Solver', 'Problem Solver'], solver);
// //       set(['Desired_Date', 'Desired Date'], formatDateForSheet(date));
// //       set(['Image_Upload', 'Image Upload', 'Image', 'Proof'], urls.join(', '));
// //       set(['Priority'], prio || 'Low');
// //       set(['Status_1', 'Status 1'], '');

// //       for (let i = 0; i < existing.length; i++) { if (typeof existing[i] === 'string' && existing[i].startsWith('=') && !rowData[i]) { rowData[i] = existing[i]; } }

// //       await sheets.spreadsheets.values.update({ spreadsheetId, range: `${TICKET_SHEET}!A${targetRow}:${colLetter(total - 1)}${targetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] } });
// //       appCache.del(CACHE_KEYS.TICKETS_RAW);
// //       res.json({ success: true, message: 'Ticket raised successfully!', ticketId });
// //     } catch (error) {
// //       recentSubmits.delete(key);
// //       res.status(500).json({ success: false, message: 'Failed to create ticket' });
// //     }
// //   });
// // });




// router.post('/create', async (req, res) => {
//   console.log('📩 [CREATE TICKET] Request received');
//   console.log('📦 Body:', { 
//     loc: req.body?.loc, 
//     pc: req.body?.pc, 
//     solver: req.body?.solver, 
//     raisedBy: req.body?.raisedBy,
//     issue: req.body?.issue?.substring(0, 40) 
//   });

//   const { loc, pc, solver, prio, date, issue, raisedBy, files, file, image } = req.body;

//   if (!loc || !issue || !pc || !solver) {
//     return res.status(400).json({ success: false, message: 'Please fill all required fields' });
//   }

//   const key = [raisedBy, issue, loc, pc, solver].map((v) => String(v || '').trim()).join('|');
//   const last = recentSubmits.get(key);
//   if (last && Date.now() - last < 60000) {
//     return res.status(409).json({ success: false, message: 'Duplicate ticket detected.' });
//   }
//   recentSubmits.set(key, Date.now());
//   setTimeout(() => recentSubmits.delete(key), 65000);

//   try {
//     await withLock(async () => {
//       console.log('🔒 Lock acquired');

//       const { H, colCount } = await getHeaderMap();
//       console.log('📋 Headers:', Object.keys(H).length, 'columns');

//       const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
//       if (idCol === undefined) {
//         console.error('💥 Help_Ticket_No column NOT FOUND!', Object.keys(H));
//         recentSubmits.delete(key);
//         return res.status(500).json({ success: false, message: 'Sheet header mismatch' });
//       }

//       const idL = colLetter(idCol);

//       // ✅ FIX: 5000 → MAX_ROW (20000)
//       const idRes = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!${idL}7:${idL}${MAX_ROW}`
//       });
//       const idVals = idRes.data.values || [];
//       console.log(`📊 Scanned ${idVals.length} rows`);

//       // Max ticket number nikaalo
//       let maxNum = 0;
//       idVals.forEach((r) => {
//         const m = String((r && r[0]) || '').trim().match(/_(\d+)$/);
//         if (m) {
//           const n = parseInt(m[1], 10);
//           if (n > maxNum) maxNum = n;
//         }
//       });

//       // ✅ FIX: Last NON-EMPTY row ke BAAD likho (empty gaps skip mat karo)
//       // Pehle empty dhoondo, warna last ke baad
//       let emptyIdx = -1;
//       // End se peeche se empty row dhoondho taaki beech ke gaps me na likhe
//       // Actually best: hamesha LAST filled row ke baad likho
//       let lastFilledIdx = -1;
//       for (let i = idVals.length - 1; i >= 0; i--) {
//         if (String((idVals[i] && idVals[i][0]) || '').trim()) {
//           lastFilledIdx = i;
//           break;
//         }
//       }
//       const targetRow = 7 + lastFilledIdx + 1;  // ✅ Last ticket ke turant baad

//       const now = nowIST();
//       const ticketId = `Help_${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)}_${String(maxNum + 1).padStart(3, '0')}`;
//       console.log(`🎫 Ticket: ${ticketId} → Row ${targetRow} (maxNum was ${maxNum})`);

//       // Files
//       const inputFiles = Array.isArray(files) ? files : (files ? [files] : (file ? [file] : (image ? [image] : [])));
//       const urls = [];
//       for (let i = 0; i < inputFiles.length; i++) {
//         const u = await saveFile(inputFiles[i], `${ticketId}_Issue_${i + 1}.jpg`);
//         if (u) urls.push(u);
//       }
//       console.log(`📎 Files uploaded: ${urls.length}`);

//       // Existing formulas preserve karo
//       const fRes = await sheets.spreadsheets.values.get({
//         spreadsheetId,
//         range: `${TICKET_SHEET}!A${targetRow}:${LAST_COL}${targetRow}`,
//         valueRenderOption: 'FORMULA'
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

//       for (let i = 0; i < existing.length; i++) {
//         if (typeof existing[i] === 'string' && existing[i].startsWith('=') && !rowData[i]) {
//           rowData[i] = existing[i];
//         }
//       }

//       const writeRange = `${TICKET_SHEET}!A${targetRow}:${colLetter(total - 1)}${targetRow}`;
//       console.log(`💾 Writing → ${writeRange}`);

//       await sheets.spreadsheets.values.update({
//         spreadsheetId,
//         range: writeRange,
//         valueInputOption: 'USER_ENTERED',
//         requestBody: { values: [rowData] }
//       });

//       appCache.del(CACHE_KEYS.TICKETS_RAW);
//       console.log(`🎉 SUCCESS: ${ticketId} at row ${targetRow}`);
//       res.json({ success: true, message: 'Ticket raised successfully!', ticketId });
//     });
//   } catch (error) {
//     console.error('💥 CREATE ERROR:', error.message);
//     console.error(error.stack);
//     recentSubmits.delete(key);
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, message: 'Failed: ' + (error.message || 'Unknown') });
//     }
//   }
// });


// router.post('/action', (req, res) => {
//   const body = req.body || {};
//   const actionType = body.actionType || body.action || '';
//   const payload = (body.payload && typeof body.payload === 'object') ? body.payload : body;
//   const ticketId = payload.ticketId || body.ticketId || payload.id || body.id || '';

//   if (!actionType || !ticketId) return res.status(400).json({ success: false, message: 'Required fields missing' });
//   payload.ticketId = ticketId;

//   withLock(async () => {
//     try {
//       const { H } = await getHeaderMap();
//       const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
//       const idL = colLetter(idCol);

//       const idRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TICKET_SHEET}!${idL}7:${idL}5000` });
//       const ids = (idRes.data.values || []).map((r) => String((r && r[0]) || '').trim());
//       const rowIdx = ids.indexOf(String(payload.ticketId).trim());
//       if (rowIdx === -1) return res.json({ success: false, message: 'Ticket Not Found' });
//       const row = rowIdx + 7;

//       const rowRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TICKET_SHEET}!A${row}:${LAST_COL}${row}` });
//       const rowVals = (rowRes.data.values && rowRes.data.values[0]) || [];

//       const now = nowIST();
//       const ts = fmtDateTime(now);
//       const updates = [];

//       const set = (headerAliases, value) => {
//         const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
//         for (const alias of aliases) {
//           if (H[alias] !== undefined) { updates.push({ name: alias, value }); return; }
//           const targetKey = cleanKey(alias);
//           for (const key in H) { if (cleanKey(key) === targetKey) { updates.push({ name: key, value }); return; } }
//         }
//       };

//       const cell = (alias) => { const idx = findColIndex(Object.keys(H), Array.isArray(alias) ? alias : [alias]); return (idx !== -1 && rowVals[idx] !== undefined) ? rowVals[idx] : ''; };
//       const lapsMinutes = (plannedName) => { const p = parseSheetDate(cell(plannedName)); return p ? Math.round((now.getTime() - p.getTime()) / 60000) : null; };

//       const logHistory = async (date, count) => {
//         try { await sheets.spreadsheets.values.append({ spreadsheetId, range: `${HISTORY_SHEET}!A1`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[payload.ticketId, date, count]] } }); } catch (e) {}
//       };

//       if (actionType === 'step2') {
//         set(['Status_1', 'Status 1'], payload.status);
//         set(['Remark_1', 'Remark 1'], payload.remark || '');
//         // ✅ FIX: Sirf tabhi date set karo jab actual value ho
//         if (payload.nextDate && String(payload.nextDate).trim() !== '') {
//           set(['Doers_Planned_Date', 'Doers Planned Date'], formatDateForSheet(payload.nextDate));
//         }
//         set(['Actual_1', 'Actual 1'], ts);
//         const lap = lapsMinutes('Planned_1');
//         if (lap !== null) set(['check_Timelaps'], lap);
//       }
//       else if (actionType === 'step3') {
//         if (payload.subAction === 'revise') {
//           const cur = parseInt(cell('Revise_Count'), 10) || 0;
//           if (cur >= 3) return res.json({ success: false, message: 'Maximum 3 revisions allowed.' });

//           // ✅ FIX: Revision sirf planned date ke baad allowed
//           const lastDateStr = cell('Revise_Date') || cell('Doers_Planned_Date');
//           const lastDate = parseSheetDate(lastDateStr);
//           if (lastDate) {
//             const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//             const lastDayStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
//             if (todayStart < lastDayStart) {
//               return res.json({ success: false, message: `Revision allowed only on/after planned date (${lastDateStr}).` });
//             }
//           }

//           const newCount = cur + 1;
//           const rd = formatDateForSheet(payload.reviseDate);
//           set(['Revise_Count', 'Revise Count'], newCount);
//           set(['Revise_Date', 'Revise Date'], rd);
//           set(['Doers_Planned_Date', 'Doers Planned Date'], rd);
//           set(['Status_2', 'Status 2'], 'Pending Revision');
//           set(['Remark_2', 'Remark 2'], payload.remark || '');
//           await logHistory(rd, newCount);
//         } else {
//           const inputFiles = Array.isArray(payload.files) ? payload.files : (payload.files ? [payload.files] : (payload.file ? [payload.file] : (payload.image ? [payload.image] : [])));
//           const urls = [];
//           for (let i = 0; i < inputFiles.length; i++) { const u = await saveFile(inputFiles[i], `${payload.ticketId}_Proof_${i + 1}.jpg`); if (u) urls.push(u); }
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
//           // ✅ FIX: Reraise pe bhi 3-revision limit check
//           const cur = parseInt(cell('Revise_Count'), 10) || 0;
//           if (cur >= 3) return res.json({ success: false, message: 'Maximum 3 revisions allowed.' });

//           const newCount = cur + 1;
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

//       if (updates.length) {
//         await sheets.spreadsheets.values.batchUpdate({
//           spreadsheetId,
//           requestBody: {
//             valueInputOption: 'USER_ENTERED',
//             data: updates.map((u) => ({ range: `${TICKET_SHEET}!${colLetter(H[u.name])}${row}`, values: [[u.value === undefined || u.value === null ? '' : u.value]] }))
//           }
//         });
//       }
//       appCache.del(CACHE_KEYS.TICKETS_RAW);
//       res.json({ success: true, message: 'Action completed successfully' });
//     } catch (error) {
//       console.error('Action Error:', error);
//       res.status(500).json({ success: false, message: 'Server Error' });
//     }
//   });
// });

// module.exports = router;






const express = require('express');
const router = express.Router();
const { Readable } = require('stream');
const { sheets, spreadsheetId, drive } = require('../config/googleSheet');
const NodeCache = require('node-cache');

const appCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const TICKET_SHEET = 'Help_Ticket_FMS';
const DOER_SHEET = 'Doer_Name';
const LOC_SHEET = 'Location';
const TARGET_SHEET = 'Target';
const HISTORY_SHEET = 'Revised_History';
const FOLDER_ID = '0ALRcS1YOamZmUk9PVA';
const LAST_COL = 'AZ';
const MAX_ROW = 20000;

const CACHE_KEYS = {
  TICKETS_RAW: 'raw_tickets_rows',
  DROPDOWNS: 'dropdowns_data',
  TARGETS: 'user_targets_raw'
};

const cleanKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pad = (n) => String(n).padStart(2, '0');
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

let lockChain = Promise.resolve();
const withLock = (fn) => {
  const run = lockChain.then(fn);
  lockChain = run.catch(() => {});
  return run;
};

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

async function saveFile(fileInput, defaultName) {
  if (!drive || !fileInput) return '';
  try {
    let rawData = typeof fileInput === 'string' ? fileInput : (fileInput.base64 || fileInput.data || fileInput.url || '');
    let fileName = (typeof fileInput === 'object' && fileInput.name) ? fileInput.name : defaultName;
    let fileMime = (typeof fileInput === 'object' && (fileInput.mimeType || fileInput.type)) ? (fileInput.mimeType || fileInput.type) : 'image/jpeg';
    if (!rawData) return '';

    const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const r = await drive.files.create({
      requestBody: { name: fileName, parents: [FOLDER_ID] },
      media: { mimeType: fileMime, body: Readable.from(buffer) },
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
      supportsTeamDrives: true,
    });

    const fileId = r.data.id;
    if (fileId) {
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
          supportsTeamDrives: true,
        });
      } catch (permErr) {}
      return r.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    }
    return '';
  } catch (e) {
    return '';
  }
}

async function getUserTargets(userName) {
  try {
    let rows;
    if (appCache.has(CACHE_KEYS.TARGETS)) {
      rows = appCache.get(CACHE_KEYS.TARGETS);
    } else {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${TARGET_SHEET}!A1:C200` });
      rows = res.data.values || [];
      appCache.set(CACHE_KEYS.TARGETS, rows, 600);
    }

    if (rows.length < 2) return { monthTarget: null, weekTarget: null };

    const t = cleanKey(userName);
    for (let i = 1; i < rows.length; i++) {
      const rowName = cleanKey(rows[i][0]);
      if (rowName && rowName === t) {
        const targetVal = rows[i][1];
        const num = targetVal !== undefined && targetVal !== '' ? Number(targetVal) : null;
        return { monthTarget: num, weekTarget: num };
      }
    }
  } catch (e) {
    console.error('getUserTargets error:', e);
  }
  return { monthTarget: null, weekTarget: null };
}

router.get('/dropdowns', async (req, res) => {
  try {
    if (appCache.has(CACHE_KEYS.DROPDOWNS)) return res.json(appCache.get(CACHE_KEYS.DROPDOWNS));
    const locRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${LOC_SHEET}!A2:A${MAX_ROW}` });
    const doerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${DOER_SHEET}!A2:B${MAX_ROW}` });
    const locations = (locRes.data.values || []).flat().filter(Boolean);
    const doers = doerRes.data.values || [];
    const pcs = doers.filter((d) => d[1] && cleanKey(d[1]) === 'pc').map((d) => d[0]);
    const solvers = doers.map((d) => d[0]).filter(Boolean);
    const dropdownResponse = { success: true, locations, pcs, solvers };
    appCache.set(CACHE_KEYS.DROPDOWNS, dropdownResponse, 3600);
    res.json(dropdownResponse);
  } catch (error) {
    res.status(500).json({ success: false, locations: [], pcs: [], solvers: [] });
  }
});

// ---------- Tickets list + myStats ----------
router.get('/', async (req, res) => {
  const { userName, filterType } = req.query;
  if (!userName) return res.status(400).json({ success: false, message: 'User name required' });

  try {
    let rows;
    if (appCache.has(CACHE_KEYS.TICKETS_RAW) && req.query.force !== 'true') {
      rows = appCache.get(CACHE_KEYS.TICKETS_RAW);
    } else {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!A6:${LAST_COL}${MAX_ROW}`,
        valueRenderOption: 'FORMATTED_VALUE',
      });
      rows = response.data.values || [];
      appCache.set(CACHE_KEYS.TICKETS_RAW, rows, 300);
    }

    const emptyStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
    if (rows.length < 2) {
      return res.json({ success: true, data: [], counts: { action: 0, raised: 0, assigned: 0, revised: 0 }, myStats: emptyStats });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const c = (aliases) => findColIndex(headers, aliases);

    const cols = {
      Timestamp: c(['Timestamp', 'Time', 'Date']),
      TicketId: c(['Help_Ticket_No', 'Help Ticket No', 'Ticket_No']),
      Raiser: c(['Raised_By', 'Raised By', 'Raiser']),
      PC: c(['PC_Accountable_for_help_ticket', 'PC Accountable', 'PC']),
      Solver: c(['Problem_Solver', 'Problem Solver', 'Solver', 'Doer']),
      Issue: c(['Issue', 'Problem']),
      Loc: c(['Location', 'Loc']),
      Prio: c(['Priority']),
      Date: c(['Desired_Date']),
      Image: c(['Image_Upload', 'Image Upload', 'Image', 'Proof']),
      Status1: c(['Status_1']),
      Remark1: c(['Remark_1']),
      DoersPlannedDate: c(['Doers_Planned_Date']),
      Planned1: c(['Planned_1']),
      Planned3: c(['Planned_3']),
      Planned4: c(['Planned_4']),
      Actual: c(['Doers_Actual_Date']),
      Actual3: c(['Actual_3', 'Actual 3']),
      ReviseCount: c(['Revise_Count']),
      ReviseDate: c(['Revise_Date']),
      Status2: c(['Status_2']),
      Proof: c(['Proof_Upload_2', 'Proof Upload 2', 'Proof']),
      Remark2: c(['Remark_2']),
      Status3: c(['Status_3']),
      Remark3: c(['Remark_3']),
      Status4: c(['Status_4']),
      Rating: c(['Rating']),
      Reraise: c(['Reraise_Date']),
      TimeLapsP: c(['check_Timelaps', 'Timelaps', 'P'])
    };

    const now = nowIST();
    const weekStart = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const me = cleanKey(userName);
    const counts = { action: 0, raised: 0, assigned: 0, revised: 0 };
    const myStats = { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0, monthTarget: '-', weekTarget: '-' };
    const filteredData = [];

    dataRows.forEach((row) => {
      const ticketId = getVal(row, cols.TicketId);
      if (!ticketId) return;

      const raiserRaw = getVal(row, cols.Raiser);
      const pcRaw = getVal(row, cols.PC);
      const solverRaw = getVal(row, cols.Solver);

      const isRaiserMe = cleanKey(raiserRaw) === me;
      const isPcMe = cleanKey(pcRaw) === me;
      const isSolverMe = cleanKey(solverRaw) === me;
      const isMyTicket = isPcMe || isSolverMe || isRaiserMe;

      const s1 = cleanKey(getVal(row, cols.Status1));
      const s2 = cleanKey(getVal(row, cols.Status2));
      const s3 = cleanKey(getVal(row, cols.Status3));
      const s4 = cleanKey(getVal(row, cols.Status4));

      const tsDate = parseSheetDate(getVal(row, cols.Timestamp));
      if (tsDate) {
        if (isRaiserMe) { if (tsDate >= weekStart) myStats.weekRaised++; if (tsDate >= monthStart) myStats.monthRaised++; }
        if (isSolverMe && s2 === 'solved') { if (tsDate >= weekStart) myStats.weekSolved++; if (tsDate >= monthStart) myStats.monthSolved++; }
      }

      if (s4 === 'closed' || s1 === 'reject') return;

      const isAssignedToMe = isPcMe || isSolverMe;

      const isActionable =
        (isPcMe && s1 !== 'done') ||
        (isSolverMe && s1 === 'done' && s2 !== 'solved') ||
        (isPcMe && s2 === 'solved' && s3 !== 'verified') ||
        (isRaiserMe && s3 === 'verified');

      const isRevisedTab = isMyTicket && (s2 === 'pendingrevision' || s2.includes('revision'));

      if (isActionable) counts.action++;
      if (isRaiserMe) counts.raised++;
      if (isAssignedToMe) counts.assigned++;
      if (isRevisedTab) counts.revised++;

      const include =
        (filterType === 'action' && isActionable) ||
        (filterType === 'raised' && isRaiserMe) ||
        (filterType === 'assigned' && isAssignedToMe) ||
        (filterType === 'revised' && isRevisedTab);

      if (include) {
        filteredData.push({
          ticketId,
          timestamp: getVal(row, cols.Timestamp),
          issue: getVal(row, cols.Issue) || 'No description',
          location: getVal(row, cols.Loc) || 'N/A',
          raiser: raiserRaw || 'Unknown',
          pc: pcRaw || 'N/A',
          solver: solverRaw || 'Unknown',
          priority: getVal(row, cols.Prio) || 'Low',
          desiredDate: getVal(row, cols.Date) || '',
          image: getVal(row, cols.Image),
          status1: getVal(row, cols.Status1),
          remark1: getVal(row, cols.Remark1),
          plannedDate: getVal(row, cols.DoersPlannedDate),
          planned1: getVal(row, cols.Planned1),
          planned3: getVal(row, cols.Planned3),
          planned4: getVal(row, cols.Planned4),
          actualDate: getVal(row, cols.Actual),
          actual3: getVal(row, cols.Actual3),
          reviseCount: getVal(row, cols.ReviseCount) || '0',
          reviseDate: getVal(row, cols.ReviseDate),
          status2: getVal(row, cols.Status2),
          proof: getVal(row, cols.Proof),
          remark2: getVal(row, cols.Remark2),
          status3: getVal(row, cols.Status3),
          remark3: getVal(row, cols.Remark3),
          status4: getVal(row, cols.Status4),
          rating: getVal(row, cols.Rating),
          reraiseDate: getVal(row, cols.Reraise),
          sheetTimeLeft: getVal(row, cols.TimeLapsP),
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

router.post('/create', async (req, res) => {
  console.log('📩 [CREATE TICKET] Request received');

  const { loc, pc, solver, prio, date, issue, raisedBy, files, file, image } = req.body;

  if (!loc || !issue || !pc || !solver) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields' });
  }

  const key = [raisedBy, issue, loc, pc, solver].map((v) => String(v || '').trim()).join('|');
  const last = recentSubmits.get(key);
  if (last && Date.now() - last < 60000) {
    return res.status(409).json({ success: false, message: 'Duplicate ticket detected.' });
  }
  recentSubmits.set(key, Date.now());
  setTimeout(() => recentSubmits.delete(key), 65000);

  try {
    await withLock(async () => {
      const { H, colCount } = await getHeaderMap();

      const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
      if (idCol === undefined) {
        recentSubmits.delete(key);
        return res.status(500).json({ success: false, message: 'Sheet header mismatch' });
      }

      const idL = colLetter(idCol);

      const idRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!${idL}7:${idL}${MAX_ROW}`
      });
      const idVals = idRes.data.values || [];

      let maxNum = 0;
      idVals.forEach((r) => {
        const m = String((r && r[0]) || '').trim().match(/_(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });

      let lastFilledIdx = -1;
      for (let i = idVals.length - 1; i >= 0; i--) {
        if (String((idVals[i] && idVals[i][0]) || '').trim()) {
          lastFilledIdx = i;
          break;
        }
      }
      const targetRow = 7 + lastFilledIdx + 1;

      const now = nowIST();
      const ticketId = `Help_${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)}_${String(maxNum + 1).padStart(3, '0')}`;

      const inputFiles = Array.isArray(files) ? files : (files ? [files] : (file ? [file] : (image ? [image] : [])));
      const urls = [];
      for (let i = 0; i < inputFiles.length; i++) {
        const u = await saveFile(inputFiles[i], `${ticketId}_Issue_${i + 1}.jpg`);
        if (u) urls.push(u);
      }

      const fRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!A${targetRow}:${LAST_COL}${targetRow}`,
        valueRenderOption: 'FORMULA'
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

      for (let i = 0; i < existing.length; i++) {
        if (typeof existing[i] === 'string' && existing[i].startsWith('=') && !rowData[i]) {
          rowData[i] = existing[i];
        }
      }

      const writeRange = `${TICKET_SHEET}!A${targetRow}:${colLetter(total - 1)}${targetRow}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: writeRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });

      appCache.del(CACHE_KEYS.TICKETS_RAW);
      res.json({ success: true, message: 'Ticket raised successfully!', ticketId });
    });
  } catch (error) {
    console.error('💥 CREATE ERROR:', error.message);
    recentSubmits.delete(key);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed: ' + (error.message || 'Unknown') });
    }
  }
});

// ✅ FIXED: async + await withLock + MAX_ROW
router.post('/action', async (req, res) => {
  const body = req.body || {};
  const actionType = body.actionType || body.action || '';
  const payload = (body.payload && typeof body.payload === 'object') ? body.payload : body;
  const ticketId = payload.ticketId || body.ticketId || payload.id || body.id || '';

  if (!actionType || !ticketId) return res.status(400).json({ success: false, message: 'Required fields missing' });
  payload.ticketId = ticketId;

  try {
    await withLock(async () => {
      const { H } = await getHeaderMap();
      const idCol = H['Help_Ticket_No'] !== undefined ? H['Help_Ticket_No'] : H['Help Ticket No'];
      const idL = colLetter(idCol);

      // ✅ FIX: 5000 → MAX_ROW
      const idRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!${idL}7:${idL}${MAX_ROW}`
      });
      const ids = (idRes.data.values || []).map((r) => String((r && r[0]) || '').trim());
      const rowIdx = ids.indexOf(String(payload.ticketId).trim());
      if (rowIdx === -1) return res.json({ success: false, message: 'Ticket Not Found' });
      const row = rowIdx + 7;

      const rowRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${TICKET_SHEET}!A${row}:${LAST_COL}${row}`
      });
      const rowVals = (rowRes.data.values && rowRes.data.values[0]) || [];

      const now = nowIST();
      const ts = fmtDateTime(now);
      const updates = [];

      const set = (headerAliases, value) => {
        const aliases = Array.isArray(headerAliases) ? headerAliases : [headerAliases];
        for (const alias of aliases) {
          if (H[alias] !== undefined) { updates.push({ name: alias, value }); return; }
          const targetKey = cleanKey(alias);
          for (const key in H) { if (cleanKey(key) === targetKey) { updates.push({ name: key, value }); return; } }
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
            requestBody: { values: [[payload.ticketId, date, count]] }
          });
        } catch (e) {}
      };

      if (actionType === 'step2') {
        set(['Status_1', 'Status 1'], payload.status);
        set(['Remark_1', 'Remark 1'], payload.remark || '');
        if (payload.nextDate && String(payload.nextDate).trim() !== '') {
          set(['Doers_Planned_Date', 'Doers Planned Date'], formatDateForSheet(payload.nextDate));
        }
        set(['Actual_1', 'Actual 1'], ts);
        const lap = lapsMinutes('Planned_1');
        if (lap !== null) set(['check_Timelaps'], lap);
      }
      else if (actionType === 'step3') {
        if (payload.subAction === 'revise') {
          const cur = parseInt(cell('Revise_Count'), 10) || 0;
          if (cur >= 3) return res.json({ success: false, message: 'Maximum 3 revisions allowed.' });

          const lastDateStr = cell('Revise_Date') || cell('Doers_Planned_Date');
          const lastDate = parseSheetDate(lastDateStr);
          if (lastDate) {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastDayStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
            if (todayStart < lastDayStart) {
              return res.json({ success: false, message: `Revision allowed only on/after planned date (${lastDateStr}).` });
            }
          }

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
          const cur = parseInt(cell('Revise_Count'), 10) || 0;
          if (cur >= 3) return res.json({ success: false, message: 'Maximum 3 revisions allowed.' });

          const newCount = cur + 1;
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

      if (updates.length) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updates.map((u) => ({
              range: `${TICKET_SHEET}!${colLetter(H[u.name])}${row}`,
              values: [[u.value === undefined || u.value === null ? '' : u.value]]
            }))
          }
        });
      }
      appCache.del(CACHE_KEYS.TICKETS_RAW);
      res.json({ success: true, message: 'Action completed successfully' });
    });
  } catch (error) {
    console.error('Action Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
});

module.exports = router;