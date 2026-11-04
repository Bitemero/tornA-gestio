import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

const create = () => drizzle({ schema });
let instance: ReturnType<typeof create> | undefined;

// Connexió creada al primer ús (no en carregar el mòdul), perquè un error
// es puga capturar i retornar com a resposta en lloc de fer caure la funció.
export function getDb() {
  return (instance ??= create());
}
