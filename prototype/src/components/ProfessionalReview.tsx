import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clipboard, Download, FilePenLine, X } from 'lucide-react';
import { sources, t } from '../data';
import { displayFact, factNames } from '../lib/case';
import type { CaseRecord, Claim, Guidance, Language } from '../types';

function scopeLabel(record: CaseRecord, language: Language): string {
  if (record.jurisdiction === 'india') return language === 'hi' ? 'भारत' : 'India';
  const target = language === 'hi'
    ? record.market === 'us' ? 'संयुक्त राज्य अमेरिका (गंतव्य बाज़ार)' : record.market === 'eu' ? 'यूरोपीय संघ (गंतव्य बाज़ार; तैयार स्रोत उपलब्ध नहीं)' : 'WIPO PCT (अंतरराष्ट्रीय ढाँचा; तैयार स्रोत उपलब्ध नहीं)'
    : record.market === 'us' ? 'United States (destination market)' : record.market === 'eu' ? 'European Union (destination market; no curated coverage)' : 'WIPO PCT (international framework; no curated coverage)';
  return record.jurisdiction === 'compare' ? `${language === 'hi' ? 'भारत' : 'India'} + ${target}` : target;
}

function prepareSummary(record: CaseRecord, guidance: Guidance, claims: Claim[], language: Language): string {
  const factLines = Object.entries(record.facts).map(([key, value]) => `- ${t(factNames[key as keyof typeof factNames], language)}: ${displayFact(key as keyof typeof factNames, value, language)}`);
  const missing = guidance.missing.length ? guidance.missing.map(key => t(factNames[key], language)).join(', ') : language === 'hi' ? 'निर्देशित प्रश्नों में कोई जानकारी लंबित दर्ज नहीं' : 'None recorded in the guided intake';
  const evidenceIds = [...new Set(claims.flatMap(claim => claim.sourceIds))];
  const evidenceLines = evidenceIds.map(id => {
    const source = sources.find(item => item.id === id);
    return source ? `- [${sources.findIndex(item => item.id === id) + 1}] ${source.title} — ${source.publisher}; ${source.section}; ${source.url}` : '';
  }).filter(Boolean);
  const issueLines = language === 'hi' ? [
    `- दिखाया गया वर्ग केवल समीक्षा मार्ग है: ${t(guidance.category, language)}।`,
    '- उत्पाद-विशिष्ट कानूनी, नियामक और आईपी निष्कर्ष अभी तय नहीं हैं।',
    ...(record.facts.use === 'food' || record.facts.use === 'medicine' ? ['- ABS लागू होने, अनुमति या लाभ-साझेदारी की आवश्यकता तय नहीं की गई है।'] : []),
    ...(evidenceIds.length ? [] : ['- चुने गए दायरे के लिए कोई तैयार आधिकारिक स्रोत संलग्न नहीं है।']),
  ] : [
    `- The displayed category is a pathway to review: ${t(guidance.category, language)}.`,
    '- Product-specific legal, regulatory and IP conclusions remain unresolved.',
    ...(record.facts.use === 'food' || record.facts.use === 'medicine' ? ['- ABS applicability and any permission or benefit-sharing requirement have not been determined.'] : []),
    ...(evidenceIds.length ? [] : ['- No curated official source is attached for the selected scope.']),
  ];
  const questions = language === 'hi'
    ? record.jurisdiction === 'compare' ? ['- कौन-सा भारतीय उत्पाद मार्ग योग और प्रस्तावित प्रस्तुति के लिए उपयुक्त है?', '- गंतव्य बाज़ार में घटक, दावे और लेबल की कौन-सी जाँच आवश्यक है?', '- दोनों दायरों की तुलना से पहले कौन-से अतिरिक्त आधिकारिक स्रोत चाहिए?'] : ['- कौन-सा उत्पाद मार्ग योग और प्रस्तावित प्रस्तुति के लिए उपयुक्त है?', '- आगे कौन-से तथ्य या आधिकारिक स्रोत एकत्र करने चाहिए?', '- आईपी या नियामक निर्णय से पहले किस विशेषज्ञ समीक्षा की आवश्यकता है?']
    : record.jurisdiction === 'compare' ? ['- Which Indian product pathway best fits the formulation and proposed presentation?', '- Which destination-market ingredient, claim and labelling checks are required?', '- Are additional official sources needed before comparing the two scopes?'] : ['- Which product pathway best fits the formulation and proposed presentation?', '- Which missing facts or official sources should be collected next?', '- What specialist review is required before an IP or regulatory decision?'];

  const headings = language === 'hi' ? { title:'IP-SAKTI SAHAYAK — विशेषज्ञ समीक्षा सारांश', prepared:'स्थानीय रूप से तैयार', case:'केस', scope:'चुना हुआ दायरा', facts:'केस तथ्य', missing:'लंबित जानकारी', evidence:'संबंधित चुने हुए प्रमाण', unresolved:'अनसुलझे प्रश्न', questions:'विशेषज्ञ के लिए प्रश्न', note:'ध्यान दें', noFacts:'- कोई तथ्य नहीं दिया गया', noEvidence:'- इस चुने हुए दायरे के लिए कोई प्रमाण संलग्न नहीं', final:'यह स्थानीय सारांश केवल जानकारी के लिए है। इसे तैयार या डाउनलोड करने से किसी विशेषज्ञ से संपर्क नहीं होता और नियामक अनुमति सिद्ध नहीं होती।' } : { title:'IP-SAKTI SAHAYAK — PROFESSIONAL REVIEW SUMMARY', prepared:'Prepared locally', case:'CASE', scope:'SELECTED SCOPE', facts:'CASE FACTS', missing:'MISSING INFORMATION', evidence:'RELEVANT CURATED EVIDENCE', unresolved:'UNRESOLVED ISSUES', questions:'QUESTIONS FOR THE PROFESSIONAL', note:'NOTE', noFacts:'- No facts supplied', noEvidence:'- No evidence attached for this selected scope', final:'This locally prepared summary is informational. Preparing or downloading it does not contact a professional and does not indicate regulatory approval.' };
  return [headings.title, `${headings.prepared}: ${new Date().toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}`, '', headings.case, record.title, '', headings.scope, scopeLabel(record, language), '', headings.facts, ...(factLines.length ? factLines : [headings.noFacts]), '', headings.missing, `- ${missing}`, '', headings.evidence, ...(evidenceLines.length ? evidenceLines : [headings.noEvidence]), '', headings.unresolved, ...issueLines, '', headings.questions, ...questions, '', headings.note, headings.final].join('\n');
}

export default function ProfessionalReview({ record, guidance, claims, language, onClose }: { record: CaseRecord; guidance: Guidance; claims: Claim[]; language: Language; onClose: () => void }) {
  const [summary, setSummary] = useState(() => prepareSummary(record, guidance, claims, language));
  const [confirmation, setConfirmation] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button, textarea')].filter(element => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      textareaRef.current?.select();
      document.execCommand('copy');
    }
    setConfirmation(language === 'hi' ? 'सारांश तैयार' : 'Summary prepared');
  };

  const download = () => {
    const blob = new Blob([summary], { type:'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ip-sakti-case'}-review-summary.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setConfirmation(language === 'hi' ? 'डाउनलोड किया गया' : 'Downloaded');
  };

  return <div className="modal-backdrop review-backdrop" onMouseDown={onClose}>
    <section ref={panelRef} className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onMouseDown={event => event.stopPropagation()}>
      <header><div><span className="overline"><FilePenLine size={14}/>{language === 'hi' ? 'स्थानीय प्रारूप' : 'LOCAL DRAFT'}</span><h2 id="review-title">{language === 'hi' ? 'विशेषज्ञ समीक्षा तैयार करें' : 'Prepare expert review'}</h2><p>{language === 'hi' ? 'सारांश संपादित करें, फिर कॉपी या डाउनलोड करें। इससे किसी विशेषज्ञ से संपर्क नहीं होता।' : 'Edit the summary, then copy or download it. This action does not contact a professional.'}</p></div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label={language === 'hi' ? 'समीक्षा बंद करें' : 'Close expert review'}><X size={20}/></button></header>
      <label htmlFor="review-summary">{language === 'hi' ? 'संपादन योग्य सारांश' : 'Editable review summary'}</label>
      <textarea ref={textareaRef} id="review-summary" value={summary} onChange={event => { setSummary(event.target.value); setConfirmation(''); }} spellCheck="false"/>
      <footer><span className="review-confirmation" role="status">{confirmation ? <><CheckCircle2 size={15}/>{confirmation}</> : null}</span><div><button className="button secondary" onClick={copy}><Clipboard size={15}/>{language === 'hi' ? 'सारांश कॉपी करें' : 'Copy summary'}</button><button className="button primary" onClick={download}><Download size={15}/>{language === 'hi' ? 'TXT डाउनलोड करें' : 'Download .txt'}</button></div></footer>
    </section>
  </div>;
}
