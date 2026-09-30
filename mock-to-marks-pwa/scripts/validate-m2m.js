const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'm2m', 'index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).filter(Boolean);
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `m2m-inline-${index + 1}.js` }));

if (!html.includes('id="f_exam"') || !html.includes("NEET:['Physics','Chemistry','Biology']")) {
  throw new Error('Mock creation is missing the JEE/NEET exam-specific subject controls');
}
if (!html.includes('chapterOptionsHtml(exam, q.subject, q.chapter)')) {
  throw new Error('Question cards are not using the exam-specific chapter catalogue');
}
if (!html.includes('data-action="viewAnalysis"') || !html.includes('View My Analysis') || !html.includes('Generate a Plan for Me')) {
  throw new Error('The free-analysis-before-plan flow is missing its required actions');
}
const chooseLength = html.indexOf("if(!state.routeParams.planDays){ showGateOverlay(planLengthGateHtml(), null); return; }");
const checkPayment = html.indexOf("if(!isEntitled()){ showPayGate(function(){ App.generatePlan(); }); return; }");
if (chooseLength < 0 || checkPayment < 0 || chooseLength > checkPayment) {
  throw new Error('Plan length must be chosen before the payment gate is shown');
}
if (!html.includes('value="semiannual"') || !html.includes('₹279 / six months')) {
  throw new Error('The six-month ₹279 subscription is missing from a pricing surface');
}
console.log(`Validated ${inlineScripts.length} Mock-to-Marks inline scripts and exam-specific analysis controls.`);
