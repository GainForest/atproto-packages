import type { SupportedLanguageCode } from "./languages";

type FeatureCopy = {
  number: string;
  title: string;
  description: string;
};

type OptionCardCopy = {
  label: string;
  title: string;
  emphasis: string;
  description: string;
  cta: string;
  alt: string;
};

type FaqCopy = {
  id: string;
  question: string;
  answer: string;
};

type HomeCopy = {
  nav: {
    home: string;
    explore: string;
    organizations: string;
    create: string;
    launchApp: string;
    menu: string;
    navigation: string;
    close: string;
    theme: string;
  };
  language: {
    label: string;
    changeAria: string;
    currentLanguage: string;
  };
  hero: {
    imageAlt: string;
    headingLine1: string;
    headingLine2: string;
    headingEmphasis1: string;
    headingEmphasis2: string;
    description: string;
    cta: string;
    proofPoints: [string, string, string];
  };
  features: {
    eyebrow: string;
    items: [FeatureCopy, FeatureCopy, FeatureCopy];
  };
  paths: {
    title: string;
    description: string;
    cards: [OptionCardCopy, OptionCardCopy];
  };
  certificate: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    faqItems: [FaqCopy, FaqCopy, FaqCopy, FaqCopy];
    previewTitle: string;
    previewDescription: string;
    objectives: [string, string];
  };
  footer: {
    tagline: string;
    infrastructure: string;
    documentation: string;
    copyright: string;
  };
};

export const HOME_TRANSLATIONS: Record<SupportedLanguageCode, HomeCopy> = {
  en: {
    nav: {
      home: "Home",
      explore: "Explore",
      organizations: "Organizations",
      create: "Create",
      launchApp: "Launch App",
      menu: "Menu",
      navigation: "Navigation",
      close: "Close",
      theme: "Theme",
    },
    language: {
      label: "Language",
      changeAria: "Change language",
      currentLanguage: "Current language",
    },
    hero: {
      imageAlt: "Misty rainforest valley",
      headingLine1: "Verified Impact",
      headingLine2: "starts with",
      headingEmphasis1: "Real",
      headingEmphasis2: "Communities",
      description:
        "Fund regenerative projects directly. Every Bumicert is a verified record of real environmental work — backed by photos, locations, and community stewards.",
      cta: "Explore Projects",
      proofPoints: ["Community-led", "Photo-verified", "Geolocated"],
    },
    features: {
      eyebrow: "About Us",
      items: [
        {
          number: "01",
          title: "Verified environmental impact",
          description:
            "Every certificate is backed by photos, geolocation data, and community verification.",
        },
        {
          number: "02",
          title: "Direct community funding",
          description:
            "Your support goes straight to the stewards doing on-ground restoration work.",
        },
        {
          number: "03",
          title: "Decentralized & transparent",
          description:
            "Built on open, decentralized infrastructure. Every action is recorded, traceable, and permanent.",
        },
      ],
    },
    paths: {
      title: "Choose Your Path",
      description:
        "Whether you're here to fund impact or showcase your work, there's a place for you.",
      cards: [
        {
          label: "For Funders",
          title: "I want to support",
          emphasis: "a project",
          description:
            "Browse verified certificates and fund the exact moment of restoration.",
          cta: "Explore Bumicerts",
          alt: "River winding through rainforest",
        },
        {
          label: "For Organizations",
          title: "I am a nature",
          emphasis: "steward",
          description:
            "Showcase your regenerative work and connect with funders who care.",
          cta: "Create a Bumicert",
          alt: "Waterfall in a tropical forest",
        },
      ],
    },
    certificate: {
      eyebrow: "The Certificate",
      titleLine1: "What exactly is",
      titleLine2: "a Bumicert?",
      faqItems: [
        {
          id: "1",
          question: "A digital certificate of impact",
          answer:
            "A Bumicert records a specific environmental action — giving it a permanent, verifiable identity on an open, decentralized network (the same technology that powers Bluesky).",
        },
        {
          id: "2",
          question: "Backed by real evidence",
          answer:
            "Photos, geolocation, timestamps, monitoring data. Every claim is verifiable. This isn't a promise of future impact — it's proof of work already done.",
        },
        {
          id: "3",
          question: "A direct line to communities",
          answer:
            "When you fund a Bumicert, your money reaches the exact people doing the restoration. No intermediaries skimming fees. No vague overhead.",
        },
        {
          id: "4",
          question: "Your claim to the story",
          answer:
            "Owning a Bumicert means you're part of that moment. A tree planted. A reef restored. An ecosystem revived. It's yours to share, hold, or gift.",
        },
      ],
      previewTitle: "Reforestation of Mount Halimun",
      previewDescription:
        "Community-led restoration of native forest in West Java, Indonesia. 5,000 trees planted across 12 hectares.",
      objectives: ["Reforestation", "Biodiversity"],
    },
    footer: {
      tagline: "Connecting communities with funders.",
      infrastructure: "Open infrastructure. Built with GainForest.",
      documentation: "Documentation",
      copyright: "Open source, community-powered.",
    },
  },
  es: {
    nav: {
      home: "Inicio",
      explore: "Explorar",
      organizations: "Organizaciones",
      create: "Crear",
      launchApp: "Abrir app",
      menu: "Menú",
      navigation: "Navegación",
      close: "Cerrar",
      theme: "Tema",
    },
    language: {
      label: "Idioma",
      changeAria: "Cambiar idioma",
      currentLanguage: "Idioma actual",
    },
    hero: {
      imageAlt: "Valle de selva tropical con neblina",
      headingLine1: "Impacto verificado",
      headingLine2: "empieza con",
      headingEmphasis1: "Comunidades",
      headingEmphasis2: "reales",
      description:
        "Financia proyectos regenerativos directamente. Cada Bumicert es un registro verificado de trabajo ambiental real, respaldado por fotos, ubicaciones y comunidades guardianas.",
      cta: "Explorar proyectos",
      proofPoints: ["Liderado por comunidades", "Verificado con fotos", "Geolocalizado"],
    },
    features: {
      eyebrow: "Sobre nosotros",
      items: [
        {
          number: "01",
          title: "Impacto ambiental verificado",
          description:
            "Cada certificado está respaldado por fotos, datos de geolocalización y verificación comunitaria.",
        },
        {
          number: "02",
          title: "Financiamiento directo a comunidades",
          description:
            "Tu apoyo llega directamente a quienes realizan la restauración en el territorio.",
        },
        {
          number: "03",
          title: "Descentralizado y transparente",
          description:
            "Construido sobre infraestructura abierta y descentralizada. Cada acción queda registrada, trazable y permanente.",
        },
      ],
    },
    paths: {
      title: "Elige tu camino",
      description:
        "Ya sea que vengas a financiar impacto o a mostrar tu trabajo, hay un lugar para ti.",
      cards: [
        {
          label: "Para financiadores",
          title: "Quiero apoyar",
          emphasis: "un proyecto",
          description:
            "Explora certificados verificados y financia el momento exacto de la restauración.",
          cta: "Explorar Bumicerts",
          alt: "Río serpenteando por la selva tropical",
        },
        {
          label: "Para organizaciones",
          title: "Soy una persona",
          emphasis: "guardiana de la naturaleza",
          description:
            "Muestra tu trabajo regenerativo y conecta con financiadores comprometidos.",
          cta: "Crear un Bumicert",
          alt: "Cascada en un bosque tropical",
        },
      ],
    },
    certificate: {
      eyebrow: "El certificado",
      titleLine1: "¿Qué es exactamente",
      titleLine2: "un Bumicert?",
      faqItems: [
        {
          id: "1",
          question: "Un certificado digital de impacto",
          answer:
            "Un Bumicert registra una acción ambiental específica y le da una identidad permanente y verificable en una red abierta y descentralizada.",
        },
        {
          id: "2",
          question: "Respaldado por evidencia real",
          answer:
            "Fotos, geolocalización, marcas de tiempo y datos de monitoreo. Cada afirmación es verificable: no es una promesa futura, es prueba de trabajo realizado.",
        },
        {
          id: "3",
          question: "Una línea directa con las comunidades",
          answer:
            "Cuando financias un Bumicert, tu dinero llega a las personas que hacen la restauración. Sin intermediarios que absorban comisiones ni costos difusos.",
        },
        {
          id: "4",
          question: "Tu vínculo con la historia",
          answer:
            "Tener un Bumicert significa formar parte de ese momento: un árbol plantado, un arrecife restaurado, un ecosistema revivido. Puedes compartirlo, conservarlo o regalarlo.",
        },
      ],
      previewTitle: "Reforestación del monte Halimun",
      previewDescription:
        "Restauración comunitaria de bosque nativo en Java Occidental, Indonesia. 5.000 árboles plantados en 12 hectáreas.",
      objectives: ["Reforestación", "Biodiversidad"],
    },
    footer: {
      tagline: "Conectando comunidades con financiadores.",
      infrastructure: "Infraestructura abierta. Construido con GainForest.",
      documentation: "Documentación",
      copyright: "Código abierto, impulsado por la comunidad.",
    },
  },
  pt: {
    nav: {
      home: "Início",
      explore: "Explorar",
      organizations: "Organizações",
      create: "Criar",
      launchApp: "Abrir app",
      menu: "Menu",
      navigation: "Navegação",
      close: "Fechar",
      theme: "Tema",
    },
    language: {
      label: "Idioma",
      changeAria: "Alterar idioma",
      currentLanguage: "Idioma atual",
    },
    hero: {
      imageAlt: "Vale de floresta tropical com neblina",
      headingLine1: "Impacto verificado",
      headingLine2: "começa com",
      headingEmphasis1: "Comunidades",
      headingEmphasis2: "reais",
      description:
        "Financie projetos regenerativos diretamente. Cada Bumicert é um registro verificado de trabalho ambiental real, apoiado por fotos, locais e guardiões comunitários.",
      cta: "Explorar projetos",
      proofPoints: ["Liderado por comunidades", "Verificado por fotos", "Geolocalizado"],
    },
    features: {
      eyebrow: "Sobre nós",
      items: [
        {
          number: "01",
          title: "Impacto ambiental verificado",
          description:
            "Cada certificado é apoiado por fotos, dados de geolocalização e verificação comunitária.",
        },
        {
          number: "02",
          title: "Financiamento direto às comunidades",
          description:
            "Seu apoio vai direto para os guardiões que fazem a restauração em campo.",
        },
        {
          number: "03",
          title: "Descentralizado e transparente",
          description:
            "Construído sobre infraestrutura aberta e descentralizada. Cada ação é registrada, rastreável e permanente.",
        },
      ],
    },
    paths: {
      title: "Escolha seu caminho",
      description:
        "Se você veio financiar impacto ou mostrar seu trabalho, há um lugar para você.",
      cards: [
        {
          label: "Para financiadores",
          title: "Quero apoiar",
          emphasis: "um projeto",
          description:
            "Explore certificados verificados e financie o momento exato da restauração.",
          cta: "Explorar Bumicerts",
          alt: "Rio serpenteando pela floresta tropical",
        },
        {
          label: "Para organizações",
          title: "Sou guardião",
          emphasis: "da natureza",
          description:
            "Mostre seu trabalho regenerativo e conecte-se com financiadores que se importam.",
          cta: "Criar um Bumicert",
          alt: "Cachoeira em uma floresta tropical",
        },
      ],
    },
    certificate: {
      eyebrow: "O certificado",
      titleLine1: "O que exatamente é",
      titleLine2: "um Bumicert?",
      faqItems: [
        {
          id: "1",
          question: "Um certificado digital de impacto",
          answer:
            "Um Bumicert registra uma ação ambiental específica, dando a ela uma identidade permanente e verificável em uma rede aberta e descentralizada.",
        },
        {
          id: "2",
          question: "Apoiado por evidências reais",
          answer:
            "Fotos, geolocalização, registros de tempo e dados de monitoramento. Toda afirmação é verificável: não é promessa futura, é prova de trabalho realizado.",
        },
        {
          id: "3",
          question: "Uma linha direta com comunidades",
          answer:
            "Ao financiar um Bumicert, seu dinheiro chega às pessoas que fazem a restauração. Sem intermediários absorvendo taxas ou custos vagos.",
        },
        {
          id: "4",
          question: "Sua participação na história",
          answer:
            "Ter um Bumicert significa fazer parte daquele momento: uma árvore plantada, um recife restaurado, um ecossistema revivido. Você pode compartilhar, guardar ou presentear.",
        },
      ],
      previewTitle: "Reflorestamento do monte Halimun",
      previewDescription:
        "Restauração comunitária de floresta nativa em Java Ocidental, Indonésia. 5.000 árvores plantadas em 12 hectares.",
      objectives: ["Reflorestamento", "Biodiversidade"],
    },
    footer: {
      tagline: "Conectando comunidades a financiadores.",
      infrastructure: "Infraestrutura aberta. Criado com GainForest.",
      documentation: "Documentação",
      copyright: "Código aberto, movido pela comunidade.",
    },
  },
  sw: {
    nav: {
      home: "Nyumbani",
      explore: "Gundua",
      organizations: "Mashirika",
      create: "Unda",
      launchApp: "Fungua programu",
      menu: "Menyu",
      navigation: "Urambazaji",
      close: "Funga",
      theme: "Mandhari",
    },
    language: {
      label: "Lugha",
      changeAria: "Badilisha lugha",
      currentLanguage: "Lugha ya sasa",
    },
    hero: {
      imageAlt: "Bonde la msitu wa mvua lenye ukungu",
      headingLine1: "Athari iliyothibitishwa",
      headingLine2: "huanza na",
      headingEmphasis1: "Jamii",
      headingEmphasis2: "halisi",
      description:
        "Fadhili miradi ya urejeshaji moja kwa moja. Kila Bumicert ni rekodi iliyothibitishwa ya kazi halisi ya mazingira, ikiungwa mkono na picha, maeneo na walezi wa jamii.",
      cta: "Gundua miradi",
      proofPoints: ["Inaongozwa na jamii", "Imethibitishwa kwa picha", "Ina eneo kamili"],
    },
    features: {
      eyebrow: "Kuhusu sisi",
      items: [
        {
          number: "01",
          title: "Athari ya mazingira iliyothibitishwa",
          description:
            "Kila cheti kinaungwa mkono na picha, data ya eneo na uthibitisho wa jamii.",
        },
        {
          number: "02",
          title: "Ufadhili wa moja kwa moja kwa jamii",
          description:
            "Msaada wako huenda moja kwa moja kwa wale wanaofanya kazi ya urejeshaji ardhini.",
        },
        {
          number: "03",
          title: "Iliyogatuliwa na wazi",
          description:
            "Imejengwa juu ya miundombinu wazi na iliyogatuliwa. Kila tendo hurekodiwa, hufuatilika na hudumu.",
        },
      ],
    },
    paths: {
      title: "Chagua njia yako",
      description:
        "Iwe uko hapa kufadhili athari au kuonyesha kazi yako, kuna nafasi kwa ajili yako.",
      cards: [
        {
          label: "Kwa wafadhili",
          title: "Nataka kusaidia",
          emphasis: "mradi",
          description:
            "Vinjari vyeti vilivyothibitishwa na ufadhili wakati mahususi wa urejeshaji.",
          cta: "Gundua Bumicerts",
          alt: "Mto ukipinda ndani ya msitu wa mvua",
        },
        {
          label: "Kwa mashirika",
          title: "Mimi ni mlezi",
          emphasis: "wa mazingira",
          description:
            "Onyesha kazi yako ya urejeshaji na ungana na wafadhili wanaojali.",
          cta: "Unda Bumicert",
          alt: "Maporomoko ya maji katika msitu wa kitropiki",
        },
      ],
    },
    certificate: {
      eyebrow: "Cheti",
      titleLine1: "Bumicert ni nini",
      titleLine2: "hasa?",
      faqItems: [
        {
          id: "1",
          question: "Cheti cha kidijitali cha athari",
          answer:
            "Bumicert hurekodi tendo mahususi la mazingira na kulipa utambulisho wa kudumu unaoweza kuthibitishwa kwenye mtandao wazi na uliogatuliwa.",
        },
        {
          id: "2",
          question: "Inaungwa mkono na ushahidi halisi",
          answer:
            "Picha, eneo, muda na data ya ufuatiliaji. Kila dai linaweza kuthibitishwa: si ahadi ya baadaye, bali ni ushahidi wa kazi iliyofanyika.",
        },
        {
          id: "3",
          question: "Njia ya moja kwa moja kwa jamii",
          answer:
            "Unapofadhili Bumicert, pesa zako huwafikia watu wanaofanya urejeshaji. Hakuna wapatanishi wanaochukua ada au gharama zisizo wazi.",
        },
        {
          id: "4",
          question: "Sehemu yako katika hadithi",
          answer:
            "Kumiliki Bumicert kunamaanisha kuwa sehemu ya wakati huo: mti uliopandwa, mwamba wa matumbawe uliorejeshwa, mfumo wa ikolojia ulihuishwa. Unaweza kushiriki, kuhifadhi au kutoa kama zawadi.",
        },
      ],
      previewTitle: "Upandaji upya wa misitu wa Mlima Halimun",
      previewDescription:
        "Urejeshaji unaoongozwa na jamii wa msitu asilia Java Magharibi, Indonesia. Miti 5,000 imepandwa katika hekta 12.",
      objectives: ["Upandaji misitu", "Bioanuwai"],
    },
    footer: {
      tagline: "Kuunganisha jamii na wafadhili.",
      infrastructure: "Miundombinu wazi. Imejengwa na GainForest.",
      documentation: "Nyaraka",
      copyright: "Chanzo wazi, inaendeshwa na jamii.",
    },
  },
  id: {
    nav: {
      home: "Beranda",
      explore: "Jelajahi",
      organizations: "Organisasi",
      create: "Buat",
      launchApp: "Buka aplikasi",
      menu: "Menu",
      navigation: "Navigasi",
      close: "Tutup",
      theme: "Tema",
    },
    language: {
      label: "Bahasa",
      changeAria: "Ubah bahasa",
      currentLanguage: "Bahasa saat ini",
    },
    hero: {
      imageAlt: "Lembah hutan hujan berkabut",
      headingLine1: "Dampak terverifikasi",
      headingLine2: "dimulai dari",
      headingEmphasis1: "Komunitas",
      headingEmphasis2: "nyata",
      description:
        "Danai proyek regeneratif secara langsung. Setiap Bumicert adalah catatan terverifikasi atas kerja lingkungan nyata, didukung foto, lokasi, dan pengelola komunitas.",
      cta: "Jelajahi proyek",
      proofPoints: ["Dipimpin komunitas", "Diverifikasi foto", "Bergeolokasi"],
    },
    features: {
      eyebrow: "Tentang kami",
      items: [
        {
          number: "01",
          title: "Dampak lingkungan terverifikasi",
          description:
            "Setiap sertifikat didukung foto, data geolokasi, dan verifikasi komunitas.",
        },
        {
          number: "02",
          title: "Pendanaan langsung ke komunitas",
          description:
            "Dukungan Anda langsung menuju para pengelola yang melakukan restorasi di lapangan.",
        },
        {
          number: "03",
          title: "Terdesentralisasi dan transparan",
          description:
            "Dibangun di atas infrastruktur terbuka dan terdesentralisasi. Setiap tindakan tercatat, dapat dilacak, dan permanen.",
        },
      ],
    },
    paths: {
      title: "Pilih jalan Anda",
      description:
        "Baik Anda ingin mendanai dampak atau menampilkan karya Anda, ada tempat untuk Anda.",
      cards: [
        {
          label: "Untuk pendana",
          title: "Saya ingin mendukung",
          emphasis: "sebuah proyek",
          description:
            "Jelajahi sertifikat terverifikasi dan danai momen restorasi yang tepat.",
          cta: "Jelajahi Bumicerts",
          alt: "Sungai berkelok melalui hutan hujan",
        },
        {
          label: "Untuk organisasi",
          title: "Saya adalah penjaga",
          emphasis: "alam",
          description:
            "Tampilkan kerja regeneratif Anda dan terhubung dengan pendana yang peduli.",
          cta: "Buat Bumicert",
          alt: "Air terjun di hutan tropis",
        },
      ],
    },
    certificate: {
      eyebrow: "Sertifikat",
      titleLine1: "Apa sebenarnya",
      titleLine2: "Bumicert itu?",
      faqItems: [
        {
          id: "1",
          question: "Sertifikat digital untuk dampak",
          answer:
            "Bumicert mencatat tindakan lingkungan tertentu dan memberinya identitas permanen yang dapat diverifikasi di jaringan terbuka dan terdesentralisasi.",
        },
        {
          id: "2",
          question: "Didukung bukti nyata",
          answer:
            "Foto, geolokasi, cap waktu, dan data pemantauan. Setiap klaim dapat diverifikasi: bukan janji dampak masa depan, melainkan bukti kerja yang telah dilakukan.",
        },
        {
          id: "3",
          question: "Jalur langsung ke komunitas",
          answer:
            "Saat Anda mendanai Bumicert, dana Anda sampai ke orang-orang yang melakukan restorasi. Tanpa perantara yang mengambil biaya atau overhead yang kabur.",
        },
        {
          id: "4",
          question: "Klaim Anda atas cerita ini",
          answer:
            "Memiliki Bumicert berarti Anda menjadi bagian dari momen itu: pohon yang ditanam, terumbu yang dipulihkan, ekosistem yang dihidupkan kembali. Anda dapat membagikan, menyimpan, atau menghadiahkannya.",
        },
      ],
      previewTitle: "Reforestasi Gunung Halimun",
      previewDescription:
        "Restorasi hutan asli yang dipimpin komunitas di Jawa Barat, Indonesia. 5.000 pohon ditanam di 12 hektare.",
      objectives: ["Reforestasi", "Keanekaragaman hayati"],
    },
    footer: {
      tagline: "Menghubungkan komunitas dengan pendana.",
      infrastructure: "Infrastruktur terbuka. Dibangun bersama GainForest.",
      documentation: "Dokumentasi",
      copyright: "Sumber terbuka, digerakkan komunitas.",
    },
  },
};

export function getHomeCopy(language: SupportedLanguageCode): HomeCopy {
  return HOME_TRANSLATIONS[language];
}
