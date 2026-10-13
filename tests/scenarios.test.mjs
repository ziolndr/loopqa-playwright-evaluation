import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scenarios = JSON.parse(readFileSync(new URL('../data/scenarios.json', import.meta.url), 'utf8'));
const expected = new Set(['TC-01','TC-02','TC-03','TC-04','TC-05','TC-06']);
const projects = new Set(['Web Application', 'Mobile Application']);
const columns = new Set(['To Do', 'In Progress', 'Done']);
const tags = new Set(['Feature', 'High Priority', 'Bug', 'Design']);

test('all six required cases are present exactly once', () => {
  assert.deepEqual(new Set(scenarios.map(item => item.id)), expected);
  assert.equal(scenarios.length, expected.size);
});

for (const scenario of scenarios) {
  test(`${scenario.id} has a well-formed, unambiguous data contract`, () => {
    assert.ok(projects.has(scenario.project));
    assert.ok(columns.has(scenario.column));
    assert.equal(typeof scenario.task, 'string');
    assert.ok(scenario.task.trim().length > 0);
    assert.ok(Array.isArray(scenario.tags) && scenario.tags.length > 0);
    assert.equal(new Set(scenario.tags).size, scenario.tags.length);
    assert.ok(scenario.tags.every(tag => tags.has(tag)));
    assert.deepEqual(Object.keys(scenario).sort(), ['column','id','project','tags','task']);
  });
}

test('scenario task identities are unique within each project', () => {
  const identities = scenarios.map(s => `${s.project}::${s.task}`);
  assert.equal(new Set(identities).size, identities.length);
});
