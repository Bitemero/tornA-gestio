import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "torna_session";
const validKeys = ["roles","special","overtime","cash","community","communityPayments","shopping","events","attendance","tasks","vacations","permissions"];
const respond = (status, data, headers = {}) => ({
  statusCode: status,
  headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...headers },
  body: JSON.stringify(data)
});
function env() {
  const {DATABASE_URL, TORNA_PASSWORD, TORNA_SECRET_KEY} = process.env;
  if (!DATABASE_URL || !TORNA_PASSWORD || !TORNA_SECRET_KEY || TORNA_SECRET_KEY.length < 32)
    throw new Error("Falten variables d'entorn del servidor");
  return { sql:neon(DATABASE_URL), password:TORNA_PASSWORD, secret:TORNA_SECRET_KEY };
}
function same(a,b) {
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x,y);
}
function signature(value, secret) {
  return createHmac("sha256",secret).update(value).digest("hex");
}
function isAuthed(event,secret) {
  const cookie=(event.headers.cookie || event.headers.Cookie || "").split(";").map(x=>x.trim()).find(x=>x.startsWith(cookieName+"="));
  if (!cookie) return false;
  const token=cookie.slice(cookieName.length+1);
  const dot=token.lastIndexOf(".");
  if (dot<0) return false;
  const body=token.slice(0,dot), mac=token.slice(dot+1);
  if (!same(signature(body,secret),mac)) return false;
  const expires=Number(body);
  return Number.isSafeInteger(expires) && expires > Date.now();
}
async function initialize(sql) {
  await sql`CREATE TABLE IF NOT EXISTS app_state (
    id integer PRIMARY KEY CHECK(id = 1),
    revision integer NOT NULL DEFAULT 0,
    data jsonb NOT NULL DEFAULT '{}'::jsonb
  )`;
  await sql`INSERT INTO app_state (id, revision, data) VALUES (1, 0, '{}'::jsonb) ON CONFLICT (id) DO NOTHING`;
}
export async function handler(event) {
  try {
    const {sql,password,secret}=env();
    const method=event.httpMethod;
    const path=event.path.replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/,"").replace(/\/$/,"") || "/";
    if (path === "/login" && method === "POST") {
      let body;
      try {body=JSON.parse(event.body||"{}");} catch {return respond(400,{error:"JSON incorrecte"});}
      if (typeof body.password !== "string" || !same(body.password,password))
        return respond(401,{error:"Contrasenya incorrecta"});
      const expires=String(Date.now()+12*60*60*1000);
      const token=expires+"."+signature(expires,secret);
      return respond(200,{ok:true},{"Set-Cookie":`${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`});
    }
    if (path === "/logout" && method === "POST")
      return respond(200,{ok:true},{"Set-Cookie":`${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`});
    if (!isAuthed(event,secret)) return respond(401,{error:"Cal iniciar sessió"});
    if (path !== "/state") return respond(404,{error:"No trobat"});
    if (method !== "GET" && method !== "PUT") return respond(405,{error:"Mètode no permès"});
    await initialize(sql);
    if (method === "GET") {
      const rows=await sql`SELECT revision,data FROM app_state WHERE id=1`;
      return respond(200,{revision:rows[0].revision,data:rows[0].data});
    }
    if ((event.headers["x-requested-with"] || event.headers["X-Requested-With"]) !== "TornA")
      return respond(400,{error:"Capçalera requerida"});
    if ((event.body||"").length > 1500000) return respond(413,{error:"Massa dades"});
    let body;
    try {body=JSON.parse(event.body||"{}");} catch {return respond(400,{error:"JSON incorrecte"});}
    if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !body.data ||
        typeof body.data !== "object" || !validKeys.every(k=>Array.isArray(body.data[k])))
      return respond(400,{error:"Dades incompletes"});
    const payload=JSON.stringify(body.data);
    const updated=await sql`
      UPDATE app_state SET data=${payload}::jsonb, revision=revision+1
      WHERE id=1 AND revision=${body.revision}
      RETURNING revision`;
    if (!updated.length) return respond(409,{error:"Conflicte: hi ha canvis nous al servidor"});
    return respond(200,{revision:updated[0].revision});
  } catch(e) {
    console.error("Error API Torn A:",e);
    return respond(500,{error:"Error del servidor. Revisa la configuració i els registres."});
  }
}
