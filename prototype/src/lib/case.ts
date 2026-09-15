import type { CaseRecord, FactKey, Facts, Guidance, Language, LocalText, ScenarioId, Source } from '../types';
import { scenarios, sources } from '../data';

export const UNKNOWN = 'unknown';
export const factOrder: FactKey[] = ['description', 'use', 'reference', 'change', 'origin'];
export const factNames: Record<FactKey, LocalText> = {
  description: { en: 'Formulation', hi: 'योग' },
  use: { en: 'Intended use', hi: 'उद्देश्य' },
  reference: { en: 'Classical reference', hi: 'शास्त्रीय संदर्भ' },
  change: { en: 'What changed', hi: 'क्या बदला' },
  origin: { en: 'Resource source', hi: 'संसाधन का स्रोत' },
};

export const answerLabels: Record<string, LocalText> = {
  medicine: { en: 'Medicine', hi: 'औषधि' },
  food: { en: 'Food / supplement', hi: 'भोजन / पूरक' },
  cosmetic: { en: 'Cosmetic', hi: 'प्रसाधन' },
  research: { en: 'Research only', hi: 'केवल शोध' },
  yes: { en: 'Yes, drawn from a classical reference', hi: 'हाँ, शास्त्रीय संदर्भ से' },
  no: { en: 'No known classical reference', hi: 'कोई ज्ञात शास्त्रीय संदर्भ नहीं' },
  same: { en: 'I am following the reference', hi: 'मैं संदर्भ का पालन कर रहा/रही हूँ' },
  modified: { en: 'I changed ingredients or process', hi: 'घटकों या प्रक्रिया में बदलाव किया है' },
  india: { en: 'India', hi: 'भारत' },
  elsewhere: { en: 'Outside India', hi: 'भारत से बाहर' },
  mixed: { en: 'More than one source', hi: 'एक से अधिक स्रोत' },
  [UNKNOWN]: { en: 'Not sure yet', hi: 'अभी निश्चित नहीं' },
};

export const choices: Partial<Record<FactKey, string[]>> = {
  use: ['medicine', 'food', 'cosmetic', 'research', UNKNOWN],
  reference: ['yes', 'no', UNKNOWN],
  change: ['same', 'modified', UNKNOWN],
  origin: ['india', 'elsewhere', 'mixed', UNKNOWN],
};

export function questionKeys(facts: Facts): FactKey[] {
  const keys: FactKey[] = ['description', 'use'];
  if (facts.use && !['research', 'cosmetic'].includes(facts.use)) {
    keys.push('reference');
    if (facts.reference === 'yes') keys.push('change');
    keys.push('origin');
  }
  return keys;
}

export function firstUnanswered(facts: Facts): FactKey | null {
  return questionKeys(facts).find(key => !facts[key]) ?? null;
}

export function createCase(scenarioId: ScenarioId | null, language: Language): CaseRecord {
  const scenario = scenarios.find(s => s.id === scenarioId);
  const description = scenario ? scenario.initialDescription[language] : '';
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `case-${Date.now()}`,
    scenarioId,
    title: scenario?.title[language] ?? (language === 'hi' ? 'नया योग' : 'New formulation'),
    facts: description ? { description } : {},
    complete: false,
    updatedAt: new Date().toISOString(),
    checklist: {},
    jurisdiction: scenarioId === 'export' ? 'compare' : 'india',
    market: 'us',
  };
}

export function setFact(caseRecord: CaseRecord, key: FactKey, value: string): CaseRecord {
  const prior = caseRecord.facts[key];
  const facts = { ...caseRecord.facts, [key]: value };
  if (prior && prior !== value) {
    // An earlier edit invalidates every downstream answer and all derived guidance.
    const later = factOrder.slice(factOrder.indexOf(key) + 1);
    later.forEach(fact => delete facts[fact]);
  }
  const title = key === 'description' && caseRecord.scenarioId === null
    ? value.trim().slice(0, 48) || caseRecord.title
    : caseRecord.title;
  return { ...caseRecord, title, facts, complete: false, updatedAt: new Date().toISOString() };
}

export function displayFact(key: FactKey, value: string, language: Language): string {
  if (key === 'description') return value;
  return answerLabels[value]?.[language] ?? value;
}

const text = (en: string, hi: string): LocalText => ({ en, hi });

export function buildGuidance(record: CaseRecord): Guidance {
  const f = record.facts;
  const missing = questionKeys(f).filter(key => !f[key] || f[key] === UNKNOWN);
  const claims: Guidance['claims'] = [];
  if (record.scenarioId === null) {
    return {
      category: text('Unmatched formulation — source review needed', 'अपरिचित योग — स्रोत समीक्षा आवश्यक'),
      missing,
      claims: [{
        id: 'prototype-coverage',
        heading: text('No curated sample match', 'कोई तैयार नमूना मेल नहीं मिला'),
        body: text(
          'Your facts have been saved, but this prototype cannot connect a new formulation to product-specific sources yet. Start with a sample case or have a qualified reviewer select the relevant official sources.',
          'आपके तथ्य सहेज लिए गए हैं, लेकिन यह प्रोटोटाइप अभी नए योग को उत्पाद-विशिष्ट स्रोतों से नहीं जोड़ सकता। नमूना मामला चुनें या योग्य विशेषज्ञ से संबंधित आधिकारिक स्रोत चुनवाएँ।',
        ),
        sourceIds: [],
        status: 'missing',
        scope: 'India',
      }],
      sourceIds: [],
    };
  }
  const category: LocalText = f.use === 'medicine'
    ? text('Medicine pathway to review', 'समीक्षा के लिए औषधि मार्ग')
    : f.use === 'food'
      ? text('Food pathway to review', 'समीक्षा के लिए खाद्य मार्ग')
      : f.use === 'cosmetic'
        ? text('Cosmetic pathway to review', 'समीक्षा के लिए प्रसाधन मार्ग')
        : text('Product category unresolved', 'उत्पाद वर्ग स्पष्ट नहीं');

  if (f.reference === 'yes') {
    claims.push({ id: 'traditional-knowledge', heading: text('Traditional knowledge consideration', 'पारंपरिक ज्ञान से जुड़ा विचार'),
      body: text('The Patents Act, Section 3(p), addresses inventions that are in effect traditional knowledge. Whether your described formulation engages this provision requires review of the exact reference and any changes.', 'पेटेंट अधिनियम की धारा 3(p) पारंपरिक ज्ञान से संबंधित आविष्कारों पर लागू होती है। आपके योग पर इसका असर समझने के लिए सही संदर्भ और बदलावों की समीक्षा चाहिए।'),
      sourceIds: ['patents'], status: f.change === UNKNOWN ? 'review' : 'evidence', scope: 'India' });
  } else if (f.reference === 'no' && f.use === 'medicine') {
    claims.push({ id: 'prior-art', heading: text('Prior-art review still matters', 'पूर्व जानकारी की समीक्षा आवश्यक'),
      body: text('A missing classical reference in your description does not establish novelty or patent eligibility. Search earlier disclosures and get specialist review before drawing an IP conclusion.', 'विवरण में शास्त्रीय संदर्भ न होने से नवीनता या पेटेंट पात्रता सिद्ध नहीं होती। आईपी निष्कर्ष से पहले पुराने स्रोतों और विशेषज्ञ की समीक्षा आवश्यक है।'),
      sourceIds: ['patents'], status: 'review', scope: 'India' });
  }

  if (f.use === 'food') {
    claims.push({ id: 'food-route', heading: text('Check the Ayurveda Aahara pathway', 'आयुर्वेद आहार मार्ग की जाँच करें'),
      body: text('FSSAI has an official Ayurveda Aahara regulation. The source identifies a possible route to examine; eligibility cannot be decided from the intended use alone.', 'FSSAI का आधिकारिक आयुर्वेद आहार नियम है। यह जाँच के लिए एक संभावित मार्ग है; केवल बताए गए उपयोग से पात्रता तय नहीं की जा सकती।'),
      sourceIds: ['food'], status: 'review', scope: 'India' });
  }

  if (f.origin === UNKNOWN || !f.origin) {
    if (f.use === 'medicine' || f.use === 'food') {
      claims.push({ id: 'resource-origin', heading: text('Resource origin needs clarification', 'संसाधन के स्रोत की जानकारी चाहिए'),
        body: text('Record where each biological ingredient was obtained and how it will be used. The sample cannot assess access-and-benefit-sharing considerations without these facts.', 'हर जैविक घटक कहाँ से लिया गया और उसका उपयोग कैसे होगा, यह दर्ज करें। इन तथ्यों के बिना यह उदाहरण लाभ-साझेदारी के प्रश्न का आकलन नहीं कर सकता।'),
        sourceIds: [], status: 'missing', scope: 'India' });
    }
  } else if (f.use === 'medicine' || f.use === 'food') {
    claims.push({ id: 'abs-review', heading: text('Resource-origin review', 'संसाधन स्रोत की समीक्षा'),
      body: text('You supplied a resource-origin category. This is a starting fact for professional access-and-benefit-sharing review, not a finding that an approval is or is not required.', 'आपने संसाधन का स्रोत बताया है। यह विशेषज्ञ द्वारा लाभ-साझेदारी की समीक्षा का शुरुआती तथ्य है; इससे अनुमति की आवश्यकता तय नहीं होती।'),
      sourceIds: [], status: 'review', scope: 'India' });
  }

  if (record.jurisdiction !== 'india' && record.market === 'us' && f.use === 'food') {
    claims.push({ id: 'us-food', heading: text('US supplement overview', 'अमेरिकी पूरक जानकारी'),
      body: text('FDA guidance describes how dietary supplements are overseen in the United States. It does not confirm that this formulation can be sold there; ingredient, claim and labelling requirements need separate review.', 'FDA की जानकारी अमेरिका में आहार पूरकों की निगरानी बताती है। इससे इस योग की बिक्री की अनुमति सिद्ध नहीं होती; घटक, दावे और लेबल की अलग समीक्षा चाहिए।'),
      sourceIds: ['fda'], status: 'review', scope: 'United States' });
  }

  if (claims.length === 0) {
    claims.push({ id: 'unresolved', heading: text('Category needs more context', 'वर्ग के लिए और संदर्भ चाहिए'),
      body: text('The available facts do not support a product-specific regulatory or IP conclusion. Add the intended use and a relevant formulation reference before reviewing a pathway.', 'उपलब्ध तथ्यों से उत्पाद-विशिष्ट नियामक या आईपी निष्कर्ष नहीं निकलता। मार्ग की समीक्षा से पहले उपयोग और संबंधित संदर्भ जोड़ें।'),
      sourceIds: [], status: 'missing', scope: 'India' });
  }
  return { category, missing, claims, sourceIds: [...new Set(claims.flatMap(claim => claim.sourceIds))] };
}

export function citedSources(guidance: Guidance): Source[] {
  return sources.filter(source => guidance.sourceIds.includes(source.id));
}
