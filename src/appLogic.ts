import { byId, initialState } from './data';
import { getAbsenceSubstitute, getNextEligiblePayer } from './rotation';
import type { AppState, HistoryEvent, ParticipantId } from './types';

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const nowIso = () => new Date().toISOString();

export const snapshot = (s: AppState) => ({
  currentPayer: s.currentPayer,
  skips: { ...s.skips },
  deferredPayer: s.deferredPayer,
  history: [...s.history],
});

export interface ActionResult { state: AppState; message: string }

export function recordPayment(state: AppState, date: string): ActionResult {
  const payer = state.currentPayer;
  const event: HistoryEvent = { id: uid(), type: 'payment', payer, date, createdAt: nowIso() };
  if (state.deferredPayer) {
    const returning = byId[state.deferredPayer];
    return {
      state: { ...state, currentPayer: state.deferredPayer, deferredPayer: null, history: [...state.history, event], undo: snapshot(state) },
      message: `${byId[payer].name} quedó registrado. Vuelve ${returning.name}.`,
    };
  }
  const advance = getNextEligiblePayer(payer, state.rotation, state.skips);
  return {
    state: { ...state, currentPayer: advance.nextPayer, skips: advance.updatedSkips, history: [...state.history, event], undo: snapshot(state) },
    message: `${byId[payer].name} quedó registrado. Sigue ${byId[advance.nextPayer].name}.`,
  };
}

export function applyAbsenceSkip(state: AppState, date: string): ActionResult | null {
  if (state.deferredPayer) return null;
  const absentId = state.currentPayer;
  const absent = byId[absentId];
  const substitute = getAbsenceSubstitute(absentId, state.rotation, state.skips);
  const event: HistoryEvent = {
    id: uid(), type: 'adjustment', action: 'absence_skip', participant: absentId,
    previousPayer: absentId, nextPayer: substitute.nextPayer, date,
    note: `${absent.name} no pudo asistir; queda próximo.`, createdAt: nowIso(),
  };
  return {
    state: { ...state, currentPayer: substitute.nextPayer, skips: substitute.updatedSkips, deferredPayer: absentId, history: [...state.history, event], undo: snapshot(state) },
    message: `${byId[substitute.nextPayer].name} cubre esta Peña. Después vuelve ${absent.name}.`,
  };
}

export function addPass(state: AppState, id: ParticipantId, amount: number): AppState {
  const next = Math.max(0, state.skips[id] + amount);
  return {
    ...state,
    skips: { ...state.skips, [id]: next },
    history: [...state.history, { id: uid(), type: 'adjustment', action: amount > 0 ? 'add_skip' : 'remove_skip', participant: id, createdAt: nowIso() }],
    undo: snapshot(state),
  };
}

export function changeNext(state: AppState, id: ParticipantId): AppState {
  return {
    ...state,
    currentPayer: id,
    deferredPayer: null,
    history: [...state.history, { id: uid(), type: 'adjustment', action: 'change_next', participant: id, createdAt: nowIso() }],
    undo: snapshot(state),
  };
}

export function saveSplit(state: AppState, participantIds: ParticipantId[], affectsRotation: boolean, date: string): AppState {
  let next = state.currentPayer;
  let skips = { ...state.skips };
  if (affectsRotation) {
    const r = getNextEligiblePayer(state.currentPayer, state.rotation, state.skips);
    next = r.nextPayer;
    skips = r.updatedSkips;
  }
  return {
    ...state,
    currentPayer: next,
    skips,
    history: [...state.history, { id: uid(), type: 'split', participants: participantIds, affectsRotation, createdAt: `${date}T12:00:00.000Z` }],
    undo: snapshot(state),
  };
}

export function saveManualPayment(state: AppState, participant: ParticipantId, date: string): AppState {
  const name = byId[participant].name;
  return {
    ...state,
    history: [...state.history, { id: uid(), type: 'adjustment', action: 'manual_payment', participant, date, note: `Pago manual de ${name}`, createdAt: nowIso() }],
    undo: snapshot(state),
  };
}

export function undoLast(state: AppState): AppState | null {
  if (!state.undo) return null;
  const prev = state.undo;
  return { ...state, ...prev, undo: undefined };
}

export function resetState(state: AppState): AppState {
  return { ...initialState(), revision: state.revision, updatedAt: state.updatedAt, undo: snapshot(state) };
}
