// Descarga el Euríbor mensual oficial del Banco de España y lo guarda en data/mensual.json
const fs = require('fs');
const path = require('path');

const URL = 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/be1901.csv';
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const COLUMNA_12M = 5; // "Euríbor. A 12 meses"

const parseLine = (l) => (l.match(/("[^"]*"|[^,]*)(,|$)/g) || []).map((s) => s.replace(/,$/, '').replace(/^"|"$/g, ''));

async function main() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Banco de España respondió ${res.status}`);
  const csv = new TextDecoder('latin1').decode(await res.arrayBuffer());
  const lines = csv.split(/\r?\n/);

  const desc = parseLine(lines.find((l) => l.startsWith('"DESCRIPCI')))[COLUMNA_12M];
  if (!/12 meses/.test(desc)) throw new Error(`La columna ${COLUMNA_12M} ya no es el Euríbor 12M: "${desc}"`);

  const datos = [];
  for (const l of lines) {
    const m = l.match(/^"([A-Z]{3}) (\d{4})"/);
    if (!m) continue;
    const v = parseFloat(parseLine(l)[COLUMNA_12M]);
    if (Number.isNaN(v)) continue;
    datos.push({ mes: `${m[2]}-${String(MESES.indexOf(m[1]) + 1).padStart(2, '0')}`, valor: v });
  }
  if (datos.length < 100) throw new Error('Muy pocos datos, algo ha cambiado en el CSV');

  fs.writeFileSync(path.join(__dirname, '../data/mensual.json'), JSON.stringify(datos, null, 1));
  const u = datos[datos.length - 1];
  console.log(`OK: ${datos.length} meses, último ${u.mes} = ${u.valor}%`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
