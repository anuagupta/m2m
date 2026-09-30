'use strict';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Produce an explainable initial 0–10 rating. This is intentionally not an
 * LLM guess: reviewers record observable features and the same inputs always
 * produce the same result. Live attempt data can later replace the prior.
 */
function initialDifficulty(evidence) {
  const e = evidence || {};
  let score = 1;
  score += clamp(Number(e.conceptLinks || 0), 0, 4) * 1.15;
  score += clamp(Number(e.reasoningSteps || 0), 0, 6) * 0.55;
  score += clamp(Number(e.calculationLoad || 0), 0, 3) * 0.65;
  score += e.nonObviousInsight ? 1.2 : 0;
  score += e.commonTrap ? 0.55 : 0;
  score -= e.directRecall ? 1 : 0;
  return Math.round(clamp(score, 0, 10));
}

/** Bayesian correct-rate estimate (20 attempts of prior strength avoids wild
 * swings for new questions), with small time/hint penalties. */
function observedDifficulty(stats, priorDifficulty) {
  const s = stats || {};
  const attempts = Math.max(0, Number(s.attempts || 0));
  const correct = clamp(Number(s.correct || 0), 0, attempts);
  const prior = clamp(Number(priorDifficulty || 5), 0, 10);
  const priorCorrect = 1 - prior / 10;
  const correctRate = (correct + 20 * priorCorrect) / (attempts + 20);
  let score = 10 * (1 - correctRate);
  if (Number(s.medianSeconds) > Number(s.targetSeconds || 120)) score += 0.5;
  if (attempts && Number(s.hintUses || 0) / attempts > 0.35) score += 0.5;
  return Math.round(clamp(score, 0, 10));
}

module.exports = { initialDifficulty, observedDifficulty };
