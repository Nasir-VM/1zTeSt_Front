/**
 * Restore and Sync Script:
 * Reads /Users/nasir/Desktop/Firebase/iamnasirlin-default-rtdb-export.json
 * Fills all missing Studentaccounts, Teacheraccounts, Teacherquestion chapters/questions,
 * QUIZSCORES, and PVQCSCORES into the live Realtime Database without overwriting existing data.
 */
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const exportPath = path.join(process.env.HOME, 'Desktop/Firebase/iamnasirlin-default-rtdb-export.json');
const serviceAccountPath = path.join(process.env.HOME, 'Desktop/Firebase/iamnasirlin-firebase-adminsdk-fbsvc-15b968b42c.json');

function sanitizeEmail(email) {
  if (!email) return 'unknown';
  return email.replace(/\./g, ',').replace(/#/g, ',').replace(/\$/g, ',').replace(/\//g, ',');
}

function parseDateKey(dataStr) {
  if (!dataStr) return '2026-01-01';
  try {
    const cleanStr = String(dataStr).replace(/下午|上午/g, ' ').replace(/\//g, '-');
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }
  } catch (e) {}
  return '2026-01-01';
}

async function restoreAndSync() {
  console.log('=== Starting Full Restore and Synchronization ===\n');

  if (!fs.existsSync(exportPath)) {
    console.error('Export file not found at:', exportPath);
    return;
  }
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key file not found at:', serviceAccountPath);
    return;
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

  const serviceAccount = require(serviceAccountPath);
  const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://iamnasirlin-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
  const db = getDatabase(app);

  const liveSnap = await db.ref().once('value');
  const liveData = liveSnap.val() || {};

  const updates = {};
  let updateCount = 0;

  // 1. Sync Studentaccount
  const expStudents = exportData['1zTeStsys']?.['Studentaccount'] || {};
  const liveStudents = liveData['1zTeStsys']?.['Studentaccount'] || {};

  for (const [stSan, stData] of Object.entries(expStudents)) {
    if (!liveStudents[stSan]) {
      updates[`1zTeStsys/Studentaccount/${stSan}`] = stData;
      updateCount++;
    } else {
      // Merge missing fields if live profile is incomplete
      if ((!liveStudents[stSan].name && stData.name) || (!liveStudents[stSan].stunum && stData.stunum)) {
        updates[`1zTeStsys/Studentaccount/${stSan}/name`] = liveStudents[stSan].name || stData.name || '';
        updates[`1zTeStsys/Studentaccount/${stSan}/stunum`] = liveStudents[stSan].stunum || stData.stunum || '';
        updateCount++;
      }
    }
  }
  console.log(`[Studentaccount] Evaluated ${Object.keys(expStudents).length} students.`);

  // 2. Sync Teacheraccount
  const expTeachers = exportData['1zTeStsys']?.['Teacheraccount'] || {};
  const liveTeachers = liveData['1zTeStsys']?.['Teacheraccount'] || {};

  for (const [tSan, tData] of Object.entries(expTeachers)) {
    if (!liveTeachers[tSan]) {
      const cleanT = { email: tData.email || '' };
      if (tData.name) cleanT.name = tData.name;
      updates[`1zTeStsys/Teacheraccount/${tSan}`] = cleanT;
      updateCount++;
    }
  }
  console.log(`[Teacheraccount] Evaluated ${Object.keys(expTeachers).length} teachers.`);

  // 3. Sync Teacherquestion (Chapters & Questions)
  const expTQ = exportData['Teacherquestion'] || {};
  const liveTQ = liveData['Teacherquestion'] || {};

  for (const [tSan, tData] of Object.entries(expTQ)) {
    const expChs = tData.chapters || {};
    const liveChs = liveTQ[tSan]?.chapters || {};

    for (const [chKey, chData] of Object.entries(expChs)) {
      if (!liveChs[chKey]) {
        // Calculate question_count if missing
        const qCount = chData.question_count != null
          ? chData.question_count
          : (chData.questions ? Object.keys(chData.questions).length : 0);
        updates[`Teacherquestion/${tSan}/chapters/${chKey}`] = {
          ...chData,
          question_count: qCount
        };
        updateCount++;
      } else {
        // Update question_count if missing in live
        const qCount = liveChs[chKey].questions
          ? Object.keys(liveChs[chKey].questions).length
          : (chData.questions ? Object.keys(chData.questions).length : 0);
        if (liveChs[chKey].question_count == null) {
          updates[`Teacherquestion/${tSan}/chapters/${chKey}/question_count`] = qCount;
          updateCount++;
        }
      }
    }
  }
  console.log(`[Teacherquestion] Synchronized teacher question banks.`);

  // 4. Sync General Quiz Scores -> QUIZSCORES
  for (const [tSan, tData] of Object.entries(expTeachers)) {
    const scores = tData.Teacherscores || {};
    for (const [pushKey, rec] of Object.entries(scores)) {
      if (!rec || typeof rec !== 'object') continue;
      const studentEmail = rec.Studentaccount || rec.student || 'unknown';
      const studentSan = sanitizeEmail(studentEmail);
      const chapterKey = rec.chapterId || 'general_chapter';
      const dateKey = parseDateKey(rec.data || rec.date || rec.time);
      const scoreNum = parseInt(rec.stuscore != null ? rec.stuscore : rec.score) || 0;

      const path = `QUIZSCORES/${tSan}/${dateKey}/${studentSan}/${chapterKey}/${pushKey}`;
      // Only set if not already in live DB
      const existing = liveData['QUIZSCORES']?.[tSan]?.[dateKey]?.[studentSan]?.[chapterKey]?.[pushKey];
      if (!existing) {
        updates[path] = {
          student: studentEmail,
          name: rec.name || studentEmail,
          score: scoreNum,
          total: rec.total || 100,
          type: 'quiz',
          time: rec.time || rec.data || '',
          date: dateKey,
          notes: rec.notes || ''
        };
        updateCount++;
      }
    }
  }
  console.log(`[QUIZSCORES] Synced general system quiz scores.`);

  // 5. Sync Legacy PVQC Scores -> PVQCSCORES
  const pvqcOldKeys = ['SCORES1', 'SCORES2', 'SCORES3', 'TOTALSCORES'];
  const legacyTeacherSan = sanitizeEmail('hi@nasirlin.net');

  for (const key of pvqcOldKeys) {
    const records = exportData['PVQCSCORES']?.[key] || {};
    for (const [pushKey, rec] of Object.entries(records)) {
      if (!rec || typeof rec !== 'object') continue;
      const studentId = rec.studentId || 'unknown';
      const studentSan = sanitizeEmail(studentId);
      const chapterKey = 'pvqc_' + key.toLowerCase();
      const dateKey = parseDateKey(rec.timestamp);
      const scoreNum = parseInt(rec.score) || 0;

      const path = `PVQCSCORES/${legacyTeacherSan}/${dateKey}/${studentSan}/${chapterKey}/${pushKey}`;
      const existing = liveData['PVQCSCORES']?.[legacyTeacherSan]?.[dateKey]?.[studentSan]?.[chapterKey]?.[pushKey];
      if (!existing) {
        updates[path] = {
          student: studentId,
          name: rec.studentName || studentId,
          score: scoreNum,
          total: rec.totalQuestions || 100,
          type: 'pvqc',
          time: rec.timestamp ? new Date(rec.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '',
          date: dateKey
        };
        updateCount++;
      }
    }
  }
  console.log(`[PVQCSCORES] Synced legacy PVQC scores.`);

  // 6. Sync Whitelist & Admin Config
  const expWL = exportData['config']?.['teacherWhitelist'] || {};
  for (const [wSan, wData] of Object.entries(expWL)) {
    if (!liveData['config']?.['teacherWhitelist']?.[wSan]) {
      updates[`config/teacherWhitelist/${wSan}`] = wData;
      updateCount++;
    }
  }

  console.log(`\nPrepared ${Object.keys(updates).length} total updates for live DB.`);

  if (Object.keys(updates).length > 0) {
    console.log('Writing updates to Live Firebase Realtime Database...');
    await db.ref().update(updates);
    console.log(`\n✅ Successfully synced ${Object.keys(updates).length} missing records into Firebase Realtime Database!`);
  } else {
    console.log('Live database is already 100% up to date with export file!');
  }
}

restoreAndSync().catch(err => {
  console.error('Sync failed:', err);
});
