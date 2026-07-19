export type ChoiceSeed = {
  prompt: string;
  answer: string;
  options: string[];
};

export type ReadingSeed = {
  passage: string;
  questions: ChoiceSeed[];
};

export type CurriculumUnit = {
  unit: number;
  theme: number;
  title: string;
  textbookPages: string;
  standards: string[];
  listen: string[];
  reading: ReadingSeed;
  language: ChoiceSeed[];
  order: string[];
  write: string[];
  oral: string[];
};

// Content is curated from Bahasa Melayu SJK Tahun 2 (2017), then checked
// against the matching curriculum document. Metadata is kept for teacher
// audit only and is never rendered in the pupil interface.
export const curriculumUnits: CurriculumUnit[] = [
  {
    unit: 1,
    theme: 1,
    title: "Keluarga Guan Hong",
    textbookPages: "2-6",
    standards: ["1.1.1(i)", "2.1.1(i)", "3.1.1(i)", "4.2.2(i)", "5.1.1(i)"],
    listen: ["bangun awal", "rajin membaca", "bantu keluarga", "hormat akan ibu bapa"],
    reading: {
      passage: "Guan Hong bangun awal. Dia rajin membaca dan membantu keluarganya. Dia juga menghormati ibu bapanya.",
      questions: [
        { prompt: "Apakah amalan Guan Hong pada waktu pagi?", answer: "Bangun awal", options: ["Bangun awal", "Tidur lewat", "Bermain sahaja"] },
        { prompt: "Siapakah yang dihormati oleh Guan Hong?", answer: "Ibu bapanya", options: ["Ibu bapanya", "Penjual", "Pelancong"] },
      ],
    },
    language: [
      { prompt: "Pilih kata nama am.", answer: "langsir", options: ["langsir", "Guan Hong", "Pulau Pinang"] },
      { prompt: "Ibu menggantung ___ di tingkap.", answer: "langsir", options: ["langsir", "akuarium", "majalah"] },
    ],
    order: ["Guan Hong rajin membaca.", "Guan Hong membantu keluarganya."],
    write: ["mengemas", "menyusun"],
    oral: ["Keluarga saya rajin.", "Saya membantu keluarga."],
  },
  {
    unit: 2,
    theme: 1,
    title: "Kami Gembira",
    textbookPages: "7-11",
    standards: ["1.1.1(i)", "2.1.1(ii)", "3.1.1(ii)", "4.1.1(i)", "5.1.1(ii)"],
    listen: ["mengemas pakaian", "menyediakan makanan", "mengangkat barang", "bercuti ke Pulau Pinang"],
    reading: {
      passage: "Keluarga Guan Hong bercuti di Pulau Pinang. Mereka menaiki kereta api ke Bukit Bendera. Guan Hong dan adiknya berenang di laut.",
      questions: [
        { prompt: "Mereka menaiki apa ke Bukit Bendera?", answer: "Kereta api", options: ["Kereta api", "Bas sekolah", "Kapal terbang"] },
        { prompt: "Di manakah Guan Hong dan adiknya berenang?", answer: "Di laut", options: ["Di laut", "Di kolam ikan", "Di sungai"] },
      ],
    },
    language: [
      { prompt: "Pilih kata nama khas.", answer: "Pulau Pinang", options: ["Pulau Pinang", "pulau", "keluarga"] },
      { prompt: "Keluarga Guan Hong melawat ___.", answer: "Tokong Ular", options: ["Tokong Ular", "sebuah tokong", "tempat itu"] },
    ],
    order: ["Mereka menaiki kereta api.", "Guan Hong berenang di laut."],
    write: ["bercuti", "makanan"],
    oral: ["Kami bercuti di Pulau Pinang.", "Wah, seronoknya!"],
  },
  {
    unit: 3,
    theme: 1,
    title: "Saudara-mara Saya",
    textbookPages: "12-17",
    standards: ["1.1.1(i)", "2.1.2(i)", "3.2.1(i)", "4.1.1(i)", "5.1.1(iii)", "5.1.1(iv)"],
    listen: ["di atas pentas", "bertepuk tangan", "majlis perkahwinan", "suasana sangat meriah"],
    reading: {
      passage: "Guan Hong menghadiri majlis perkahwinan mak ciknya. Suasana di situ sangat meriah. Para tetamu bertepuk tangan.",
      questions: [
        { prompt: "Majlis siapakah yang dihadiri oleh Guan Hong?", answer: "Majlis perkahwinan mak ciknya", options: ["Majlis perkahwinan mak ciknya", "Hari sukan sekolah", "Pameran sains"] },
        { prompt: "Bagaimanakah suasana di majlis itu?", answer: "Sangat meriah", options: ["Sangat meriah", "Sangat sunyi", "Sangat gelap"] },
      ],
    },
    language: [
      { prompt: "Guan Hong berkata, ‘___ sayang akan nenek saya.’", answer: "Saya", options: ["Saya", "Kamu", "Mereka"] },
      { prompt: "Guan Hong memakai se___ baju baharu.", answer: "helai", options: ["helai", "batang", "biji"] },
    ],
    order: ["Para tetamu bertepuk tangan.", "Saya sayang akan nenek saya."],
    write: ["pengantin", "album"],
    oral: ["Suasana di sini sangat meriah.", "Ini datuk dan nenek saya."],
  },
  {
    unit: 4,
    theme: 2,
    title: "Mari Berkawan",
    textbookPages: "20-24",
    standards: ["1.1.1(ii)", "2.1.2(ii)", "3.2.1(ii)", "4.2.2(ii)", "5.1.1(iii)"],
    listen: ["Saya murid baharu.", "Saya mahu berkawan dengan kamu.", "Selamat datang, Anand.", "Terima kasih, kawan."],
    reading: {
      passage: "Bekas air Sandra hilang. Zhi Ying dan Amira membantu Sandra. Mereka menemukan bekas air itu di pondok bacaan.",
      questions: [
        { prompt: "Di manakah bekas air itu ditemukan?", answer: "Di pondok bacaan", options: ["Di pondok bacaan", "Di kantin", "Di padang"] },
        { prompt: "Siapakah yang membantu Sandra?", answer: "Zhi Ying dan Amira", options: ["Zhi Ying dan Amira", "Ayah dan ibu", "Helmi dan Fendi"] },
      ],
    },
    language: [
      { prompt: "Zhi Ying suka bermain pianika. ___ pandai bermain alat muzik.", answer: "Dia", options: ["Dia", "Kami", "Kamu"] },
      { prompt: "Cikgu Wong mengajar murid. ___ seorang guru muzik.", answer: "Beliau", options: ["Beliau", "Mereka", "Saya"] },
    ],
    order: ["Saya mahu berkawan dengan kamu.", "Sandra mengucapkan terima kasih."],
    write: ["kawan", "buku skrap"],
    oral: ["Selamat datang ke sekolah kami.", "Terima kasih kerana membantu saya."],
  },
  {
    unit: 5,
    theme: 2,
    title: "Hormati Jiran",
    textbookPages: "25-30",
    standards: ["1.1.1(iii)", "2.1.1(iii)", "3.1.1(iii)", "4.1.1(i)", "5.1.1(iv)", "5.1.4(i)"],
    listen: ["Tahniah, Amira!", "Silalah datang ke rumah saya.", "Mereka dilayan dengan mesranya.", "Hormati jiran kita."],
    reading: {
      passage: "Zhi Ying dan Anand berkunjung ke rumah Amira. Ibu Amira menghidangkan kuih. Mereka makan dengan sopannya dan mengucapkan terima kasih.",
      questions: [
        { prompt: "Siapakah yang menghidangkan kuih?", answer: "Ibu Amira", options: ["Ibu Amira", "Cikgu Wong", "Ayah Anand"] },
        { prompt: "Apakah yang diucapkan selepas makan?", answer: "Terima kasih", options: ["Terima kasih", "Selamat jalan", "Tolong diam"] },
      ],
    },
    language: [
      { prompt: "Amira memakai se___ baju kurung.", answer: "pasang", options: ["pasang", "utas", "kuntum"] },
      { prompt: "Ibu membuat muruku ___ kuih wade.", answer: "dan", options: ["dan", "atau", "tetapi"] },
    ],
    order: ["Mereka makan dengan sopannya.", "Jiran-jiran datang melawat Tempua."],
    write: ["prihatin", "sopan"],
    oral: ["Kita mestilah menghormati jiran.", "Silalah makan kuih ini."],
  },
  {
    unit: 6,
    theme: 2,
    title: "Bekerjasama",
    textbookPages: "31-36",
    standards: ["1.1.2(i)", "2.1.1(iv)", "3.1.1(iv)", "4.2.1(i)", "5.1.3(i)", "5.1.4(ii)"],
    listen: ["membuat pasu secara berkumpulan", "membawa plastisin", "menyiapkan tugasan", "bekerjasama dengan rakan"],
    reading: {
      passage: "Anand dan Amira datang ke rumah Zhi Ying. Mereka membuat pasu daripada plastisin. Mereka bekerjasama sehingga tugasan itu selesai.",
      questions: [
        { prompt: "Apakah bahan yang digunakan untuk membuat pasu?", answer: "Plastisin", options: ["Plastisin", "Kertas", "Kaca"] },
        { prompt: "Mengapakah tugasan itu dapat disiapkan?", answer: "Mereka bekerjasama", options: ["Mereka bekerjasama", "Mereka berebut", "Mereka tidur"] },
      ],
    },
    language: [
      { prompt: "Kelas Tahun 2 Mawar sangat ___.", answer: "kemas", options: ["kemas", "bulat", "awal"] },
      { prompt: "Amira berjalan ___ pondok bacaan.", answer: "ke", options: ["ke", "dari", "pada"] },
    ],
    order: ["Mereka menyiapkan tugasan bersama-sama.", "Bekerjasama ialah amalan murni."],
    write: ["plastisin", "bekerjasama"],
    oral: ["Kami membuat pasu bersama-sama.", "Tugasan itu sudah selesai."],
  },
  {
    unit: 7,
    theme: 3,
    title: "Bersih dan Ceria",
    textbookPages: "39-43",
    standards: ["1.1.2(ii)", "2.1.2(iii)", "3.2.1(iii)", "4.3.2(ii)", "5.1.3(ii)"],
    listen: ["cuci rambut dengan syampu", "lap rambut dengan tuala", "berus gigi dua kali sehari", "bersihkan celah-celah gigi"],
    reading: {
      passage: "Vimala mempunyai gigi yang putih dan bersih. Dia memberus gigi sekurang-kurangnya dua kali sehari. Dia menggunakan flos untuk membersihkan celah-celah gigi.",
      questions: [
        { prompt: "Berapa kalikah Vimala memberus gigi setiap hari?", answer: "Sekurang-kurangnya dua kali", options: ["Sekurang-kurangnya dua kali", "Seminggu sekali", "Sebulan sekali"] },
        { prompt: "Apakah kegunaan flos?", answer: "Membersihkan celah-celah gigi", options: ["Membersihkan celah-celah gigi", "Menyikat rambut", "Mencuci tangan"] },
      ],
    },
    language: [
      { prompt: "Pilih kata adjektif warna.", answer: "kuning", options: ["kuning", "bersih", "awal"] },
      { prompt: "Daun pokok itu berwarna ___.", answer: "hijau", options: ["hijau", "bujur", "lewat"] },
    ],
    order: ["Vimala memberus gigi setiap hari.", "Rumah bersih, kita selesa."],
    write: ["syampu", "bersih"],
    oral: ["Saya menjaga kebersihan diri.", "Gigi saya putih dan bersih."],
  },
  {
    unit: 8,
    theme: 3,
    title: "Sekolah Bersih Murid Selesa",
    textbookPages: "44-49",
    standards: ["1.1.2(iii)", "2.1.2(iv)", "3.2.1(iv)", "4.2.1(ii)", "5.1.3(iii)", "5.1.4(iii)"],
    listen: ["bawa kain pengelap", "hias taman kelas", "gantung kad perkataan", "susun kerusi dengan kemas"],
    reading: {
      passage: "Di kelas Guan Hong ada Taman Bahasa Melayu. Di situ terdapat ruang bacaan dan pokok ilmu. Taman kelas itu bersih, cantik dan kemas.",
      questions: [
        { prompt: "Apakah yang terdapat di Taman Bahasa Melayu?", answer: "Ruang bacaan dan pokok ilmu", options: ["Ruang bacaan dan pokok ilmu", "Kolam renang", "Tempat letak kereta"] },
        { prompt: "Bagaimanakah keadaan taman kelas itu?", answer: "Bersih, cantik dan kemas", options: ["Bersih, cantik dan kemas", "Kotor dan sempit", "Gelap dan sunyi"] },
      ],
    },
    language: [
      { prompt: "Pilih kata adjektif bentuk.", answer: "bujur", options: ["bujur", "bersih", "lewat"] },
      { prompt: "Kon disusun di ___ rak.", answer: "atas", options: ["atas", "bujur", "hijau"] },
    ],
    order: ["Murid-murid menghias taman kelas.", "Pusat sumber sekolah menjadi cantik."],
    write: ["poster", "kerusi"],
    oral: ["Sekolah bersih, murid selesa.", "Kami menjaga kebersihan kelas."],
  },
  {
    unit: 9,
    theme: 3,
    title: "Hargailah Kesihatan",
    textbookPages: "50-55",
    standards: ["1.1.2(iv)", "2.3.1(i)", "3.2.4(i)", "4.2.1(iii)", "5.1.3(iv)", "5.1.4(iv)"],
    listen: ["keluarkan lobak dari peti sejuk", "cuci lobak itu", "rajin bersenam", "makan buah-buahan"],
    reading: {
      passage: "Kita perlu rajin bersenam supaya badan cergas. Kita juga perlu makan buah-buahan dan sayur-sayuran supaya badan sihat.",
      questions: [
        { prompt: "Apakah kesan rajin bersenam?", answer: "Badan menjadi cergas", options: ["Badan menjadi cergas", "Badan menjadi lemah", "Kita cepat mengantuk"] },
        { prompt: "Apakah makanan yang membantu badan kekal sihat?", answer: "Buah-buahan dan sayur-sayuran", options: ["Buah-buahan dan sayur-sayuran", "Gula-gula sahaja", "Makanan basi"] },
      ],
    },
    language: [
      { prompt: "Sandra bangun pada ___ pagi.", answer: "awal", options: ["awal", "bujur", "hijau"] },
      { prompt: "___ tugas jururawat pergigian?", answer: "Apakah", options: ["Apakah", "Siapakah", "Bilakah"] },
    ],
    order: ["Kita mestilah rajin bersenam.", "Sayuran hijau baik untuk kesihatan."],
    write: ["berenang", "bersenam"],
    oral: ["Saya menjaga kesihatan diri.", "Badan yang sihat menjadikan kita gembira."],
  },
  {
    unit: 10,
    theme: 4,
    title: "Pentingnya Keselamatan",
    textbookPages: "58-62",
    standards: ["1.1.3(i)", "2.3.1(ii)", "3.2.2(i)", "4.3.3(i)", "5.1.2(i)"],
    listen: ["bermain dengan berhati-hati", "gunakan lif dengan selamat", "patuhi peraturan", "pakai baju hujan"],
    reading: {
      passage: "Helmi dan ayahnya menggunakan lif di pasar raya. Mereka menunggu dengan sabar dan masuk ke dalam lif dengan cermat. Mereka sentiasa mematuhi peraturan keselamatan.",
      questions: [
        { prompt: "Bagaimanakah mereka menunggu lif?", answer: "Dengan sabar", options: ["Dengan sabar", "Dengan kasar", "Sambil berlari"] },
        { prompt: "Apakah yang sentiasa dipatuhi oleh mereka?", answer: "Peraturan keselamatan", options: ["Peraturan keselamatan", "Jadual permainan", "Harga pakaian"] },
      ],
    },
    language: [
      { prompt: "Anand ___ almari.", answer: "membuka", options: ["membuka", "dibuka", "terbuka"] },
      { prompt: "Dia ___ baju hujan ke sekolah.", answer: "membawa", options: ["membawa", "dibawa", "bawaan"] },
    ],
    order: ["Kita mestilah mematuhi peraturan.", "Helmi menggunakan lif dengan selamat."],
    write: ["selamat", "berbahaya"],
    oral: ["Saya sentiasa berhati-hati.", "Keselamatan diri amat penting."],
  },
  {
    unit: 11,
    theme: 4,
    title: "Keselamatan di Sekolah",
    textbookPages: "63-68",
    standards: ["1.1.3(ii)", "2.3.1(iii)", "3.2.4(ii)", "4.3.2(i)", "5.1.2(ii)", "5.1.4(i)"],
    listen: ["ingat nombor telefon ibu", "patuhi peraturan sekolah", "jangan berlari di tandas", "bersukan di tempat yang selamat"],
    reading: {
      passage: "Anand tiba di sekolah dengan menaiki kereta. Kereta itu dipandu oleh ibunya. Anand dipimpin oleh ibunya semasa berjalan masuk ke kawasan sekolah.",
      questions: [
        { prompt: "Siapakah yang memandu kereta?", answer: "Ibu Anand", options: ["Ibu Anand", "Cikgu Wong", "Anand"] },
        { prompt: "Bagaimanakah Anand berjalan masuk ke sekolah?", answer: "Dia dipimpin oleh ibunya", options: ["Dia dipimpin oleh ibunya", "Dia berlari sendirian", "Dia menunggang basikal"] },
      ],
    },
    language: [
      { prompt: "Anand ___ oleh ibunya.", answer: "dipimpin", options: ["dipimpin", "memimpin", "pimpin"] },
      { prompt: "Murid bermain di tempat selamat ___ mematuhi peraturan.", answer: "dan", options: ["dan", "tetapi", "atau"] },
    ],
    order: ["Murid-murid mematuhi peraturan sekolah.", "Kereta itu dipandu oleh ibu Anand."],
    write: ["tangki air", "makmal sains"],
    oral: ["Saya menjaga keselamatan di sekolah.", "Semasa bersukan, patuhi peraturan."],
  },
  {
    unit: 12,
    theme: 4,
    title: "Keselamatan di Jalan Raya",
    textbookPages: "69-74",
    standards: ["1.2.1", "2.2.1(i)", "3.3.1(i)", "4.3.1(i)", "5.1.4(ii)", "5.2.1(iii)"],
    listen: ["pakai tali pinggang keledar", "berjalan di lorong pejalan kaki", "pegang tangan ibu", "beratur ketika menaiki bas"],
    reading: {
      passage: "Sandra berjalan ke sekolah bersama-sama ibunya. Mereka berjalan di lorong pejalan kaki dan menghadap lalu lintas. Sandra sentiasa memegang tangan ibunya.",
      questions: [
        { prompt: "Di manakah Sandra dan ibunya berjalan?", answer: "Di lorong pejalan kaki", options: ["Di lorong pejalan kaki", "Di tengah jalan", "Di laluan basikal"] },
        { prompt: "Mengapakah mereka menghadap lalu lintas?", answer: "Supaya berhati-hati dan peka", options: ["Supaya berhati-hati dan peka", "Supaya boleh berlari", "Supaya cepat sampai"] },
      ],
    },
    language: [
      { prompt: "Lorong itu dikhaskan ___ pejalan kaki.", answer: "untuk", options: ["untuk", "daripada", "pada"] },
      { prompt: "Murid-murid sedang ___ untuk menaiki bas.", answer: "beratur", options: ["beratur", "mengatur", "diatur"] },
    ],
    order: ["Kita perlu memakai tali pinggang keledar.", "Mereka berjalan dengan berhati-hati."],
    write: ["topi keledar", "lampu isyarat"],
    oral: ["Saya berwaspada di jalan raya.", "Kami beratur ketika menaiki bas."],
  },
  {
    unit: 13,
    theme: 5,
    title: "Bijak Sains",
    textbookPages: "78-82",
    standards: ["1.2.2", "2.2.1(ii)", "3.2.4(iii)", "4.2.1(i)", "5.1.4(iii)"],
    listen: ["haiwan memerlukan makanan", "menggunakan deria penglihatan", "menghidu bau makanan", "model bot itu timbul"],
    reading: {
      passage: "Helmi melihat keadaan mihun dengan deria penglihatannya. Kemudian, dia menghidu bau mihun itu. Setelah memastikan mihun tidak basi, barulah dia makan.",
      questions: [
        { prompt: "Deria apakah yang digunakan untuk melihat mihun?", answer: "Deria penglihatan", options: ["Deria penglihatan", "Deria pendengaran", "Deria sentuhan"] },
        { prompt: "Mengapakah Helmi menghidu mihun itu?", answer: "Untuk memastikan mihun tidak basi", options: ["Untuk memastikan mihun tidak basi", "Untuk menyejukkan mihun", "Untuk mengubah warnanya"] },
      ],
    },
    language: [
      { prompt: "Ibu menjemur pakaian di ___ rumah.", answer: "luar", options: ["luar", "tepi", "dalam"] },
      { prompt: "Bakul diletakkan di ___ dinding.", answer: "tepi", options: ["tepi", "luar", "atas"] },
    ],
    order: ["Lembu makan untuk mendapatkan tenaga.", "Helmi menggunakan deria penglihatannya."],
    write: ["tenaga", "tenggelam"],
    oral: ["Tumbuhan memerlukan cahaya matahari.", "Hidung digunakan untuk menghidu."],
  },
  {
    unit: 14,
    theme: 5,
    title: "Hebat dan Berguna",
    textbookPages: "83-88",
    standards: ["1.1.1(iii)", "2.3.1(iv)", "3.3.1(ii)", "4.3.1(ii)", "5.1.4(iv)", "5.1.4(v)"],
    listen: ["buku digital mengeluarkan bunyi", "gunakan televisyen dengan bijak", "telefon pintar amat berguna", "sila baca arahan dengan teliti"],
    reading: {
      passage: "Sandra menonton televisyen selepas menyiapkan kerja sekolah. Dia suka rancangan pendidikan sains. Rancangan itu memberikan banyak maklumat kepadanya.",
      questions: [
        { prompt: "Bilakah Sandra menonton televisyen?", answer: "Selepas menyiapkan kerja sekolah", options: ["Selepas menyiapkan kerja sekolah", "Semasa guru mengajar", "Sepanjang malam"] },
        { prompt: "Apakah rancangan yang disukai oleh Sandra?", answer: "Rancangan pendidikan sains", options: ["Rancangan pendidikan sains", "Iklan makanan", "Perlawanan bola sahaja"] },
      ],
    },
    language: [
      { prompt: "___ pencipta telefon?", answer: "Siapakah", options: ["Siapakah", "Bilakah", "Apakah"] },
      { prompt: "___ petik suis dengan tangan yang basah.", answer: "Jangan", options: ["Jangan", "Sila", "Tolong"] },
    ],
    order: ["Buku digital senang dibawa.", "Televisyen memberikan banyak maklumat."],
    write: ["teknologi", "telefon pintar"],
    oral: ["Gunakan teknologi dengan bijak.", "Buku digital hebat dan berguna."],
  },
  {
    unit: 15,
    theme: 5,
    title: "Bijak Mencipta",
    textbookPages: "89-94",
    standards: ["1.1.2(i)", "2.3.2(i)", "3.3.2(i)", "4.3.3(ii)", "5.1.4(vi)", "5.2.3"],
    listen: ["penyangkut tisu", "guna bahan kitar semula", "cipta hiasan cantik", "beg pintar boleh dikunci"],
    reading: {
      passage: "Zulkifli Haron ialah seorang pencipta. Beliau telah mencipta pelbagai benda yang berguna. Kita perlu rajin mencari ilmu jika mahu berjaya.",
      questions: [
        { prompt: "Siapakah Zulkifli Haron?", answer: "Seorang pencipta", options: ["Seorang pencipta", "Seorang jururawat", "Seorang pemandu"] },
        { prompt: "Apakah yang perlu dilakukan jika mahu berjaya?", answer: "Rajin mencari ilmu", options: ["Rajin mencari ilmu", "Malas berusaha", "Membuang masa"] },
      ],
    },
    language: [
      { prompt: "___, cantiknya hasil ciptaan itu!", answer: "Wah", options: ["Wah", "Tolong", "Jangan"] },
      { prompt: "Pilih kata ganda penuh.", answer: "warna-warna", options: ["warna-warna", "mewarnakan", "berwarna"] },
    ],
    order: ["Kita menggunakan bahan kitar semula.", "Beg pintar boleh dikunci secara digital."],
    write: ["kreatif", "penyangkut"],
    oral: ["Saya suka mereka cipta.", "Hasil ciptaan itu amat berguna."],
  },
  {
    unit: 16,
    theme: 6,
    title: "Sambut Perayaan",
    textbookPages: "97-101",
    standards: ["1.1.2(ii)", "2.3.2(iii)", "3.2.3", "4.3.3(i)", "5.2.1(i)"],
    listen: ["menyediakan hidangan untuk tetamu", "susun cawan dan piring", "hari raya hari gembira", "rakan-rakan datang berkunjung"],
    reading: {
      passage: "Keluarga Vimala menyambut Deepavali. Vimala dan ibunya menyediakan muruku dan ladu untuk tetamu. Mereka menyusun hidangan dengan kemas.",
      questions: [
        { prompt: "Apakah perayaan yang disambut oleh keluarga Vimala?", answer: "Deepavali", options: ["Deepavali", "Hari Kebangsaan", "Hari Sukan"] },
        { prompt: "Apakah hidangan yang disediakan?", answer: "Muruku dan ladu", options: ["Muruku dan ladu", "Sandwic dan mihun", "Roti dan sup"] },
      ],
    },
    language: [
      { prompt: "Pilih kata dasar.", answer: "masak", options: ["masak", "memasak", "dimasak"] },
      { prompt: "Kata dasar bagi ‘menyusun’ ialah ___.", answer: "susun", options: ["susun", "menyusun", "susunan"] },
    ],
    order: ["Rakan-rakan datang berkunjung.", "Kami menyambut perayaan bersama-sama."],
    write: ["perayaan", "tetamu"],
    oral: ["Selamat menyambut hari perayaan.", "Silalah jamu selera."],
  },
  {
    unit: 17,
    theme: 6,
    title: "Hargailah Seni",
    textbookPages: "102-107",
    standards: ["1.1.1(iii)", "2.3.2(iv)", "3.3.1(i)", "4.3.2(i)", "5.2.1(ii)", "5.1.4(v)"],
    listen: ["pergerakan taici sangat perlahan", "sulaman merupakan seni kreatif", "bakul siya diperbuat daripada buluh", "gendang Cina ialah alat muzik pukul"],
    reading: {
      passage: "Sulaman dibuat menggunakan tangan atau mesin. Sulaman menjadi hiasan pada pakaian. Kebaya nyonya mempunyai corak sulaman yang cantik dan unik.",
      questions: [
        { prompt: "Bagaimanakah sulaman dibuat?", answer: "Menggunakan tangan atau mesin", options: ["Menggunakan tangan atau mesin", "Menggunakan air sahaja", "Menggunakan cahaya"] },
        { prompt: "Apakah pakaian yang mempunyai sulaman cantik?", answer: "Kebaya nyonya", options: ["Kebaya nyonya", "Baju hujan", "Pakaian sukan"] },
      ],
    },
    language: [
      { prompt: "Pilih kata tunggal.", answer: "suka", options: ["suka", "kesukaan", "menyukai"] },
      { prompt: "___ sentuh alat muzik tanpa kebenaran.", answer: "Jangan", options: ["Jangan", "Sila", "Tolong"] },
    ],
    order: ["Sulaman merupakan seni kreatif.", "Senaman taici merehatkan badan."],
    write: ["sulaman", "seramik"],
    oral: ["Kita mestilah menghargai seni.", "Gendang Cina ialah alat muzik pukul."],
  },
  {
    unit: 18,
    theme: 6,
    title: "Indahnya Budi Bahasa",
    textbookPages: "108-113",
    standards: ["1.1.2(iv)", "2.3.2(ii)", "3.3.2(ii)", "4.3.3(ii)", "5.2.1(iii)", "5.2.2"],
    listen: ["tolong tampal poster", "minta izin daripada guru", "bantu cikgu membawa buku", "bercakap dengan sopan"],
    reading: {
      passage: "Sandra datang awal ke sekolah. Dia melihat Cikgu Wong membawa banyak buku. Sandra menawarkan diri untuk membantu gurunya.",
      questions: [
        { prompt: "Bilakah Sandra datang ke sekolah?", answer: "Awal", options: ["Awal", "Lewat malam", "Selepas sekolah tamat"] },
        { prompt: "Apakah bantuan yang ditawarkan oleh Sandra?", answer: "Membawa buku", options: ["Membawa buku", "Mencuci kereta", "Membeli makanan"] },
      ],
    },
    language: [
      { prompt: "Kata berimbuhan awalan bagi ‘bantu’ ialah ___.", answer: "membantu", options: ["membantu", "bantuan", "dibantu"] },
      { prompt: "Pilih ayat dengan tanda baca yang betul.", answer: "Terima kasih, cikgu.", options: ["Terima kasih, cikgu.", "terima kasih cikgu", "Terima kasih cikgu?"] },
    ],
    order: ["Sandra membantu Cikgu Wong.", "Kita hendaklah bercakap dengan sopan."],
    write: ["berbudi bahasa", "membantu"],
    oral: ["Bolehkah saya membantu cikgu?", "Terima kasih atas bantuan kamu."],
  },
  {
    unit: 19,
    theme: 7,
    title: "Cintailah Bahasa Kita",
    textbookPages: "116-120",
    standards: ["1.1.3(i)", "2.2.1(iii)", "3.2.2(ii)", "4.1.1(i)", "5.2.3"],
    listen: ["Minggu Bahasa Melayu", "permainan bahasa", "pertandingan bercerita", "cintailah bahasa kita"],
    reading: {
      passage: "Guan Hong suka membaca buku cerita berbahasa Melayu. Cikgu Wong memilihnya untuk menyertai pertandingan bercerita. Guan Hong berlatih dengan tekun lalu menjadi johan.",
      questions: [
        { prompt: "Apakah pertandingan yang disertai oleh Guan Hong?", answer: "Pertandingan bercerita", options: ["Pertandingan bercerita", "Pertandingan berenang", "Pertandingan memasak"] },
        { prompt: "Mengapakah Guan Hong berjaya menjadi johan?", answer: "Dia berlatih dengan tekun", options: ["Dia berlatih dengan tekun", "Dia tidak membuat persediaan", "Dia datang lewat"] },
      ],
    },
    language: [
      { prompt: "Udin berlari pantas macam ___.", answer: "kilat", options: ["kilat", "batu", "kayu"] },
      { prompt: "Udin rajin macam ___.", answer: "semut", options: ["semut", "gajah", "ikan"] },
    ],
    order: ["Guan Hong suka membaca buku cerita.", "Permainan bahasa menambahkan kosa kata."],
    write: ["bahasa", "bercerita"],
    oral: ["Bahasa Melayu bahasa kebangsaan kita.", "Saya suka bermain permainan bahasa."],
  },
  {
    unit: 20,
    theme: 7,
    title: "Malaysia Indah",
    textbookPages: "121-126",
    standards: ["1.1.3(ii)", "2.3.1(ii)", "3.2.3", "4.2.1(ii)", "5.3.1(i)", "5.3.1(ii)"],
    listen: ["bercuti ke Pulau Redang", "bawa baju mandi dan pelampung", "pemandangan sangat indah", "udara nyaman di tempat berkelah"],
    reading: {
      passage: "Keluarga Amira mahu bercuti ke Pulau Redang. Amira membawa baju mandi, gogal dan pelampung. Mereka membuat persediaan sebelum bertolak.",
      questions: [
        { prompt: "Ke manakah keluarga Amira mahu bercuti?", answer: "Pulau Redang", options: ["Pulau Redang", "Bukit Bendera", "Taman tema air"] },
        { prompt: "Apakah alat keselamatan yang dibawa oleh Amira?", answer: "Pelampung", options: ["Pelampung", "Pianika", "Penyangkut baju"] },
      ],
    },
    language: [
      { prompt: "Pilih ayat penyata.", answer: "Kampung Helmi sangat indah.", options: ["Kampung Helmi sangat indah.", "Di manakah kampung Helmi?", "Sila duduk."] },
      { prompt: "‘Air sungainya jernih.’ ialah ___.", answer: "ayat penyata", options: ["ayat penyata", "ayat tanya", "ayat perintah"] },
    ],
    order: ["Keluarga Amira bercuti ke Pulau Redang.", "Pemandangan di kampung sangat indah."],
    write: ["pelampung", "pemandangan"],
    oral: ["Malaysia mempunyai banyak tempat yang indah.", "Saya suka berkunjung ke Pulau Redang."],
  },
  {
    unit: 21,
    theme: 7,
    title: "Negara Tercinta",
    textbookPages: "127-132",
    standards: ["1.2.1", "2.3.2(iv)", "3.3.1(ii)", "4.2.1(iii)", "5.3.1(iii)", "5.3.1(iv)"],
    listen: ["bunga raya bunga kebangsaan", "lagu kebangsaan negara kita", "berdiri tegak ketika menyanyi", "masyarakat hidup bersatu padu"],
    reading: {
      passage: "Lagu kebangsaan negara kita ialah ‘Negaraku’. Kita mestilah berdiri tegak dan menyanyikannya dengan penuh semangat. Lagu itu menimbulkan rasa cinta akan negara.",
      questions: [
        { prompt: "Apakah lagu kebangsaan negara kita?", answer: "Negaraku", options: ["Negaraku", "Rasa Sayang", "Kalau Berkawan"] },
        { prompt: "Bagaimanakah kita menghormati lagu kebangsaan?", answer: "Berdiri tegak ketika menyanyi", options: ["Berdiri tegak ketika menyanyi", "Duduk dan berbual", "Berlari-lari"] },
      ],
    },
    language: [
      { prompt: "___ tokoh negara itu?", answer: "Siapakah", options: ["Siapakah", "Apakah", "Bilakah"] },
      { prompt: "___ bawa Jalur Gemilang ke sekolah.", answer: "Tolong", options: ["Tolong", "Apakah", "Wah"] },
    ],
    order: ["Kita mestilah menghormati lagu kebangsaan.", "Masyarakat Malaysia hidup bersatu padu."],
    write: ["Negaraku", "patriotik"],
    oral: ["Saya cinta akan negara Malaysia.", "Kita hidup harmoni dan bersatu padu."],
  },
  {
    unit: 22,
    theme: 8,
    title: "Urus Wang",
    textbookPages: "135-139",
    standards: ["1.1.3(ii)", "2.1.2(iii)", "3.2.2(i)", "4.3.1(ii)", "5.3.2(i)"],
    listen: ["simpan wang di dalam beg duit", "berbelanja dengan cermat", "masukkan baki wang ke dalam tabung", "rancang perbelanjaan harian"],
    reading: {
      passage: "Ayah memberi Helmi wang belanja sebanyak tiga ringgit. Helmi merancang perbelanjaannya. Dia memasukkan baki wang ke dalam tabung.",
      questions: [
        { prompt: "Berapakah wang belanja Helmi?", answer: "Tiga ringgit", options: ["Tiga ringgit", "Lima ringgit", "Sepuluh ringgit"] },
        { prompt: "Di manakah Helmi menyimpan baki wang?", answer: "Di dalam tabung", options: ["Di dalam tabung", "Di atas meja", "Di dalam kasut"] },
      ],
    },
    language: [
      { prompt: "Pilih ayat dasar.", answer: "Zhi Ying menabung.", options: ["Zhi Ying menabung.", "Zhi Ying menabung dan berjimat.", "Mengapakah Zhi Ying menabung?"] },
      { prompt: "Helmi ___ setiap hari.", answer: "berjimat", options: ["berjimat", "membazir", "berebut"] },
    ],
    order: ["Helmi merancang perbelanjaannya.", "Zhi Ying menabung setiap hari."],
    write: ["tabung", "berjimat"],
    oral: ["Saya berbelanja dengan cermat.", "Baki wang disimpan di dalam tabung."],
  },
  {
    unit: 23,
    theme: 8,
    title: "Rajin Berusaha",
    textbookPages: "140-145",
    standards: ["1.2.1", "2.2.1(ii)", "3.2.2(ii)", "4.3.2(ii)", "5.3.2(ii)", "5.3.2(iii)"],
    listen: ["rajin belajar Matematik", "mahir membaiki jam", "melayan pelanggan dengan mesra", "berusaha memajukan perniagaan"],
    reading: {
      passage: "Ayah Zhi Ying mempunyai Kedai Jam Tik Tok. Beliau mahir membaiki jam dan melayan pelanggan dengan mesra. Perniagaannya semakin maju kerana beliau rajin berusaha.",
      questions: [
        { prompt: "Apakah kemahiran ayah Zhi Ying?", answer: "Membaiki jam", options: ["Membaiki jam", "Membuat pasu", "Menjahit baju"] },
        { prompt: "Mengapakah perniagaannya semakin maju?", answer: "Beliau rajin berusaha", options: ["Beliau rajin berusaha", "Beliau selalu lewat", "Beliau tidak melayan pelanggan"] },
      ],
    },
    language: [
      { prompt: "Pilih ayat tunggal.", answer: "Nenek menjahit cadar.", options: ["Nenek menjahit cadar.", "Nenek menjahit cadar dan langsir.", "Nenek menjahit kerana rajin."] },
      { prompt: "Pilih ayat majmuk.", answer: "Datuk menternak kambing dan lembu.", options: ["Datuk menternak kambing dan lembu.", "Datuk bekerja.", "Kambing makan."] },
    ],
    order: ["Ayah Zhi Ying mahir membaiki jam.", "Fendi rajin membuat latihan Matematik."],
    write: ["pelanggan", "perniagaan"],
    oral: ["Kita mestilah rajin berusaha.", "Pelanggan dilayan dengan mesra."],
  },
  {
    unit: 24,
    theme: 8,
    title: "Bijak Berbelanja",
    textbookPages: "146-151",
    standards: ["1.2.2", "2.2.1(iii)", "3.3.2(iii)", "4.2.2(i)", "5.3.1(iii)", "5.3.1(iv)"],
    listen: ["bandingkan harga sebelum membeli", "pilih barang yang bermutu", "membeli kasut sekolah", "berbelanja dengan bijak"],
    reading: {
      passage: "Anand membandingkan harga kasut sekolah di dua buah kedai. Kasut yang sama berharga tiga puluh lima ringgit di Kedai Kasut Selesa dan tiga puluh ringgit di Kedai Kasut Kawan. Anand memilih kasut yang lebih murah.",
      questions: [
        { prompt: "Kedai manakah yang menjual kasut lebih murah?", answer: "Kedai Kasut Kawan", options: ["Kedai Kasut Kawan", "Kedai Kasut Selesa", "Kedai Jam Tik Tok"] },
        { prompt: "Berapakah harga kasut yang dipilih oleh Anand?", answer: "Tiga puluh ringgit", options: ["Tiga puluh ringgit", "Tiga puluh lima ringgit", "Lima puluh ringgit"] },
      ],
    },
    language: [
      { prompt: "___ harga biskut itu?", answer: "Berapakah", options: ["Berapakah", "Siapakah", "Bilakah"] },
      { prompt: "___ pilih baju yang sesuai.", answer: "Sila", options: ["Sila", "Wah", "Apakah"] },
    ],
    order: ["Anand membandingkan harga kasut.", "Amira memilih barang yang bermutu."],
    write: ["berbelanja", "bermutu"],
    oral: ["Saya membandingkan harga sebelum membeli.", "Kita mestilah berbelanja dengan bijak."],
  },
];

export const themeTitles: Record<number, string> = {
  1: "Keluarga Saya",
  2: "Rakan dan Jiran",
  3: "Kita Bersih Kita Sihat",
  4: "Kita Cermat Kita Selamat",
  5: "Bijak Sains, Teknologi dan Inovasi",
  6: "Budaya Bangsa",
  7: "Sayangi Malaysia",
  8: "Wang dan Perbelanjaan",
};

export const questionBankStats = {
  units: curriculumUnits.length,
  listen: curriculumUnits.reduce((total, unit) => total + unit.listen.length, 0),
  read: curriculumUnits.reduce((total, unit) => total + unit.reading.questions.length, 0),
  language: curriculumUnits.reduce((total, unit) => total + unit.language.length, 0),
  order: curriculumUnits.reduce((total, unit) => total + unit.order.length, 0),
  write: curriculumUnits.reduce((total, unit) => total + unit.write.length, 0),
  oral: curriculumUnits.reduce((total, unit) => total + unit.oral.length, 0),
};
