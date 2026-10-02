// Filtros de fechas: actualiza gráfico, resumen y tabla según el periodo elegido.
(function () {
  const DATOS = window.EURIBOR || [];
  if (!DATOS.length) return;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const num = (v, d = 3) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v) => num(v) + ' %';
  const nombre = (m) => MESES[+m.slice(5) - 1] + ' ' + m.slice(0, 4);
  const nombreCap = (m) => nombre(m).replace(/^./, (c) => c.toUpperCase());
  const slug = (m) => 'euribor-' + MESES[+m.slice(5) - 1] + '-' + m.slice(0, 4);
  const valor = (m) => { const d = DATOS.find((x) => x.mes === m); return d ? d.valor : null; };
  const mesMenos = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 - n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const variacion = (a, b) => {
    if (a == null || b == null) return '<span>—</span>';
    const d = a - b, cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (d > 0 ? '▲ +' : d < 0 ? '▼ ' : '= ') + num(d) + ' p.p.</span>';
  };
  const NS = 'http://www.w3.org/2000/svg';

  function dibujar(cont, datos) {
    const W = 800, H = 260, p = { l: 44, r: 12, t: 14, b: 28 };
    const vals = datos.map((d) => d.valor);
    let min = Math.floor(Math.min(...vals) * 2) / 2, max = Math.ceil(Math.max(...vals) * 2) / 2;
    if (max === min) max += 0.5;
    const n = Math.max(datos.length - 1, 1);
    const x = (i) => p.l + (i * (W - p.l - p.r)) / n;
    const y = (v) => p.t + ((max - v) * (H - p.t - p.b)) / (max - min);
    const pts = datos.map((d, i) => x(i).toFixed(1) + ',' + y(d.valor).toFixed(1)).join(' ');
    let g = '';
    const paso = max - min > 3 ? 1 : 0.5;
    for (let v = min; v <= max + 1e-9; v += paso) {
      g += '<line class="grid" x1="' + p.l + '" x2="' + (W - p.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (p.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + num(v, 1) + '%</text>';
    }
    const largo = datos.length > 60;
    const cada = Math.ceil(datos.length / 8);
    datos.forEach((d, i) => {
      const enero = d.mes.endsWith('-01');
      const pinta = largo ? enero && (+d.mes.slice(0, 4)) % Math.max(1, Math.round(datos.length / 96)) === 0 : i % cada === 0 || i === datos.length - 1;
      if (pinta) g += '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="' + (i === datos.length - 1 ? 'end' : 'middle') + '">' + (largo ? d.mes.slice(0, 4) : ABR[+d.mes.slice(5) - 1] + ' ' + d.mes.slice(2, 4)) + '</text>';
    });
    const area = p.l + ',' + (H - p.b) + ' ' + pts + ' ' + x(datos.length - 1) + ',' + (H - p.b);
    cont.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución del Euríbor">' + g +
      '<polygon class="area" points="' + area + '"/><polyline class="linea" points="' + pts + '"/>' +
      '<g class="cursor" style="display:none"><line class="cursor-linea" y1="' + p.t + '" y2="' + (H - p.b) + '"/><circle r="5" class="cursor-punto"/>' +
      '<rect class="cursor-caja" rx="6" height="40" width="132"/><text class="cursor-mes"/><text class="cursor-valor"/></g>' +
      '<rect x="' + p.l + '" y="0" width="' + (W - p.l - p.r) + '" height="' + H + '" fill="transparent" class="captura"/></svg>';

    const svg = cont.querySelector('svg'), cur = svg.querySelector('.cursor');
    const mover = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(datos.length - 1, Math.round(((px - p.l) / (W - p.l - p.r)) * n)));
      const d = datos[i], cx = x(i), cy = y(d.valor);
      cur.style.display = '';
      cur.querySelector('.cursor-linea').setAttribute('x1', cx);
      cur.querySelector('.cursor-linea').setAttribute('x2', cx);
      const c = cur.querySelector('.cursor-punto'); c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      const bx = cx + 140 > W ? cx - 142 : cx + 10, by = Math.max(p.t, Math.min(cy - 20, H - p.b - 40));
      const caja = cur.querySelector('.cursor-caja'); caja.setAttribute('x', bx); caja.setAttribute('y', by);
      const tm = cur.querySelector('.cursor-mes'); tm.setAttribute('x', bx + 10); tm.setAttribute('y', by + 16); tm.textContent = nombreCap(d.mes);
      const tv = cur.querySelector('.cursor-valor'); tv.setAttribute('x', bx + 10); tv.setAttribute('y', by + 33); tv.textContent = pct(d.valor);
    };
    const cap = svg.querySelector('.captura');
    cap.addEventListener('pointermove', mover);
    cap.addEventListener('pointerdown', mover);
    cap.addEventListener('pointerleave', () => { cur.style.display = 'none'; });
  }

  function resumen(cont, datos) {
    const vals = datos.map((d) => d.valor);
    const iMax = vals.indexOf(Math.max(...vals)), iMin = vals.indexOf(Math.min(...vals));
    const media = vals.reduce((s, v) => s + v, 0) / vals.length;
    cont.innerHTML =
      '<div class="stat"><span class="label">Variación en el periodo</span><b>' + variacion(vals[vals.length - 1], vals[0]) + '</b></div>' +
      '<div class="stat"><span class="label">Media</span><b>' + pct(media) + '</b></div>' +
      '<div class="stat"><span class="label">Máximo (' + nombre(datos[iMax].mes) + ')</span><b>' + pct(vals[iMax]) + '</b></div>' +
      '<div class="stat"><span class="label">Mínimo (' + nombre(datos[iMin].mes) + ')</span><b>' + pct(vals[iMin]) + '</b></div>';
  }

  function tablaMensual(tbody, datos) {
    tbody.innerHTML = datos.slice().reverse().map((d) =>
      '<tr><td><a href="/' + slug(d.mes) + '/">' + nombreCap(d.mes) + '</a></td><td class="n">' + pct(d.valor) + '</td><td class="n">' + variacion(d.valor, valor(mesMenos(d.mes, 1))) + '</td></tr>').join('');
  }

  function tablaAnual(tbody, datos) {
    const anios = [...new Set(datos.map((d) => d.mes.slice(0, 4)))].reverse();
    const dentro = new Set(datos.map((d) => d.mes));
    tbody.innerHTML = anios.map((y) => {
      const del = datos.filter((d) => d.mes.startsWith(y));
      const celdas = ABR.map((_, i) => {
        const m = y + '-' + String(i + 1).padStart(2, '0'), v = valor(m);
        return '<td class="n">' + (v != null && dentro.has(m) ? '<a href="/' + slug(m) + '/">' + num(v) + '</a>' : '') + '</td>';
      }).join('');
      return '<tr><th>' + y + '</th>' + celdas + '<td class="n"><b>' + num(del.reduce((s, d) => s + d.valor, 0) / del.length) + '</b></td></tr>';
    }).join('');
  }

  document.querySelectorAll('[data-explorador]').forEach((root) => {
    const desde = root.querySelector('.f-desde'), hasta = root.querySelector('.f-hasta');
    const botones = root.querySelectorAll('[data-meses]');
    const tabla = document.querySelector(root.dataset.tabla);
    const primero = DATOS[0].mes, ultimo = DATOS[DATOS.length - 1].mes;
    desde.min = hasta.min = primero; desde.max = hasta.max = ultimo;

    function aplicar() {
      let a = desde.value || primero, b = hasta.value || ultimo;
      if (a > b) [a, b] = [b, a];
      const datos = DATOS.filter((d) => d.mes >= a && d.mes <= b);
      if (datos.length < 2) return;
      dibujar(root.querySelector('.chart'), datos);
      resumen(root.querySelector('.resumen'), datos);
      root.querySelector('.f-titulo').textContent = nombreCap(datos[0].mes) + ' – ' + nombre(datos[datos.length - 1].mes) + ' (' + datos.length + ' meses)';
      if (tabla) (tabla.dataset.tipo === 'anual' ? tablaAnual : tablaMensual)(tabla, datos);
    }
    function rango(meses) {
      botones.forEach((b) => b.classList.toggle('activo', +b.dataset.meses === meses));
      hasta.value = ultimo;
      desde.value = meses ? (DATOS[Math.max(0, DATOS.length - meses)].mes) : primero;
      aplicar();
    }
    botones.forEach((b) => b.addEventListener('click', () => rango(+b.dataset.meses)));
    [desde, hasta].forEach((inp) => inp.addEventListener('change', () => { botones.forEach((b) => b.classList.remove('activo')); aplicar(); }));
    rango(+root.dataset.rango);
  });
})();
