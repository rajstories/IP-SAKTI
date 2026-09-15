import { useState } from 'react';
import { ArrowRight, Check, Clock3, FolderOpen, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { CaseRecord, Language } from '../types';
import { labels, t } from '../data';

export default function SavedCases({ records, language, onOpen, onNew, onReset, onRename, onDelete }: { records: CaseRecord[]; language: Language; onOpen: (id: string) => void; onNew: () => void; onReset: () => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const L = (key: keyof typeof labels) => t(labels[key], language);

  if (!records.length) return <section className="empty-state"><span className="empty-icon"><FolderOpen size={34}/></span><h1>{language === 'en' ? 'Your work, in one place.' : 'आपके सभी केस, एक जगह।'}</h1><p>{language === 'en' ? 'Start a formulation review to create your first case.' : 'पहला केस बनाने के लिए योग की समीक्षा शुरू करें।'}</p><button className="button primary" onClick={onNew}><Plus size={17}/>{L('start')}</button></section>;

  const beginRename = (record: CaseRecord) => { setEditingId(record.id); setDraft(record.title); setConfirmId(null); };
  const saveRename = () => { if (!editingId || !draft.trim()) return; onRename(editingId, draft.trim()); setEditingId(null); };

  return <section className="saved-page">
    <div className="saved-header"><div><span className="overline">{language === 'hi' ? 'आपकी केस फ़ाइलें' : 'YOUR CASE FILES'}</span><h1>{L('saved')}</h1><p>{language === 'hi' ? 'इस डिवाइस पर सहेजे गए उदाहरण केस।' : 'Sample cases saved on this device.'}</p></div><button className="button primary" onClick={onNew}><Plus size={17}/>{L('newCase')}</button></div>
    <div className="saved-list">{records.map(record => <article className="saved-row" key={record.id}>
      {editingId === record.id ? <div className="rename-form"><label htmlFor={`rename-${record.id}`}>{language === 'hi' ? 'केस का नाम' : 'Case name'}</label><input id={`rename-${record.id}`} type="text" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setEditingId(null); }} autoFocus/><button className="icon-button confirm" onClick={saveRename} aria-label="Save case name"><Check size={17}/></button><button className="icon-button" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X size={17}/></button></div> : <>
        <button className="saved-open" onClick={() => onOpen(record.id)}><span className="saved-row-icon"><FolderOpen size={20}/></span><span className="saved-copy"><strong>{record.title}</strong><span>{record.complete ? language === 'hi' ? 'मार्गदर्शन तैयार' : 'Guidance ready' : language === 'hi' ? 'प्रश्न जारी हैं' : 'Questions in progress'} · {Object.keys(record.facts).length} {language === 'hi' ? 'तथ्य' : 'facts'}</span></span><span className="saved-date"><Clock3 size={13}/>{new Date(record.updatedAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { month:'short', day:'numeric' })}</span><ArrowRight size={19}/></button>
        <div className="saved-actions"><button className="icon-button" onClick={() => beginRename(record)} aria-label={`${language === 'hi' ? 'नाम बदलें' : 'Rename'} ${record.title}`}><Pencil size={15}/></button><button className="icon-button delete" onClick={() => { setConfirmId(record.id); setEditingId(null); }} aria-label={`${language === 'hi' ? 'हटाएँ' : 'Delete'} ${record.title}`}><Trash2 size={15}/></button></div>
      </>}
      {confirmId === record.id ? <div className="delete-confirm" role="alert"><span>{language === 'hi' ? 'यह केस हटाएँ?' : 'Delete this case?'}</span><button onClick={() => { onDelete(record.id); setConfirmId(null); }}>{language === 'hi' ? 'हटाएँ' : 'Delete'}</button><button onClick={() => setConfirmId(null)}>{language === 'hi' ? 'रखें' : 'Keep'}</button></div> : null}
    </article>)}</div>
    <button className="reset-saved" onClick={onReset}><RotateCcw size={15}/>{language === 'hi' ? 'इस ऐप के स्थानीय उदाहरण केस हटाएँ' : 'Clear this app’s local sample cases'}</button>
  </section>;
}
