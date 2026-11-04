import { pgTable, integer, jsonb, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Estat compartit de l'aplicació: una única fila (id = 1) amb totes les dades en JSON
// i un número de revisió per al control de concurrència entre dispositius.
export const appState = pgTable(
  "app_state",
  {
    id: integer().primaryKey(),
    revision: integer().notNull().default(0),
    data: jsonb().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("app_state_single_row", sql`${t.id} = 1`)],
);
