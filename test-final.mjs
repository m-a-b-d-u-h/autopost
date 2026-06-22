import { generateTipsVideo } from "./video-builders/tipsVideo.mjs";
const out = await generateTipsVideo({
  hook: "5 kebiasaan yang bikin kamu terlihat lemah tanpa sadar",
  tips: [
    { title: "Membungkuk Saat Duduk", description: "Postur tubuh buruk mengirim sinyal rendah diri ke otak dan orang sekitar, bikin kamu terlihat tidak percaya diri", example: "Latihan duduk tegak dengan bahu rileks selama 5 menit setiap jam, rasakan perbedaan rasa percaya diri" },
    { title: "Bicara Terlalu Cepat", description: "Bicara cepat tanpa jeda bikin kamu terlihat gugup, tidak siap, dan kurang profesional di mata lawan bicara", example: "Terapkan teknik jeda 2 detik setelah lawan bicara selesai sebelum kamu mulai merespon pembicaraan" },
    { title: "Sering Minta Maaf", description: "Minta maaf untuk hal sepele bikin wibawa dan authority kamu luntur tanpa kamu sadari sedikit demi sedikit", example: "Ganti kata 'maaf ganggu' dengan 'izin sebentar' dan rasakan bedanya saat orang mulai lebih menghargai kamu" },
    { title: "Kontak Mata Lemah", description: "Pandangan yang selalu menghindar bikin lawan bicara merasa kamu tidak jujur atau tidak tertarik sama sekali", example: "Latih kontak mata 60% dari waktu bicara, fokus ke satu mata lawan bicara agar terlihat lebih pede dan menarik" },
    { title: "Terlalu Sering Nunduk HP", description: "Kebiasaan main HP di keramaian bikin kamu terlihat tertutup, tidak approachable, dan sulit didekati orang baru", example: "Letakkan HP di saku saat antre atau naik transportasi umum, lalu amati sekitar dengan posisi tegak dan buka body language" },
  ],
  cta: "Sadar gak sadar kamu selama ini lakuin? Follow biar gak terus-terusan insecure",
  output: `output/tips-styled-${Date.now()}.mp4`
});
console.log("Done:", out);
