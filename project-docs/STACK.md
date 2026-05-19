# Stack – MinPortfölj

## Frontend
- React 18
- Vite (byggverktyg och dev-server)
- Rent JavaScript / JSX – inga TypeScript-filer trots att @types/react finns som devDependency

## Backend
- Vercel Serverless Functions (api/funds.js)
- Ingen vercel.json konfigurerad ännu

## Pakethanterare
- npm (package-lock.json)

## Externa datakällor
- Yahoo Finance – historiska prispriser via query1.finance.yahoo.com
- Morningstar – avgiftsdata via lt.morningstar.com

## Projektstruktur
src/
  components/   UI-komponenter, ingen beräkningslogik
  hooks/        State och datahämtning (useFundData, usePortfolio)
  lib/          All business logic och datapipeline

api/
  funds.js      Serverless function – hämtar prisdata och avgifter

## Datapipeline
normalize → dateRange → blend → calculations → komponenter
Ordningen är strikt och får aldrig brytas.

## Kända avvikelser från AI_RULES.md
- "TypeScript strikt" är inte implementerat – appen är ren JS/JSX
- Mobilanpassning saknas trots "mobil först"

## Tekniska krav innan produktion
- Lägg till vercel.json med korrekt routing
- Flytta ms_token till Vercel miljövariabel (MORNINGSTAR_TOKEN)
- Säkerställ att api/funds.js når Yahoo Finance och Morningstar från Vercels edge-nätverk
