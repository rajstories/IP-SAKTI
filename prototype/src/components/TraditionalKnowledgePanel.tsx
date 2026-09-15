import { BookOpen, ChevronDown } from 'lucide-react';
import { sources, t } from '../data';
import { displayFact, factNames, UNKNOWN } from '../lib/case';
import type { CaseRecord, Language } from '../types';

type OpenCitation = (sourceId: string, claimId: string, trigger: HTMLButtonElement) => void;

export default function TraditionalKnowledgePanel({ record, language, onCitation }: { record: CaseRecord; language: Language; onCitation: OpenCitation }) {
  const patentSource = sources.find(source => source.id === 'patents');
  const reference = record.facts.reference;
  const change = record.facts.change;
  const hasReference = reference === 'yes';
  const hasExactReference = false;
  const status = hasReference ? 'Professional review needed' : 'Information needed';

  return <details className="support-disclosure">
    <summary><span><BookOpen size={17}/><span><strong>{language === 'hi' ? 'पारंपरिक ज्ञान और पूर्व कला संकेत' : 'Traditional knowledge and prior-art pointers'}</strong><small>{language === 'hi' ? 'दिए गए विवरण और तैयार संदर्भ का संबंध' : 'How supplied details relate to curated references'}</small></span></span><ChevronDown size={16}/></summary>
    <div className="support-content">
      <div className="support-intro"><p>{language === 'hi' ? 'यह तालिका केवल दिए गए तथ्यों को तैयार उदाहरण स्रोतों से जोड़ती है। यह नवीनता या पेटेंट पात्रता का निष्कर्ष नहीं है।' : 'This table only connects supplied facts to curated sample references. It is not a novelty or patentability conclusion.'}</p><span className={`status-badge ${hasReference ? 'review' : 'missing'}`}>{language === 'hi' ? hasReference ? 'विशेषज्ञ समीक्षा चाहिए' : 'जानकारी चाहिए' : status}</span></div>
      <div className="evidence-table-wrap"><table className="evidence-table"><thead><tr><th>{language === 'hi' ? 'मिलता विवरण' : 'Matched detail'}</th><th>{language === 'hi' ? 'तैयार संदर्भ' : 'Curated reference'}</th><th>{language === 'hi' ? 'व्याख्या' : 'Interpretation'}</th></tr></thead><tbody>
        <tr><td><strong>{t(factNames.reference, language)}</strong><span>{reference ? displayFact('reference', reference, language) : language === 'hi' ? 'नहीं दिया गया' : 'Not supplied'}</span></td><td>{hasReference && patentSource ? <button className="table-citation" onClick={event => onCitation('patents', 'traditional-knowledge', event.currentTarget)}><span>[1]</span>{patentSource.title} · {patentSource.section}</button> : <span className="missing-cell">{language === 'hi' ? 'कोई संदर्भ जुड़ा नहीं' : 'No reference attached'}</span>}</td><td>{hasReference ? language === 'hi' ? 'धारा 3(p) विचार के लिए प्रासंगिक हो सकती है; सटीक योग और दावा विशेषज्ञ को देखना होगा।' : 'Section 3(p) may be relevant as a consideration; a professional must review the exact formulation and claim.' : language === 'hi' ? '“कोई ज्ञात संदर्भ नहीं” का अर्थ नवीनता सिद्ध होना नहीं है।' : '“No known reference” does not establish novelty.'}</td></tr>
        <tr><td><strong>{t(factNames.change, language)}</strong><span>{change ? displayFact('change', change, language) : language === 'hi' ? 'लागू नहीं / नहीं दिया' : 'Not applicable or not supplied'}</span></td><td><span className="missing-cell">{language === 'hi' ? 'सटीक शास्त्रीय पाठ संलग्न नहीं' : 'Exact classical text not attached'}</span></td><td>{change === UNKNOWN || !change ? language === 'hi' ? 'तुलना के लिए मूल पाठ और बदलावों की सूची चाहिए।' : 'The original text and a change list are needed for comparison.' : language === 'hi' ? 'दिया गया उत्तर दर्ज है; यह अपने आप कानूनी समानता तय नहीं करता।' : 'The supplied answer is recorded; it does not determine legal similarity.'}</td></tr>
        <tr><td><strong>{language === 'hi' ? 'पूर्व कला खोज' : 'Prior-art search'}</strong><span>{language === 'hi' ? 'खोज रिकॉर्ड नहीं दिया गया' : 'No search record supplied'}</span></td><td><span className="missing-cell">{language === 'hi' ? 'सत्यापित परिणाम उपलब्ध नहीं' : 'No verified results attached'}</span></td><td>{language === 'hi' ? 'इस प्रोटोटाइप ने प्रतिबंधित TKDL रिकॉर्ड नहीं खोजे हैं।' : 'This prototype has not searched restricted TKDL records.'}</td></tr>
      </tbody></table></div>
      {!hasExactReference ? <div className="support-note">{language === 'hi' ? 'प्रमाण अनुपलब्ध: ग्रंथ, अध्याय/श्लोक और संस्करण का सटीक संदर्भ दें।' : 'Evidence missing: supply the exact text, chapter or verse, and edition reference.'}</div> : null}
    </div>
  </details>;
}
