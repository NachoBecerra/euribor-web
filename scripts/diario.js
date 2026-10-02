// Añade el valor diario del Euríbor 12M.
// Uso: npm run diario -- 2.951              (fecha = ayer)
//      npm run diario -- 2026-10-01 2.951
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../data/diario.json');

const args = process.argv.slice(2);
let fecha, valor;
if (args.length === 1) {
  const d = new Date(Date.now() - 864e5);
  fecha = d.toISOString().slice(0, 10);
  valor = args[0];
} else {
  [fecha, valor] = args;
}
valor = parseFloat(String(valor).replace(',', '.'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || Number.isNaN(valor)) {
  console.error('Uso: npm run diario -- [AAAA-MM-DD] 2.951');
  process.exit(1);
}

const datos = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const i = datos.findIndex((d) => d.fecha === fecha);
if (i >= 0) datos[i].valor = valor; else datos.push({ fecha, valor });
datos.sort((a, b) => a.fecha.localeCompare(b.fecha));
fs.writeFileSync(file, JSON.stringify(datos, null, 1));
console.log(`Guardado ${fecha} = ${valor}%`);
