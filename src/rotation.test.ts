import { describe, expect, it } from 'vitest';
import { getAbsenceSubstitute, getNextEligiblePayer, previewTurns } from './rotation';
import { rotation, initialState } from './data';
import { applyAbsenceSkip, recordPayment } from './appLogic';
import type { AppState } from './types';

describe('rotation engine', () => {
  it('advances from Manu to Noyi without consuming a later Fidel pass', () => {
    const r = getNextEligiblePayer('manu', rotation, { fidel: 1, marco: 0, noyi: 0, manu: 0 });
    expect(r.nextPayer).toBe('noyi');
    expect(r.updatedSkips.fidel).toBe(1);
  });

  it('wraps around the canonical rotation correctly', () => {
    const r = getNextEligiblePayer('manu', rotation, { fidel: 0, marco: 0, noyi: 0, manu: 0 });
    expect(r.nextPayer).toBe('noyi');
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
    let r = getNextEligiblePayer('noyi', rotation, skips);
    expect(r.nextPayer).toBe('marco');
    expect(r.updatedSkips.fidel).toBe(1);
    skips = r.updatedSkips;
    r = getNextEligiblePayer('noyi', rotation, skips);
    expect(r.nextPayer).toBe('marco');
    expect(r.updatedSkips.fidel).toBe(0);
    skips = r.updatedSkips;
    r = getNextEligiblePayer('noyi', rotation, skips);
    expect(r.nextPayer).toBe('fidel');
  });

  it('previews upcoming turns without mutating real skips', () => {
    const skips = { fidel: 1, marco: 0, noyi: 0, manu: 0 };
    expect(previewTurns('manu', rotation, skips, 4)).toEqual(['noyi', 'marco', 'manu', 'noyi']);
    expect(skips.fidel).toBe(1);
    previewTurns('manu', rotation, skips, 8);
    expect(skips).toEqual({ fidel: 1, marco: 0, noyi: 0, manu: 0 });
  });

  it('finds the next absence substitute in canonical order', () => {
    const r = getAbsenceSubstitute('manu', rotation, { fidel: 1, marco: 0, noyi: 0, manu: 0 });
    expect(r.nextPayer).toBe('noyi');
    expect(r.updatedSkips.fidel).toBe(1);
  });
});

describe('initial state', () => {
  it('starts with Manu next, Fidel holding one pass, and seeded history', () => {
    const s = initialState();
    expect(s.currentPayer).toBe('manu');
    expect(s.skips).toEqual({ fidel: 1, marco: 0, noyi: 0, manu: 0 });
    expect(s.deferredPayer).toBeNull();
    expect(s.history.map((e) => (e.type === 'payment' ? e.payer : null))).toEqual(['fidel', 'fidel', 'marco', 'noyi']);
  });
});

describe('effective sequence from initial state', () => {
  it('follows the canonical Noyi -> Fidel -> Marco -> Manu cycle', () => {
    let state = initialState();
    const sequence: string[] = [state.currentPayer];
    for (let i = 0; i < 8; i++) {
      const result = recordPayment(state, '2026-01-01');
      state = result.state;
      sequence.push(state.currentPayer);
    }
    expect(sequence).toEqual(['manu', 'noyi', 'marco', 'manu', 'noyi', 'fidel', 'marco', 'manu', 'noyi']);
  });
});

describe('Manu pays', () => {
  it('records Manu once and advances to Noyi', () => {
    const state = initialState();
    const result = recordPayment(state, '2026-01-01');
    const payments = result.state.history.filter((e) => e.type === 'payment');
    expect(payments.filter((e) => e.type === 'payment' && e.payer === 'manu')).toHaveLength(1);
    expect(payments.some((e) => e.type === 'payment' && e.payer === 'fidel' && e.date === '2026-01-01')).toBe(false);
    expect(result.state.skips.fidel).toBe(1);
    expect(result.state.currentPayer).toBe('noyi');
  });
});

describe('absence skip', () => {
  it('defers the absent payer and restores them immediately after the substitute pays', () => {
    let state: AppState = { ...initialState(), currentPayer: 'manu', skips: { fidel: 0, marco: 0, noyi: 0, manu: 0 } };
    const skip = applyAbsenceSkip(state, '2026-01-08');
    expect(skip).not.toBeNull();
    state = skip!.state;
    expect(state.deferredPayer).toBe('manu');
    expect(state.currentPayer).toBe('noyi');
    expect(applyAbsenceSkip(state, '2026-01-08')).toBeNull();
    const afterSubstitutePays = recordPayment(state, '2026-01-08');
    expect(afterSubstitutePays.state.currentPayer).toBe('manu');
    expect(afterSubstitutePays.state.deferredPayer).toBeNull();
    const afterManuPays = recordPayment(afterSubstitutePays.state, '2026-01-15');
    expect(afterManuPays.state.currentPayer).toBe('noyi');
  });
});
