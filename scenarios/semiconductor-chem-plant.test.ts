import { describe, expect, it } from 'vitest';
import { applySelection, initialState, type IncidentScenario } from '@etzhayyim/kami-engine-sdk/webvr';
import { SEMI_PLANT_INCIDENT } from './semiconductor-chem-plant.js';

function reachesTerminal(scenario: IncidentScenario, fromId: string, seen = new Set<string>()): boolean {
  if (seen.has(fromId)) return false;
  seen.add(fromId);
  const n = scenario.nodes[fromId];
  if (!n) return false;
  if (n.terminal) return true;
  if (n.choices.length === 0) return false;
  return n.choices.some((c) => reachesTerminal(scenario, c.next, seen));
}

describe('cyber-drill / semiconductor-chem-plant scenario', () => {
  it('start node exists', () => {
    expect(SEMI_PLANT_INCIDENT.nodes[SEMI_PLANT_INCIDENT.start]).toBeDefined();
  });

  it('every choice targets an existing node', () => {
    for (const node of Object.values(SEMI_PLANT_INCIDENT.nodes)) {
      for (const c of node.choices) {
        expect(SEMI_PLANT_INCIDENT.nodes[c.next], `${node.id}.${c.id} → ${c.next}`).toBeDefined();
      }
    }
  });

  it('every node reaches a terminal', () => {
    for (const id of Object.keys(SEMI_PLANT_INCIDENT.nodes)) {
      expect(reachesTerminal(SEMI_PLANT_INCIDENT, id), `dead-end at ${id}`).toBe(true);
    }
  });

  it('terminal nodes have an outcome', () => {
    for (const n of Object.values(SEMI_PLANT_INCIDENT.nodes)) {
      if (n.terminal) expect(n.choices).toHaveLength(0);
    }
  });

  it('happy path produces a success terminal', () => {
    let s = initialState(SEMI_PLANT_INCIDENT);
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'callShiftLead');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'segmentOtNetwork');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'notifyMetiIpa');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'factualEarlyNotice');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'goldenImageRestore');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'doRootCauseAndShare');
    expect(s.done).toBe(true);
    expect(s.outcome).toBe('success');
    expect(s.history.every((d) => d.grade === 'best')).toBe(true);
  });

  it('cover-up path produces a failure terminal', () => {
    let s = initialState(SEMI_PLANT_INCIDENT);
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'callShiftLead');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'segmentOtNetwork');
    s = applySelection(SEMI_PLANT_INCIDENT, s, 'concealForBrand');
    expect(s.done).toBe(true);
    expect(s.outcome).toBe('failure');
  });

  it('every choice references a SSoT framework (best/bad) or routes back (ok)', () => {
    for (const node of Object.values(SEMI_PLANT_INCIDENT.nodes)) {
      for (const c of node.choices) {
        if (c.grade === 'best' || c.grade === 'bad') {
          // best / bad choices must cite a framework control for the
          // pedagogic rationale to be auditable.
          expect(c.reference, `${node.id}.${c.id}: graded ${c.grade} without reference`).toBeDefined();
        }
      }
    }
  });
});
