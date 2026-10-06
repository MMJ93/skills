import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {NAME,VERSION,COMMIT,FILES,gitBlobId,verifyBlob,replaceExactlyOnce,adaptSkill,METADATA,inventory,isSameInstall,installPrepared,parseArgs,writeAdaptation} from '../installer.mjs';

// A deliberately small fixture of the exact upstream patch anchors, not a copy
// of the runtime and not a substitute for a real upstream/runtime smoke test.
const source=`---
name: html-plan
description: Use when the user types /html-plan.
---

# html-plan

Plan this: $ARGUMENTS

Do not start building until that response arrives.

## The tree

Keep original rules and source references.
Then build.

- **As a file.** Give the user \`plan.packed.html\` to open in a browser.
- **As a published artifact**, if you have an Artifact tool. Pack with \`--artifact\` and publish \`plan.artifact.html\`. Keep it private unless the user asks to share it.
`;
async function inTemp(run){const p=await fs.mkdtemp(path.join(os.tmpdir(),'html-plan-unit-'));try{return await run(p);}finally{await fs.rm(p,{recursive:true,force:true});}}
async function writeMarker(p){const files=await inventory(p);await fs.writeFile(path.join(p,'INSTALL.json'),JSON.stringify({name:NAME,version:VERSION,commit:COMMIT,files}));}

test('Git blob checksum agrees with Git for exact bytes',()=>{const b=Buffer.from('hello\n');const p=spawnSync('git',['hash-object','--stdin'],{input:b,encoding:'utf8'});assert.equal(p.status,0);assert.equal(gitBlobId(b),p.stdout.trim());});
test('integrity accepts original and rejects changed bytes',()=>{const b=Buffer.from('abc');verifyBlob(b,gitBlobId(b),'fixture');assert.throws(()=>verifyBlob(Buffer.from('abd'),gitBlobId(b),'fixture'),/Integrity mismatch/);});
test('all downloads are pinned, unique and relative',()=>{assert.match(COMMIT,/^[a-f0-9]{40}$/);assert.equal(new Set(FILES.map(f=>f.name)).size,6);for(const f of FILES){assert.match(f.sha,/^[a-f0-9]{40}$/);assert.ok(!f.name.startsWith('/')&&!f.name.split('/').includes('..'));}});
test('patch names skill and removes command placeholders',()=>{const s=adaptSkill(source);assert.match(s,/name: html-plan-codex\n/);assert.match(s,/# html-plan-codex\n/);assert.ok(s.includes('$html-plan-codex'));assert.ok(!s.includes('$ARGUMENTS')&&!s.includes('/html-plan'));});
test('patch removes live-artifact instructions and keeps local handoff',()=>{const s=adaptSkill(source);assert.ok(!s.includes('`--artifact`'));assert.ok(s.includes('local packed file'));assert.ok(s.includes('Keep original rules and source references.'));});
test('patch requires explicit approval and retains project constraints',()=>{const s=adaptSkill(source);assert.ok(!s.includes('Then build.'));assert.ok(s.includes('AGENTS.md'));assert.ok(s.includes('untrusted task data'));assert.ok(s.includes('Do not change implementation files'));});
test('patch fails closed when expected upstream text is missing',()=>{assert.throws(()=>adaptSkill(source.replace('Plan this: $ARGUMENTS','Unknown syntax')),/patch anchor changed/);});
test('patch fails closed when an anchor is duplicated',()=>{assert.throws(()=>replaceExactlyOnce('x x','x','y'),/patch anchor changed/);});
test('metadata uses explicit-only invocation',()=>{assert.ok(METADATA.includes('allow_implicit_invocation: false'));assert.ok(METADATA.includes('$html-plan-codex'));});
test('CLI defaults to current .agents discovery location',()=>{assert.equal(parseArgs([]).dest,path.join(os.homedir(),'.agents','skills',NAME));});
test('CLI accepts dry run, example and an explicit destination',()=>{const o=parseArgs(['--dry-run','--open-example','--dest','/tmp/skill-test']);assert.equal(o.dest,'/tmp/skill-test');assert.equal(o.dryRun,true);assert.equal(o.open,true);});
test('CLI refuses unknown or incomplete arguments',()=>{assert.throws(()=>parseArgs(['--force']),/Unknown option/);assert.throws(()=>parseArgs(['--dest']),/needs a directory/);});
test('adaptation preserves original runtime bytes and adds CJS scope',()=>inTemp(async p=>{await fs.mkdir(path.join(p,'runtime'));await fs.writeFile(path.join(p,'runtime','htmlplan.js'),'// upstream fixture\n');await fs.writeFile(path.join(p,'SKILL.md'),source);await writeAdaptation(p);assert.equal(await fs.readFile(path.join(p,'runtime','htmlplan.js'),'utf8'),'// upstream fixture\n');assert.equal(JSON.parse(await fs.readFile(path.join(p,'runtime','package.json'),'utf8')).type,'commonjs');assert.ok(await fs.readFile(path.join(p,'agents','openai.yaml'),'utf8'));}));
test('new skill installation is isolated and preserves a sibling skill',()=>inTemp(async p=>{const src=path.join(p,'prepared');const dest=path.join(p,'.agents','skills',NAME);await fs.mkdir(src);await fs.writeFile(path.join(src,'SKILL.md'),'fixture');const sibling=path.join(p,'.agents','skills','other');await fs.mkdir(sibling,{recursive:true});await fs.writeFile(path.join(sibling,'SKILL.md'),'do not touch');await installPrepared(src,dest);assert.equal(await fs.readFile(path.join(dest,'SKILL.md'),'utf8'),'fixture');assert.equal(await fs.readFile(path.join(sibling,'SKILL.md'),'utf8'),'do not touch');assert.deepEqual((await fs.readdir(path.join(p,'.agents'))).sort(),['skills']);}));
test('existing destination is refused without any overwrite',()=>inTemp(async p=>{const src=path.join(p,'prepared'),dest=path.join(p,'skills','existing');await fs.mkdir(src);await fs.writeFile(path.join(src,'SKILL.md'),'new');await fs.mkdir(dest,{recursive:true});await fs.writeFile(path.join(dest,'SKILL.md'),'original');await assert.rejects(()=>installPrepared(src,dest),/already exists/);assert.equal(await fs.readFile(path.join(dest,'SKILL.md'),'utf8'),'original');}));
test('exact marked installation is recognized as unchanged',()=>inTemp(async p=>{await fs.writeFile(path.join(p,'SKILL.md'),'content');await writeMarker(p);assert.equal(await isSameInstall(p),true);}));
test('modified and extra files prevent a false already-installed result',()=>inTemp(async p=>{await fs.writeFile(path.join(p,'SKILL.md'),'content');await writeMarker(p);await fs.writeFile(path.join(p,'extra.txt'),'personal');assert.equal(await isSameInstall(p),false);await fs.rm(path.join(p,'extra.txt'));await fs.writeFile(path.join(p,'SKILL.md'),'changed');assert.equal(await isSameInstall(p),false);}));
test('symlink content is never followed for installation verification',()=>inTemp(async p=>{const outside=path.join(p,'outside');await fs.writeFile(outside,'private');const dir=path.join(p,'skill');await fs.mkdir(dir);await fs.symlink(outside,path.join(dir,'linked'));await assert.rejects(()=>inventory(dir),/symlink/);}));
