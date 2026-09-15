import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Plus, FolderOpen, BookOpen, Sprout, Globe2, ChevronRight, ShieldCheck, Files, Waypoints, CircleHelp, FlaskConical, Leaf, Menu, X, Check, Search } from 'lucide-react';
import Botanical from './components/Botanical';
import CaseFlow from './components/CaseFlow';
import SavedCases from './components/SavedCases';
import { labels as l, scenarios, sources, t } from './data';
import { createCase } from './lib/case';
import { clearCases, loadCases, saveCases } from './lib/storage';
import type { CaseRecord, Language, Jurisdiction, Market, Scenario } from './types';

const PREFERENCES_KEY = 'ip-sakti-global-preferences-v1';
function loadGlobalPreferences(): { language: Language; jurisdiction: Jurisdiction; market: Market } {
  const fallback = { language: 'en' as Language, jurisdiction: 'india' as Jurisdiction, market: 'us' as Market };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<typeof fallback>;
    return {
      language: saved.language === 'hi' ? 'hi' : 'en',
      jurisdiction: ['india', 'international', 'compare'].includes(saved.jurisdiction ?? '') ? saved.jurisdiction as Jurisdiction : fallback.jurisdiction,
      market: ['us', 'eu', 'pct'].includes(saved.market ?? '') ? saved.market as Market : fallback.market,
    };
  } catch { return fallback; }
}

export default function App() {
  const [initialPreferences] = useState(loadGlobalPreferences);
  const [language,setLanguage]=useState<Language>(initialPreferences.language);
  const [jurisdiction,setJurisdiction]=useState<Jurisdiction>(initialPreferences.jurisdiction);
  const [market,setMarket]=useState<Market>(initialPreferences.market);
  const [page,setPage]=useState('home');
  const [menu,setMenu]=useState(false);
  const [about,setAbout]=useState(false);
  const [records,setRecords]=useState<CaseRecord[]>(loadCases);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [storageAvailable,setStorageAvailable]=useState(true);
  const [search,setSearch]=useState('');
  const L=(key:keyof typeof l)=>t(l[key],language);
  const activeRecord=records.find(record=>record.id===activeId)??null;
  useEffect(() => {
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ language, jurisdiction, market })); } catch { /* Case storage reports availability separately. */ }
  }, [language, jurisdiction, market]);
  function updateRecord(next:CaseRecord){
    const updated=[next,...records.filter(record=>record.id!==next.id)];
    setRecords(updated);setStorageAvailable(saveCases(updated));
    setJurisdiction(next.jurisdiction);setMarket(next.market);
  }
  function start(s:Scenario|null){
    const created=createCase(s?.id??null,language);
    const record={...created,jurisdiction:s?.id==='export'?'compare':jurisdiction,market};
    updateRecord(record);setActiveId(record.id);setPage('case');setMenu(false);
  }
  function open(id:string){const record=records.find(item=>item.id===id);if(!record)return;setActiveId(id);setJurisdiction(record.jurisdiction);setMarket(record.market);setPage('case');setMenu(false);}
  function reset(){
    const message=language==='hi'?'इस ऐप के स्थानीय उदाहरण केस हटाएँ? इससे अन्य ब्राउज़र डेटा प्रभावित नहीं होगा।':'Clear this app’s local sample cases? Other browser data will not be affected.';
    if(!window.confirm(message))return;
    clearCases();setRecords([]);setActiveId(null);setPage('home');setMenu(false);
  }
  function renameCase(id:string,title:string){const updated=records.map(record=>record.id===id?{...record,title,updatedAt:new Date().toISOString()}:record);setRecords(updated);setStorageAvailable(saveCases(updated));}
  function deleteCase(id:string){const updated=records.filter(record=>record.id!==id);setRecords(updated);setStorageAvailable(saveCases(updated));if(activeId===id){setActiveId(null);setPage('home');}}
  function changeJurisdiction(next:Jurisdiction){setJurisdiction(next);if(activeRecord)updateRecord({...activeRecord,jurisdiction:next,complete:activeRecord.complete,updatedAt:new Date().toISOString()});}
  function changeMarket(next:Market){setMarket(next);if(activeRecord)updateRecord({...activeRecord,market:next,complete:activeRecord.complete,updatedAt:new Date().toISOString()});}
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${menu?'open':''}`}>
      <button className="brand" onClick={()=>setPage('home')} aria-label="IP-SAKTI home"><span className="brand-mark"><Sprout size={25}/></span><span>IP-SAKTI<span className="brand-sub">SAHAYAK</span></span></button>
      <div className="sidebar-section">{language==='en'?'YOUR WORKSPACE':'आपका कार्यस्थल'}</div>
      <nav aria-label="Main navigation">
        <button className={page==='home'||page==='case'?'nav-item active':'nav-item'} onClick={()=>{setPage('home');setActiveId(null);setMenu(false);}}><Plus size={19}/>{L('newCase')}<span className="nav-shortcut">N</span></button>
        <button className={page==='saved'?'nav-item active':'nav-item'} onClick={()=>{setPage('saved');setActiveId(null);setMenu(false);}}><FolderOpen size={18}/>{L('saved')}<span className="nav-count">{records.length||''}</span></button>
        <button className={page==='sources'?'nav-item active':'nav-item'} onClick={()=>{setPage('sources');setMenu(false);}}><BookOpen size={18}/>{L('library')}<span className="nav-count">{sources.length}</span></button>
      </nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={()=>setAbout(true)}><CircleHelp size={18}/>{L('about')}</button><div className="team"><span className="team-avatar">G</span><div><strong>Team GeoVision</strong><span>SIH 2026 · Internal round</span></div><ShieldCheck size={16}/></div></div>
    </aside>
    {menu&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
    <div className="app-content">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Open navigation"><Menu size={20}/></button><span>{L('workspace')}</span><ChevronRight size={14}/><strong>{page==='sources'?L('library'):page==='saved'?L('saved'):L('newCase')}</strong></div><div className="top-controls"><div className="jurisdiction-control" aria-label="Jurisdiction">{(['india','international','compare'] as const).map(v=><button key={v} className={jurisdiction===v?'selected':''} onClick={()=>changeJurisdiction(v)}>{v==='india'&&<span className="india-dot"/>}{L(v)}</button>)}</div><label className="language-select"><Globe2 size={16}/><select aria-label="Language" value={language} onChange={e=>{setLanguage(e.target.value as Language);document.documentElement.lang=e.target.value;}}><option value="en">English</option><option value="hi">हिन्दी</option></select></label></div></header>
      {jurisdiction!=='india'&&<div className="market-strip"><Globe2 size={15}/><span>{language==='en'?'Selected scope':'चुना हुआ दायरा'}</span><select aria-label={language==='hi'?'लक्षित बाज़ार या ढाँचा':'Target market or framework'} value={market} onChange={e=>changeMarket(e.target.value as Market)}><optgroup label={language==='hi'?'गंतव्य बाज़ार':'Destination markets'}><option value="us">{L('us')}</option><option value="eu">{L('eu')}</option></optgroup><optgroup label={language==='hi'?'अंतरराष्ट्रीय ढाँचे':'International frameworks'}><option value="pct">{L('pct')}</option></optgroup></select><small>{language==='hi'?(market==='us'?'गंतव्य बाज़ार · तैयार अमेरिकी आहार-पूरक उदाहरण।':market==='eu'?'गंतव्य बाज़ार · इस उदाहरण में स्रोत उपलब्ध नहीं हैं।':'अंतरराष्ट्रीय ढाँचा · इस उदाहरण में स्रोत उपलब्ध नहीं हैं।'):(market==='us'?'Destination market · curated US dietary-supplement sample.':market==='eu'?'Destination market · source coverage is not included in this sample.':'International framework · source coverage is not included in this sample.')}</small></div>}
      <main id="main" tabIndex={-1} className="main">
        <div className={`workspace-meta ${page==='home'?'home-meta':''}`}>{page!=='home'?<span className="eyebrow"><span className="small-dot"/>{language==='en'?'FORMULATION WORKSPACE':'योग कार्यस्थल'}</span>:null}<span className="prototype-label"><FlaskConical size={13}/>{L('sample')}</span></div>
        {page==='home'&&<>
          <section className="welcome"><div className="welcome-copy"><span className="overline">{language==='hi'?'संदर्भ सहित जानकारी':'KNOWLEDGE, WITH CONTEXT'}</span><h1>{language==='en'?<>Clarity for your<br/><span>formulation.</span></>:L('homeTitle')}</h1><p>{L('homeSubtitle')}</p><button className="button primary" onClick={()=>start(null)}><Plus size={18}/>{L('start')}<ArrowRight size={17}/></button><div className="welcome-caption"><ShieldCheck size={14}/>{language==='en'?'Source-led. Jurisdiction-aware. Human in the loop.':'स्रोत आधारित। स्पष्ट अधिकार क्षेत्र। विशेषज्ञ समीक्षा।'}</div></div><div className="botanical-panel"><div className="specimen-label"><span>{language==='hi'?'क्षेत्र नोट / 001':'FIELD NOTES / 001'}</span><span>{language==='hi'?'आयुर्वेद':'AYURVEDA'}</span></div><Botanical/><div className="specimen-card"><span className="specimen-icon"><Leaf size={18}/></span><div><strong>{language==='en'?'Rooted in knowledge.':'ज्ञान पर आधारित।'}</strong><span>{language==='en'?'Grounded in evidence.':'प्रमाणों से समर्थित।'}</span></div><span className="specimen-seal"><Check size={12}/></span></div></div></section>
          <section className="sample-section"><div className="section-top"><div><h2>{language==='en'?'Start with a sample case':'उदाहरण केस से शुरुआत करें'}</h2><p>{language==='en'?'Three pathways. One clear place to begin.':'तीन मार्ग। एक स्पष्ट शुरुआत।'}</p></div><span className="quiet-caption">{language==='en'?'CURATED DEMONSTRATIONS':'चुने हुए उदाहरण'}</span></div><div className="sample-list">{scenarios.map((s,i)=><button className="sample-row" key={s.id} onClick={()=>start(s)}><span className={`sample-icon sample-icon-${i}`}>{i===0?<BookOpen size={21}/>:i===1?<Sprout size={23}/>:<Globe2 size={22}/>}</span><span className="sample-text"><strong>{t(s.title,language)}</strong><span>{t(s.description,language)}</span></span><span className="sample-kind">{t(s.kind,language)}</span><ArrowUpRight size={19}/></button>)}</div></section>
          <section className="trust-strip"><div><Files size={19}/><span>{language==='en'?'Traceable sources':'स्पष्ट स्रोत'}</span></div><div><Waypoints size={19}/><span>{language==='en'?'Context before conclusions':'निष्कर्ष से पहले संदर्भ'}</span></div><div><ShieldCheck size={19}/><span>{language==='en'?'Professional review when needed':'ज़रूरत पर विशेषज्ञ समीक्षा'}</span></div></section>
        </>}
        {page==='case'&&activeRecord&&<CaseFlow key={activeRecord.id} record={activeRecord} language={language} onUpdate={updateRecord} onBack={()=>{setPage('home');setActiveId(null);}} onReset={reset}/>}
        {page==='sources'&&<section className="library-page"><div className="page-heading"><h1>{L('library')}</h1><p>{language==='en'?'Official reference points used in the curated demonstration.':'उदाहरण में उपयोग किए गए आधिकारिक संदर्भ।'}</p></div><label className="search-field"><Search size={18}/><input aria-label={language==='hi'?'स्रोत खोजें':'Search sources'} placeholder={language==='hi'?'दस्तावेज़ या जारीकर्ता खोजें':'Search documents or issuing bodies'} value={search} onChange={e=>setSearch(e.target.value)}/></label>{sources.filter(s=>`${s.title} ${s.publisher}`.toLowerCase().includes(search.toLowerCase())).map(s=><a className="library-row" key={s.id} href={s.url} target="_blank" rel="noreferrer"><span className="document-icon"><BookOpen size={22}/></span><div><span className="eyebrow">{s.scope} · {s.type}</span><h3>{s.title}</h3><p>{s.publisher}</p></div><ArrowUpRight size={18}/></a>)}</section>}
        {page==='saved'&&<SavedCases records={records} language={language} onOpen={open} onNew={()=>start(null)} onReset={reset} onRename={renameCase} onDelete={deleteCase}/>} 
        {!storageAvailable&&<div className="storage-notice" role="status">{language==='hi'?'स्थानीय सहेजना उपलब्ध नहीं है।':'Local saving is unavailable in this browser session.'}</div>}
        <footer className="page-footer"><span><ShieldCheck size={13}/>{L('disclaimer')}</span><span>IP-SAKTI Sahayak</span></footer>
      </main>
    </div>
    {about&&<div className="modal-backdrop" onClick={()=>setAbout(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" onClick={()=>setAbout(false)} aria-label={language==='hi'?'बंद करें':'Close'}><X size={20}/></button><span className="empty-icon"><Sprout size={30}/></span><h2 id="about-title">{L('about')}</h2><p>{language==='hi'?'यह इंटरैक्टिव प्रोटोटाइप तैयार उदाहरण केस और आधिकारिक स्रोत संकेतों का उपयोग करता है। यह लाइव भाषा मॉडल नहीं चलाता और कानूनी निष्कर्ष सत्यापित नहीं करता।':'This interactive prototype uses curated sample cases and official source pointers. It does not run a live language model or verify legal conclusions.'}</p><p>{language==='hi'?'यह एक निर्देशित, नियम-आधारित प्रदर्शन है। आगे चलकर उदाहरण प्रमाण को लाइव खोज और मानव समीक्षा से जोड़ा जा सकता है।':'It is a guided, deterministic demonstration. The sample evidence can later be connected to live retrieval and human review.'}</p><button className="button primary" onClick={()=>setAbout(false)}>{language==='hi'?'समझ गया':'Understood'}<Check size={17}/></button></section></div>}
  </div>;
}
