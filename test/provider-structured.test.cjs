const { test } = require('node:test');
const assert = require('node:assert/strict');
test('structured edits preserve unknown provider fields and remove only the requested override', async () => {
  const { updateProviderEntry, fileSuggestionValue, spinnerVerbsValue } = await import('../src/provider-settings.mjs');
  const original = { defaultMode: 'plan', allow: ['Read'], futurePolicy: { keep: true } };
  assert.deepEqual(updateProviderEntry(original, 'deny', ['Bash(rm *)']), { ...original, deny: ['Bash(rm *)'] });
  assert.deepEqual(updateProviderEntry(original, 'defaultMode', null), { allow: ['Read'], futurePolicy: { keep: true } });
  assert.equal(updateProviderEntry({ language: 'ko' }, 'language', null), null);
  assert.deepEqual(fileSuggestionValue({ future: true }, '  git ls-files  '), { future: true, type: 'command', command: 'git ls-files' });
  assert.equal(fileSuggestionValue({}, '  '), null);
  assert.deepEqual(spinnerVerbsValue({ future: 1 }, 'replace', [' Working ']), { future: 1, mode: 'replace', verbs: ['Working'] });
  assert.equal(spinnerVerbsValue({}, 'replace', []), null);
  assert.deepEqual(original, { defaultMode: 'plan', allow: ['Read'], futurePolicy: { keep: true } });
});

test('spinner editor keeps the add field focused, guards IME, and saves mode and list changes', async t => {
  const React = require('react');
  const { readFileSync, existsSync } = require('node:fs');
  const { join, dirname } = require('node:path');
  const Module = require('node:module');
  const ts = require('typescript');
  const { JSDOM } = require(require.resolve('jsdom', { paths: [join(__dirname, '../../../webview')] }));
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const names = ['window','document','navigator','HTMLElement','HTMLInputElement','Node'];
  const saved = new Map(names.map(name => [name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  for (const name of names) Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  t.after(async()=>{await React.act(()=>root.unmount());dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;for(const [name,desc] of saved){if(desc)Object.defineProperty(globalThis,name,desc);else delete globalThis[name];}});
  const cache = new Map();
  function load(file) {
    if(cache.has(file))return cache.get(file).exports;
    const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(dirname(file));cache.set(file,m);
    const original=m.require.bind(m);
    m.require=id=>id.endsWith('/i18n')?require('./i18n-fixture.cjs'):id.endsWith('/Tooltip')?{Tooltip:({children})=>children}:id.startsWith('.')&&!id.endsWith('.mjs')?load(join(dirname(file),id+(existsSync(join(dirname(file),id+'.tsx'))?'.tsx':'.ts'))):original(id);
    m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;
  }
  const { SpinnerVerbsEditor }=load(join(__dirname,'../renderer/src/settings/ClaudeCodeSetting/SpinnerVerbsEditor.tsx'));
  const writes=[];
  await React.act(()=>root.render(React.createElement(SpinnerVerbsEditor,{value:null,onSave:async value=>{writes.push(value);}})));
  const add=document.querySelector('input');
  await React.act(()=>{add.focus();Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(add,'생각 중');add.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await React.act(()=>add.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true})));
  assert.equal(writes.length,0);
  await React.act(()=>add.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  assert.deepEqual(writes.at(-1),{mode:'append',verbs:['생각 중']});
  assert.equal(document.activeElement,add);
  assert.equal(add.value,'');
  await React.act(()=>document.querySelector('button[data-mode="replace"]').click());
  assert.deepEqual(writes.at(-1),{mode:'replace',verbs:['생각 중']});
  await React.act(()=>document.querySelector('button[data-remove]').click());
  assert.equal(writes.at(-1),null);
  assert.equal(document.querySelector('textarea'),null,'no raw JSON editor');
});

test("nested permission fields inherit and reset independently of sibling overrides", async () => {
  const { providerNestedField, updateProviderEntry } = await import("../src/provider-settings.mjs");
  const data = { settings: { permissions: { allow: ["Read"] } }, effectiveSettings: { permissions: { allow: ["Read"], defaultMode: "plan", disableAutoMode: "disable" } }, projectSettings: { permissions: { allow: ["Read"] } } };
  assert.deepEqual(providerNestedField(data, "project", "permissions", "defaultMode", ""), {value:"plan",inherited:true,shadowed:false});
  assert.equal(providerNestedField(data, "project", "permissions", "allow", []).inherited, false);
  assert.deepEqual(updateProviderEntry({allow:["Read"],disableAutoMode:"disable"}, "disableAutoMode", null), {allow:["Read"]});
});

test('permission policies expose switches and persist disable/reset independently', async t => {
  const React = require('react');
  const { readFileSync } = require('node:fs');
  const { join, dirname } = require('node:path');
  const Module = require('node:module');
  const ts = require('typescript');
  const { JSDOM } = require(require.resolve('jsdom', { paths: [join(__dirname, '../../../webview')] }));
  const dom = new JSDOM('<div id="root"></div>');
  const names = ['window','document','navigator','HTMLElement','Node'];
  const saved = new Map(names.map(name => [name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  for (const name of names) Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  t.after(async()=>{await React.act(()=>root.unmount());dom.window.close();delete globalThis.IS_REACT_ACT_ENVIRONMENT;for(const [name,desc] of saved){if(desc)Object.defineProperty(globalThis,name,desc);else delete globalThis[name];}});
  const writes = [];
  const elements = ['DisableBypassMode','DisableAutoMode'].map(name => {
    const file = join(__dirname,`../renderer/src/settings/ClaudeCodeSetting/PermissionsSection/${name}SettingItem.tsx`);
    const m = new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(dirname(file));
    const original=m.require.bind(m);
    m.require=id=>id.endsWith('/store')?{usePermissionField:key=>{
      const [value,setValue]=React.useState(null);
      return {value,pending:false,save:async next=>{writes.push([key,next]);setValue(next);}};
    }}:id.endsWith('/ProviderSettingControl')?{ProviderSettingFrame:({title,settingKey,children})=>React.createElement('section',null,React.createElement('h4',null,title),React.createElement('code',null,settingKey),children)}:id.endsWith('/i18n')?require('./i18n-fixture.cjs'):id.endsWith('/SettingsControls')?{SettingsSwitch:({label,checked,onChange})=>React.createElement('button',{role:'switch','aria-label':label,'aria-checked':checked,onClick:()=>onChange(!checked)})}:original(id);
    m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,file);
    return React.createElement(m.exports[`${name}SettingItem`],{key:name});
  });
  await React.act(()=>root.render(React.createElement(React.Fragment,null,...elements)));
  const switches=document.querySelectorAll('[role=switch]');
  assert.equal(switches.length,2);
  await React.act(()=>switches[0].click());
  assert.equal(switches[0].getAttribute('aria-checked'),'true');
  assert.equal(switches[1].getAttribute('aria-checked'),'false');
  await React.act(()=>switches[0].click());
  await React.act(()=>switches[1].click());
  assert.deepEqual(writes,[['disableBypassPermissionsMode','disable'],['disableBypassPermissionsMode',null],['disableAutoMode','disable']]);
  assert.deepEqual([...document.querySelectorAll('code')].map(e=>e.textContent),['permissions.disableBypassPermissionsMode','permissions.disableAutoMode']);
});

test('environment variables inherit individually and preserve sibling keys on edits', async () => {
  const {providerNestedField,updateProviderEntry}=await import('../src/provider-settings.mjs');
  const data={settings:{env:{LOCAL:'local'}},effectiveSettings:{env:{LOCAL:'local',SHARED:'shared'}},overrides:[]};
  assert.deepEqual(providerNestedField(data,'project','env','SHARED',''),{value:'shared',inherited:true,shadowed:false});
  assert.equal(providerNestedField(data,'project','env','LOCAL','').inherited,false);
  assert.deepEqual(updateProviderEntry(data.settings.env,'SHARED','override'),{LOCAL:'local',SHARED:'override'});
  assert.deepEqual(updateProviderEntry({LOCAL:'local',SHARED:'override'},'SHARED',null),{LOCAL:'local'});
});

test('voice enablement preserves CLI-owned mode and autoSubmit while supporting scoped reset',async()=>{
 const {updateProviderEntry,providerNestedField}=await import('../src/provider-settings.mjs');
 const own={mode:'tap',autoSubmit:false};
 assert.deepEqual(updateProviderEntry(own,'enabled',false),{mode:'tap',autoSubmit:false,enabled:false});
 assert.deepEqual(updateProviderEntry({...own,enabled:false},'enabled',null),own);
 const data={settings:{voice:own},effectiveSettings:{voice:{...own,enabled:false}},overrides:[]};
 assert.deepEqual(providerNestedField(data,'project','voice','enabled',true),{value:false,inherited:true,shadowed:false});
 assert.equal(providerNestedField(undefined,'global','voice','enabled',true).value,true);
});
