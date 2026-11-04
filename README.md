# Torn A · Bombers Tortosa — Netlify + PostgreSQL

Versió de desplegament de l'app original. Conserva els mòduls de rols, serveis especials, hores extres, caixa, comunitat, compres, àpats, tasques, vacances i permisos.

## Arquitectura
- `public/index.html`: aplicació web.
- `netlify/functions/api.mjs`: API de Netlify Functions, autenticació i accés a dades.
- PostgreSQL compatible amb Neon: dades persistents i compartides.
- Control de concurrència per revisió: evita sobreescriptures silencioses entre dispositius.

## 1. Preparar GitHub
Crea un repositori **privat** a GitHub, puja-hi el contingut d'aquesta carpeta (no el ZIP sense descomprimir). El fitxer `netlify.toml` ha de quedar a l'arrel.

## 2. Preparar PostgreSQL
Crea una base de dades PostgreSQL gestionada (per exemple a Neon).
Copia la cadena de connexió `postgresql://...` del proveïdor. No la compartisques públicament.
La taula es crea automàticament quan s'accedeix a `/api/state` amb sessió iniciada.

## 3. Desplegar a Netlify
- Netlify → Add new project → Import an existing project → GitHub.
- Selecciona el repositori.
- Build command: deixa'l buit (no cal compilar l'HTML).
- Publish directory: `public`.
- Functions directory: `netlify/functions` (ja definit a `netlify.toml`).
- Configura les variables d'entorn de Netlify (Project configuration → Environment variables):
  - `DATABASE_URL`: cadena de connexió PostgreSQL.
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
- No inclogues `DATABASE_URL`, contrasenyes ni fitxers `.env` al repositori.
- No utilitzes aquesta versió per a dades personals o operatives sensibles sense millorar autenticació, permisos, registre d'auditoria i política de còpies.
- Fes còpies de seguretat periòdiques des del proveïdor PostgreSQL i exportacions JSON.
- Netlify i el proveïdor PostgreSQL poden tindre límits o costos segons el pla.

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
