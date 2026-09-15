import { useEffect, useRef } from 'react';
import { ArrowUpRight, BookOpen, CircleAlert, Link2, X } from 'lucide-react';
import { t } from '../data';
import type { Claim, Language, Source } from '../types';

type Props = {
  source: Source;
  sourceNumber: number;
  claim?: Claim;
  language: Language;
  onClose: () => void;
};

export default function SourceDrawer({ source, sourceNumber, claim, language, onClose }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button, a[href], summary, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, source.id]);

  let hostname = source.url;
  try { hostname = new URL(source.url).hostname; } catch { /* Keep the visible URL. */ }

  return <div className="source-preview-backdrop" onMouseDown={onClose}>
    <aside
      ref={panelRef}
      className="source-preview evidence-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-preview-title"
      aria-describedby="source-preview-description"
      onMouseDown={event => event.stopPropagation()}
    >
      <div className="source-preview-top">
        <span className="evidence-provenance"><BookOpen size={13}/>[{sourceNumber}] {language === 'hi' ? 'चुना हुआ उदाहरण प्रमाण' : 'Curated sample evidence'}</span>
        <button ref={closeRef} className="icon-button" onClick={onClose} aria-label={language === 'hi' ? 'स्रोत बंद करें' : 'Close source'}><X size={19}/></button>
      </div>

      <h2 id="source-preview-title">{source.title}</h2>
      <dl className="evidence-meta">
        <div><dt>{language === 'hi' ? 'जारीकर्ता' : 'Issuing body'}</dt><dd>{source.publisher}</dd></div>
        <div><dt>{language === 'hi' ? 'अधिकार क्षेत्र' : 'Jurisdiction'}</dt><dd>{source.scope}</dd></div>
        <div><dt>{language === 'hi' ? 'स्रोत का दायरा' : 'Source scope'}</dt><dd>{language === 'hi' ? source.scopeKind === 'National source' ? 'राष्ट्रीय स्रोत' : 'गंतव्य-बाज़ार स्रोत' : source.scopeKind}</dd></div>
        <div><dt>{language === 'hi' ? 'धारा / विषय' : 'Section / topic'}</dt><dd>{source.section}</dd></div>
        <div className="meta-wide"><dt>{language === 'hi' ? 'स्रोत / संस्करण तिथि' : 'Source / version note'}</dt><dd>{source.date}</dd></div>
      </dl>

      <div className="source-quote-label">{language === 'hi' ? source.passageKind === 'Supporting passage' ? 'समर्थक अंश · स्रोत भाषा: अंग्रेज़ी' : 'उदाहरण सामग्री · स्रोत भाषा: अंग्रेज़ी' : `${source.passageKind.toUpperCase()} · SOURCE LANGUAGE: ENGLISH`}</div>
      <blockquote>{source.excerpt}</blockquote>

      <section className="claim-connection" id="source-preview-description">
        <span><Link2 size={14}/>{language === 'hi' ? 'यह अंश किस दावे का समर्थन करता है' : 'How this passage supports the claim'}</span>
        {claim ? <h3>“{t(claim.heading, language)}”</h3> : null}
        <p>{t(source.explanation, language)}</p>
      </section>

      <a href={source.url} target="_blank" rel="noreferrer" className="button secondary evidence-link">
        {language === 'hi' ? 'आधिकारिक स्रोत खोलें' : 'Open official source'}<ArrowUpRight size={16}/>
      </a>

      <details className="evidence-details">
        <summary>{language === 'hi' ? 'विवरण' : 'Details'}</summary>
        <dl>
          <div><dt>Evidence ID</dt><dd>CUR-{source.id.toUpperCase()}-{String(sourceNumber).padStart(2, '0')}</dd></div>
          <div><dt>Source type</dt><dd>{source.type}</dd></div>
          <div><dt>Official host</dt><dd>{hostname}</dd></div>
        </dl>
      </details>

      <div className="source-preview-note"><CircleAlert size={15}/>{language === 'hi' ? 'अंश की प्रासंगिकता और वर्तमान नियम योग्य विशेषज्ञ से जाँचें।' : 'Check the passage’s applicability and current requirements with a qualified professional.'}</div>
    </aside>
  </div>;
}
