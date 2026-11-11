// Klipler: YouTube video kimliği + başlangıç/bitiş saniyesi + cümle + iki çeviri.
// Saniyeler videonun Arapça altyazısından alındı, gerekirse ince ayar yapılır.
const KLIPLER = [
  {
    youtube: "dinQIb4ZFXY", start: 4.8, end: 7.9,
    arapca: "الحمد لله بخير، و كيف حالك أنت يا اخي؟",
    dogru: "Elhamdülillah iyiyim, peki sen nasılsın kardeşim?",
    yanlis: "Bugün çok yorgunum, sen ne yapıyorsun kardeşim?"
  },
  {
    youtube: "dinQIb4ZFXY", start: 11.95, end: 13.85,
    arapca: "اسمي خاسو، ما اسمك؟",
    dogru: "Benim adım Hasu, senin adın ne?",
    yanlis: "Senin adın Hasu mu, nerelisin?"
  },
  {
    youtube: "dinQIb4ZFXY", start: 19.05, end: 21.15,
    arapca: "أنا من الشيشان، و من أين أنت؟",
    dogru: "Ben Çeçenistanlıyım, sen nerelisin?",
    yanlis: "Ben Türkiye'denim, sen kaç yaşındasın?"
  },
  {
    youtube: "dinQIb4ZFXY", start: 23.7, end: 25.9,
    arapca: "لا أنا لست روسيا أنا شيشاني",
    dogru: "Hayır, ben Rus değilim, ben Çeçenim.",
    yanlis: "Evet, ben Rus'um, Rusya'da yaşıyorum."
  },
  {
    youtube: "dinQIb4ZFXY", start: 27.9, end: 32.1,
    arapca: "لا أنا لست تركيا، أنا شيشاني أيضا",
    dogru: "Hayır, ben Türk değilim, ben de Çeçenim.",
    yanlis: "Evet, ben Türk'üm, Türkiye'den geliyorum."
  },
  {
    youtube: "dinQIb4ZFXY", start: 34.4, end: 38.6,
    arapca: "عمري ثلاثة و عشرون عاما، و كم عمرك أنت؟",
    dogru: "Yirmi üç yaşındayım, peki sen kaç yaşındasın?",
    yanlis: "Yirmi dokuz yaşındayım, peki sen nerelisin?"
  },
  {
    youtube: "dinQIb4ZFXY", start: 44.35, end: 47.05,
    arapca: "نعم أنا متزوج، و هل متزوج أيضا؟",
    dogru: "Evet, evliyim; sen de evli misin?",
    yanlis: "Hayır, bekârım; senin çocuğun var mı?"
  }
];
