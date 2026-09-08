export type ParticipantId = 'fidel' | 'marco' | 'noyi' | 'manu';
export type TabId = 'next' | 'history' | 'group' | 'settings';
export interface Participant { id: ParticipantId; name: string; photo: string; theme: string; }
export interface PaymentEvent { id:string; type:'payment'; payer:ParticipantId; date?:string; createdAt?:string; label?:string }
export interface SplitEvent { id:string; type:'split'; participants:ParticipantId[]; affectsRotation:boolean; createdAt:string }
export interface AdjustmentEvent { id:string; type:'adjustment'; action:'add_skip'|'remove_skip'|'change_next'|'manual_payment'|'absence_skip'|'undo'; participant?:ParticipantId; previousPayer?:ParticipantId; nextPayer?:ParticipantId; date?:string; note?:string; createdAt:string }
export type HistoryEvent = PaymentEvent | SplitEvent | AdjustmentEvent;
export interface Snapshot { currentPayer:ParticipantId; skips:Record<ParticipantId,number>; deferredPayer:ParticipantId|null; history:HistoryEvent[] }
export interface AppState extends Snapshot { version:1; rotation:ParticipantId[]; undo?:Snapshot; revision:number; updatedAt:string }
