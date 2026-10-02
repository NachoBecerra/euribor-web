# Euríbor Claro

Web estática del Euríbor a 12 meses: valor oficial, histórico desde 1999, una página por mes y calculadora de revisión de hipoteca. Coste: 0 €.

## Uso diario

```
npm run diario -- 2.951            # añade el Euríbor diario de ayer
npm run diario -- 2026-10-01 2.951 # o de una fecha concreta
git commit -am "diario" && git push
```

La media mensual oficial se descarga sola cada día del Banco de España.

## Ver en local

```
npm run all     # descarga datos y genera dist/
npm run serve   # abre http://localhost:3000
```

## Publicar gratis (una sola vez)

1. Crea un repositorio en GitHub y sube esta carpeta.
2. En el repo: Settings → Pages → Source: **GitHub Actions**.
3. Listo: se publica en `https://TU-USUARIO.github.io/REPO/` y se actualiza cada día.
4. Dominio propio (opcional, ~10 €/año): Settings → Pages → Custom domain, y cambia `siteUrl` en `config.js`.

> Sin dominio propio, la web vive en una subcarpeta y las rutas `/…` fallan: usa un dominio propio o un repo llamado `TU-USUARIO.github.io`.

## Ganar dinero

- **AdSense**: solicítalo cuando tengas la web publicada con dominio. Al aprobarte, pon tu `ca-pub-…` en `config.js` → los anuncios aparecen solos. Activa el mensaje de consentimiento (CMP) de Google en AdSense → Privacidad y mensajes.
- **Afiliación hipotecaria**: date de alta en un programa de afiliados de hipotecas y pega el enlace en `affiliate.url` de `config.js`.
- **Search Console**: da de alta la web y envía `/sitemap.xml`.
