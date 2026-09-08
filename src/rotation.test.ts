import { describe, expect, it } from 'vitest';
import { getAbsenceSubstitute, getNextEligiblePayer, previewTurns } from './rotation';
import { rotation, initialState } from './data';
import { applyAbsenceSkip, recordPayment } from './appLogic';
import type { AppState } from './types';

describe('rotation engine', () => {
  it('consumes Fidel pass after Manu and selects Marco', () => {
    const r = getNextEligiblePayer('manu', rotation, { fidel: 1, marco: 0, noyi: 0, manu: 0 });
    expect(r.nextPayer).toBe('marco');
    expect(r.updatedSkips.fidel).toBe(0);
  });

  it('wraps around the base rotation correctly', () => {
    const r = getNextEligiblePayer('manu', rotation, { fidel: 0, marco: 0, noyi: 0, manu: 0 });
    expect(r.nextPayer).toBe('fidel');
  });

  it('never mutates the original skips object', () => {
    const skips = { fidel: 1, marco: 0, noyi: 0, manu: 0 };
    getNextEligiblePayer('manu', rotation, skips);
    expect(skips.fidel).toBe(1);
  });

  it('never produces a negative pass count', () => {
    const r = getNextEligiblePayer('fidel', rotation, { fidel: 0, marco: 0, noyi: 0, manu: 0 });
    expect(Object.values(r.updatedSkips).every((v) => v >= 0)).toBe(true);
  });

  it('handles multiple passes: 2 -> 1 -> 0 -> eligible', () => {
    let skips = { fidel: 2, marco: 0, noyi: 0, manu: 0 };
    let r = getNextEligiblePayer('manu', rotation, skips); // reaches fidel, consumes 2->1
    expect(r.nextPayer).toBe('marco');
    expect(r.updatedSkips.fidel).toBe(1);
    skips = r.updatedSkips;
    r = getNextEligiblePayer('manu', rotation, skips); // next cycle reaches fidel again, 1->0
    expect(r.nextPayer).toBe('marco');
    expect(r.updatedSkips.fidel).toBe(0);
    skips = r.updatedSkips;
    r = getNextEligiblePayer('manu', rotation, skips); // fidel now eligible
    expect(r.nextPayer).toBe('fidel');
  });

  it('previews the upcoming turns without mutating real skips (preview purity)', () => {
    const skips = { fidel: 1, marco: 0, noyi: 0, manu: 0 };
    expect(previewTurns('manu', rotation, skips, 4)).toEqual(['marco', 'noyi', 'manu', 'fidel']);
    expect(skips.fidel).toBe(1);
    previewTurns('manu', rotation, skips, 8);
    expect(skips).toEqual({ fidel: 1, marco: 0, noyi: 0, manu: 0 });
  });

  it('getAbsenceSubstitute finds the next eligible person, consuming passes encountered', () => {
    const r = getAbsenceSubstitute('manu', rotation, { fidel: 1, marco: 0, noyi: 0, manu: 0 });
    expect(r.nextPayer).toBe('marco');
    expect(r.updatedSkips.fidel).toBe(0);
  });
});

describe('initial state (TEST 1)', () => {
  it('starts with Manu next, Fidel holding one pass, and seeded history', () => {
    const s = initialState();
    expect(s.currentPayer).toBe('manu');
    expect(s.skips).toEqual({ fidel: 1, marco: 0, noyi: 0, manu: 0 });
    expect(s.deferredPayer).toBeNull();
    expect(s.history.map((e) => (e.type === 'payment' ? e.payer : null))).toEqual(['fidel', 'fidel', 'marco', 'noyi']);
  });
});

describe('effective sequence from initial state', () => {
  it('matches Manu -> Marco -> Noyi -> Manu -> Fidel -> Marco -> Noyi -> Manu -> Fidel', () => {
    let state = initialState();
    const sequence: string[] = [state.currentPayer];
    for (let i = 0; i < 8; i++) {
      const result = recordPayment(state, '2026-01-01');
      state = result.state;
      sequence.push(state.currentPayer);
    }
    expect(sequence).toEqual(['manu', 'marco', 'noyi', 'manu', 'fidel', 'marco', 'noyi', 'manu', 'fidel']);
  });
});

describe('TEST 2 — Manu pays', () => {
  it('records Manu once, consumes Fidel pass without recording him, and advances to Marco', () => {
    const state = initialState();
    const result = recordPayment(state, '2026-01-01');
    const payments = result.state.history.filter((e) => e.type === 'payment');
    expect(payments.filter((e) => e.type === 'payment' && e.payer === 'manu')).toHaveLength(1);
    expect(payments.some((e) => e.type === 'payment' && e.payer === 'fidel' && e.date === '2026-01-01')).toBe(false);
    expect(result.state.skips.fidel).toBe(0);
    expect(result.state.currentPayer).toBe('marco');
  });
});

describe('TEST 4 — absence skip', () => {
  it('defers the absent payer and restores them immediately after the substitute pays', () => {
    let state: AppState = { ...initialState(), currentPayer: 'manu', skips: { fidel: 0, marco: 0, noyi: 0, manu: 0 } };
    const skip = applyAbsenceSkip(state, '2026-01-08');
    expect(skip).not.toBeNull();
    state = skip!.state;
    expect(state.deferredPayer).toBe('manu');
    expect(state.currentPayer).toBe('fidel'); // next eligible after manu covers this Peña

    // a second absence skip must be prevented while one is pending
    expect(applyAbsenceSkip(state, '2026-01-08')).toBeNull();

    // substitute (fidel) pays -> Manu returns as next payer immediately
    const afterSubstitutePays = recordPayment(state, '2026-01-08');
    expect(afterSubstitutePays.state.currentPayer).toBe('manu');
    expect(afterSubstitutePays.state.deferredPayer).toBeNull();

    // Manu later pays -> normal rotation resumes from Manu
    const afterManuPays = recordPayment(afterSubstitutePays.state, '2026-01-15');
    expect(afterManuPays.state.currentPayer).toBe('fidel');
  });
});
