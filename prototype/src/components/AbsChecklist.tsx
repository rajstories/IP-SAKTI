import { Check, ChevronDown, ClipboardCheck, CircleAlert } from 'lucide-react';
import type { CaseRecord, Language } from '../types';
import { UNKNOWN } from '../lib/case';

type Status = 'Information needed' | 'Evidence available' | 'Professional review needed';
type Item = { id: string; title: string; explanation: string; status: Status };

export default function AbsChecklist({ record, language, onUpdate }: { record: CaseRecord; language: Language; onUpdate: (next: CaseRecord) => void }) {
  const hasOrigin = Boolean(record.facts.origin && record.facts.origin !== UNKNOWN);
  const hasUse = Boolean(record.facts.use && record.facts.use !== UNKNOWN);
  const items: Item[] = language === 'hi' ? [
    { id:'abs-origin', title:'हर जैविक घटक का देश और स्रोत', explanation:hasOrigin ? 'आपने एक सामान्य स्रोत श्रेणी दी है; आपूर्तिकर्ता और स्थान अभी दर्ज करने हैं।' : 'घटक के स्रोत की जानकारी अभी चाहिए।', status:hasOrigin ? 'Evidence available' : 'Information needed' },
    { id:'abs-records', title:'आपूर्तिकर्ता और प्राप्ति रिकॉर्ड', explanation:'नाम, स्थान, खरीद या संग्रह रिकॉर्ड इस केस में संलग्न नहीं हैं।', status:'Information needed' },
    { id:'abs-use', title:'प्रस्तावित उपयोग', explanation:hasUse ? 'दिया गया उपयोग केस तथ्य के रूप में उपलब्ध है।' : 'वाणिज्यिक या शोध उपयोग स्पष्ट करें।', status:hasUse ? 'Evidence available' : 'Information needed' },
    { id:'abs-review', title:'ABS लागू होने की विशेषज्ञ समीक्षा', explanation:'सामान्य स्रोत श्रेणी से अनुमति या लाभ-साझेदारी की आवश्यकता तय नहीं होती।', status:'Professional review needed' },
    { id:'abs-source', title:'आधिकारिक ABS स्रोत', explanation:'इस तैयार डेमो में कोई सत्यापित ABS कानूनी स्रोत संलग्न नहीं है।', status:'Information needed' },
  ] : [
    { id:'abs-origin', title:'Country and origin for each biological ingredient', explanation:hasOrigin ? 'A broad origin category is supplied; provider and location details are still needed.' : 'Resource-origin information is still needed.', status:hasOrigin ? 'Evidence available' : 'Information needed' },
    { id:'abs-records', title:'Provider and acquisition records', explanation:'Provider name, location, and purchase or collection records are not attached to this case.', status:'Information needed' },
    { id:'abs-use', title:'Proposed use', explanation:hasUse ? 'The intended use is available as a supplied case fact.' : 'Clarify commercial or research use.', status:hasUse ? 'Evidence available' : 'Information needed' },
    { id:'abs-review', title:'Professional ABS applicability review', explanation:'A broad origin category cannot determine whether permission or benefit sharing is required.', status:'Professional review needed' },
    { id:'abs-source', title:'Official ABS source coverage', explanation:'No verified ABS legal source is attached to this curated demo.', status:'Information needed' },
  ];

  const toggle = (id: string) => {
    const checklist = { ...record.checklist, [id]: !record.checklist[id] };
    onUpdate({ ...record, checklist, updatedAt: new Date().toISOString() });
  };

  const statusClass = (status: Status) => status === 'Evidence available' ? 'evidence' : status === 'Professional review needed' ? 'review' : 'missing';

  return <details className="support-disclosure">
    <summary><span><ClipboardCheck size={17}/><span><strong>{language === 'hi' ? 'ABS जानकारी जाँच सूची' : 'ABS information checklist'}</strong><small>{language === 'hi' ? 'जानकारी की तैयारी; नियामक स्वीकृति नहीं' : 'Information readiness; not regulatory approval'}</small></span></span><ChevronDown size={16}/></summary>
    <div className="support-content abs-content">
      <div className="abs-list">{items.map(item => <article className="abs-item" key={item.id}>
        <button className={`task-check ${record.checklist[item.id] ? 'checked' : ''}`} onClick={() => toggle(item.id)} aria-pressed={Boolean(record.checklist[item.id])} aria-label={`${language === 'hi' ? record.checklist[item.id] ? 'चिह्न हटाएँ' : 'चिह्न लगाएँ' : record.checklist[item.id] ? 'Unmark' : 'Mark'} ${item.title}`}>{record.checklist[item.id] ? <Check size={14}/> : null}</button>
        <div><div className="abs-title-row"><h4>{item.title}</h4><span className={`status-badge ${statusClass(item.status)}`}>{item.status === 'Evidence available' ? <Check size={11}/> : <CircleAlert size={11}/>} {language === 'hi' ? item.status === 'Evidence available' ? 'स्रोत उपलब्ध' : item.status === 'Professional review needed' ? 'विशेषज्ञ समीक्षा चाहिए' : 'जानकारी चाहिए' : item.status}</span></div><p>{item.explanation}</p>{record.checklist[item.id] ? <span className="task-recorded">{language === 'hi' ? 'जानकारी कार्य दर्ज किया गया' : 'Information task recorded'}</span> : null}</div>
      </article>)}</div>
      <div className="support-note">{language === 'hi' ? 'कार्य पूरा चिह्नित करने का अर्थ नियामक अनुमति या ABS अनुपालन नहीं है।' : 'Marking a task complete records your preparation only. It does not indicate regulatory approval or ABS compliance.'}</div>
    </div>
  </details>;
}
