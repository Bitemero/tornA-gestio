# Torn A · Bombers Tortosa — Netlify + Netlify Database

Versió de desplegament de l'app original. Conserva els mòduls de rols, serveis especials, hores extres, caixa, comunitat, compres, àpats, tasques, vacances i permisos.

## Arquitectura
- `public/index.html`: aplicació web.
- `netlify/functions/api.mts`: API de Netlify Functions, autenticació i accés a dades.
- Netlify Database (PostgreSQL gestionat per Netlify): dades persistents i compartides.
- `db/schema.ts`: esquema de la base de dades (Drizzle ORM).
- `netlify/database/migrations/`: migracions SQL que Netlify aplica automàticament a cada desplegament.
- Control de concurrència per revisió: evita sobreescriptures silencioses entre dispositius.

## 1. Preparar GitHub
Crea un repositori **privat** a GitHub, puja-hi el contingut d'aquesta carpeta (no el ZIP sense descomprimir). El fitxer `netlify.toml` ha de quedar a l'arrel.

## 2. Base de dades
S'utilitza **Netlify Database**: no cal crear cap compte extern ni configurar cap cadena de connexió. La base de dades es crea automàticament i les migracions de `netlify/database/migrations/` s'apliquen a cada desplegament.
Per modificar l'esquema: edita `db/schema.ts` i executa `npx drizzle-kit generate --name descripcio_del_canvi`.

## 3. Desplegar a Netlify
- Netlify → Add new project → Import an existing project → GitHub.
- Selecciona el repositori.
- Build command: deixa'l buit (no cal compilar l'HTML).
- Publish directory: `public`.
- Functions directory: `netlify/functions` (ja definit a `netlify.toml`).
- Configura les variables d'entorn de Netlify (Project configuration → Environment variables):
  - `TORNA_PASSWORD`: contrasenya llarga i única d'accés.
  - `TORNA_SECRET_KEY`: cadena aleatòria de 32 caràcters o més, diferent de la contrasenya.
- Desplega el projecte. Si has afegit variables després del desplegament, torna a desplegar-lo.
- Obre la URL `https://...netlify.app`, inicia sessió i prova un registre.

## 4. Importar les dades antigues
Des de l'aplicació antiga: pestanya **Dades** → **Descarregar còpia JSON**.
Des de la nova: **Dades** → **Importar còpia JSON**.
Atenció: la importació substitueix el conjunt de registres existent.

## 5. Funcionament i seguretat
- Els canvis es desen al servidor, no al navegador. Recarrega la pàgina per veure modificacions d'altres companys.
- Si dos usuaris escriuen a la vegada, el segon rep un avís i ha de repetir el canvi.
- L'accés és per contrasenya **compartida**, sense comptes ni permisos individuals.
- Les sessions duren 12 hores.
- No inclogues contrasenyes ni fitxers `.env` al repositori.
- No utilitzes aquesta versió per a dades personals o operatives sensibles sense millorar autenticació, permisos, registre d'auditoria i política de còpies.
- Fes còpies de seguretat periòdiques amb exportacions JSON des de l'aplicació.
- Netlify pot tindre límits o costos segons el pla.

## Prova local
Requereix Node.js modern i Netlify CLI.
```bash
npm install
npx netlify dev
```
Crea un fitxer `.env` local amb les variables d'entorn (no el puges a GitHub).
L'URL local l'indicarà la CLI.

## Limitacions actuals
No s'ha desplegat ni provat contra una base de dades real. És una base funcional inicial que requereix verificació abans d'ús habitual.
