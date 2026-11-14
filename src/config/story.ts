import type { StoryConfig } from "@/types/story";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  A JOURNEY TO YOUR HEART — STORY CONFIGURATION                        ║
 * ║                                                                      ║
 * ║  Everything personal lives in this file. Replace the sample names,   ║
 * ║  letters, memories and messages with your own. The shape of this     ║
 * ║  object is validated at startup by `src/config/schema.ts`.           ║
 * ║                                                                      ║
 * ║  Writing style: mixed Indonesian + English (default). Feel free to   ║
 * ║  rewrite everything in a single language — the game does not care.   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const SENDER = "Rafi";
const RECIPIENT = "Nayla";

export const story: StoryConfig = {
  senderName: SENDER,
  recipientName: RECIPIENT,
  title: "A Journey to Your Heart",
  tagline: "Every adventure has a destination. Mine is you.",
  language: "mix",
  animationSpeed: 1,
  puzzleDifficulty: "normal",

  theme: {
    midnight: "#0b0718",
    lavender: "#b9a7ff",
    rose: "#ff6fa3",
    gold: "#f3d08a",
    ink: "#f6f1ff",
  },

  // Keys reference entries in `src/config/assets.ts` → audio.music
  music: {
    menu: "menu-theme",
    ch1: "ch1-unknown-world",
    ch2: "ch2-garden-of-memories",
    ch3: "ch3-ocean-of-feelings",
    ch4: "ch4-castle-of-words",
    ch5: "ch5-final-destination",
    celebration: "celebration",
    gentle: "gentle-ending",
  },

  chapters: {
    ch1: {
      id: "ch1",
      number: 1,
      title: "The Unknown World",
      subtitle: "Dunia yang Asing",
      intro: "Kamu terbangun di sebuah pulau yang melayang di antara bintang. You don't know this place yet — but it knows you.",
      accent: "#b9a7ff",
      outro: "Setiap perjalanan dimulai dari satu langkah ke tempat yang belum dikenal.",
    },
    ch2: {
      id: "ch2",
      number: 2,
      title: "The Garden of Memories",
      subtitle: "Taman Kenangan",
      intro: "Di balik portal, ada taman yang tumbuh dari hal-hal kecil yang kuingat tentangmu. Every petal here is a moment.",
      accent: "#ff8fb8",
      outro: "Hal-hal kecil yang diam-diam kusimpan, ternyata tumbuh jadi taman.",
    },
    ch3: {
      id: "ch3",
      number: 3,
      title: "The Ocean of Feelings",
      subtitle: "Samudra Rasa",
      intro: "Malam, laut yang tenang, dan satu perahu kecil. Some things I could only say when the horizon was listening.",
      accent: "#8fd3ff",
      outro: "Some feelings are too deep for words — so I let the sea carry them.",
    },
    ch4: {
      id: "ch4",
      number: 4,
      title: "The Castle of Words",
      subtitle: "Istana Kata",
      intro: "Sebuah kastil tua menyimpan kata-kata yang belum pernah kuucapkan. Three keys, three fragments, one letter.",
      accent: "#f3d08a",
      outro: "Kata-kata yang selama ini belum sempat kuucapkan, akhirnya menemukan jalannya.",
    },
    ch5: {
      id: "ch5",
      number: 5,
      title: "The Final Destination",
      subtitle: "Tujuan Terakhir",
      intro: "Di atas awan, sebuah taman menunggu. Everything we found along the way leads here — to one question.",
      accent: "#ffd6e7",
      outro: "Every adventure has a destination.",
    },
  },

  romanticMessages: [
    "Every adventure has a destination. Mine is you.",
    "Pelan-pelan saja. Aku menunggu di ujung jalan.",
    "Some stories are better walked than told.",
    "Setiap cahaya di dunia ini kutitipkan untukmu.",
    "The best part of this world is that you're in it.",
    "Tidak ada peta di sini. Hanya hati yang tahu arah.",
  ],

  dialogue: {
    awakening: [
      { text: "Hei. Kamu datang." },
      {
        text: "I built this little world for you. Setiap sudutnya, every light, every word.",
      },
      {
        text: "Jalan-jalanlah pelan-pelan. There's no rush here. Aku akan menunggu di ujung perjalanan.",
      },
    ],
    strangePlace: [
      {
        text: "Kamu membuka mata di sebuah pulau kecil yang melayang di antara bintang-bintang.",
      },
      {
        speaker: SENDER,
        text: "Tempat ini belum punya nama. I was hoping you'd help me name it someday.",
      },
      {
        speaker: SENDER,
        text: "Coba gerakkan kakimu. Walk around a bit — this island is yours now.",
      },
    ],
    afterFirstLetter: [
      {
        speaker: SENDER,
        text: "Lihat? Cahaya-cahaya kecil itu mulai bermunculan. They know the way — follow them.",
      },
    ],
    followTheLight: [
      {
        speaker: SENDER,
        text: "Ada tiga cahaya yang tersebar di pulau ini. Kumpulkan semuanya, and the way forward will open.",
      },
    ],
    allLightsCollected: [
      {
        speaker: SENDER,
        text: "You found them all. Dengar... ada suara dari ujung pulau. Gerbangnya terbuka.",
      },
    ],
    portal: [
      {
        speaker: SENDER,
        text: "Jangan takut. Aku ada di sisi lain. Melangkahlah.",
      },
    ],
    bloomingGarden: [
      {
        text: "Udara di sini berbeda. Hangat. Wangi bunga yang pernah kamu bilang kamu suka.",
      },
      {
        speaker: SENDER,
        text: "Welcome to the garden. Setiap bunga di sini tumbuh dari hal-hal kecil yang kuingat tentangmu.",
      },
      {
        speaker: SENDER,
        text: "Jalan ke paviliun di tengah taman. Aku ingin menunjukkan sesuatu.",
      },
    ],
    littleThings: [
      {
        speaker: SENDER,
        text: "Ada lima bunga istimewa yang kusembunyikan di sini. Little things — like the way you laugh at your own jokes.",
      },
      { speaker: SENDER, text: "Find them for me?" },
    ],
    memoryInTheAir: [
      {
        speaker: SENDER,
        text: "Look up. Kenangan-kenangan itu melayang di udara, menunggu disentuh.",
      },
      { speaker: SENDER, text: "Lihat satu per satu, ya. Take your time." },
    ],
    memoryTree: [
      {
        speaker: SENDER,
        text: "Pohon ini sudah lama menunggu. Letakkan bunga-bunga yang kamu temukan di akarnya — and watch what happens.",
      },
    ],
    beautifulMoment: [
      {
        speaker: SENDER,
        text: "Inilah yang kulihat setiap kali aku mengingatmu. Semuanya bersinar.",
      },
      {
        speaker: SENDER,
        text: "Tapi taman ini baru permulaan. Ada laut yang harus kita seberangi.",
      },
    ],
    silentOcean: [
      {
        text: "Laut itu diam. Hanya bulan dan bayangannya yang bergoyang pelan di permukaan air.",
      },
      {
        speaker: SENDER,
        text: "Di sini aku menyimpan perasaan yang terlalu dalam untuk dikatakan. Ada perahu kecil di dermaga — naiklah.",
      },
    ],
    sailWithMe: [
      {
        speaker: SENDER,
        text: "Sail with me. Kemudikan perahunya ke arah cahaya di kejauhan. Pelan-pelan saja, laut ini tidak akan marah.",
      },
    ],
    messageBottles: [
      {
        speaker: SENDER,
        text: "Ada tiga botol yang kuhanyutkan ke laut ini. Each one holds something I never said out loud.",
      },
      { speaker: SENDER, text: "Temukan mereka, ya." },
    ],
    starPuzzle: [
      {
        speaker: SENDER,
        text: "Lihat ke langit. Bintang-bintang itu menunggu dihubungkan. Gambarkan bentuk yang kamu rasakan.",
      },
    ],
    starPuzzleSolved: [
      {
        speaker: SENDER,
        text: "You drew it. Itu bentuk yang sama yang kulihat setiap kali menatap langit belakangan ini.",
      },
    ],
    beyondHorizon: [
      {
        speaker: SENDER,
        text: "Dan di ujung malam yang paling panjang pun, matahari selalu kembali.",
      },
      {
        speaker: SENDER,
        text: "Lihat ke depan. Di balik cakrawala, ada kastil yang menyimpan semua kata-kataku.",
      },
    ],
    forgottenCastle: [
      {
        text: "Kabut menyelimuti halaman kastil tua. Jendela-jendelanya menyala hangat, seolah sudah lama menunggumu.",
      },
      {
        speaker: SENDER,
        text: "Istana ini kubangun dari kata-kata yang belum pernah kuucapkan. Pintunya terkunci — cari jalan masuknya.",
      },
    ],
    threeKeys: [
      {
        speaker: SENDER,
        text: "Tiga kunci tersebar di halaman ini. Each key opens one thing I've been holding back.",
      },
      { speaker: SENDER, text: "Find them, and the chamber will open." },
    ],
    chamberUnlocked: [
      {
        speaker: SENDER,
        text: "Pintunya terbuka. Masuklah. Jangan khawatir — isinya hanya kata-kata.",
      },
    ],
    unspokenWords: [
      {
        speaker: SENDER,
        text: "Tiga pecahan surat ada di hadapanmu. Gunakan kunci yang kamu temukan untuk membukanya, satu per satu.",
      },
    ],
    heartChamber: [
      { speaker: SENDER, text: "Ini ruang paling dalam dari istana ini." },
      {
        speaker: SENDER,
        text: "Yang berdetak di sana — itu milikmu. Sudah lama.",
      },
    ],
    finalPath: [
      {
        text: "Di atas awan, sebuah taman melayang. Jalan setapaknya menyala setiap kali kamu melangkah.",
      },
      {
        speaker: SENDER,
        text: "Hampir sampai. Ikuti jalannya — I'm waiting at the end.",
      },
    ],
    everythingWeFound: [
      {
        speaker: SENDER,
        text: "Lihat semua yang kamu temukan. Cahaya, bunga, kenangan, pesan, bintang, kunci, kata-kata.",
      },
      {
        speaker: SENDER,
        text: "Semuanya kecil. But together, they're everything I've been trying to say.",
      },
    ],
    theGift: [
      { speaker: SENDER, text: "Ada satu hal terakhir. Bukalah." },
    ],
    giftOpened: [
      {
        speaker: SENDER,
        text: "Itu bukan hadiah, sebenarnya. It's a question.",
      },
    ],
  },

  letters: {
    firstMessage: {
      id: "first-message",
      title: "Pesan Pertama",
      greeting: `Untuk ${RECIPIENT},`,
      paragraphs: [
        "Kalau kamu membaca ini, berarti kamu benar-benar datang. Thank you. Itu saja sudah membuatku tersenyum.",
        "Aku bukan orang yang pandai bicara. Jadi aku membangun dunia ini — supaya hal-hal yang sulit kuucapkan bisa kamu temukan sendiri, satu per satu.",
        "There are five chapters ahead. Di setiap tempat, ada sesuatu yang ingin kutunjukkan padamu. Nothing scary, I promise. Hanya hal-hal yang selama ini kusimpan.",
        "Ikuti cahaya. They know the way.",
      ],
      signature: `— ${SENDER}`,
    },
    fromMe: {
      id: "from-me",
      title: "Surat Dariku",
      greeting: `${RECIPIENT} sayang,`,
      paragraphs: [
        "Aku sudah menulis surat ini berkali-kali. Dihapus, ditulis lagi, dihapus lagi. Ternyata lebih mudah membangun satu dunia penuh daripada menulis satu paragraf yang jujur.",
        "I don't remember the exact day you became important to me. Mungkin memang tidak ada hari seperti itu. Mungkin kamu datang pelan-pelan — seperti pagi, yang tidak pernah terasa dimulai, tapi tiba-tiba saja semuanya terang.",
        "Aku suka caramu memperhatikan hal-hal kecil. Caramu mengingat nama orang. The way you hum when you think nobody's listening. Caramu bilang \u201cnggak apa-apa\u201d padahal jelas ada apa-apa — dan caramu tetap kuat setelahnya.",
        "Aku tidak punya janji besar. I can't promise I'll never make you upset, or that every day will be easy. Tapi aku bisa janji satu hal: aku akan selalu berusaha. Untuk mendengar. Untuk hadir. Untuk jadi tempat yang aman buat kamu pulang.",
        "Perjalanan ini hampir selesai. Di ujungnya ada satu pertanyaan — tidak panjang, tidak rumit. Only one thing I truly want to know.",
        "Apa pun jawabanmu nanti, terima kasih sudah berjalan sejauh ini bersamaku.",
      ],
      signature: `Dengan segenap hati,\n${SENDER}`,
    },
    yesClosing: {
      id: "yes-closing",
      title: "Bab Baru Kita",
      greeting: `${RECIPIENT},`,
      paragraphs: [
        "Kamu bilang ya. Aku menulis ulang kalimat ini tiga kali karena tanganku gemetar — in the best way possible.",
        "Dunia ini kubangun untuk satu pertanyaan, tapi sekarang dunianya milik kita berdua. Every light, every flower, every star.",
        "Let's take it slow. Let's take it real. Aku tidak akan ke mana-mana.",
        "Selamat datang di bab baru kita.",
      ],
      signature: `Dengan bahagia yang susah dijelaskan,\n${SENDER}`,
    },
    notYetClosing: {
      id: "not-yet-closing",
      title: "Tidak Apa-Apa",
      greeting: `${RECIPIENT},`,
      paragraphs: [
        "Terima kasih sudah jujur. Itu jauh lebih berarti daripada jawaban yang terburu-buru.",
        "This world isn't going anywhere, and neither am I. Kenangannya tetap di sini, suratnya tetap di sini, pintunya tetap terbuka.",
        "Take all the time you need. Tidak ada tenggat waktu untuk hal-hal yang penting.",
        "Whatever happens next, I'm glad it was you who walked this path with me.",
      ],
      signature: `Dengan tulus,\n${SENDER}`,
    },
  },

  // Replace the sample illustrations in /public/memories with your own photos.
  memories: [
    {
      id: "memory-1",
      title: "Hujan Sore Itu",
      caption:
        "The afternoon we got caught in the rain and you refused to run. Kamu bilang, \u201cHujan nggak akan lari kalau kita nggak lari.\u201d",
      date: "Maret 2025",
      image: "/memories/memory-01.webp",
    },
    {
      id: "memory-2",
      title: "Kopi Kedua",
      caption:
        "Second coffee, same table, three hours of talking about nothing and everything.",
      date: "April 2025",
      image: "/memories/memory-02.webp",
    },
    {
      id: "memory-3",
      title: "Langit Malam di Atap",
      caption:
        "Kita menghitung bintang dan selalu kehilangan hitungan di angka sebelas.",
      date: "Juni 2025",
      image: "/memories/memory-03.webp",
    },
    {
      id: "memory-4",
      title: "Jalan Pulang",
      caption:
        "The long way home, karena kita berdua tidak mau obrolannya selesai.",
      date: "Agustus 2025",
      image: "/memories/memory-04.webp",
    },
    {
      id: "memory-5",
      title: "Tawa yang Itu",
      caption:
        "That laugh. Yang bikin orang di meja sebelah ikut tersenyum tanpa tahu kenapa.",
      date: "Oktober 2025",
      image: "/memories/memory-05.webp",
    },
  ],

  bottles: [
    {
      id: "bottle-1",
      title: "Botol Pertama — Hal yang Kusadari",
      text: "Aku pertama kali sadar ada yang berbeda saat kamu tertawa di tengah hujan. Everyone else was running for cover, and you just stood there, smiling. I think that's when it started.",
    },
    {
      id: "bottle-2",
      title: "Botol Kedua — Hal yang Kutakutkan",
      text: "Aku takut mengatakannya terlalu cepat dan merusak semuanya. So I kept quiet. Tapi diam ternyata jauh lebih berat dari yang kukira.",
    },
    {
      id: "bottle-3",
      title: "Botol Ketiga — Hal yang Kuharapkan",
      text: "I hope, whatever your answer is, you'll always know this: kamu membuat hari-hari biasa terasa seperti petualangan.",
    },
  ],

  keys: [
    {
      id: "key-gold",
      name: "Kunci Emas — Keberanian",
      description: "The courage I needed to say the first word.",
      color: "#f3d08a",
    },
    {
      id: "key-silver",
      name: "Kunci Perak — Kejujuran",
      description: "Kejujuran yang selama ini kusimpan rapat-rapat.",
      color: "#d7ccff",
    },
    {
      id: "key-rose",
      name: "Kunci Mawar — Harapan",
      description: "A small hope I never let go of.",
      color: "#ff8fb8",
    },
  ],

  fragments: [
    {
      id: "fragment-1",
      keyId: "key-gold",
      title: "Fragmen I — Keberanian",
      lines: [
        "Aku tidak pernah pandai memulai.",
        "Setiap kali ingin bicara, kata-katanya tersangkut di tenggorokan.",
        "So I'm starting here, in a place where I can't run away.",
      ],
    },
    {
      id: "fragment-2",
      keyId: "key-silver",
      title: "Fragmen II — Kejujuran",
      lines: [
        "Honestly? Aku memikirkanmu lebih sering dari yang seharusnya.",
        "Saat pagi, saat bosan, saat lagu tertentu diputar.",
        "And it never once felt like a waste of time.",
      ],
    },
    {
      id: "fragment-3",
      keyId: "key-rose",
      title: "Fragmen III — Harapan",
      lines: [
        "Aku tidak minta kamu merasakan hal yang sama hari ini.",
        "I'm only asking for a chance.",
        "Satu kesempatan untuk menulis bab selanjutnya — bersama.",
      ],
    },
  ],

  proposal: {
    question: "Will You Be My Girlfriend?",
    supportingText:
      "I don't know what tomorrow holds, but I hope we can write the next chapter together.",
    yesLabel: "YES! ❤️",
    notYetLabel: "Not Yet",
  },

  endings: {
    yes: {
      headline: "You just made my world brighter.",
      message: `Terima kasih, ${RECIPIENT}. Mulai hari ini, setiap bab akan kita tulis bersama.`,
    },
    notYet: {
      headline: "That's okay. Take all the time you need.",
      message:
        "Tidak ada yang berubah. Aku tetap di sini, dan dunia ini tetap milikmu untuk dijelajahi kapan pun kamu mau.",
    },
  },

  summary: {
    title: "Everything We Found",
    subtitle: "Semua yang kita temukan sepanjang jalan.",
  },
};
