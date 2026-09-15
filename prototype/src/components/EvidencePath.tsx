import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Focus, Minus, Plus } from 'lucide-react';
import { sources, t } from '../data';
import { displayFact, factNames } from '../lib/case';
import type { CaseRecord, Claim, Guidance, Language } from '../types';

type OpenCitation = (sourceId: string, claimId: string, trigger: HTMLButtonElement) => void;
type Selection = { id: string; title: string; body: string; sourceId?: string; claimId?: string };

type Props = {
  record: CaseRecord;
  guidance: Guidance;
  claims: Claim[];
  language: Language;
  onCitation: OpenCitation;
};

const short = (value: string, max = 24) => value.length > max ? `${value.slice(0, max - 1)}…` : value;

export default function EvidencePath({ record, guidance, claims, language, onCitation }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const factEntries = Object.entries(record.facts).filter((entry): entry is [keyof typeof record.facts, string] => Boolean(entry[1]));
  const pathSources = useMemo(() => {
    const ids = [...new Set(claims.flatMap(claim => claim.sourceIds))].slice(0, 2);
    return ids.map(id => sources.find(source => source.id === id)).filter(Boolean) as typeof sources;
  }, [claims]);
  const initialSelection: Selection = {
    id: 'facts',
    title: language === 'hi' ? 'दिए गए तथ्य' : 'Supplied case facts',
    body: language === 'hi' ? `${factEntries.length} तथ्य इस तैयार उदाहरण मार्ग में उपयोग किए गए हैं।` : `${factEntries.length} supplied facts feed this curated demo path.`,
  };
  const [selection, setSelection] = useState<Selection>(initialSelection);

  const selectWithKeyboard = (event: React.KeyboardEvent<SVGGElement>, next: Selection) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelection(next);
    }
  };

  const sourcePositions = pathSources.length > 1 ? [54, 172] : [113];
  const viewWidth = 920 / zoom;
  const viewHeight = 300 / zoom;
  const viewX = (920 - viewWidth) / 2;
  const viewY = (300 - viewHeight) / 2;
  const sourceForSelection = selection.sourceId ? sources.find(source => source.id === selection.sourceId) : undefined;

  return <section className="evidence-path-section" aria-labelledby="evidence-path-title">
    <div className="evidence-path-head">
      <div><span className="overline">{language === 'hi' ? 'तैयार उदाहरण संबंध' : 'CURATED DEMO RELATIONSHIPS'}</span><h3 id="evidence-path-title">{language === 'hi' ? 'प्रमाण मार्ग' : 'Evidence path'}</h3></div>
      <button className="disclosure-button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? language === 'hi' ? 'ग्राफ बंद करें' : 'Close graph' : language === 'hi' ? 'ग्राफ खोलें' : 'Expand graph'}{expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>
    </div>
    <div className="compact-path" aria-label={language === 'hi' ? 'संक्षिप्त प्रमाण मार्ग' : 'Compact evidence path'}>
      <span><strong>01</strong>{language === 'hi' ? 'केस तथ्य' : 'Case facts'}</span><i>→</i>
      <span><strong>02</strong>{language === 'hi' ? 'वर्ग विचार' : 'Category consideration'}</span><i>→</i>
      <span><strong>03</strong>{pathSources.length ? `${pathSources.length} ${language === 'hi' ? 'तैयार स्रोत' : 'curated source'}${pathSources.length > 1 ? 's' : ''}` : language === 'hi' ? 'स्रोत नहीं' : 'No attached source'}</span><i>→</i>
      <span><strong>04</strong>{language === 'hi' ? 'संबंधित मार्गदर्शन' : 'Relevant guidance'}</span>
    </div>

    {expanded ? <div className="evidence-graph-wrap">
      <div className="graph-toolbar" aria-label={language === 'hi' ? 'ग्राफ नियंत्रण' : 'Graph controls'}>
        <button onClick={() => setZoom(value => Math.max(1, Number((value - .2).toFixed(1))))} disabled={zoom <= 1} aria-label={language === 'hi' ? 'ज़ूम घटाएँ' : 'Zoom out'}><Minus size={15}/></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(value => Math.min(1.8, Number((value + .2).toFixed(1))))} disabled={zoom >= 1.8} aria-label={language === 'hi' ? 'ज़ूम बढ़ाएँ' : 'Zoom in'}><Plus size={15}/></button>
        <button onClick={() => setZoom(1)} aria-label={language === 'hi' ? 'ग्राफ दृश्य में फिट करें' : 'Fit graph to view'}><Focus size={15}/><span>{language === 'hi' ? 'फिट' : 'Fit'}</span></button>
      </div>
      <div className="evidence-graph" role="group" aria-label={language === 'hi' ? 'चयन योग्य प्रमाण ग्राफ' : 'Selectable evidence graph'}>
        <svg viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`} aria-hidden="false">
          <defs><marker id="path-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>
          <g className={`graph-edge ${selection.id === 'edge-facts-category' ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="Select facts to category relationship" onClick={() => setSelection({ id:'edge-facts-category', title: language === 'hi' ? 'तथ्य से वर्ग विचार' : 'Facts → category consideration', body: language === 'hi' ? 'दिए गए उपयोग और योग के विवरण से केवल समीक्षा मार्ग सुझाया गया है; कोई अंतिम वर्गीकरण नहीं।' : 'The supplied use and formulation details inform a pathway to review; they do not determine a final classification.' })} onKeyDown={event => selectWithKeyboard(event, { id:'edge-facts-category', title:'Facts → category consideration', body:'Supplied facts inform a pathway to review, not a final classification.' })}>
            <line x1="190" y1="148" x2="245" y2="148"/><line className="edge-hit" x1="190" y1="148" x2="245" y2="148"/>
          </g>
          {pathSources.map((source, index) => {
            const y = sourcePositions[index];
            const edgeId = `edge-source-${source.id}`;
            const claim = claims.find(item => item.sourceIds.includes(source.id));
            const edgeSelection = { id:edgeId, title:`${t(guidance.category, language)} → ${source.title}`, body:t(source.explanation, language), sourceId:source.id, claimId:claim?.id };
            return <g key={edgeId} className={`graph-edge ${selection.id === edgeId ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`Select relationship to ${source.title}`} onClick={() => setSelection(edgeSelection)} onKeyDown={event => selectWithKeyboard(event, edgeSelection)}>
              <line x1="425" y1="148" x2="480" y2={y + 35}/><line className="edge-hit" x1="425" y1="148" x2="480" y2={y + 35}/>
              <line x1="660" y1={y + 35} x2="730" y2="148" markerEnd="url(#path-arrow)"/><line className="edge-hit" x1="660" y1={y + 35} x2="730" y2="148"/>
            </g>;
          })}
          {!pathSources.length ? <g className={`graph-edge ${selection.id === 'edge-no-source' ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="Select missing evidence relationship" onClick={() => setSelection({id:'edge-no-source',title:language === 'hi' ? 'स्रोत उपलब्ध नहीं' : 'No curated source attached',body:language === 'hi' ? 'इस दायरे में मार्गदर्शन के लिए सत्यापित स्रोत आवश्यक है।' : 'Verified sources are needed before this scope can support guidance.'})} onKeyDown={event => selectWithKeyboard(event,{id:'edge-no-source',title:'No curated source attached',body:'Verified sources are needed before this scope can support guidance.'})}><line x1="425" y1="148" x2="730" y2="148" markerEnd="url(#path-arrow)"/><line className="edge-hit" x1="425" y1="148" x2="730" y2="148"/></g> : null}

          <g className={`graph-node ${selection.id === 'facts' ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="Select supplied case facts" onClick={() => setSelection(initialSelection)} onKeyDown={event => selectWithKeyboard(event, initialSelection)}><rect x="20" y="113" width="170" height="70" rx="10"/><text x="38" y="140" className="node-label">01 · INPUT</text><text x="38" y="163" className="node-title">{language === 'hi' ? 'केस तथ्य' : 'Case facts'}</text></g>
          <g className={`graph-node ${selection.id === 'category' ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="Select category consideration" onClick={() => setSelection({id:'category',title:language === 'hi' ? 'वर्ग विचार' : 'Category consideration',body:t(guidance.category, language)})} onKeyDown={event => selectWithKeyboard(event,{id:'category',title:'Category consideration',body:t(guidance.category, language)})}><rect x="245" y="113" width="180" height="70" rx="10"/><text x="263" y="140" className="node-label">02 · CONSIDERATION</text><text x="263" y="163" className="node-title">{short(t(guidance.category, language), 23)}</text></g>
          {pathSources.map((source, index) => { const y = sourcePositions[index]; const claim = claims.find(item => item.sourceIds.includes(source.id)); const next = {id:`source-${source.id}`,title:source.title,body:`${source.publisher} · ${source.section}`,sourceId:source.id,claimId:claim?.id}; return <g key={source.id} className={`graph-node source-node ${selection.id === next.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`Select source ${source.title}`} onClick={() => setSelection(next)} onKeyDown={event => selectWithKeyboard(event,next)}><rect x="480" y={y} width="180" height="70" rx="10"/><text x="498" y={y + 27} className="node-label">03 · SOURCE [{sources.findIndex(item => item.id === source.id) + 1}]</text><text x="498" y={y + 50} className="node-title">{short(source.title, 23)}</text></g>; })}
          <g className={`graph-node ${selection.id === 'guidance' ? 'selected' : ''}`} role="button" tabIndex={0} aria-label="Select relevant guidance" onClick={() => setSelection({id:'guidance',title:language === 'hi' ? 'संबंधित मार्गदर्शन' : 'Relevant guidance',body:claims.map(claim => t(claim.heading, language)).join(' · ') || (language === 'hi' ? 'कोई समर्थित दावा नहीं' : 'No supported claim')})} onKeyDown={event => selectWithKeyboard(event,{id:'guidance',title:'Relevant guidance',body:claims.map(claim => t(claim.heading, language)).join(' · ')})}><rect x="730" y="113" width="170" height="70" rx="10"/><text x="748" y="140" className="node-label">04 · OUTPUT</text><text x="748" y="163" className="node-title">{language === 'hi' ? 'मार्गदर्शन' : 'Guidance'}</text></g>
        </svg>
      </div>
      <div className="graph-selection" role="status"><div><span>{language === 'hi' ? 'चयन' : 'Selected relationship'}</span><h4>{selection.title}</h4><p>{selection.body}</p></div>{sourceForSelection ? <button className="button secondary" onClick={event => onCitation(sourceForSelection.id, selection.claimId ?? 'evidence-path', event.currentTarget)}><BookOpen size={14}/>{language === 'hi' ? 'स्रोत खोलें' : 'Open source'}</button> : null}</div>
      <details className="graph-text-alternative"><summary>{language === 'hi' ? 'पाठ विकल्प' : 'Text alternative'}</summary><ol><li>{language === 'hi' ? 'दिए गए तथ्य:' : 'Supplied facts:'} {factEntries.map(([key,value]) => `${t(factNames[key], language)} — ${displayFact(key, value, language)}`).join('; ')}</li><li>{language === 'hi' ? 'वर्ग विचार:' : 'Category consideration:'} {t(guidance.category, language)}</li><li>{language === 'hi' ? 'तैयार स्रोत:' : 'Curated sources:'} {pathSources.map(source => `${source.title}, ${source.section}`).join('; ') || (language === 'hi' ? 'कोई नहीं' : 'None attached')}</li><li>{language === 'hi' ? 'मार्गदर्शन:' : 'Guidance:'} {claims.map(claim => t(claim.heading, language)).join('; ') || (language === 'hi' ? 'कोई समर्थित दावा नहीं' : 'No supported claim')}</li></ol></details>
    </div> : null}
  </section>;
}
