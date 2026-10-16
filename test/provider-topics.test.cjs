const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join,dirname,basename}=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {JSDOM}=require(require.resolve('jsdom',{paths:[join(__dirname,'../../../webview')]}));

test('provider page includes every official topic, places implemented controls in their documented topics, and keeps pending topics empty',()=>{
  const keys={Model:'model',Effort:'effortLevel',ResponseLanguage:'language',Thinking:'alwaysThinkingEnabled',FastMode:'fastMode',ThinkingSummaries:'showThinkingSummaries',RespectGitignore:'respectGitignore',Checkpointing:'fileCheckpointingEnabled',FileSuggestion:'fileSuggestion',SpinnerVerbs:'spinnerVerbs',NonessentialTraffic:'env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',DefaultMode:'permissions.defaultMode',VoiceEnabled:'voice.enabled',UpdateChannel:'autoUpdatesChannel',ConfigDirectory:'env.CLAUDE_CONFIG_DIR',AutoUpdate:'env.DISABLE_AUTOUPDATER'};
  let search = '';
  const cache=new Map();
  function load(file){
    if(cache.has(file))return cache.get(file).exports;
    const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(dirname(file));cache.set(file,m);
    const original=m.require.bind(m);
    m.require=id=>{
      if(id==='react-router')return {useLocation:()=>({search})};
      if(id.endsWith('/router'))return {useRouter:()=>({push:()=>{}})};
      if(id.endsWith('/i18n'))return require('./i18n-fixture.cjs');
      if(id.endsWith('/store'))return {useProviderScope:fn=>fn({scope:'global',projectId:''}),useProviderSettings:()=>({data:{settings:{},effectiveSettings:{}}})};
      if(id.endsWith('/SettingsControls'))return {SettingsSection:({title,children})=>React.createElement('section',null,React.createElement('h3',null,title),children)};
      if(id.endsWith('SettingItem')){const name=basename(id).replace('SettingItem','');return {[`${name}SettingItem`]:()=>React.createElement('code',{'data-key':keys[name]||name},keys[name]||name)};}
      if(id.endsWith('/ScopeControl'))return {ScopeControl:()=>null};
      if(id.startsWith('.')&&!id.endsWith('.mjs')){const base=join(dirname(file),id);return load(existsSync(base+'.tsx')?base+'.tsx':existsSync(base+'.ts')?base+'.ts':join(base,'index.tsx'));}
      return original(id);
    };
    m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;
  }
  const Page=load(join(__dirname,'../renderer/src/settings/ClaudeCodeSetting/index.tsx')).ClaudeCodeSetting;
  const initial=new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  assert.equal(initial.window.document.querySelectorAll('section').length,1,'show only the selected topic');
  assert.equal(initial.window.document.querySelector('section > h3').textContent,'모델 및 응답');
  assert.equal(initial.window.document.querySelectorAll('nav button').length,17,'topics belong in the content submenu');
  initial.window.close();
  const docs=[];
  for(const topic of ['model-and-responses','memory-and-context','interface-and-terminal','permission-settings','sandbox-settings','tools','hooks-and-automation','mcp','plugins-and-skills','agents-sessions-and-worktrees','authentication-and-providers','privacy-and-telemetry','remote-desktop-and-notifications','enterprise-and-managed-settings','git-and-attribution','updates-and-versioning','global-config-settings']) {
    search='?topic='+topic;
    const dom=new JSDOM(renderToStaticMarkup(React.createElement(Page)));docs.push(dom);
    assert.equal(dom.window.document.querySelectorAll('section').length,1,topic);
    assert.equal(dom.window.document.querySelector('nav [aria-current="page"]').getAttribute('data-topic'),topic);
  }
  const topics=['모델 및 응답','에이전트, 세션, 워크트리','원격, 데스크톱, 알림','MCP','플러그인 및 스킬','훅 및 자동화','인증 및 공급자','권한 설정','인터페이스 및 터미널','Git 및 속성','메모리 및 컨텍스트','전역 설정','업데이트 및 버전 관리','도구','개인정보 보호 및 텔레메트리','엔터프라이즈 및 관리형 설정','샌드박스 설정'];
  assert.deepEqual(docs.map(dom=>dom.window.document.querySelector('section > h3').textContent).sort(),topics.sort());
  for(const [key,topic] of [['voice.enabled','인터페이스 및 터미널'],['autoUpdatesChannel','업데이트 및 버전 관리'],['env.CLAUDE_CONFIG_DIR','메모리 및 컨텍스트'],['env.DISABLE_AUTOUPDATER','메모리 및 컨텍스트'],['fileSuggestion','인터페이스 및 터미널'],['spinnerVerbs','인터페이스 및 터미널'],['respectGitignore','인터페이스 및 터미널'],['fileCheckpointingEnabled','메모리 및 컨텍스트'],['env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC','메모리 및 컨텍스트'],['permissions.defaultMode','권한 설정']]){
    const row=docs.map(dom=>dom.window.document.querySelector(`[data-key="${key}"]`)).find(Boolean);assert.ok(row,key);assert.equal(row.closest('section').querySelector('h3').textContent,topic);
  }
  assert.equal(docs.find(dom=>dom.window.document.querySelector('section > h3').textContent==='MCP').window.document.querySelector('section code'),null);
  search='?topic=unknown';
  const fallback=new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  assert.equal(fallback.window.document.querySelector('section > h3').textContent,'모델 및 응답');
  fallback.window.close();docs.forEach(dom=>dom.window.close());
});
