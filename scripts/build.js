// Genera la web estática en dist/ a partir de data/mensual.json y data/diario.json
const fs = require('fs');
const path = require('path');
const cfg = require('../config');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const mensual = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mensual.json'), 'utf8')).filter((d) => d.mes >= '1999-01');
const diario = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/diario.json'), 'utf8'));

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ---------- utilidades ----------
const num = (v, d = 3) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 3) => `${num(v, d)} %`;
const eur = (v) => `${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const nombreMes = (m) => `${MESES[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
const nombreMesCap = (m) => nombreMes(m).replace(/^./, (c) => c.toUpperCase());
const slug = (m) => `euribor-${MESES[+m.slice(5) - 1]}-${m.slice(0, 4)}`;
const fechaLarga = (f) => { const [y, mo, d] = f.split('-'); return `${+d} de ${MESES[+mo - 1]} de ${y}`; };
const valorMes = (m) => (mensual.find((d) => d.mes === m) || {}).valor;
const mesMenos = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 - n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function variacion(a, b) {
  if (a == null || b == null) return '<span>—</span>';
  const d = a - b;
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
  const flecha = d > 0 ? '▲' : d < 0 ? '▼' : '=';
  return `<span class="${cls}">${flecha} ${d > 0 ? '+' : ''}${num(d)} p.p.</span>`;
}
function cuota(capital, tipoAnual, anios) {
  const i = tipoAnual / 100 / 12, n = anios * 12;
  return i === 0 ? capital / n : (capital * i) / (1 - Math.pow(1 + i, -n));
}

function grafico(datos) {
  const W = 800, H = 260, p = { l: 44, r: 12, t: 12, b: 28 };
  const vals = datos.map((d) => d.valor);
  let min = Math.floor(Math.min(...vals) * 2) / 2, max = Math.ceil(Math.max(...vals) * 2) / 2;
  if (max === min) max += 0.5;
  const x = (i) => p.l + (i * (W - p.l - p.r)) / (datos.length - 1);
  const y = (v) => p.t + ((max - v) * (H - p.t - p.b)) / (max - min);
  const pts = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join(' ');
  let g = '';
  const paso = (max - min) > 3 ? 1 : 0.5;
  for (let v = min; v <= max + 1e-9; v += paso) {
    g += `<line class="grid" x1="${p.l}" x2="${W - p.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${p.l - 6}" y="${y(v) + 4}" text-anchor="end">${num(v, 1)}%</text>`;
  }
  const cada = Math.ceil(datos.length / 8);
  datos.forEach((d, i) => {
    if (i % cada === 0 || i === datos.length - 1) g += `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="${i === datos.length - 1 ? 'end' : 'middle'}">${ABR[+d.mes.slice(5) - 1]} ${d.mes.slice(2, 4)}</text>`;
  });
  const area = `${p.l},${H - p.b} ${pts} ${x(datos.length - 1)},${H - p.b}`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del Euríbor">${g}<polygon class="area" points="${area}"/><polyline class="linea" points="${pts}"/></svg></div>`;
}

// Gráfico con filtros de fechas; `tabla` es el selector del <tbody> que se filtra a la vez
function explorador({ titulo, rangoInicial, tabla, datosIniciales }) {
  const opciones = [[12, '1 año'], [36, '3 años'], [60, '5 años'], [120, '10 años'], [0, 'Todo']];
  return `<div class="card" data-explorador data-rango="${rangoInicial}" data-tabla="${tabla}">
<h2>${titulo}</h2>
<div class="filtros">
  <div class="rangos">${opciones.map(([m, t]) => `<button type="button" data-meses="${m}">${t}</button>`).join('')}</div>
  <div class="fechas"><label>Desde <input type="month" class="f-desde"></label><label>Hasta <input type="month" class="f-hasta"></label></div>
</div>
<p class="f-titulo label"></p>
${grafico(datosIniciales)}
<div class="resumen stats4"></div>
</div>`;
}
const scriptsExplorador = () => `<script>window.EURIBOR=${JSON.stringify(mensual)};</script><script src="/explorador.js" defer></script>`;

const anuncio = () => cfg.adsenseClient
  ? `<div class="ad"><ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.adsenseClient}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`
  : '';
const afiliado = () => cfg.affiliate.url
  ? `<div class="cta"><p>${cfg.affiliate.titulo}</p><a href="${cfg.affiliate.url}" rel="sponsored noopener" target="_blank">${cfg.affiliate.boton}</a></div>`
  : '';

function layout({ title, description, ruta, body, extraHead = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${cfg.siteUrl}${ruta}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>€</text></svg>">
<link rel="stylesheet" href="/styles.css">
${cfg.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.adsenseClient}" crossorigin="anonymous"></script>` : ''}
${extraHead}
</head>
<body>
<header class="top"><div class="wrap">
<a class="logo" href="/">Euríbor<span>Claro</span></a>
<nav><a href="/">Hoy</a><a href="/calculadora/">Calculadora</a><a href="/historico/">Histórico</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="wrap">
<p>Datos: media mensual oficial del Euríbor a 12 meses publicada por el Banco de España (BOE). Euribor® es una marca registrada de EMMI; esta web no está afiliada a EMMI.
Información orientativa, no constituye asesoramiento financiero.</p>
<p><a href="/aviso-legal/">Aviso legal</a> · <a href="/privacidad/">Privacidad y cookies</a> · © ${new Date().getFullYear()} ${cfg.siteName}</p>
</footer>
</body>
</html>`;
}

const calculadoraHTML = (eurAnterior, eurNuevo) => `
<div class="card" id="calculadora">
<h2>¿Cuánto cambia tu cuota en la próxima revisión?</h2>
<div class="calc">
  <div><label for="c-capital">Capital pendiente (€)</label><input id="c-capital" type="number" value="150000" step="1000" min="0"></div>
  <div><label for="c-anios">Años que quedan</label><input id="c-anios" type="number" value="25" min="1" max="40"></div>
  <div><label for="c-dif">Diferencial (%)</label><input id="c-dif" type="number" value="0.99" step="0.01"></div>
  <div><label for="c-ant">Euríbor anterior (%)</label><input id="c-ant" type="number" value="${eurAnterior.toFixed(3)}" step="0.001"></div>
  <div><label for="c-nue">Euríbor nuevo (%)</label><input id="c-nue" type="number" value="${eurNuevo.toFixed(3)}" step="0.001"></div>
</div>
<div class="resultado" id="c-res" aria-live="polite"></div>
<p class="nota">Cálculo con sistema de amortización francés. "Euríbor anterior" es el de tu última revisión; por defecto, el de hace 12 meses (revisión anual).</p>
</div>
<script>
(function(){
  const $=id=>document.getElementById(id);
  const f=v=>v.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const cuota=(C,t,a)=>{const i=t/100/12,n=a*12;return i===0?C/n:C*i/(1-Math.pow(1+i,-n));};
  function calc(){
    const C=+$('c-capital').value,a=+$('c-anios').value,d=+$('c-dif').value,ant=+$('c-ant').value,nue=+$('c-nue').value;
    if(!(C>0&&a>0)){$('c-res').textContent='Introduce capital y años.';return;}
    const q1=cuota(C,ant+d,a),q2=cuota(C,nue+d,a),dif=q2-q1;
    const txt=dif>0.005?'<span class="up">sube '+f(dif)+' al mes</span> ('+f(dif*12)+' al año)':dif<-0.005?'<span class="down">baja '+f(-dif)+' al mes</span> ('+f(-dif*12)+' al año)':'se queda igual';
    $('c-res').innerHTML='Tu cuota pasa de '+f(q1)+' a <b>'+f(q2)+'</b>: '+txt+'.';
  }
  document.querySelectorAll('.calc input').forEach(i=>i.addEventListener('input',calc));calc();
})();
</script>`;

function escribir(ruta, html) {
  const dir = path.join(DIST, ruta);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// ---------- construcción ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(DIST, 'styles.css'));
fs.copyFileSync(path.join(ROOT, 'src/explorador.js'), path.join(DIST, 'explorador.js'));

const ult = mensual[mensual.length - 1];
const ant = valorMes(mesMenos(ult.mes, 1));
const hace1 = valorMes(mesMenos(ult.mes, 12));
const rutas = ['/', '/calculadora/', '/historico/', '/aviso-legal/', '/privacidad/'];

// Diario: último valor y media provisional del mes en curso (meses posteriores al último oficial)
const ultDiario = diario[diario.length - 1];
const mesCurso = mesMenos(ult.mes, -1);
const diasCurso = diario.filter((d) => d.fecha.startsWith(mesCurso));
const mediaCurso = diasCurso.length ? diasCurso.reduce((s, d) => s + d.valor, 0) / diasCurso.length : null;

const bloqueDiario = ultDiario ? `
<div class="stat"><span class="label">Euríbor diario (${fechaLarga(ultDiario.fecha)})</span><b>${pct(ultDiario.valor)}</b></div>
${mediaCurso != null ? `<div class="stat"><span class="label">Media provisional de ${nombreMes(mesCurso)} (${diasCurso.length} días)</span><b>${pct(mediaCurso)}</b> ${variacion(mediaCurso, ult.valor)}</div>` : ''}` : '';

const faqs = [
  ['¿Qué es el Euríbor?', 'Es el tipo de interés medio al que los bancos de la zona euro se prestan dinero entre sí. El Euríbor a 12 meses es el índice de referencia de la mayoría de hipotecas variables en España.'],
  ['¿Qué Euríbor se aplica a mi hipoteca?', 'Normalmente la media mensual oficial del Euríbor a 12 meses que publica el Banco de España, del mes que indique tu escritura (habitualmente uno o dos meses antes de la fecha de revisión).'],
  [`¿Cuánto está el Euríbor en ${nombreMes(ult.mes)}?`, `La media oficial del Euríbor a 12 meses en ${nombreMes(ult.mes)} ha sido del ${pct(ult.valor)}.`],
  ['¿Cómo calculo cuánto me sube la hipoteca?', 'Usa nuestra calculadora: introduce capital pendiente, años restantes, diferencial y el Euríbor de tu última revisión, y verás la nueva cuota al momento.'],
];
const faqLD = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})}</script>`;

// Portada
escribir('/', layout({
  title: `Euríbor hoy: ${pct(ult.valor)} en ${nombreMes(ult.mes)} | ${cfg.siteName}`,
  description: `El Euríbor a 12 meses cerró ${nombreMes(ult.mes)} en ${pct(ult.valor)}. Consulta su evolución mes a mes y calcula cuánto cambia tu hipoteca.`,
  ruta: '/',
  extraHead: faqLD + scriptsExplorador(),
  body: `
<h1>Euríbor hoy</h1>
<p class="sub">Euríbor a 12 meses, el índice de la mayoría de hipotecas variables.</p>
<div class="hero">
  <div class="card">
    <span class="label">Media oficial de ${nombreMes(ult.mes)}</span>
    <div class="big">${pct(ult.valor)}</div>
    <div>${variacion(ult.valor, ant)} respecto al mes anterior</div>
  </div>
  <div class="card stats">
    <div class="stat"><span class="label">Mes anterior</span><b>${ant != null ? pct(ant) : '—'}</b></div>
    <div class="stat"><span class="label">Hace un año</span><b>${hace1 != null ? pct(hace1) : '—'}</b> ${variacion(ult.valor, hace1)}</div>
    ${bloqueDiario}
  </div>
</div>
${afiliado()}
${explorador({ titulo: 'Evolución del Euríbor', rangoInicial: 36, tabla: '#tabla-mensual', datosIniciales: mensual.slice(-36) })}
${calculadoraHTML(hace1 ?? ult.valor, ult.valor)}
${anuncio()}
<div class="card"><h2>Euríbor mes a mes</h2>
<p class="nota">La tabla muestra el periodo elegido en el gráfico.</p>
<div class="tabla-scroll"><table><thead><tr><th>Mes</th><th class="n">Euríbor 12M</th><th class="n">Variación</th></tr></thead><tbody id="tabla-mensual" data-tipo="mensual">
${mensual.slice(-36).reverse().map((d) => `<tr><td><a href="/${slug(d.mes)}/">${nombreMesCap(d.mes)}</a></td><td class="n">${pct(d.valor)}</td><td class="n">${variacion(d.valor, valorMes(mesMenos(d.mes, 1)))}</td></tr>`).join('')}
</tbody></table></div>
<p><a href="/historico/">Ver histórico completo desde 1999 →</a></p></div>
<div class="card"><h2>Preguntas frecuentes</h2>
${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
</div>`,
}));

// Calculadora
escribir('/calculadora/', layout({
  title: `Calculadora de revisión de hipoteca con el Euríbor | ${cfg.siteName}`,
  description: `Calcula cuánto sube o baja tu cuota hipotecaria con el último Euríbor (${pct(ult.valor)}, ${nombreMes(ult.mes)}).`,
  ruta: '/calculadora/',
  body: `<h1>Calculadora de revisión de hipoteca</h1>
<p class="sub">Último Euríbor oficial: <b>${pct(ult.valor)}</b> (${nombreMes(ult.mes)}).</p>
${calculadoraHTML(hace1 ?? ult.valor, ult.valor)}${afiliado()}${anuncio()}`,
}));

// Histórico por años
const anios = [...new Set(mensual.map((d) => d.mes.slice(0, 4)))].reverse();
escribir('/historico/', layout({
  title: `Histórico del Euríbor desde 1999, mes a mes | ${cfg.siteName}`,
  description: 'Tabla completa con el Euríbor a 12 meses de cada mes desde 1999 y su media anual.',
  ruta: '/historico/',
  extraHead: scriptsExplorador(),
  body: `<h1>Histórico del Euríbor</h1>
<p class="sub">Media mensual oficial del Euríbor a 12 meses desde 1999.</p>
${explorador({ titulo: 'Evolución histórica', rangoInicial: 0, tabla: '#tabla-anual', datosIniciales: mensual })}
${anuncio()}
<div class="card" style="overflow-x:auto"><table><thead><tr><th>Año</th>${ABR.map((a) => `<th class="n">${a}</th>`).join('')}<th class="n">Media</th></tr></thead><tbody id="tabla-anual" data-tipo="anual">
${anios.map((y) => {
    const del = mensual.filter((d) => d.mes.startsWith(y));
    const celdas = ABR.map((_, i) => { const m = `${y}-${String(i + 1).padStart(2, '0')}`; const v = valorMes(m); return `<td class="n">${v != null ? `<a href="/${slug(m)}/">${num(v)}</a>` : ''}</td>`; }).join('');
    return `<tr><th>${y}</th>${celdas}<td class="n"><b>${num(del.reduce((s, d) => s + d.valor, 0) / del.length)}</b></td></tr>`;
  }).join('')}
</tbody></table></div>`,
}));

// Una página por mes (SEO: "euríbor septiembre 2026")
mensual.forEach((d, i) => {
  const prev = mensual[i - 1], next = mensual[i + 1];
  const v12 = valorMes(mesMenos(d.mes, 12));
  const q = cuota(150000, d.valor + 0.99, 25), q12 = v12 != null ? cuota(150000, v12 + 0.99, 25) : null;
  const ejemplo = q12 != null ? `<p>Para una hipoteca de 150.000 € a 25 años con diferencial del 0,99 % que se revise con este Euríbor, la cuota sería de <b>${eur(q)}</b> al mes, frente a ${eur(q12)} con el Euríbor de un año antes: <b class="${q > q12 ? 'up' : 'down'}">${q > q12 ? '+' : ''}${eur(q - q12)} al mes</b> (${q > q12 ? '+' : ''}${eur((q - q12) * 12)} al año).</p>` : '';
  rutas.push(`/${slug(d.mes)}/`);
  escribir(`/${slug(d.mes)}/`, layout({
    title: `Euríbor ${nombreMes(d.mes)}: ${pct(d.valor)} | ${cfg.siteName}`,
    description: `El Euríbor a 12 meses de ${nombreMes(d.mes)} fue del ${pct(d.valor)}. Variación mensual, anual y efecto en tu hipoteca.`,
    ruta: `/${slug(d.mes)}/`,
    body: `<h1>Euríbor ${nombreMes(d.mes)}</h1>
<div class="hero">
  <div class="card"><span class="label">Media oficial Euríbor 12M</span><div class="big">${pct(d.valor)}</div><div>${variacion(d.valor, prev && prev.valor)} respecto a ${prev ? nombreMes(prev.mes) : 'el mes anterior'}</div></div>
  <div class="card stats">
    <div class="stat"><span class="label">${prev ? nombreMesCap(prev.mes) : 'Mes anterior'}</span><b>${prev ? pct(prev.valor) : '—'}</b></div>
    <div class="stat"><span class="label">Hace un año</span><b>${v12 != null ? pct(v12) : '—'}</b> ${variacion(d.valor, v12)}</div>
  </div>
</div>
<div class="card"><h2>¿Cómo afecta a tu hipoteca?</h2>${ejemplo}<p><a href="/calculadora/">Calcula tu caso exacto →</a></p></div>
${afiliado()}${anuncio()}
<p>${prev ? `<a href="/${slug(prev.mes)}/">← ${nombreMesCap(prev.mes)}</a>` : ''} ${next ? ` · <a href="/${slug(next.mes)}/">${nombreMesCap(next.mes)} →</a>` : ''} · <a href="/historico/">Histórico</a></p>`,
  }));
});

// Legales (plantillas: revisar con tus datos)
escribir('/aviso-legal/', layout({
  title: `Aviso legal | ${cfg.siteName}`, description: 'Aviso legal', ruta: '/aviso-legal/',
  body: `<h1>Aviso legal</h1><div class="card">
<p>Titular: ${cfg.owner.nombre} · NIF: ${cfg.owner.nif} · Contacto: ${cfg.owner.email}</p>
<p>La información de esta web es orientativa y no constituye asesoramiento financiero. Los datos del Euríbor proceden de la publicación oficial del Banco de España en el BOE. Euribor® es una marca registrada de The European Money Markets Institute (EMMI); esta web no está afiliada ni patrocinada por EMMI.</p>
<p>Algunos enlaces pueden ser de afiliado: si contratas un servicio a través de ellos, podemos recibir una comisión sin coste para ti.</p></div>`,
}));
escribir('/privacidad/', layout({
  title: `Privacidad y cookies | ${cfg.siteName}`, description: 'Política de privacidad y cookies', ruta: '/privacidad/',
  body: `<h1>Privacidad y cookies</h1><div class="card">
<p>Responsable: ${cfg.owner.nombre} (${cfg.owner.email}). Esta web no recoge datos personales mediante formularios. La calculadora funciona en tu navegador y no envía datos.</p>
<p>Usamos Google AdSense para mostrar publicidad. Google y sus socios pueden usar cookies para personalizar anuncios; puedes gestionar tu consentimiento en el aviso de cookies y en <a href="https://adssettings.google.com">adssettings.google.com</a>. Más información: <a href="https://policies.google.com/technologies/ads">policies.google.com/technologies/ads</a>.</p>
<p>Puedes ejercer tus derechos de acceso, rectificación y supresión escribiendo a ${cfg.owner.email}.</p></div>`,
}));

// SEO
const hoy = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rutas.map((r) => `<url><loc>${cfg.siteUrl}${r}</loc><lastmod>${hoy}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);
if (cfg.adsenseClient) fs.writeFileSync(path.join(DIST, 'ads.txt'), `google.com, ${cfg.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);

console.log(`Web generada en dist/: ${rutas.length} páginas. Último Euríbor ${ult.mes} = ${ult.valor}%`);
