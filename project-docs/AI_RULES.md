# AI Rules – minportfölj.se

## Filläsning
- Läs **endast** relevanta filer — aldrig hela projektet
- Läs `DESIGN.md` alltid vid UI-ändringar, nya komponenter eller designbeslut
- Läs `PRODUCT.md` vid produktbeslut, ny funktionalitet eller copy-ändringar

## Kodstruktur
- Ingen duplicerad logik — reuse före ny implementation
- Business logic ska ligga i `/lib`
- UI-komponenter ska vara reusable och innehålla **ingen** beräkningslogik
- Rör inte orelaterade filer
- Refactor före workaround

## Språk och typer
- TypeScript är **inte** aktivt — projektet är ren JS/JSX trots att @types/react finns
- Mobil först (ännu ej implementerat — se Fas 3 i Roadmap)

## Förbjudet i ny kod
- `buildSeries` — legacy, används bara av `FundDetailsModal` (ska fasas ut)
- `getYahooRef` — stub för bakåtkompatibilitet (ska fasas ut)
- `MONTH_SECS` — finns i `utils.js` men används inte för spanberäkning

## Kritiska invarianter
- `endTs` är alltid `latestNavTs` — aldrig `Date.now()`
- Inner join i `blendPortfolio` får **aldrig** ersättas med index-baserad blandning
- Avkastning = sista värdet i serien − 100 (aldrig separat beräkning)
- Tooltip vid slutpunkten använder `returnValue` direkt — garanterar att tooltip och legend alltid stämmer överens
- Spanberäkning: alltid `getDisplayRange()`, aldrig dagapproximation
