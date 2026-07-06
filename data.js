// Data Simulasi Peradilan Pidana berbasis konfigurasi peran - HakimPintar AI

const AGENT_PROFILES = {
  hakim: {
    name: "Anda (Hakim Ketua Pemula)",
    role: "Hakim Ketua",
    avatar: "HK",
    desc: "Bertanggung jawab memimpin persidangan, menguji keabsahan bukti digital, menilai kesesuaian kesaksian, dan menjatuhkan putusan hukum berdasarkan KUHP 2023 & KUHAP 2025.",
    profileModule: {
      identitas: "Hakim Ketua Utama",
      peran: "Memimpin jalannya persidangan, memutus sela perkara, menguji fakta bukti di pengadilan, dan menjatuhkan vonis pidana.",
      strategi: "Objektif, imparsial, kritis terhadap bukti sains/teknologi forensik digital, serta menerapkan pemidanaan yang restoratif."
    },
    memoryModule: {
      shortTerm: "Mengingat jalannya persidangan antar sesi dialog (Sesi 1 sampai Sesi 8).",
      longTerm: "Mempelajari Berkas Perkara Pidana No. 472/Pid.B/2026/PN.JKT.SEL atas nama Terdakwa Adi Saputra."
    },
    strategyModule: {
      taktik: "Mendengarkan saksi secara aktif, menguji rantai penanganan bukti (chain of custody), dan memanfaatkan daftar rujukan hukum."
    },
    legalRetriever: {
      RAGAccess: ["KUHP 2023", "KUHAP 2025", "Yurisprudensi Mahkamah Agung", "Surat Edaran Mahkamah Agung (SEMA)"]
    },
    llmEngine: {
      model: "Human Judge Sandbox (Interaktif)",
      temperature: 0,
      promptTemplate: "Ditentukan oleh input manual hakim pemula di persidangan."
    }
  },
  jaksa: {
    name: "Reza Utama, S.H. (JPU)",
    role: "Jaksa Penuntut Umum",
    avatar: "JPU",
    desc: "Representasi negara yang mendakwa Adi Saputra melakukan pencurian dengan pemberatan. Sangat bersikeras bahwa bukti digital CCTV dan GPS ponsel terdakwa valid dan sah demi hukum.",
    profileModule: {
      identitas: "Jaksa Penuntut Umum Kejaksaan Negeri Jkt-Sel",
      peran: "Menuntut terdakwa bersalah atas dasar dakwaan tunggal pencurian dengan pemberatan (Pasal 477 KUHP 2023).",
      strategi: "Menegakkan dakwaan dengan fokus pada keselarasan bukti sains forensik dengan keterangan saksi korban."
    },
    memoryModule: {
      shortTerm: "Merekam tanggapan terdakwa dan eksepsi penasihat hukum terkait tanggal penyitaan bukti.",
      longTerm: "Melampirkan BAP Lab Forensik Mabes Polri, CCTV asli/enhanced, serta data carrier operator seluler."
    },
    strategyModule: {
      taktik: "Menolak dalil eksepsi dengan justifikasi penyitaan darurat (Pasal 91 KUHAP 2025) guna mengamankan integritas data."
    },
    legalRetriever: {
      RAGAccess: ["Pasal 477 KUHP 2023", "Pasal 91 KUHAP 2025 (Penyitaan Darurat)", "SOP Penyitaan Digital Forensik Polri"]
    },
    llmEngine: {
      model: "Model Respons Hukum",
      temperature: 0.3,
      tugas: "Membaca dakwaan, tuntutan, dan melakukan cross-examine saksi secara kritis.",
      promptTemplate: "System: Bertindaklah sebagai Jaksa Penuntut Umum yang tegas, menekankan pembuktian digital ilmiah dan menentang argumen penasihat hukum yang mengada-ada..."
    }
  },
  advokat: {
    name: "Farhan Lubis, S.H. (PH)",
    role: "Penasihat Hukum / Advokat",
    avatar: "PH",
    desc: "Advokat terdakwa yang ahli hukum acara pidana dan sangat kritis terhadap prosedur penyitaan digital (*chain of custody*). Ia berusaha membuktikan alibi kliennya dan kecacatan formil bukti JPU.",
    profileModule: {
      identitas: "Advokat & Konsultan Hukum (Lubis & Associates)",
      peran: "Membela hak konstitusional Terdakwa, membongkar kecacatan prosedur penyitaan, dan mengajukan rehabilitasi/pembebasan.",
      strategi: "Menyerang validitas formil bukti elektronik JPU dan meminta alternatif pidana pengawasan/kerja sosial."
    },
    memoryModule: {
      shortTerm: "Mencatat inkonsistensi waktu saksi korban dan log koordinat GPS/BTS yang diajukan ahli.",
      longTerm: "Memegang kronologi pembelaan terdakwa yang menyatakan HP-nya disita paksa tanpa surat pengadilan."
    },
    strategyModule: {
      taktik: "Memanfaatkan doktrin 'Fruit of the Poisonous Tree' pada penyitaan digital yang terlambat disahkan PN."
    },
    legalRetriever: {
      RAGAccess: ["Putusan MK No. 20/PUU-XIV/2016", "Pasal 91 & 93 KUHAP 2025 (Verifikasi Hash)", "Pedoman Pemidanaan Alternatif Pasal 65 KUHP 2023"]
    },
    llmEngine: {
      model: "Model Respons Pembelaan",
      temperature: 0.25,
      tugas: "Mengajukan eksepsi formil, menyusun pleidoi pembelaan, dan memohon pidana alternatif KUHP 2023.",
      promptTemplate: "System: Bertindaklah sebagai Advokat yang jeli mendeteksi cacat formil hukum acara. Perjuangkan asas fair trial dan hak asasi terdakwa..."
    }
  },
  terdakwa: {
    name: "Adi Saputra",
    role: "Terdakwa",
    avatar: "T",
    desc: "Didakwa mencuri tas berisi uang Rp 15 juta dari kasir minimarket. Mengaku sedang tertidur di kamar kosnya saat kejadian berlangsung, namun memiliki riwayat chat mencurigakan.",
    profileModule: {
      identitas: "Terdakwa Adi Saputra (24 Tahun)",
      peran: "Memberikan pembelaan/keterangan yang konsisten dengan alibi tertidur di kos.",
      strategi: "Menolak tuduhan pencurian dan menyatakan HP disita secara paksa dengan intimidasi penyidik."
    },
    memoryModule: {
      shortTerm: "Merespon pertanyaan hakim ketua dan jaksa mengenai motor pinjaman dan chat iPhone 14 Pro.",
      longTerm: "Mengingat kronologi peminjaman motor teman pada jam 22:30 hanya untuk membeli makan di Menteng."
    },
    strategyModule: {
      taktik: "Memberikan jawaban defensif dan klaim kebetulan atas chat penawaran iPhone 14 Pro sesaat setelah perampokan."
    },
    legalRetriever: {
      RAGAccess: ["Pasal 184 KUHAP (Hak memberikan keterangan bebas tekanan)"]
    },
    llmEngine: {
      model: "Model Respons Terdakwa",
      temperature: 0.5,
      tugas: "Memberikan alibi konsisten dan menjawab pertanyaan interogatif dari JPU dan Hakim.",
      promptTemplate: "System: Anda adalah Adi Saputra. Bersikeraslah bahwa Anda tidak bersalah dan berada di kos. Berikan respon gugup namun defensif saat diuji..."
    }
  },
  saksi1: {
    name: "Sandi",
    role: "Saksi Korban (Kasir)",
    avatar: "SK",
    desc: "Kasir minimarket yang ditodong oleh pelaku. Mengalami trauma psikologis namun ingat jaket berlogo lingkaran merah yang digunakan pelaku.",
    profileModule: {
      identitas: "Saksi Korban / Kasir Minimarket",
      peran: "Menjelaskan kronologi penodongan pelaku secara visual dan situasional.",
      strategi: "Memberikan keterangan apa adanya sesuai ingatan trauma visual (ciri fisik pelaku, jaket, masker)."
    },
    memoryModule: {
      shortTerm: "Mengkonfirmasi barang bukti jaket bertuliskan 'RED RIDER' yang ditunjukkan hakim.",
      longTerm: "Merekam detail penodongan pisau dapur kecil merah ke lehernya di kasir pukul 23:15."
    },
    strategyModule: {
      taktik: "Konsisten pada ciri jaket dan perawakan pelaku, meskipun wajah tidak terlihat jelas karena masker."
    },
    legalRetriever: {
      RAGAccess: ["Kewajiban saksi memberikan keterangan yang benar (Pasal 242 KUHP Lama / Pasal 395 KUHP Baru)"]
    },
    llmEngine: {
      model: "Model Respons Saksi",
      temperature: 0.4,
      tugas: "Memberi kesaksian dengan memori peristiwa trauma visual yang konsisten, termasuk ciri pelaku, jaket, dan pisau.",
      promptTemplate: "System: Anda adalah Sandi. Berikan kesaksian dengan nada trauma yang jujur. Fokus pada ciri jaket hitam lingkaran merah..."
    }
  },
  saksi2: {
    name: "Briptu Dian Saputra, S.Kom.",
    role: "Saksi Ahli Digital Forensik",
    avatar: "AF",
    desc: "Ahli Lab Forensik Polri yang menjelaskan pemrosesan rekaman CCTV dan metadata log HP terdakwa.",
    profileModule: {
      identitas: "Ahli Digital Forensik Puslabfor Polri",
      peran: "Menyajikan hasil analisis ilmiah mengenai orisinalitas CCTV dan jejak lokasi GPS/BTS seluler.",
      strategi: "Mempertahankan validitas data berbasis log hash, stempel waktu, dan mitigasi spoofing seluler."
    },
    memoryModule: {
      shortTerm: "Menanggapi pertanyaan advokat tentang potensi bias pemrosesan gambar digital.",
      longTerm: "Menyimpan seluruh catatan log filter restorasi dan data log dari operator telekomunikasi."
    },
    strategyModule: {
      taktik: "Menjelaskan secara saintifik bahwa koordinat GPS divalidasi silang dengan log BTS operator seluler (tidak bisa dimanipulasi lokal)."
    },
    legalRetriever: {
      RAGAccess: ["Standar ISO/IEC 27037 (Penanganan Bukti Digital)", "Panduan Audit Forensik Komputer Kementerian Hukum"]
    },
    llmEngine: {
      model: "Model Respons Ahli",
      temperature: 0.15,
      tugas: "Menganalisis bukti digital secara forensik: restorasi CCTV, verifikasi hash, dan triangulasi GPS/BTS seluler.",
      promptTemplate: "System: Bertindaklah sebagai Ahli Digital Forensik yang berbicara dengan data ilmiah, menggunakan terminologi teknis yang mudah dipahami hakim..."
    }
  },
  hakimAsisten: {
    name: "ARIA (Asisten Analisis Yudisial)",
    role: "Asisten Analisis",
    avatar: "AI",
    desc: "Asisten analisis yang membantu Hakim Ketua meninjau kesesuaian fakta hukum, menyusun draft pertimbangan, dan mengevaluasi validitas alat bukti elektronik dalam skenario.",
    profileModule: {
      identitas: "Asisten Analisis Yudisial ARIA",
      peran: "Menganalisis fakta persidangan, memeriksa argumen hukum, dan menyusun draft amar putusan yang proporsional.",
      strategi: "Menggabungkan rujukan hukum dalam skenario dengan inferensi logika deduktif untuk menghasilkan rekomendasi objektif."
    },
    memoryModule: {
      shortTerm: "Merekam seluruh transkrip persidangan per sesi dan mengidentifikasi inkonsistensi pernyataan antar agen.",
      longTerm: "Menyimpan ringkasan berkas perkara, BAP, keterangan saksi, dan rujukan yurisprudensi yang relevan."
    },
    strategyModule: {
      taktik: "Melakukan pemeriksaan silang antara keterangan saksi, log GPS/BTS, nilai hash CCTV, dan rujukan KUHP/KUHAP untuk mendeteksi inkonsistensi yang signifikan."
    },
    legalRetriever: {
      RAGAccess: [
        "KUHP 2023 (Full Corpus)",
        "KUHAP 2025 (Full Corpus)",
        "Yurisprudensi Mahkamah Agung RI",
        "Standar ISO/IEC 27037 Forensik Digital",
        "SEMA & PERMA Mahkamah Agung",
        "Doktrin Hukum Pidana Internasional"
      ]
    },
    llmEngine: {
      model: "Model Analitis Yudisial",
      temperature: 0.05,
      tugas: "Membantu Hakim menganalisis fakta persidangan, memvalidasi argumen, dan menyusun draft konsideran putusan hukum yang terstruktur.",
      promptTemplate: "System: Anda adalah ARIA, Hakim Asisten AI dengan akses penuh ke corpus hukum Indonesia. Analisis fakta sidang secara imparsial dan rekomendasikan pertimbangan hukum yang terukur..."
    }
  }
};

const COMPARATIVE_LAW = {
  kuhp: {
    title: "KUHP Baru (UU No. 1/2023) vs KUHP Lama (WvS)",
    items: [
      {
        topic: "Pencurian Biasa",
        lama: "Pasal 362: Ancaman pidana penjara paling lama 5 tahun atau denda paling banyak sembilan ratus rupiah.",
        baru: "Pasal 476: Ancaman pidana penjara paling lama 5 tahun atau denda Kategori IV (maksimal Rp 500 juta). Mengutamakan denda sebelum penjara."
      },
      {
        topic: "Pencurian dengan Pemberatan (Malam hari/Merusak)",
        lama: "Pasal 363 ayat (1) ke-3, ke-4, ke-5: Penjara paling lama 7 tahun (keadaan memberatkan).",
        baru: "Pasal 477 ayat (1): Pencurian di waktu malam, di tempat tinggal, atau dengan merusak/memanjat diancam penjara paling lama 7 tahun atau denda Kategori V (maksimal Rp 2 miliar)."
      },
      {
        topic: "Pidana Alternatif / Kerja Sosial",
        lama: "Tidak diatur. Penjara adalah satu-satunya hukuman utama bagi tindak pidana pencurian.",
        baru: "Pasal 65 & 85: Jika pidana penjara yang dijatuhkan di bawah 5 tahun, hakim dapat menjatuhkan pidana pengawasan atau pidana kerja sosial (Restorative Justice) dengan syarat tertentu."
      }
    ]
  },
  kuhap: {
    title: "KUHAP Baru (UU 2025) vs KUHAP Lama (UU No. 8/1981)",
    items: [
      {
        topic: "Legalitas Bukti Digital",
        lama: "Bukti elektronik tidak diatur secara rigid dalam KUHAP lama. Hanya diperluas melalui UU ITE Pasal 5.",
        baru: "Pasal 86: Informasi dan/atau dokumen elektronik serta hasil cetaknya diakui sebagai jenis alat bukti mandiri yang kedudukannya sejajar dengan surat dan petunjuk."
      },
      {
        topic: "Penyitaan Darurat (Tanpa Izin PN)",
        lama: "Penyitaan dalam keadaan mendesak diperbolehkan, namun harus segera dilaporkan ke Ketua PN tanpa batas waktu tegas.",
        baru: "Pasal 91: Penyitaan digital darurat harus dilaporkan dan dimintakan persetujuan tertulis Ketua PN maksimal 2x24 jam sejak penyitaan dilakukan. Jika lewat, bukti digital batal demi hukum."
      },
      {
        topic: "Chain of Custody (Integritas Bukti)",
        lama: "Tidak ada standardisasi pencatatan teknis seperti nilai hash file digital di dalam KUHAP.",
        baru: "Pasal 93: Wajib mencantumkan stempel waktu, penanganan beruntun (*chain of custody*), nilai hash sidik jari berkas digital, dan metode penyalinan forensik dalam berita acara penyitaan."
      }
    ]
  }
};

const TRIAL_SESSIONS = [
  {
    number: 1,
    title: "Pembacaan Dakwaan",
    speaker: "Jaksa & Terdakwa",
    description: "Hakim membuka sidang, Jaksa membacakan surat dakwaan Pasal 477 KUHP 2023, Hakim mencatat pokok dakwaan, dan Terdakwa menyatakan pemahaman.",
    guideline: "Perhatikan dakwaan JPU. Pastikan unsur perbuatan melawan hukum dirumuskan dengan jelas.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Sidang perkara pidana Nomor 472/Pid.B/2026/PN.JKT.SEL dengan terdakwa Adi Saputra dinyatakan dibuka. [Ketuk Palu 1x]" },
      { speaker: "Hakim Ketua", text: "Jaksa Penuntut Umum, silakan bacakan surat dakwaan." },
      { speaker: "Jaksa (JPU)", text: "Terima kasih, Yang Mulia. Bahwa Terdakwa Adi Saputra pada 12 April 2026 pukul 23:15 WIB mengambil tas hitam berisi uang Rp 15.000.000 milik saksi korban Sandi dengan merusak laci kasir." },
      { speaker: "Jaksa (JPU)", text: "Perbuatan terdakwa diatur dan diancam pidana berdasarkan Pasal 477 KUHP Baru (UU No. 1/2023)." },
      { speaker: "Hakim Ketua", text: "Terdakwa, apakah Saudara mengerti isi dakwaan tersebut?" },
      { speaker: "Terdakwa", text: "Saya mengerti dakwaannya, Yang Mulia. Tapi saya tidak pernah melakukan pencurian itu." }
    ]
  },
  {
    number: 2,
    title: "Eksepsi",
    speaker: "Advokat & Hakim",
    description: "Advokat mengajukan keberatan. Fokus pada keabsahan bukti CCTV + AI enhancement. Hakim kemudian memutuskan nasib eksepsi ini.",
    guideline: "Analisis dalil eksepsi Advokat. Putuskan apakah eksepsi mengenai AI enhancement dan prosedur bukti digital ini diterima atau ditolak.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Penasihat Hukum, apakah akan mengajukan Eksepsi?" },
      { speaker: "Advokat (PH)", text: "Benar, Yang Mulia. Kami mengajukan Eksepsi atas keabsahan bukti digital. Penyitaan CCTV dan HP terdakwa melanggar batas waktu 2x24 jam sesuai Pasal 91 KUHAP 2025." },
      { speaker: "Advokat (PH)", text: "Selain itu, bukti CCTV telah dimanipulasi dengan algoritma AI Super Resolution yang rawan bias (hallucination)." },
      { speaker: "Jaksa (JPU)", text: "Keberatan kami tolak, Yang Mulia. Penggunaan AI hanya untuk deblurring visual, bukan manipulasi. Log hash asli juga terjaga utuh." },
      { speaker: "Hakim Ketua", text: "Baik. Majelis telah mencatat keberatan dan tanggapan. Majelis akan menetapkan Putusan Sela." }
    ],
    interactive: true,
    options: [
      {
        id: "tolak-eksepsi",
        label: "TOLAK EKSEPSI (Sidang Lanjut)",
        verdict: "Menyatakan keberatan Penasihat Hukum tidak dapat diterima, memerintahkan persidangan ini dilanjutkan ke tahap pembuktian.",
        scoreModifier: { logic: 10, procedure: 5 },
        feedback: "Keputusan tepat. Hakim berwenang melanjutkan sidang untuk membuktikan materi perkara utama demi keadilan korban."
      },
      {
        id: "terima-eksepsi",
        label: "TERIMA EKSEPSI (Dakwaan Gugur)",
        verdict: "Menyatakan menerima Eksepsi Penasihat Hukum Terdakwa, menyatakan dakwaan JPU batal demi hukum.",
        scoreModifier: { logic: 10, procedure: 10 },
        feedback: "Menggugurkan perkara karena cacat formil. Namun untuk tujuan simulasi, persidangan akan 'dipaksa' lanjut ke pembuktian."
      }
    ]
  },
  {
    number: 3,
    title: "Pemeriksaan Saksi 1 (Korban)",
    speaker: "Saksi 1 & Hakim",
    description: "Hakim menggali kronologi kejadian. Saksi AI memberi kesaksian detail. Hakim menggali informasi kerugian.",
    guideline: "Uji ingatan visual saksi korban terhadap pelaku dan rekaman CCTV. Anda dapat melakukan filter AI pada rekaman CCTV untuk memvalidasi ciri jaket pelaku.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Saksi Sandi, silakan ceritakan kronologi kejadian dan sebutkan informasi kerugian yang Anda alami." },
      { speaker: "Saksi 1 (Sandi)", text: "Malam itu sekitar jam 23:15, pelaku masuk menodongkan pisau, merusak laci kasir, dan mengambil tas berisi uang operasional sebesar Rp 15 juta." },
      { speaker: "Saksi 1 (Sandi)", text: "Pelaku memakai masker dan jaket hitam bertudung yang ada logo lingkaran merahnya. Tulisannya 'RED RIDER'." },
      { speaker: "Hakim Ketua", text: "Jaksa, silakan tampilkan rekaman CCTV untuk dikonfrontasi dengan keterangan saksi." },
      { speaker: "Jaksa (JPU)", text: "Baik Yang Mulia. Kami akan menerapkan filter AI untuk memperjelas logo jaket pelaku di CCTV." }
    ],
    interactive: true,
    task: "verify-cctv"
  },
  {
    number: 4,
    title: "Pemeriksaan Saksi 2 (Ahli Digital)",
    speaker: "Saksi Ahli Digital",
    description: "Saksi ahli menjelaskan keabsahan dan potensi bias bukti digital. Evaluasi validitas AI enhancement.",
    guideline: "Evaluasi keandalan bukti ilmiah. Periksa timeline log GPS ponsel terdakwa di peta untuk melihat apakah alibinya sah.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Saksi Ahli, mohon jelaskan metode analisis bukti digital dan evaluasi validitas dari AI enhancement yang digunakan penyidik." },
      { speaker: "Saksi Ahli", text: "Kami menggunakan AI Super Resolution untuk CCTV dengan validasi nilai hash SHA256 asli yang tidak berubah. AI tidak mengubah bentuk materiil, hanya menajamkan pixel." },
      { speaker: "Saksi Ahli", text: "Selain itu, kami mengekstraksi log GPS Google Maps dan CDR (Call Detail Record) BTS seluler milik ponsel Terdakwa." },
      { speaker: "Saksi Ahli", text: "Berdasarkan log BTS, ponsel terdakwa terdeteksi berada di area Sudirman pada pukul 23:15, berimpit dengan TKP." },
      { speaker: "Advokat (PH)", text: "Apakah data koordinat itu bisa dipalsukan?" },
      { speaker: "Saksi Ahli", text: "Koordinat perangkat bisa di-spoof, tetapi log BTS dari infrastruktur operator jaringan tidak bisa dipalsukan oleh pengguna." }
    ],
    interactive: true,
    task: "verify-gps"
  },
  {
    number: 5,
    title: "Pemeriksaan Terdakwa",
    speaker: "Terdakwa",
    description: "Hakim bertanya tentang alibi. Terdakwa menjawab pertanyaan. Hakim menggali konsistensi keterangan.",
    guideline: "Tanyakan terdakwa mengenai alibinya dan konfrontasi dengan jejak BTS seluler yang menunjukkan ia berada di lokasi kejahatan.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Terdakwa Adi, alibi Anda berada di kos Menteng. Tapi saksi ahli membuktikan ponsel Anda berada di Sudirman pada jam 23:15. Jelaskan!" },
      { speaker: "Terdakwa", text: "Saya tidak tahu Yang Mulia! Saya tidur di kos. Mungkin ponsel saya tertinggal di motor teman, atau diretas!" },
      { speaker: "Hakim Ketua", text: "Jika ponsel Anda tertinggal, bagaimana Anda bisa mengirim chat pada jam 23:48 menawarkan HP iPhone 14 Pro sesaat setelah perampokan?" },
      { speaker: "Terdakwa", text: "Itu... ponsel lama saya yang ingin saya jual, kebetulan saja saya tawarkan malam itu karena butuh uang." }
    ]
  },
  {
    number: 6,
    title: "Tuntutan",
    speaker: "Jaksa Penuntut Umum",
    description: "Jaksa menyampaikan tuntutan pidana, mempertimbangkan faktor memberatkan dan meringankan. Tuntutan: 5 tahun penjara + denda Rp 10.000.000.",
    guideline: "Catat tuntutan hukuman JPU. Jaksa menuntut hukuman maksimal berdasarkan Pasal 477 KUHP 2023.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Agenda selanjutnya adalah pembacaan Surat Tuntutan (Requisitoir) oleh Penuntut Umum. Silakan." },
      { speaker: "Jaksa (JPU)", text: "Menimbang bukti forensik digital, Terdakwa Adi Saputra terbukti secara sah bersalah melakukan tindak pidana pencurian Pasal 477 KUHP Baru." },
      { speaker: "Jaksa (JPU)", text: "Hal yang memberatkan: kejahatan terdakwa meresahkan masyarakat dan terdakwa berbelit-belit. Hal meringankan: terdakwa belum pernah dihukum." },
      { speaker: "Jaksa (JPU)", text: "Maka kami menuntut Majelis Hakim menjatuhkan pidana penjara selama 5 (lima) tahun dan denda sebesar Rp 10.000.000 (sepuluh juta rupiah) subsider 3 bulan kurungan." }
    ]
  },
  {
    number: 7,
    title: "Pembelaan (Pleidoi)",
    speaker: "Penasihat Hukum",
    description: "Advokat menyampaikan pembelaan akhir, menekankan aspek kemanusiaan dan rehabilitasi, lalu meminta keringanan hukuman.",
    guideline: "Pertimbangkan permohonan Advokat yang merujuk pada rehabilitasi dan pidana kerja sosial berdasarkan pedoman pemidanaan alternatif KUHP 2023.",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Silakan Penasihat Hukum membacakan Nota Pembelaan (Pledoi)." },
      { speaker: "Advokat (PH)", text: "Yang Mulia, kami memohon keadilan yang mengedepankan sisi kemanusiaan. Terdakwa adalah pemuda yang baru pertama kali tersandung kasus." },
      { speaker: "Advokat (PH)", text: "Menghukum terdakwa 5 tahun penjara hanya akan menghancurkan masa depannya. Kami memohon Majelis mengutamakan prinsip Restorative Justice." },
      { speaker: "Advokat (PH)", text: "Sesuai pedoman Pasal 65 KUHP Baru 2023, kami memohon agar terdakwa dijatuhi pidana alternatif berupa Pidana Kerja Sosial atau Pidana Pengawasan demi rehabilitasi." }
    ]
  },
  {
    number: 8,
    title: "Musyawarah & Putusan",
    speaker: "Hakim (Anda)",
    description: "Hakim pemula menganalisis semua fakta, mempertimbangkan keabsahan bukti, konsistensi keterangan, dan hukum. Hakim menjatuhkan putusan dengan pertimbangan lengkap.",
    guideline: "Formulasikan keputusan akhir Anda. Sistem akan mengevaluasi logika hukum Anda terhadap Pasal 477 KUHP 2023 dan penerapan pemidanaan alternatif.",
    interactive: true,
    task: "final-verdict",
    dialogues: [
      { speaker: "Hakim Ketua", text: "Setelah memeriksa seluruh saksi, ahli, bukti digital AI, serta mendengarkan Tuntutan dan Pembelaan, Majelis Hakim akan menjatuhkan Putusan Akhir." },
      { speaker: "Hakim Asisten (ARIA)", text: "Saran ARIA: Logika deduktif membuktikan terdakwa berada di TKP. Karena terdakwa non-resividis dan ancaman hukuman < 5 tahun, penerapan pidana alternatif dapat dipertimbangkan sesuai KUHP 2023." },
      { speaker: "Hakim Ketua", text: "Tugas Anda sekarang: Isilah formulir amar putusan di sebelah kanan, dan tentukan apakah ia dipenjara atau dikenai hukuman kerja sosial." }
    ]
  }
];

// Rubrik instrumen penilaian untuk mengevaluasi kualitas putusan hakim pemula
const EVALUATION_RUBRIC = {
  evidenceVerification: {
    weight: 30,
    title: "Evaluasi Bukti Digital & AI (Bobot 30%)",
    desc: "Menilai seberapa kritis hakim dalam memvalidasi keabsahan bukti CCTV olahan AI dan metadata GPS/BTS (Chain of Custody, nilai hash)."
  },
  articleApplication: {
    weight: 25,
    title: "Penerapan Pasal KUHP Baru 2023 (Bobot 25%)",
    desc: "Ketepatan mencocokkan dakwaan pencurian dengan pemberatan (Pasal 477 KUHP Baru) dengan kronologi perusakan kunci laci minimarket di waktu malam."
  },
  proceduralJustice: {
    weight: 20,
    title: "Kepatuhan Hukum Acara KUHAP 2025 (Bobot 20%)",
    desc: "Ketajaman mengevaluasi penyitaan HP darurat tanpa izin pengadilan yang terlambat dilaporkan penyidik (Pasal 91 KUHAP Baru)."
  },
  sentencingProportionality: {
    weight: 25,
    title: "Keadilan & Proporsionalitas Hukuman (Bobot 25%)",
    desc: "Pemberian sanksi pidana alternatif (penjara vs kerja sosial/pengawasan) yang proporsional sesuai asas pedoman pemidanaan KUHP Baru."
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AGENT_PROFILES, COMPARATIVE_LAW, TRIAL_SESSIONS, EVALUATION_RUBRIC };
}
