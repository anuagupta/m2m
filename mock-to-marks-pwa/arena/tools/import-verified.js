'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { initialDifficulty } = require('./difficulty');

const input = process.argv[2];
const apply = process.argv.includes('--apply');
if (!input) throw new Error('Usage: node arena/tools/import-verified.js intake.json [--apply]');

const root = path.join(__dirname, '..', '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'subject-chapters.js'), 'utf8'), ctx);
['questions.js', 'practice.js', 'pyq.js'].forEach((name) => vm.runInContext(fs.readFileSync(path.join(root, 'arena', name), 'utf8'), ctx));
const existing = new Set(ctx.window.QBANK.map((q) => q.id));
const rows = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
if (!Array.isArray(rows) || !rows.length) throw new Error('Intake must be a non-empty JSON array.');

const officialHost = /(^|\.)(nta\.ac\.in|nta\.nic\.in|s3waas\.gov\.in|cbse\.gov\.in|cbse\.nic\.in|cbseacademic\.nic\.in)$/i;
const recoveryHost = /(^|\.)(careers360\.com|aakash\.ac\.in|resonance\.ac\.in|allen\.in)$/i;
const clean = rows.map((raw, i) => {
  const label = raw.id || `row ${i + 1}`;
  if (/examside|examgoal/i.test(JSON.stringify(raw))) throw new Error(`${label}: prohibited transcription source`);
  ['id', 'exam', 'year', 'examDate', 'subject', 'chapter', 'type', 'q', 'answer', 'hint', 'solution', 'sourceUrl', 'answerKeyUrl'].forEach((key) => {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') throw new Error(`${label}: missing ${key}`);
  });
  const inScope = ['JEE', 'NEET'].includes(raw.exam) && raw.year >= 2017 && raw.year <= 2026;
  if (!inScope) throw new Error(`${label}: exam/year is outside this intake`);
  if (existing.has(raw.id)) throw new Error(`${label}: duplicate question id`);
  existing.add(raw.id);
  const chapters = ctx.window.PJ_SUBJECT_CHAPTERS[raw.exam] && ctx.window.PJ_SUBJECT_CHAPTERS[raw.exam][raw.subject];
  if (!chapters || !chapters.includes(raw.chapter)) throw new Error(`${label}: chapter is not in the canonical dropdown catalogue`);
  [raw.sourceUrl, raw.answerKeyUrl].forEach((value) => {
    const url = new URL(value);
    if (!officialHost.test(url.hostname)) throw new Error(`${label}: provenance must use an official NTA host`);
  });
  if (raw.transcriptionUrl) throw new Error(`${label}: transcriptionUrl is no longer accepted; use recoverySourceUrl`);
  if (raw.recoverySourceUrl) {
    const recovery = new URL(raw.recoverySourceUrl);
    if (!recoveryHost.test(recovery.hostname)) throw new Error(`${label}: recovery source is not approved`);
  }
  const legacyOfficialIntake = !!raw.officialQuestionId && raw.answerKeyMatch === undefined;
  if (raw.exam === 'NEET' && raw.subject === 'Biology' && !legacyOfficialIntake && !['Botany', 'Zoology'].includes(raw.biologyBranch)) {
    throw new Error(`${label}: NEET Biology requires biologyBranch Botany or Zoology`);
  }
  if (raw.answerKeyMatch !== true && !legacyOfficialIntake) throw new Error(`${label}: official answer-key match is not confirmed`);
  if (raw.independentSolution !== true && !legacyOfficialIntake) throw new Error(`${label}: independent solution is not confirmed`);
  const hasDiagram = !!raw.img || (Array.isArray(raw.options) && raw.options.some((option) => option && typeof option === 'object' && option.img));
  const diagramStatus = raw.diagramStatus || (!hasDiagram && legacyOfficialIntake ? 'not_required' : null);
  if (!['not_required', 'redrawn'].includes(diagramStatus)) throw new Error(`${label}: diagram must be absent or independently redrawn`);
  if (raw.ambiguous === true || raw.dropped === true || raw.bonus === true) throw new Error(`${label}: ambiguous/dropped/bonus questions cannot be imported`);
  if (raw.type === 'mcq' && (!Array.isArray(raw.options) || raw.options.length < 4 || !Number.isInteger(raw.answer) || raw.answer < 0 || raw.answer >= raw.options.length)) throw new Error(`${label}: invalid MCQ answer/options`);
  if (!['mcq', 'num'].includes(raw.type)) throw new Error(`${label}: unsupported type`);
  const difficulty = raw.difficulty === undefined ? initialDifficulty(raw.difficultyEvidence) : raw.difficulty;
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 10) throw new Error(`${label}: difficulty must be 0–10`);
  return Object.assign({}, raw, { difficulty, diagramStatus, source: raw.source || `${raw.exam} ${raw.year} · ${raw.examDate}` });
});

if (!apply) {
  console.log(JSON.stringify(clean, null, 2));
  console.error(`Validated ${clean.length} official questions. Re-run with --apply to append them.`);
  process.exit(0);
}

const bank = path.join(root, 'arena', 'pyq.js');
const source = fs.readFileSync(bank, 'utf8');
const marker = '\n);';
const at = source.lastIndexOf(marker);
if (at < 0) throw new Error('Could not locate the PYQ bank terminator.');
const serialized = clean.map((q) => `  ${JSON.stringify(q)}`).join(',\n');
const prefix = source.slice(0, at).replace(/,?\s*$/, ',\n');
fs.writeFileSync(bank, `${prefix}${serialized}${source.slice(at)}`);
console.log(`Added ${clean.length} verified questions to arena/pyq.js. Run npm test before committing.`);
