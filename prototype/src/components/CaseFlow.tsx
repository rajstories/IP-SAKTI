import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, ClipboardList, FileSearch, Globe2, HelpCircle, Landmark, Pencil, RotateCcw, ShieldCheck, Sprout, Square } from 'lucide-react';
import { labels, scenarios, sources, t } from '../data';
import { answerLabels, buildGuidance, choices, displayFact, factNames, firstUnanswered, questionKeys, setFact, UNKNOWN } from '../lib/case';
import type { CaseRecord, Claim, EvidenceScope, FactKey, Language, Market } from '../types';
import AbsChecklist from './AbsChecklist';
import EvidencePath from './EvidencePath';
import ProfessionalReview from './ProfessionalReview';
import SourceDrawer from './SourceDrawer';
import TraditionalKnowledgePanel from './TraditionalKnowledgePanel';

const questionCopy: Record<FactKey, { eyebrow: {en:string;hi:string}; title:{en:string;hi:string}; help:{en:string;hi:string} }> = {
  description: { eyebrow:{en:'START WITH THE FACTS',hi:'पहले तथ्य बताएँ'}, title:{en:'Tell us about your formulation.',hi:'अपने योग के बारे में बताइए।'}, help:{en:'Describe its ingredients, any known reference and what you hope to do with it.',hi:'घटक, ज्ञात संदर्भ और आप इसका क्या उपयोग करना चाहते हैं, बताएँ।'} },
  use: { eyebrow:{en:'PRODUCT INTENT',hi:'उत्पाद का उद्देश्य'}, title:{en:'How will you present this product?',hi:'इस उत्पाद को किस रूप में प्रस्तुत करेंगे?'}, help:{en:'Your intended use helps identify which sources may be relevant. This does not classify the product by itself.',hi:'बताया गया उपयोग संबंधित स्रोत चुनने में मदद करता है। केवल इससे उत्पाद का वर्ग तय नहीं होता।'} },
  reference: { eyebrow:{en:'CLASSICAL CONTEXT',hi:'शास्त्रीय संदर्भ'}, title:{en:'Is it drawn from a classical formulation?',hi:'क्या यह शास्त्रीय योग पर आधारित है?'}, help:{en:'A named text or formulation is useful evidence. An uncertain answer is acceptable; the result will stay provisional.',hi:'ग्रंथ या योग का नाम उपयोगी प्रमाण है। अनिश्चित उत्तर भी स्वीकार्य है; परिणाम प्रारंभिक रहेगा।'} },
  change: { eyebrow:{en:'FORMULATION DETAIL',hi:'योग में बदलाव'}, title:{en:'What changed from the reference?',hi:'संदर्भ योग से क्या बदला है?'}, help:{en:'Describe whether the ingredients or method follow the reference. Your answer will not be treated as a patentability decision.',hi:'बताएँ कि घटक या प्रक्रिया संदर्भ का पालन करते हैं या नहीं। इससे पेटेंट पात्रता तय नहीं होती।'} },
  origin: { eyebrow:{en:'BIOLOGICAL RESOURCES',hi:'जैविक संसाधन'}, title:{en:'Where are the biological ingredients sourced?',hi:'जैविक घटक कहाँ से लिए गए हैं?'}, help:{en:'This is a first-level fact for later expert review of resource-origin and ABS questions.',hi:'संसाधन स्रोत और लाभ-साझेदारी की विशेषज्ञ समीक्षा के लिए यह शुरुआती तथ्य है।'} },
};

type Props = {
  record: CaseRecord;
  language: Language;
  onUpdate: (next: CaseRecord) => void;
  onBack: () => void;
  onReset: () => void;
};

type CitationSelection = { sourceId: string; claimId: string };
type OpenCitation = (sourceId: string, claimId: string, trigger: HTMLButtonElement) => void;

const targetTitle = (market: Market, language: Language) => {
  if (market === 'us') return language === 'hi' ? 'संयुक्त राज्य अमेरिका' : 'United States';
  if (market === 'eu') return language === 'hi' ? 'यूरोपीय संघ' : 'European Union';
  return language === 'hi' ? 'WIPO PCT ढाँचा' : 'WIPO PCT framework';
};

const targetKind = (market: Market, language: Language) => market === 'pct'
  ? (language === 'hi' ? 'अंतरराष्ट्रीय ढाँचा' : 'International framework')
  : (language === 'hi' ? 'गंतव्य बाज़ार' : 'Destination market');

const targetEvidenceScope = (market: Market): EvidenceScope | null => market === 'us' ? 'United States' : null;

function checklistFor(scope: 'india' | 'target', market: Market, language: Language): string[] {
  if (scope === 'india') return language === 'hi'
    ? ['भारतीय उत्पाद मार्ग की पुष्टि करें', 'शास्त्रीय संदर्भ और बदलाव दर्ज करें', 'जैविक घटकों के स्रोत लिखें']
    : ['Confirm the Indian product pathway', 'Record the reference and formulation changes', 'Document biological-resource origins'];
  if (market === 'us') return language === 'hi'
    ? ['हर घटक की अमेरिकी स्थिति जाँचें', 'प्रस्तावित दावों और लेबल की समीक्षा करें', 'वर्तमान FDA अपेक्षाओं की विशेषज्ञ से पुष्टि करें']
    : ['Check each ingredient’s US status', 'Review proposed claims and label presentation', 'Confirm current FDA expectations with a specialist'];
  return language === 'hi'
    ? ['मार्गदर्शन से पहले सत्यापित आधिकारिक स्रोत जोड़ें']
    : ['Add verified official sources before generating guidance'];
}

function ClaimList({ claims, language, onCitation }: { claims: Claim[]; language: Language; onCitation: OpenCitation }) {
  const L = (key: keyof typeof labels) => t(labels[key], language);
  return <div className="claim-list">
    {claims.map((claim, index) => <article className="claim" key={claim.id}>
      <span className="claim-index">{String(index + 1).padStart(2, '0')}</span>
      <div className="claim-content">
        <div className="claim-top">
          <h4>{t(claim.heading, language)}</h4>
          <span className={`status-badge ${claim.status}`}>
            {claim.status === 'evidence' ? <Check size={12}/> : <CircleAlert size={12}/>} {claim.status === 'evidence' ? L('evidence') : claim.status === 'missing' ? L('missing') : L('expert')}
          </span>
        </div>
        <p>{t(claim.body, language)}</p>
        {claim.sourceIds.length ? <div className="claim-citations" aria-label={language === 'hi' ? 'दावे के स्रोत' : 'Claim sources'}>
          <span>{language === 'hi' ? 'स्रोत' : 'Evidence'}</span>
          {claim.sourceIds.map(id => {
            const source = sources.find(item => item.id === id);
            if (!source) return null;
            const number = sources.findIndex(item => item.id === id) + 1;
            return <button
              className="citation-marker"
              onClick={event => onCitation(id, claim.id, event.currentTarget)}
              aria-label={`${language === 'hi' ? 'स्रोत खोलें' : 'Open source'} ${number}: ${source.title}`}
              title={`${source.title} · ${source.section}`}
              key={id}
            >[{number}]</button>;
          })}
        </div> : <span className="process-note">{language === 'hi' ? 'केस के तथ्य / समीक्षा बिंदु' : 'Case facts / review prompt'}</span>}
      </div>
    </article>)}
  </div>;
}

function ScopePanel({ title, kind, claims, checklist, language, onCitation, compact = false }: {
  title: string;
  kind: string;
  claims: Claim[];
  checklist: string[];
  language: Language;
  onCitation: OpenCitation;
  compact?: boolean;
}) {
  return <section className={`scope-panel ${compact ? 'compact' : ''}`} aria-label={`${title} guidance`}>
    <header className="scope-panel-head">
      <span className="scope-icon">{kind.toLowerCase().includes('framework') || kind.includes('ढाँचा') ? <Globe2 size={18}/> : <Landmark size={18}/>}</span>
      <div><span>{kind}</span><h3>{title}</h3></div>
      <span className="scope-count">{String(claims.length).padStart(2, '0')} {language === 'hi' ? 'बिंदु' : 'claims'}</span>
    </header>
    {claims.length
      ? <ClaimList claims={claims} language={language} onCitation={onCitation}/>
      : <div className="coverage-empty"><Globe2 size={20}/><div><strong>{language === 'hi' ? 'तैयार स्रोत उपलब्ध नहीं' : 'Curated coverage is unavailable'}</strong><p>{language === 'hi' ? 'इस चुने हुए दायरे के लिए कोई उत्तर उधार नहीं लिया गया है। आधिकारिक स्रोत जोड़ने के बाद ही मार्गदर्शन तैयार करें।' : 'No answer has been borrowed from another jurisdiction. Add official sources for this selected scope before generating guidance.'}</p></div></div>}
    <div className="scope-checklist">
      <span className="scope-checklist-title"><ClipboardList size={14}/>{language === 'hi' ? 'इस दायरे की जाँच सूची' : 'Checklist for this scope'}</span>
      {checklist.map(item => <span className="checklist-item" key={item}><Square size={12}/>{item}</span>)}
    </div>
  </section>;
}

export default function CaseFlow({ record, language, onUpdate, onBack, onReset }: Props) {
  const [active, setActive] = useState<FactKey | null>(() => record.complete ? null : firstUnanswered(record.facts) ?? 'description');
  const [draft, setDraft] = useState(() => active ? record.facts[active] ?? '' : '');
  const [scrollToStep, setScrollToStep] = useState(false);
  const [citation, setCitation] = useState<CitationSelection | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reviewReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const stepRef = useRef<HTMLDivElement | null>(null);
  const scenario = scenarios.find(item => item.id === record.scenarioId);
  const displayTitle = scenario && [scenario.title.en, scenario.title.hi].includes(record.title) ? t(scenario.title, language) : record.title;
  const keys = questionKeys(active && draft.trim() ? { ...record.facts, [active]: draft.trim() } : record.facts);
  const guidance = useMemo(() => buildGuidance(record), [record]);
  const L = (key: keyof typeof labels) => t(labels[key], language);
  const isResult = record.complete && active === null;
  const currentIndex = active ? keys.indexOf(active) : keys.length;
  const willFinish = Boolean(active && draft.trim() && firstUnanswered(setFact(record, active, draft.trim()).facts) === null);
  const indiaClaims = guidance.claims.filter(claim => claim.scope === 'India');
  const selectedEvidenceScope = targetEvidenceScope(record.market);
  const targetClaims = selectedEvidenceScope ? guidance.claims.filter(claim => claim.scope === selectedEvidenceScope) : [];
  const visibleClaims = record.jurisdiction === 'india' ? indiaClaims : record.jurisdiction === 'international' ? targetClaims : [...indiaClaims, ...targetClaims];

  useEffect(() => {
    setActive(record.complete ? null : firstUnanswered(record.facts) ?? 'description');
    setDraft('');
    setCitation(null);
    setReviewOpen(false);
  }, [record.id]);

  useEffect(() => { setCitation(null); setReviewOpen(false); }, [record.jurisdiction, record.market]);
  useEffect(() => {
    if (!scrollToStep) return;
    stepRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    setScrollToStep(false);
  }, [active, scrollToStep]);

  const openCitation = useCallback<OpenCitation>((sourceId, claimId, trigger) => {
    returnFocusRef.current = trigger;
    setCitation({ sourceId, claimId });
  }, []);

  const closeCitation = useCallback(() => {
    setCitation(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  const closeReview = useCallback(() => {
    setReviewOpen(false);
    window.requestAnimationFrame(() => reviewReturnFocusRef.current?.focus());
  }, []);

  const edit = (key: FactKey) => {
    setDraft(record.facts[key] ?? '');
    setActive(key);
    setScrollToStep(true);
  };

  const commit = () => {
    if (!active || !draft.trim()) return;
    const next = setFact(record, active, draft.trim());
    onUpdate(next);
    const nextKey = firstUnanswered(next.facts);
    if (nextKey) {
      setActive(nextKey);
      setDraft(next.facts[nextKey] ?? '');
      setScrollToStep(true);
      return;
    }
    onUpdate({ ...next, complete: true, updatedAt: new Date().toISOString() });
    setActive(null);
  };

  const goBack = () => {
    if (active) {
      const index = keys.indexOf(active);
      if (index > 0) { edit(keys[index - 1]); return; }
    }
    onBack();
  };

  const selectedSource = citation ? sources.find(item => item.id === citation.sourceId) : undefined;
  const selectedClaim = citation ? guidance.claims.find(item => item.id === citation.claimId) : undefined;

  return <div className="case-workspace">
    <div className="case-heading">
      <button className="text-button" onClick={goBack}><ArrowLeft size={15}/>{L('back')}</button>
      <div className="case-heading-row">
        <div><span className="overline">{scenario ? t(scenario.kind, language).toUpperCase() : language === 'hi' ? 'नया योग' : 'NEW FORMULATION'}</span><h1>{displayTitle}</h1><p>{language === 'hi' ? 'पहले तथ्य, फिर उनसे जुड़ी जानकारी।' : 'Start with the facts. Then follow the relevant evidence.'}</p></div>
        <span className="case-saved"><CheckCircle2 size={15}/>{L('local')}</span>
      </div>
    </div>
    <div className="case-body">
      <section className="case-main">
        <div ref={stepRef} className="step-track" aria-label={language === 'hi' ? 'योग के प्रश्न' : 'Formulation steps'}>{keys.map((key, index) => <div key={key} className={`step-part ${isResult || index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'future'}`}><span className="step-circle">{isResult || index < currentIndex ? <Check size={14}/> : index + 1}</span><span>{t(factNames[key], language)}</span></div>)}</div>
        {active ? <div className="question-card" key={active}>
          <span className="overline">{t(questionCopy[active].eyebrow, language)} · {Math.max(currentIndex + 1, 1)} / {keys.length}</span>
          <h2>{t(questionCopy[active].title, language)}</h2><p>{t(questionCopy[active].help, language)}</p>
          {active === 'description' ? <><label htmlFor="formulation-description" className="field-label">{t(factNames.description, language)}</label><textarea id="formulation-description" rows={5} value={draft} onChange={event => setDraft(event.target.value)} placeholder={language === 'hi' ? 'उदाहरण: शास्त्रीय संदर्भ पर आधारित त्रिफला चूर्ण…' : 'e.g. A Triphala powder described as following a classical reference…'}/><span className="field-hint">{language === 'hi' ? 'इस प्रोटोटाइप में नमूना मामलों का मार्गदर्शन दिया जाता है।' : 'This prototype provides guided results for the sample pathways.'}</span></>
            : <div className="choice-list" role="radiogroup" aria-label={t(questionCopy[active].title, language)}>{(choices[active] ?? []).map(option => <button type="button" role="radio" aria-checked={draft === option} className={`choice ${draft === option ? 'selected' : ''}`} key={option} onClick={() => setDraft(option)}><span className="choice-radio">{draft === option ? <span/> : null}</span><span>{t(answerLabels[option], language)}</span>{option === UNKNOWN ? <HelpCircle size={15}/> : draft === option ? <Check size={16}/> : null}</button>)}</div>}
          <div className="question-actions"><span>{language === 'hi' ? 'आप पिछले उत्तर बदल सकते हैं।' : 'You can revisit earlier answers.'}</span><button className="button primary" disabled={!draft.trim()} onClick={commit}>{willFinish ? language === 'hi' ? 'मार्गदर्शन देखें' : 'View guidance' : L('next')}<ArrowRight size={17}/></button></div>
        </div> : null}
        {isResult ? <div className="guidance-result">
          <div className="guidance-kicker"><ShieldCheck size={18}/><span>{language === 'hi' ? 'केस के तथ्यों पर आधारित · चुने हुए उदाहरण प्रमाण' : 'BASED ON YOUR FACTS · CURATED SAMPLE EVIDENCE'}</span></div>
          <h2>{language === 'hi' ? 'आपके योग की जानकारी' : 'Your formulation guidance'}</h2>
          <p className="result-intro">{language === 'hi' ? 'उपलब्ध तथ्यों से संबंधित जानकारी नीचे है। यह कोई अंतिम कानूनी या उत्पाद-वर्ग का निर्णय नहीं है।' : 'These are considerations connected to the facts you supplied. They are not a final legal or product-classification decision.'}</p>
          <div className="category-strip"><span className="category-icon"><Sprout size={19}/></span><div><span>{language === 'hi' ? 'संभावित समीक्षा मार्ग' : 'POSSIBLE PATHWAY TO REVIEW'}</span><strong>{t(guidance.category, language)}</strong></div><span className="status-badge review"><CircleAlert size={13}/>{L('expert')}</span></div>
          {guidance.missing.length ? <div className="missing-banner"><CircleAlert size={17}/><div><strong>{L('missing')}</strong><p>{language === 'hi' ? 'इन बातों की पुष्टि करें: ' : 'Clarify these facts: '}{guidance.missing.map(key => t(factNames[key], language)).join(', ')}.</p></div></div> : null}

          {record.jurisdiction === 'compare' ? <div className="comparison-section">
            <div className="comparison-heading"><div><span className="overline">{language === 'hi' ? 'दायरे साथ-साथ' : 'SCOPES, SIDE BY SIDE'}</span><h3>{language === 'hi' ? 'भारत और चुना हुआ दायरा' : 'India and selected scope'}</h3></div><p>{language === 'hi' ? 'हर कॉलम अपने स्रोत और जाँच सूची का उपयोग करता है।' : 'Each panel keeps its own claims, evidence and checklist.'}</p></div>
            <div className="compare-grid">
              <ScopePanel title={language === 'hi' ? 'भारत' : 'India'} kind={language === 'hi' ? 'राष्ट्रीय स्रोत' : 'National sources'} claims={indiaClaims} checklist={checklistFor('india', record.market, language)} language={language} onCitation={openCitation} compact/>
              <ScopePanel title={targetTitle(record.market, language)} kind={targetKind(record.market, language)} claims={targetClaims} checklist={checklistFor('target', record.market, language)} language={language} onCitation={openCitation} compact/>
            </div>
          </div> : <div className="single-scope-section">
            <div className="result-section-head"><h3>{language === 'hi' ? 'आईपी और नियामक विचार' : 'IP and regulatory considerations'}</h3><span>{record.jurisdiction === 'india' ? 'INDIA' : targetKind(record.market, language).toUpperCase()}</span></div>
            {record.jurisdiction === 'india'
              ? <ScopePanel title={language === 'hi' ? 'भारत' : 'India'} kind={language === 'hi' ? 'राष्ट्रीय स्रोत' : 'National sources'} claims={indiaClaims} checklist={checklistFor('india', record.market, language)} language={language} onCitation={openCitation}/>
              : <ScopePanel title={targetTitle(record.market, language)} kind={targetKind(record.market, language)} claims={targetClaims} checklist={checklistFor('target', record.market, language)} language={language} onCitation={openCitation}/>} 
          </div>}

          <div className="supporting-sections">
            <EvidencePath record={record} guidance={guidance} claims={visibleClaims} language={language} onCitation={openCitation}/>
            <TraditionalKnowledgePanel record={record} language={language} onCitation={openCitation}/>
            <AbsChecklist record={record} language={language} onUpdate={onUpdate}/>
          </div>

          <div className="next-actions"><div><ClipboardList size={21}/><div><h3>{language === 'hi' ? 'अगला उपयोगी कदम' : 'A useful next step'}</h3><p>{guidance.missing.length ? language === 'hi' ? 'अनिश्चित तथ्यों की पुष्टि करें, फिर संबंधित स्रोत और विशेषज्ञ की राय देखें।' : 'Confirm the unresolved facts, then review the relevant sources with a qualified professional.' : language === 'hi' ? 'दिए गए स्रोत खोलें और उत्पाद-विशिष्ट प्रश्न विशेषज्ञ से जाँचें।' : 'Open the cited sources and ask a professional to check product-specific questions.'}</p></div></div><div className="next-action-buttons"><button className="button secondary" onClick={() => edit(guidance.missing[0] ?? 'description')}><Pencil size={15}/>{language === 'hi' ? 'तथ्य बदलें' : 'Edit case facts'}</button><button ref={reviewReturnFocusRef} className="button primary" onClick={() => setReviewOpen(true)}><ClipboardList size={15}/>{language === 'hi' ? 'विशेषज्ञ समीक्षा तैयार करें' : 'Prepare expert review'}</button></div></div>
        </div> : null}
      </section>
      <aside className="facts-panel" aria-label={language === 'hi' ? 'दिए गए तथ्य' : 'Your facts'}>
        <div className="facts-panel-top"><span className="overline">CASE FILE / {record.id.slice(0, 6).toUpperCase()}</span><Sprout size={17}/></div>
        <h2>{language === 'hi' ? 'आपके योग के तथ्य' : 'Your formulation'}</h2><p>{language === 'hi' ? 'आपने जो बताया है' : 'What you have told us so far'}</p>
        {scenario ? <div className="ingredients"><span>{language === 'hi' ? 'उदाहरण घटक' : 'SAMPLE INGREDIENTS'}</span><strong>{scenario.ingredients}</strong></div> : null}
        <div className="fact-list">{(['description', 'use', 'reference', 'change', 'origin'] as FactKey[]).map(key => { const value = record.facts[key]; return value ? <div className="fact-row" key={key}><div><span>{t(factNames[key], language)}</span><strong>{displayFact(key, value, language)}</strong></div><button className="fact-edit" onClick={() => edit(key)} aria-label={`${L('edit')} ${t(factNames[key], language)}`}><Pencil size={15}/></button></div> : null; })}</div>
        {Object.keys(record.facts).length === 0 ? <div className="no-facts"><FileSearch size={23}/><span>{language === 'hi' ? 'प्रश्नों के उत्तर यहाँ दिखाई देंगे।' : 'Your answers will appear here as you go.'}</span></div> : null}
        <div className="facts-bottom"><span><CheckCircle2 size={14}/>{L('local')}</span><button onClick={onReset}><RotateCcw size={14}/>{L('reset')}</button></div>
      </aside>
    </div>
    {selectedSource ? <SourceDrawer source={selectedSource} sourceNumber={sources.findIndex(item => item.id === selectedSource.id) + 1} claim={selectedClaim} language={language} onClose={closeCitation}/> : null}
    {reviewOpen ? <ProfessionalReview record={record} guidance={guidance} claims={visibleClaims} language={language} onClose={closeReview}/> : null}
  </div>;
}
