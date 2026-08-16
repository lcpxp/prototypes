// ------------------------------------------------------------------
// embed - text in, gte-small vectors out. Nothing else.
//
// The model runs on the edge worker itself (Supabase.ai), so there is no
// third-party API, no key to hold and no per-call cost. 384 dimensions,
// mean-pooled and L2-normalised, which is what makes cosine similarity a
// dot product and what docs/KNOWLEDGE-MODEL.md's rescale was written
// against.
//
// Deliberately stateless: it does not read or write the database. The
// vectors go back to Postgres, which stores them (supabase/schema/
// 34_embeddings.sql). That keeps the service_role key out of the
// picture entirely - this function only ever sees the text it was sent.
//
// Input:  { "input": "one string" } or { "input": ["many", "strings"] }
// Output: { "embeddings": [[384 floats], ...] }
// ------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// One session for the worker's lifetime; loading the model per request
// would dominate the time.
const session = new Supabase.ai.Session("gte-small");

// The model truncates past its context window, so a very long write-up
// is embedded on its opening. Stated rather than hidden: a caller that
// needs the tail should chunk before calling. Callers should also keep
// batches small - sixteen full-length work items exceeded the worker's
// memory in practice, four did not.
Deno.serve(async (req: Request) => {
  let body: { input?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON: { input: string | string[] }" }, 400);
  }
  const raw = body.input;
  const texts = Array.isArray(raw) ? raw : [raw];
  if (!texts.length || texts.some((t) => typeof t !== "string")) {
    return json({ error: "input must be a string or an array of strings" }, 400);
  }
  if (texts.length > 64) {
    return json({ error: "at most 64 strings per call" }, 400);
  }
  try {
    const embeddings: number[][] = [];
    for (const text of texts as string[]) {
      embeddings.push(await session.run(text, { mean_pool: true, normalize: true }) as number[]);
    }
    return json({ model: "gte-small", dimensions: 384, embeddings });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
