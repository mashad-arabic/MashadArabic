// Video bağlantısı çözücü (oyun sayfası ve yönetim paneli birlikte kullanır).
// Desteklenen bağlantılar:
//   • YouTube:       https://www.youtube.com/watch?v=...  /  youtu.be/...  /  shorts/...
//   • Google Drive:  https://drive.google.com/file/d/DOSYA_KIMLIGI/view?usp=sharing
//                    (dosya "Bağlantıya sahip olan herkes" ile paylaşılmış olmalı)
//   • Dropbox:       https://www.dropbox.com/s/.../video.mp4?dl=0
//   • Doğrudan dosya: https://.../video.mp4 (Firebase Storage dahil)

const VideoKaynak = (() => {
  const YT_KALIP = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;
  const DRIVE_ALANLARI = ["drive.google.com", "docs.google.com", "drive.usercontent.google.com"];

  function driveKimligi(url) {
    if (!DRIVE_ALANLARI.includes(url.hostname)) return null;
    const m = url.pathname.match(/\/file\/d\/([\w-]{10,})/);
    return m ? m[1] : url.searchParams.get("id");
  }

  // Bağlantıyı çöz: { tur: "youtube", youtube } | { tur: "video", video, nereden } | null
  function coz(metin) {
    metin = String(metin || "").trim();
    if (!metin) return null;

    if (/^[\w-]{11}$/.test(metin)) return { tur: "youtube", youtube: metin };
    const yt = metin.match(YT_KALIP);
    if (yt) return { tur: "youtube", youtube: yt[1] };

    let url;
    try { url = new URL(metin); } catch { return null; }
    // http:// adresleri https sitede tarayıcı tarafından engellenir
    if (url.protocol !== "https:") return null;

    const driveId = driveKimligi(url);
    if (driveId) {
      // confirm=t: büyük dosyalardaki "virüs taranamadı" uyarı sayfasını atlar
      return {
        tur: "video", nereden: "drive",
        video: `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`
      };
    }

    if (url.hostname === "www.dropbox.com" || url.hostname === "dropbox.com") {
      url.searchParams.delete("dl");
      url.searchParams.set("raw", "1");
      return { tur: "video", nereden: "dropbox", video: url.href };
    }

    return { tur: "video", nereden: "dogrudan", video: url.href };
  }

  // <video> öğesinin oynatabileceği adres (eski kayıtlarda paylaşım bağlantısı kalmışsa da çevirir)
  function oynatilabilir(adres) {
    const c = coz(adres);
    return c && c.tur === "video" ? c.video : adres;
  }

  const NEREDEN_AD = { drive: "Google Drive", dropbox: "Dropbox", dogrudan: "Video bağlantısı", yukleme: "Yüklenen dosya" };

  return { coz, oynatilabilir, neredenAd: (n) => NEREDEN_AD[n] || "Video" };
})();

// Oyun kodunda kısa ad
const oynatilabilirAdres = VideoKaynak.oynatilabilir;
