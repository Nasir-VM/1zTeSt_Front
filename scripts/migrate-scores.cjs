/**
 * Migration: Restructure PVQCSCORES with date indexing + add question_count
 */
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const serviceAccount = require(path.join(process.env.HOME, 'Desktop/Firebase/iamnasirlin-firebase-adminsdk-fbsvc-15b968b42c.json'));

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://iamnasirlin-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const db = getDatabase(app);

function sanitizeEmail(email) {
  return email.replace(/\./g, ',').replace(/#/g, ',').replace(/\$/g, ',').replace(/\//g, ',');
}

async function migrateScores() {
  console.log('=== Migrating PVQCSCORES with date indexing ===\n');

  const teacherEmail = 'hi@nasirlin.net';
  const teacherSan = sanitizeEmail(teacherEmail);

  const snap = await db.ref('PVQCSCORES').once('value');
  const data = snap.val();
  if (!data) { console.log('No PVQCSCORES data found'); return; }

  console.log('Current top-level keys:', Object.keys(data));

  const allRecords = [];
  const oldKeys = ['SCORES1', 'SCORES2', 'SCORES3', 'TOTALSCORES'];

  for (const key of oldKeys) {
    const records = data[key];
    if (!records || typeof records !== 'object') continue;
    for (const [pushKey, rec] of Object.entries(records)) {
      if (!rec || typeof rec !== 'object') continue;
      allRecords.push({
        pushKey, oldKey: key,
        score: rec.score || 0,
        studentId: rec.studentId || '',
        studentName: rec.studentName || '',
        timestamp: rec.timestamp || '',
        totalQuestions: rec.totalQuestions || null
      });
    }
  }

  console.log(`Found ${allRecords.length} old-format records to migrate\n`);

  const updates = {};
  for (const rec of allRecords) {
    let dateKey = '2026-01-01';
    if (rec.timestamp) {
      try {
        const d = new Date(rec.timestamp);
        if (!isNaN(d.getTime())) {
          dateKey = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
        }
      } catch (e) {}
    }

    const studentSan = sanitizeEmail(rec.studentId || 'unknown');
    const chapterKey = 'legacy_' + rec.oldKey.toLowerCase();
    const timeStr = rec.timestamp ? new Date(rec.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '';

    const newRecord = {
      student: rec.studentId,
      name: rec.studentName,
      score: rec.score,
      total: rec.totalQuestions || 0,
      type: 'quiz',
      time: timeStr,
      date: dateKey,
      migrated: true
    };

    const dbPath = `PVQCSCORES/${teacherSan}/${dateKey}/${studentSan}/${chapterKey}/${rec.pushKey}`;
    updates[dbPath] = newRecord;
  }

  console.log(`Writing ${Object.keys(updates).length} records to new structure...`);
  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
    console.log(`✅ Migrated ${Object.keys(updates).length} records`);
  }

  // Remove old keys
  for (const key of oldKeys) {
    if (data[key]) {
      await db.ref('PVQCSCORES/' + key).remove();
      console.log(`  Removed PVQCSCORES/${key}`);
    }
  }
  console.log('=== Score migration complete ===\n');
}

async function addQuestionCounts() {
  console.log('=== Adding question_count to chapters ===\n');
  const chaptersSnap = await db.ref('Teacherquestion').once('value');
  const teachers = chaptersSnap.val();
  if (!teachers) { console.log('No Teacherquestion data'); return; }

  const updates = {};
  for (const [teacherKey, teacherData] of Object.entries(teachers)) {
    const chapters = teacherData.chapters;
    if (!chapters) continue;
    for (const [chKey, chData] of Object.entries(chapters)) {
      const count = chData.questions ? Object.keys(chData.questions).length : 0;
      updates[`Teacherquestion/${teacherKey}/chapters/${chKey}/question_count`] = count;
      console.log(`  ${chData.name}: ${count} questions`);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
    console.log(`\n✅ Updated question_count for ${Object.keys(updates).length} chapters`);
  }
}

async function deployRules() {
  console.log('\n=== Deploying RTDB rules ===\n');
  const rules = {
    rules: {
      ".read": true,
      ".write": true
    }
  };
  console.log(JSON.stringify(rules, null, 2));
  console.log('(Rules must be deployed via Firebase Console or CLI)');
}

async function main() {
  try {
    await migrateScores();
    await addQuestionCounts();
    await deployRules();
    console.log('\n🎉 All migrations complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

main();
