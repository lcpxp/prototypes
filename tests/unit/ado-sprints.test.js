// ------------------------------------------------------------------
// tests/unit/ado-sprints.test.js - Benchmarks for tools/ado/sprints.js,
// driven against a mocked Azure DevOps.
//
// The script writes to a system a session cannot reach, so the claims
// that matter are the ones a mistake could not be undone from:
//   1. A bad list - a wrong code, reversed dates, an overlap - stops
//      before anything is sent.
//   2. Each sprint is created as "Sprint <code>" under the iteration
//      root with its dates, then selected for the team.
//   3. Running twice creates and selects nothing the second time.
//   4. A sprint that exists with other dates is reported and left alone.
//   5. Nothing changes when the owner says no, or after the first failure.
// The fixture is invented: no organisation, project or id here is real.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const sprints = require("../../tools/ado/sprints.js");

const PROFILE = { organisation: "demo-org", project: "Demo", team: "Demo Team", iteration_root: "Demo" };
const LIST = [
  { code: "30-01", start: "2030-01-07", end: "2030-01-18" },
  { code: "30-02", start: "2030-01-21", end: "2030-02-01" },
];

function ado(seed) {
  const state = { nodes: (seed && seed.nodes) || [], team: (seed && seed.team) || [], calls: [], failOn: seed && seed.failOn };
  let next = 1;
  function reply(status, body) {
    return Promise.resolve({ ok: status < 300, status, headers: { get: () => null },
      text: () => Promise.resolve(body === undefined ? "" : JSON.stringify(body)) });
  }
  const env = {
    origin: "https://ado.example",
    sleep: () => Promise.resolve(),
    confirm: () => (seed && seed.answer === false ? false : true),
    log: () => {},
    table: () => {},
    fetch(url, opts) {
      const path = url.replace("https://ado.example", "").split("?")[0];
      const body = opts.body ? JSON.parse(opts.body) : undefined;
      state.calls.push({ method: opts.method, path, body });
      if (/\/_apis\/wit\/classificationnodes\/iterations/.test(path)) {
        if (opts.method === "GET") return reply(200, { name: "Demo", children: state.nodes });
        if (state.failOn && body.name === state.failOn) return reply(400, { message: "refused" });
        const node = { id: next, identifier: "guid-" + next, name: body.name, attributes: body.attributes };
        next += 1;
        state.nodes.push(node);
        return reply(201, node);
      }
      if (/\/_apis\/work\/teamsettings\/iterations$/.test(path)) {
        if (opts.method === "GET") return reply(200, { value: state.team });
        state.team.push({ id: body.id });
        return reply(200, { id: body.id });
      }
      return reply(404, { message: "unexpected " + path });
    },
  };
  return { env, state, run: sprints.create(env) };
}
const writes = (state) => state.calls.filter((c) => c.method === "POST");

test("a bad list or profile is refused before anything is sent", () => {
  assert.deepEqual(sprints.validate(LIST, PROFILE), []);
  const bad = sprints.validate([
    { code: "Sprint 1", start: "2030-01-07", end: "2030-01-18" },
    { code: "30-02", start: "2030-01-21", end: "2030-01-20" },
    { code: "30-03", start: "2030-01-15", end: "2030-01-25" },
  ], { organisation: "o", project: "p", team: "t" });
  assert.ok(bad.some((m) => /iteration_root/.test(m)));
  assert.ok(bad.some((m) => /not a sprint code/.test(m)));
  assert.ok(bad.some((m) => /ends before it starts/.test(m)));
  assert.ok(bad.some((m) => /overlaps/.test(m)));
});

test("each sprint is created under the root with its dates, then selected", async () => {
  const { state, run } = ado();
  const out = await run.apply(LIST, PROFILE);
  const posts = writes(state);
  assert.equal(posts.length, 4);
  assert.equal(posts[0].path, "/demo-org/Demo/_apis/wit/classificationnodes/iterations");
  assert.deepEqual(posts[0].body, { name: "Sprint 30-01",
    attributes: { startDate: "2030-01-07T00:00:00Z", finishDate: "2030-01-18T00:00:00Z" } });
  assert.equal(posts[1].path, "/demo-org/Demo/Demo%20Team/_apis/work/teamsettings/iterations");
  assert.deepEqual(posts[1].body, { id: "guid-1" });
  assert.deepEqual(out.team_sprints, ["30-01", "30-02"]);
  assert.deepEqual(out.created, ["Sprint 30-01", "Sprint 30-02"]);
});

test("running twice creates and selects nothing the second time", async () => {
  const { state, run } = ado();
  await run.apply(LIST, PROFILE);
  const before = writes(state).length;
  const out = await run.apply(LIST, PROFILE);
  assert.equal(writes(state).length, before);
  assert.deepEqual(out.team_sprints, ["30-01", "30-02"]);
});

test("an existing sprint is selected if it is not, and left alone if its dates differ", async () => {
  const { state, run } = ado({ nodes: [
    { id: 7, identifier: "guid-7", name: "Sprint 30-01",
      attributes: { startDate: "2030-01-07T00:00:00Z", finishDate: "2030-01-18T00:00:00Z" } },
    { id: 8, identifier: "guid-8", name: "Sprint 30-02",
      attributes: { startDate: "2030-01-22T00:00:00Z", finishDate: "2030-02-01T00:00:00Z" } },
  ] });
  const out = await run.apply(LIST, PROFILE);
  const posts = writes(state);
  assert.equal(posts.length, 1, "only the selection of the matching sprint");
  assert.deepEqual(posts[0].body, { id: "guid-7" });
  assert.deepEqual(out.left, ["Sprint 30-02"]);
  assert.deepEqual(out.team_sprints, ["30-01"]);
});

test("nothing changes when the owner says no, or after the first failure", async () => {
  const no = ado({ answer: false });
  await no.run.apply(LIST, PROFILE);
  assert.equal(writes(no.state).length, 0);

  const fail = ado({ failOn: "Sprint 30-01" });
  await assert.rejects(fail.run.apply(LIST, PROFILE), /answered 400: refused/);
  assert.equal(writes(fail.state).length, 1, "it stops at the refused create");
});

test("a root below the project creates the sprints in that folder", async () => {
  const { state, run } = ado();
  await run.apply(LIST.slice(0, 1), Object.assign({}, PROFILE, { iteration_root: "Demo\\Delivery Sprints" }));
  assert.equal(writes(state)[0].path, "/demo-org/Demo/_apis/wit/classificationnodes/iterations/Delivery%20Sprints");
});
