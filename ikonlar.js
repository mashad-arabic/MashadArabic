// Sitede kullanılan bütün görseller burada SVG olarak çizilir (emoji yok).
// Hepsi 64×64'lük bir alana çizilir ve bulundukları kutuya göre ölçeklenir.

const svg = (ic, etiket = "") =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img"${etiket ? ` aria-label="${etiket}"` : ' aria-hidden="true"'}>${ic}</svg>`;

// Beş köşeli yıldız (merkez 32,32 · dış yarıçap 20 · iç yarıçap 8)
const YILDIZ_NOKTALARI =
  "32,12 36.7,25.5 51,25.8 39.6,34.5 43.8,48.2 32,40 20.2,48.2 24.4,34.5 13,25.8 27.3,25.5";

// ---------- Küçük simgeler ----------
const IKONLAR = {
  yildiz: svg(`
    <polygon points="${YILDIZ_NOKTALARI}" transform="translate(32 32) scale(1.45) translate(-32 -32)"
      fill="#f2c94c" stroke="#d9a520" stroke-width="2" stroke-linejoin="round"/>`),

  alev: svg(`
    <path d="M32 4 C42 16 50 26 50 38 C50 50 42 58 32 58 C22 58 14 50 14 38
             C14 28 20 20 26 14 C26 24 30 28 34 30 C36 22 36 12 32 4 Z" fill="#f3722c"/>
    <path d="M32 30 C38 36 42 41 42 46 C42 52 37 56 32 56 C27 56 22 52 22 46
             C22 41 26 36 29 34 C29 38 31 40 33 40 C34 37 34 33 32 30 Z" fill="#f9c74f"/>`),

  takvim: svg(`
    <rect x="8" y="12" width="48" height="44" rx="7" fill="#e8f1ef"/>
    <path d="M8 19 a7 7 0 0 1 7 -7 h34 a7 7 0 0 1 7 7 v7 H8 Z" fill="#e5484d"/>
    <rect x="18" y="6" width="5" height="12" rx="2.5" fill="#5c6f6b"/>
    <rect x="41" y="6" width="5" height="12" rx="2.5" fill="#5c6f6b"/>
    <g fill="#9fb8b2">
      <rect x="15" y="31" width="8" height="7" rx="2"/><rect x="28" y="31" width="8" height="7" rx="2"/>
      <rect x="41" y="31" width="8" height="7" rx="2"/><rect x="15" y="43" width="8" height="7" rx="2"/>
      <rect x="28" y="43" width="8" height="7" rx="2"/>
    </g>
    <rect x="41" y="43" width="8" height="7" rx="2" fill="#2fbf71"/>`),

  kamera: svg(`
    <path d="M10 22 a6 6 0 0 1 6 -6 h7 l4 -6 h10 l4 6 h7 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 H16 a6 6 0 0 1 -6 -6 Z"
      fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/>
    <circle cx="32" cy="33" r="9" fill="none" stroke="currentColor" stroke-width="4.5"/>`)
};

// ---------- Avatarlar ----------
// Her avatar: renkli bir daire zemin + üstüne çizilmiş figür.
const AVATARLAR = [
  {
    id: "deve", ad: "Deve", zemin: "#f4d58d",
    ciz: `
      <ellipse cx="32" cy="55" rx="22" ry="3" fill="#d4a95a"/>
      <path d="M13 40 Q15 25 23 29 Q28 18 34 29 Q38 22 42 33 L44 41 Q30 45 13 41 Z" fill="#a0632d"/>
      <path d="M41 36 L46 22 Q47 17 52 17 L56 19 L55 22 L51 23 L47 37 Z" fill="#a0632d"/>
      <circle cx="52" cy="19.5" r="1" fill="#2b1a0c"/>
      <g fill="#8a5224">
        <rect x="16" y="39" width="3.5" height="15" rx="1.5"/><rect x="22" y="40" width="3.5" height="14" rx="1.5"/>
        <rect x="35" y="40" width="3.5" height="14" rx="1.5"/><rect x="40" y="39" width="3.5" height="15" rx="1.5"/>
      </g>
      <path d="M13 40 Q9 44 11 48" stroke="#8a5224" stroke-width="2" fill="none" stroke-linecap="round"/>`
  },
  {
    id: "kartal", ad: "Kartal", zemin: "#8ecae6",
    ciz: `
      <path d="M6 30 Q18 16 32 30 Q46 16 58 30 Q46 27 38 37 L26 37 Q18 27 6 30 Z" fill="#5b3a1e"/>
      <path d="M12 29 Q20 24 27 30 M37 30 Q44 24 52 29" stroke="#3f2713" stroke-width="1.5" fill="none"/>
      <ellipse cx="32" cy="40" rx="7" ry="11" fill="#6b4423"/>
      <path d="M27 50 L32 58 L37 50 Z" fill="#5b3a1e"/>
      <circle cx="32" cy="25" r="7" fill="#ffffff"/>
      <path d="M32 25 L40 27 L34 30 Z" fill="#f2c94c"/>
      <circle cx="31" cy="23.5" r="1.3" fill="#1b1b1b"/>`
  },
  {
    id: "hilal", ad: "Hilal", zemin: "#1d3557",
    ciz: `
      <circle cx="29" cy="33" r="17" fill="#f2c94c"/>
      <circle cx="36" cy="28" r="15" fill="#1d3557"/>
      <polygon points="${YILDIZ_NOKTALARI}" fill="#f2c94c"
        transform="translate(46 40) scale(0.38) translate(-32 -32)"/>
      <g fill="#a8c5e8"><circle cx="16" cy="14" r="1.2"/><circle cx="50" cy="16" r="1"/><circle cx="12" cy="44" r="1"/></g>`
  },
  {
    id: "yildiz", ad: "Yıldız", zemin: "#5a189a",
    ciz: `
      <polygon points="${YILDIZ_NOKTALARI}" fill="#f2c94c" stroke="#ffe08a" stroke-width="1.5" stroke-linejoin="round"
        transform="translate(32 33) scale(1.1) translate(-32 -32)"/>
      <g fill="#c8a6f0"><circle cx="13" cy="16" r="1.4"/><circle cx="52" cy="13" r="1.1"/>
        <circle cx="50" cy="50" r="1.3"/><circle cx="14" cy="48" r="1"/></g>`
  },
  {
    id: "hurma", ad: "Hurma ağacı", zemin: "#f4a261",
    ciz: `
      <circle cx="46" cy="18" r="7" fill="#ffd27a"/>
      <ellipse cx="32" cy="56" rx="22" ry="5" fill="#e9c46a"/>
      <path d="M29 55 Q26 40 32 25 L35.5 25 Q31 40 34 55 Z" fill="#6b4226"/>
      <g fill="#2a9d8f">
        <path d="M34 24 Q22 13 8 21 Q22 17 34 26 Z"/>
        <path d="M34 24 Q46 11 57 19 Q46 17 34 26 Z"/>
        <path d="M34 24 Q24 26 16 39 Q27 29 34 26 Z"/>
        <path d="M34 24 Q45 27 51 40 Q42 29 34 26 Z"/>
        <path d="M34 24 Q34 12 28 6 Q38 12 36 24 Z"/>
      </g>
      <g fill="#8b3a1e"><circle cx="31" cy="27" r="2"/><circle cx="35" cy="28" r="2"/><circle cx="33" cy="30" r="2"/></g>`
  },
  {
    id: "kitap", ad: "Kitap", zemin: "#2a9d8f",
    ciz: `
      <path d="M7 24 L7 50 Q19 46 32 51 Q45 46 57 50 L57 24 Z" fill="#1d6b61"/>
      <path d="M10 20 Q21 16 31 21 L31 47 Q21 43 10 47 Z" fill="#fdfaf2"/>
      <path d="M33 21 Q43 16 54 20 L54 47 Q43 43 33 47 Z" fill="#f3eee0"/>
      <g stroke="#9a8f75" stroke-width="1.6" stroke-linecap="round" fill="none">
        <path d="M14 26 Q20 24 27 27 M14 31 Q19 29 27 32 M14 36 Q21 34 27 37"/>
        <path d="M37 27 Q43 24 50 26 M37 32 Q44 29 50 31 M37 37 Q42 34 50 36"/>
      </g>
      <path d="M43 15 L47 15 L47 26 L45 24 L43 26 Z" fill="#e5484d"/>`
  },
  {
    id: "aslan", ad: "Aslan", zemin: "#264653",
    ciz: `
      <g fill="#c8553d">
        <circle cx="32" cy="33" r="21"/>
        <circle cx="16" cy="20" r="6"/><circle cx="48" cy="20" r="6"/>
        <circle cx="12" cy="36" r="6"/><circle cx="52" cy="36" r="6"/>
        <circle cx="19" cy="50" r="6"/><circle cx="45" cy="50" r="6"/>
      </g>
      <circle cx="22" cy="21" r="4" fill="#f4a261"/><circle cx="42" cy="21" r="4" fill="#f4a261"/>
      <circle cx="32" cy="34" r="14" fill="#f4a261"/>
      <circle cx="26.5" cy="31" r="1.8" fill="#1b1b1b"/><circle cx="37.5" cy="31" r="1.8" fill="#1b1b1b"/>
      <ellipse cx="32" cy="40" rx="6" ry="4.5" fill="#fbd3a7"/>
      <path d="M29 37 L35 37 L32 40.5 Z" fill="#5a2e1d"/>
      <path d="M32 40.5 Q29.5 44 27.5 42.5 M32 40.5 Q34.5 44 36.5 42.5" stroke="#5a2e1d" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
  },
  {
    id: "at", ad: "At", zemin: "#e9c46a",
    ciz: `
      <path d="M20 58 L25 36 Q22 22 31 14 L33 6 L37 13 Q47 15 51 29 Q54 36 49 39
               Q45 39 40 33 L40 58 Z" fill="#7a4e33"/>
      <path d="M31 14 Q22 22 22 38 L27 35 Q26 24 35 15 Z" fill="#3e2416"/>
      <path d="M33 6 L35 12 L32 13 Z" fill="#3e2416"/>
      <circle cx="40" cy="22" r="1.8" fill="#1b1b1b"/>
      <circle cx="48.5" cy="33" r="1.2" fill="#3e2416"/>`
  },
  {
    id: "cami", ad: "Cami", zemin: "#457b9d",
    ciz: `
      <rect x="12" y="40" width="32" height="17" fill="#f1faee"/>
      <path d="M15 40 Q15 22 28 18 Q41 22 41 40 Z" fill="#f1faee"/>
      <path d="M28 18 L28 11" stroke="#f2c94c" stroke-width="1.6"/>
      <circle cx="28" cy="9.5" r="2.4" fill="#f2c94c"/><circle cx="29.3" cy="8.8" r="2" fill="#457b9d"/>
      <path d="M24 57 L24 49 Q28 44 32 49 L32 57 Z" fill="#1d3557"/>
      <rect x="47" y="20" width="6" height="37" fill="#f1faee"/>
      <rect x="45.5" y="30" width="9" height="2.5" fill="#d7e3e8"/>
      <path d="M46 20 L50 10 L54 20 Z" fill="#f2c94c"/>
      <rect x="6" y="56" width="52" height="2" fill="#d7e3e8"/>`
  },
  {
    id: "kahve", ad: "Kahve", zemin: "#6d4c41",
    ciz: `
      <path d="M24 10 Q20 15 24 19 Q28 23 24 28 M32 8 Q28 13 32 18 Q36 23 32 28 M40 10 Q36 15 40 19 Q44 23 40 28"
        stroke="#d7c4b8" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>
      <ellipse cx="32" cy="54" rx="20" ry="3.5" fill="#4e342e"/>
      <path d="M15 32 L49 32 L45 49 Q32 55 19 49 Z" fill="#fffaf3"/>
      <path d="M49 36 Q57 36 55 43 Q53 48 46 46" stroke="#fffaf3" stroke-width="3.5" fill="none"/>
      <ellipse cx="32" cy="32" rx="17" ry="2.5" fill="#8d5b3a"/>
      <path d="M20 40 Q32 43 44 40" stroke="#2a9d8f" stroke-width="2.5" fill="none"/>`
  }
];

function avatarBul(id) {
  return AVATARLAR.find((a) => a.id === id) || AVATARLAR[0];
}

function avatarSvg(id) {
  const a = avatarBul(id);
  return svg(`<circle cx="32" cy="32" r="32" fill="${a.zemin}"/>${a.ciz}`, a.ad);
}

// Öğrencinin yüklediği fotoğraf (data:image/... adresi) varsa onu, yoksa çizilmiş avatarı göster.
// Fotoğraf başka kullanıcıdan gelebilir (yönetim listesi), bu yüzden yalnızca güvenli
// base64 resim adresleri kabul edilir.
const FOTO_KALIBI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
function fotoGecerli(foto) {
  return typeof foto === "string" && foto.length < 200000 && FOTO_KALIBI.test(foto);
}
function avatarHtml(avatarId, foto) {
  return fotoGecerli(foto) ? `<img src="${foto}" alt="">` : avatarSvg(avatarId);
}

// Sayfadaki <span data-ikon="..."> yerlerine simgeleri koy
document.querySelectorAll("[data-ikon]").forEach((yer) => {
  yer.innerHTML = IKONLAR[yer.dataset.ikon] || "";
  yer.classList.add("ikon");
});
