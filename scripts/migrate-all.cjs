/**
 * Full Migration Script:
 * 1. Migrates legacy general scores from 1zTeStsys/Teacheraccount/{teacher}/Teacherscores -> QUIZSCORES/{teacher}/{dateKey}/{student}/{chapterKey}
 * 2. Migrates legacy PVQCSCORES (SCORES1..3, TOTALSCORES) -> PVQCSCORES/{teacher}/{dateKey}/{student}/{chapterKey}
 * 3. Ensures strict separation between QUIZSCORES (system tests) and PVQCSCORES (PVQC/TTVS tests).
 *
 * Usage:
 *   node scripts/migrate-all.cjs          (Dry run - inspect records)
 *   node scripts/migrate-all.cjs --apply  (Execute live updates to Firebase Realtime Database)
 */
const path = require('path');
const fs = require('fs');

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

async function runMigration() {
  const isApply = process.argv.includes('--apply');
  console.log(`=== Migration Script (${isApply ? 'LIVE EXECUTION' : 'DRY RUN'}) ===\n`);

  if (!fs.existsSync(exportPath)) {
    console.error('Export file not found at:', exportPath);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  console.log('Top level keys in export:', Object.keys(rawData));

  // 1. General System Scores Migration (1zTeStsys -> QUIZSCORES)
  const quizScoresUpdates = {};
  let quizCount = 0;
  const teacherAccounts = rawData['1zTeStsys']?.['Teacheraccount'] || {};

  for (const [teacherSan, teacherData] of Object.entries(teacherAccounts)) {
    const scores = teacherData.Teacherscores || {};
    for (const [pushKey, rec] of Object.entries(scores)) {
      if (!rec || typeof rec !== 'object') continue;
      const studentEmail = rec.Studentaccount || rec.student || 'unknown';
      const studentSan = sanitizeEmail(studentEmail);
      const chapterKey = rec.chapterId || 'general_chapter';
      const dateKey = parseDateKey(rec.data || rec.date || rec.time);
      const scoreNum = parseInt(rec.stuscore != null ? rec.stuscore : rec.score) || 0;

      const newRecord = {
        student: studentEmail,
        name: rec.name || studentEmail,
        score: scoreNum,
        total: rec.total || 100,
        type: 'quiz',
        time: rec.time || rec.data || '',
        date: dateKey,
        notes: rec.notes || '',
        migratedFrom: '1zTeStsys/Teacheraccount/Teacherscores'
      };

      const targetPath = `QUIZSCORES/${teacherSan}/${dateKey}/${studentSan}/${chapterKey}/${pushKey}`;
      quizScoresUpdates[targetPath] = newRecord;
      quizCount++;
    }
  }
  console.log(`[QUIZSCORES] Prepared ${quizCount} general quiz score records.`);

  // 2. Legacy PVQC Scores Migration (PVQCSCORES -> PVQCSCORES)
  const pvqcScoresUpdates = {};
  let pvqcCount = 0;
  const pvqcOldKeys = ['SCORES1', 'SCORES2', 'SCORES3', 'TOTALSCORES'];
  const legacyTeacherSan = sanitizeEmail('hi@nasirlin.net');

  for (const key of pvqcOldKeys) {
    const records = rawData['PVQCSCORES']?.[key] || {};
    for (const [pushKey, rec] of Object.entries(records)) {
      if (!rec || typeof rec !== 'object') continue;
      const studentId = rec.studentId || 'unknown';
      const studentSan = sanitizeEmail(studentId);
      const chapterKey = 'pvqc_' + key.toLowerCase();
      const dateKey = parseDateKey(rec.timestamp);
      const scoreNum = parseInt(rec.score) || 0;

      const newRecord = {
        student: studentId,
        name: rec.studentName || studentId,
        score: scoreNum,
        total: rec.totalQuestions || 100,
        type: 'pvqc',
        time: rec.timestamp ? new Date(rec.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '',
        date: dateKey,
        migratedFrom: `PVQCSCORES/${key}`
      };

      const targetPath = `PVQCSCORES/${legacyTeacherSan}/${dateKey}/${studentSan}/${chapterKey}/${pushKey}`;
      pvqcScoresUpdates[targetPath] = newRecord;
      pvqcCount++;
    }
  }
  console.log(`[PVQCSCORES] Prepared ${pvqcCount} legacy PVQC score records.`);

  if (!isApply) {
    console.log('\nDRY RUN complete! To execute live updates against Firebase Realtime Database, run:');
    console.log('  node scripts/migrate-all.cjs --apply');
    return;
  }

  // Live execution using firebase-admin
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key file not found at:', serviceAccountPath);
    return;
  }

  const { initializeApp, cert } = require('firebase-admin/app');
  const { getDatabase } = require('firebase-admin/database');

  const serviceAccount = require(serviceAccountPath);
  const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://iamnasirlin-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
  const db = getDatabase(app);

  console.log('\nWriting QUIZSCORES updates to Firebase...');
  if (Object.keys(quizScoresUpdates).length > 0) {
    await db.ref().update(quizScoresUpdates);
    console.log(`✅ Successfully written ${Object.keys(quizScoresUpdates).length} QUIZSCORES records.`);
  }

  console.log('Writing PVQCSCORES updates to Firebase...');
  if (Object.keys(pvqcScoresUpdates).length > 0) {
    await db.ref().update(pvqcScoresUpdates);
    console.log(`✅ Successfully written ${Object.keys(pvqcScoresUpdates).length} PVQCSCORES records.`);
  }

  console.log('\n🎉 Live migration complete!');
}

runMigration().catch(err => {
  console.error('Migration error:', err);
});
