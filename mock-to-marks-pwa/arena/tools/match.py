import re, json, sys
paper, keytxt, keypage = sys.argv[1], sys.argv[2], int(sys.argv[3])
t = re.sub(r'[ \t]+', ' ', open(paper).read())
t = re.sub(r'(\d) (\d)', r'\1\2', t); t = re.sub(r'(\d) (\d)', r'\1\2', t)
# key: only the requested page
k = open(keytxt).read().split('=== PAGE ')
kp = [x for x in k if x.startswith(f'{keypage} ===')][0]
kp = re.sub(r'[ \t]+', ' ', kp)
key = dict(re.findall(r'(\d{8,})\s+(\d{8,}|\d{1,7}(?:\.\d+)?|Drop|DROP|[\w\.]+)', kp))
out = []; sec = None
for m in re.finditer(r'(Section\s*:\s*(\w+)\s*Section\s*([AB]))|Q\.(\d+)(.*?)(?=Q\.\d+|\Z)', t, re.S):
    if m.group(1): sec = f'{m.group(2)} {m.group(3)}'; continue
    body = m.group(5)
    qid = re.search(r'Question\s*ID\s*:\s*(\d+)', body)
    if not qid: continue
    opts = re.findall(r'Option\s*(\d)\s*ID\s*:\s*(\d+)', body)
    typ = re.search(r'Question\s*Type\s*:\s*(\w+)', body)
    qid = qid.group(1); ans = key.get(qid)
    rec = dict(q=int(m.group(4)), sec=sec, qid=qid, type=typ.group(1) if typ else '?', key=ans)
    if opts:
        ids = {i: oid for i, oid in opts}; pos = [i for i, oid in opts if oid == ans]
        rec['opts'] = ids; rec['correct_pos'] = int(pos[0]) if pos else None
    out.append(rec)
print(len(out), 'questions;', sum(1 for r in out if r['key'] is None), 'without key;',
      sum(1 for r in out if r.get('opts') and r['correct_pos'] is None), 'MCQ unmatched;',
      [r['qid'] for r in out if r['key'] in ('Drop', 'DROP')], 'dropped')
json.dump(out, open(paper + '.match.json', 'w'), indent=0)
for r in out: print(r['q'], r['sec'], r['qid'], r['type'], 'ANS', r.get('correct_pos') or r['key'])
