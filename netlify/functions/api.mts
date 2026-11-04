import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { appState } from "../../db/schema.js";

const cookieName = "torna_session";
const validKeys = ["roles","special","overtime","cash","community","communityPayments","shopping","events","attendance","tasks","vacations","permissions"];
const respond = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...headers },
  });
function env() {
  const {TORNA_PASSWORD, TORNA_SECRET_KEY} = process.env;
  if (!TORNA_PASSWORD || !TORNA_SECRET_KEY || TORNA_SECRET_KEY.length < 32)
    throw new Error("Falten variables d'entorn del servidor");
  return { password:TORNA_PASSWORD, secret:TORNA_SECRET_KEY };
}
function same(a: string, b: string) {
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x,y);
}
function signature(value: string, secret: string) {
  return createHmac("sha256",secret).update(value).digest("hex");
}
function isAuthed(req: Request, secret: string) {
  const cookie=(req.headers.get("cookie") || "").split(";").map((x: string)=>x.trim()).find((x: string)=>x.startsWith(cookieName+"="));
  if (!cookie) return false;
  const token=cookie.slice(cookieName.length+1);
  const dot=token.lastIndexOf(".");
  if (dot<0) return false;
  const body=token.slice(0,dot), mac=token.slice(dot+1);
  if (!same(signature(body,secret),mac)) return false;
  const expires=Number(body);
  return Number.isSafeInteger(expires) && expires > Date.now();
}
// La taula la crea la migració; aquí només ens assegurem que existeix la fila única.
async function initialize() {
  await getDb().insert(appState).values({ id: 1, revision: 0, data: {} }).onConflictDoNothing();
}
export default async (req: Request) => {
  try {
    const {password,secret}=env();
    const method=req.method;
    const path=new URL(req.url).pathname.replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/,"").replace(/\/$/,"") || "/";
    if (path === "/login" && method === "POST") {
      let body: any;
      try {body=JSON.parse((await req.text())||"{}");} catch {return respond(400,{error:"JSON incorrecte"});}
      if (typeof body.password !== "string" || !same(body.password,password))
        return respond(401,{error:"Contrasenya incorrecta"});
      const expires=String(Date.now()+12*60*60*1000);
      const token=expires+"."+signature(expires,secret);
      return respond(200,{ok:true},{"Set-Cookie":`${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`});
    }
    if (path === "/logout" && method === "POST")
      return respond(200,{ok:true},{"Set-Cookie":`${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`});
    if (!isAuthed(req,secret)) return respond(401,{error:"Cal iniciar sessió"});
    if (path !== "/state") return respond(404,{error:"No trobat"});
    if (method !== "GET" && method !== "PUT") return respond(405,{error:"Mètode no permès"});
    await initialize();
    if (method === "GET") {
      const rows=await getDb().select({revision:appState.revision,data:appState.data}).from(appState).where(eq(appState.id,1));
      const row=rows[0] ?? {revision:0,data:{}};
      return respond(200,{revision:row.revision,data:row.data ?? {}});
    }
    if (req.headers.get("x-requested-with") !== "TornA")
      return respond(400,{error:"Capçalera requerida"});
    const raw=await req.text();
    if (raw.length > 1500000) return respond(413,{error:"Massa dades"});
    let body: any;
    try {body=JSON.parse(raw||"{}");} catch {return respond(400,{error:"JSON incorrecte"});}
    if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !body.data ||
        typeof body.data !== "object" || Array.isArray(body.data))
      return respond(400,{error:"Dades incompletes"});
    // Les claus que falten (p. ex. còpies antigues) es completen amb llistes buides.
    for (const k of validKeys) {
      if (body.data[k] === undefined || body.data[k] === null) body.data[k] = [];
      if (!Array.isArray(body.data[k])) return respond(400,{error:`Dades incorrectes a «${k}»`});
    }
    const updated=await getDb().update(appState)
      .set({data:body.data, revision:sql`${appState.revision} + 1`, updatedAt:new Date()})
      .where(and(eq(appState.id,1), eq(appState.revision,body.revision)))
      .returning({revision:appState.revision});
    if (!updated.length) return respond(409,{error:"Conflicte: hi ha canvis nous al servidor"});
    return respond(200,{revision:updated[0].revision});
  } catch(e) {
    console.error("Error API Torn A:",e);
    return respond(500,{error:"Error del servidor. Revisa la configuració i els registres."});
  }
};

export const config: Config = {
  path: ["/api/login", "/api/logout", "/api/state"],
};
