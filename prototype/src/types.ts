export type Language = 'en' | 'hi';
export type Jurisdiction = 'india' | 'international' | 'compare';
export type Market = 'us' | 'eu' | 'pct';
export type LocalText = { en: string; hi: string };
export type ScenarioId = 'classical' | 'modified' | 'export';
export type FactKey = 'description' | 'use' | 'reference' | 'change' | 'origin';
export type Facts = Partial<Record<FactKey, string>>;
export interface Scenario { id: ScenarioId; title: LocalText; description: LocalText; kind: LocalText; ingredients: string; initialDescription: LocalText; duration: string; }
export type EvidenceScope = 'India' | 'United States';
export interface Source { id: string; title: string; publisher: string; scope: EvidenceScope; scopeKind: 'National source' | 'Destination-market source'; section: string; date: string; url: string; excerpt: string; explanation: LocalText; type: 'Official text' | 'Official guidance'; passageKind: 'Supporting passage' | 'Illustrative content'; }
export interface CaseRecord { id: string; scenarioId: ScenarioId | null; title: string; facts: Facts; complete: boolean; updatedAt: string; checklist: Record<string, boolean>; jurisdiction: Jurisdiction; market: Market; }
export interface Claim { id: string; heading: LocalText; body: LocalText; sourceIds: string[]; status: 'evidence' | 'review' | 'missing'; scope: EvidenceScope; }
export interface Guidance { category: LocalText; missing: FactKey[]; claims: Claim[]; sourceIds: string[]; }
