/**
 * Indonesian Localization Dictionary (idDict)
 *
 * Single source of truth for all human-facing text, field labels, status badge descriptions,
 * error translations, navigation groups, and in-depth page guide modals.
 * Adheres strictly to GLOSSARY.md, ADR 0001, ADR 0002, and ADR 0005.
 */

import type {
  CertificateType,
  CredentialSyncStatus,
  VisitReasonType,
  VisitStatus,
} from "../vms-contract";
import type {
  TapQuotaMode,
  TimeScheduleTemplateId,
} from "../access-level-contract";

export const PAGE_KEYS = [
  "reception",
  "activeMonitoring",
  "approvals",
  "preRegistration",
  "groupRegistration",
  "accessLevels",
  "visitors",
  "publicInvite",
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

export function isPageKey(val: unknown): val is PageKey {
  return typeof val === "string" && (PAGE_KEYS as readonly string[]).includes(val);
}

export const NAV_ICON_KEYS = [
  "desk",
  "shield-check",
  "clipboard-check",
  "user-plus",
  "users",
  "key",
  "id-card",
] as const;

export type NavIconKey = (typeof NAV_ICON_KEYS)[number];

export function isNavIconKey(val: unknown): val is NavIconKey {
  return typeof val === "string" && (NAV_ICON_KEYS as readonly string[]).includes(val);
}

export interface PageGuideStep {
  step: number;
  title: string;
  description: string;
}

export interface PageGuideBadge {
  label: string;
  color: string;
  description: string;
}

export interface PageGuideFaq {
  question: string;
  answer: string;
}

export interface PageGuideContent {
  title: string;
  subtitle: string;
  purpose: string;
  role: string;
  steps: PageGuideStep[];
  badgeMeanings: PageGuideBadge[];
  faqs: PageGuideFaq[];
}

export interface NavigationItem {
  title: string;
  description: string;
  href: string;
  icon: NavIconKey;
  badge?: string;
}

export interface NavigationGroup {
  title: string;
  description: string;
  items: NavigationItem[];
}

export interface StatusBadgeInfo {
  label: string;
  description: string;
  className: string;
  dotColor: string;
}

export const idDict = {
  appName: "Sistem Manajemen Tamu",
  appShortName: "VMS Gedung",
  appSubtitle: "Pengelolaan Kunjungan, Hak Akses Pintu, & Keamanan Terpadu",

  navigation: {
    toggleSidebar: "Buka / Tutup Menu Navigasi",
    collapseMenu: "Ciutkan Menu",
    expandMenu: "Bentangkan Menu",
    groups: {
      mainOperations: {
        title: "Operasional Utama",
        description: "Aktivitas pelayanan tamu harian, monitoring kehadiran, dan izin masuk",
        items: [
          {
            title: "Meja Resepsionis",
            description: "Penerimaan tamu datang langsung (walk-in) dan cetak lencana",
            href: "/vms/reception",
            icon: "desk",
          },
          {
            title: "Monitoring Tamu & Pintu",
            description: "Pantau tamu aktif, jatah buka pintu, dan izin darurat",
            href: "/vms/active-monitoring",
            icon: "shield-check",
          },
          {
            title: "Persetujuan Kunjungan",
            description: "Antrean verifikasi dan persetujuan jadwal tamu",
            href: "/vms/approvals",
            icon: "clipboard-check",
          },
        ],
      },
      invitations: {
        title: "Pendaftaran Undangan",
        description: "Pembuatan jadwal janji temu mandiri maupun rombongan delegasi",
        items: [
          {
            title: "Buat Undangan Tamu",
            description: "Jadwalkan kunjungan perorangan & kirim tautan mandiri",
            href: "/vms/pre-registration",
            icon: "user-plus",
          },
          {
            title: "Pendaftaran Rombongan",
            description: "Daftarkan delegasi rombongan tamu dengan satu penanggung jawab",
            href: "/vms/group-registration",
            icon: "users",
          },
        ],
      },
      securityMaster: {
        title: "Master Keamanan",
        description: "Konfigurasi hak akses pintu fisik dan basis data biometrik tamu",
        items: [
          {
            title: "Hak Akses Pintu",
            description: "Pengaturan kelompok izin pintu, lantai, dan kuota tap",
            href: "/vms/access-levels",
            icon: "key",
          },
          {
            title: "Buku Tamu & Biometrik",
            description: "Basis data riwayat kunjungan tamu dan verifikasi foto wajah",
            href: "/vms/visitors",
            icon: "id-card",
          },
        ],
      },
    },
  },

  header: {
    selectFacility: "Pilih Gedung / Lokasi",
    facilityTimezoneHint: "Waktu lokal fasilitas",
    systemConnected: "Sistem Pintu Terhubung",
    systemDisconnected: "Koneksi Terminal Terputus",
    systemChecking: "Memeriksa Gateway...",
    systemConfigIncomplete: "Konfigurasi Belum Lengkap",
    liveMonitoring: "Live Monitoring",
    operatorRole: "Petugas Resepsionis Lobi",
    operatorGreeting: "Selamat Datang,",
    notifications: "Pemberitahuan Sistem",
    switchBranch: "Pindah Cabang",
    quickSearch: "Cari data tamu, janji temu, atau pintu...",
  },

  common: {
    save: "Simpan",
    cancel: "Batal",
    close: "Tutup",
    search: "Cari",
    filter: "Saring",
    resetFilter: "Atur Ulang Saringan",
    delete: "Hapus",
    edit: "Ubah",
    details: "Lihat Detail",
    copy: "Salin",
    copied: "Berhasil Disalin!",
    loading: "Memuat data...",
    submitting: "Memproses permintaan...",
    success: "Operasi Berhasil",
    failed: "Operasi Gagal",
    back: "Kembali",
    next: "Selanjutnya",
    download: "Unduh",
    refresh: "Segarkan",
    actions: "Aksi Tindakan",
    status: "Status Saat Ini",
    facility: "Gedung / Lokasi",
    date: "Tanggal Kunjungan",
    time: "Waktu Kunjungan",
    visitor: "Nama Tamu",
    visitorName: "Nama Lengkap Tamu",
    visitorCompany: "Asal Instansi / Perusahaan",
    visitorPhone: "Nomor Telepon / WhatsApp",
    visitorEmail: "Alamat Email Tamu",
    host: "Karyawan Tuan Rumah",
    hostDepartment: "Departemen Tuan Rumah",
    accessLevel: "Hak Akses Pintu",
    purpose: "Keperluan Kunjungan",
    notes: "Catatan Tambahan",
    allFacilities: "Semua Lokasi Fasilitas",
    noDataFound: "Tidak ada data yang ditemukan",
    confirmAction: "Konfirmasi Tindakan",
    guideButtonLabel: "Panduan Halaman Ini",
  },

  certificateTypes: {
    111: "KTP (Kartu Tanda Penduduk)",
    414: "Paspor",
    335: "SIM (Surat Izin Mengemudi)",
    222: "Izin Masuk / Exit-Entry Permit",
  } as Record<CertificateType, string>,

  visitReasons: {
    0: "Urusan Bisnis",
    1: "Pelatihan / Training",
    2: "Kunjungan Umum",
    3: "Rapat / Meeting",
    4: "Keperluan Lainnya",
  } as Record<VisitReasonType, string>,

  timeSchedules: {
    1: "Akses 24 Jam Penuh (24/7)",
    2: "Jam Kerja Normal (Senin–Jumat 08:00–18:00)",
    3: "Akses Khusus Akhir Pekan (Sabtu–Minggu)",
  } as Record<TimeScheduleTemplateId, string>,

  tapQuotaModes: {
    unlimited: {
      label: "Bebas Masuk Tanpa Batas (0)",
      description: "Tamu dapat menempelkan kartu/QR di pintu putar dan pintu akses berkali-kali selama masa berlaku jadwal kunjungan.",
    },
    limited: {
      label: "Batas Jumlah Masuk Tertentu",
      description: "Batasi frekuensi buka pintu / putaran pintu putar (misal 1 kali masuk atau 2 kali masuk).",
    },
  } as Record<TapQuotaMode, { label: string; description: string }>,

  syncStatuses: {
    Applied: "Tersinkronisasi ke Terminal",
    Syncing: "Sedang Menyinkronkan...",
    Failed: "Gagal Sinkronisasi",
    Unknown: "Status Belum Diketahui",
  } as Record<CredentialSyncStatus, string>,

  statusBadges: {
    PENDING_APPROVAL: {
      label: "Menunggu Persetujuan",
      description: "Permohonan kunjungan telah diajukan dan sedang menunggu verifikasi dari tuan rumah atau staf keamanan.",
      className: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotColor: "bg-amber-500",
    },
    APPROVED: {
      label: "Disetujui",
      description: "Kunjungan telah disetujui. Tamu dapat menggunakan fitur masuk otomatis tanpa antre di pintu putar.",
      className: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotColor: "bg-emerald-500",
    },
    CHECKED_IN: {
      label: "Sedang Berkunjung",
      description: "Tamu telah melakukan check-in dan saat ini berada di dalam area gedung yang berwenang.",
      className: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dotColor: "bg-blue-500",
    },
    OVERSTAY: {
      label: "Melewati Batas Waktu",
      description: "Tamu belum keluar gedung dan telah melebihi batas waktu toleransi kepulangan yang dijadwalkan.",
      className: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
      dotColor: "bg-red-500",
    },
    CHECKED_OUT: {
      label: "Sudah Keluar",
      description: "Tamu telah menyelesaikan kunjungan dan berhasil melakukan check-out. Izin akses pintu telah dinonaktifkan.",
      className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
      dotColor: "bg-slate-400",
    },
    REJECTED: {
      label: "Ditolak",
      description: "Permohonan kunjungan ditolak oleh pihak yang berwenang karena alasan keamanan atau ketidaksesuaian jadwal.",
      className: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dotColor: "bg-rose-500",
    },
    CANCELLED: {
      label: "Dibatalkan",
      description: "Jadwal janji temu telah dibatalkan oleh pengundang atau tamu sebelum pelaksanaan kunjungan.",
      className: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
      dotColor: "bg-zinc-400",
    },
  } as Record<string, StatusBadgeInfo>,

  errors: {
    validation: "Data tidak lengkap atau tidak valid. Silakan periksa kembali kolom isian yang ditandai merah.",
    not_found: "Data tidak ditemukan. Silakan pastikan nomor identitas atau kode referensi yang Anda masukkan sudah benar.",
    config: "Konfigurasi sistem belum lengkap. Hubungi administrator IT untuk pengaturan terminal pintu.",
    upstream: "Gagal terhubung ke perangkat kontrol pintu (HikCentral). Silakan coba beberapa saat lagi atau gunakan mode manual.",
    conflict: "Terjadi benturan data atau jadwal. Kunjungan atau identitas ini telah terdaftar di sistem.",
    unauthorized: "Sesi login Anda telah berakhir atau belum terautentikasi. Silakan masuk kembali.",
    forbidden: "Anda tidak memiliki hak akses untuk melakukan tindakan operasional ini.",
    unknown: "Terjadi gangguan sistem yang tidak terduga. Silakan hubungi tim pendukung teknis.",
  },

  pages: {
    reception: {
      title: "Meja Resepsionis Lobi",
      subtitle: "Layanan Penerimaan Tamu Datang Langsung (Walk-in) & Verifikasi Masuk",
      guide: {
        title: "Panduan Operasional Meja Resepsionis",
        subtitle: "Instruksi praktis untuk melayani tamu datang langsung, verifikasi wajah, dan pencetakan akses",
        purpose: "Halaman ini digunakan oleh Petugas Resepsionis Meja Depan untuk melayani tamu yang datang langsung tanpa janji temu sebelumnya (walk-in), memverifikasi identitas fisik tamu, mengambil foto biometrik wajah, dan mengaktifkan hak akses pintu gedung secara langsung.",
        role: "Petugas Resepsionis Meja Depan & Satpam Pos Masuk Lobi",
        steps: [
          {
            step: 1,
            title: "Tanyakan Identitas & Karyawan Tuan Rumah",
            description: "Sapa tamu dengan ramah. Tanyakan nama lengkap, asal instansi, kartu tanda pengenal (KTP/SIM/Paspor), serta nama karyawan internal yang hendak ditemui.",
          },
          {
            step: 2,
            title: "Pengambilan Foto Wajah / Biometrik",
            description: "Arahkan tamu menghadap kamera web lobi. Pastikan wajah berada di dalam lingkaran panduan dengan pencahayaan cukup, tanpa mengenakan masker atau kacamata hitam.",
          },
          {
            step: 3,
            title: "Pilih Hak Akses Pintu & Proses Masuk",
            description: "Tentukan paket hak akses pintu yang sesuai dengan lantai tujuan tamu, lalu klik tombol 'Proses Masuk & Cetak Akses'. Berikan arahan menuju pintu putar lobi.",
          },
        ],
        badgeMeanings: [
          {
            label: "Sedang Berkunjung (Hijau/Biru)",
            color: "bg-blue-100 text-blue-800",
            description: "Tamu telah berhasil check-in dan hak akses pintu putar sudah aktif.",
          },
          {
            label: "Pendaftaran Mandiri (Kuning)",
            color: "bg-amber-100 text-amber-800",
            description: "Tamu sudah mengisi data lewat ponsel namun memerlukan verifikasi akhir di meja resepsionis.",
          },
          {
            label: "Daftar Pantauan (Merah)",
            color: "bg-red-100 text-red-800",
            description: "PERINGATAN: Nama tamu masuk dalam daftar pantauan keamanan ketat. Segera hubungi komandan satpam.",
          },
        ],
        faqs: [
          {
            question: "Bagaimana jika foto wajah tamu gagal diverifikasi oleh terminal?",
            answer: "Minta tamu melepas topi atau kacamata tebal, lalu ambil ulang foto wajah. Jika kamera terminal tetap menolak, berikan kode QR tamu digital yang dapat dipindai pada sensor QR pintu putar.",
          },
          {
            question: "Apa yang harus dilakukan jika karyawan tuan rumah tidak dapat dihubungi?",
            answer: "Tahan tamu di ruang tunggu resepsionis. Jangan izinkan tamu masuk ke area steril gedung sebelum tuan rumah atau perwakilannya memberikan konfirmasi penerimaan.",
          },
        ],
      },
    },

    activeMonitoring: {
      title: "Monitoring Tamu & Pintu Aktif",
      subtitle: "Pemantauan Real-time Kehadiran Tamu, Jatah Buka Pintu, & Akses Darurat",
      guide: {
        title: "Panduan Monitoring Kehadiran & Pintu",
        subtitle: "Instruksi pemantauan waktu nyata, penanganan overstay, dan penerbitan izin darurat",
        purpose: "Halaman ini digunakan untuk memantau seluruh tamu yang sedang berada di dalam gedung secara waktu nyata (real-time). Petugas dapat mengawasi sisa jatah tap pintu, pergerakan antar-ruangan, mendeteksi tamu yang melebihi batas jam kunjungan (overstay), serta memberikan izin darurat sementara.",
        role: "Petugas Keamanan Gedung (Security Control Room) & Supervisor Resepsionis",
        steps: [
          {
            step: 1,
            title: "Pantau Status Kehadiran Tamu Secara Berkala",
            description: "Perhatikan tabel tamu aktif. Pastikan tidak ada tamu yang statusnya berubah menjadi merah (Melewati Batas Waktu / Overstay).",
          },
          {
            step: 2,
            title: "Tindak Lanjuti Peringatan Melewati Batas Waktu",
            description: "Jika ada tamu berstatus overstay, hubungi Karyawan Tuan Rumah terkait untuk memastikan apakah pertemuan masih berlangsung atau tamu sudah keluar tanpa men-tap kartu.",
          },
          {
            step: 3,
            title: "Pemberian Izin Akses Darurat Sementara",
            description: "Jika tamu memerlukan akses mendesak ke ruangan khusus (misal Data Center), klik 'Izin Darurat', pilih pintu tujuan, tentukan durasi (1-4 jam), dan tuliskan alasan justifikasi yang valid.",
          },
        ],
        badgeMeanings: [
          {
            label: "Sedang Berkunjung (Biru)",
            color: "bg-blue-100 text-blue-800",
            description: "Tamu berada di dalam gedung dalam batas waktu normal dan kuota tap mencukupi.",
          },
          {
            label: "Melewati Batas Waktu (Merah)",
            color: "bg-red-100 text-red-800",
            description: "Tamu belum keluar dan sudah melewati batas toleransi kepulangan. Perlu tindakan konfirmasi petugas.",
          },
          {
            label: "Jatah Tap Habis (Kuning/Oranye)",
            color: "bg-amber-100 text-amber-800",
            description: "Tamu telah mencapai batas maksimal membuka pintu. Hubungi resepsionis jika perlu penambahan jatah.",
          },
        ],
        faqs: [
          {
            question: "Bagaimana cara kerja Masuk Otomatis Tanpa Antre (Fast-Track)?",
            answer: "Tamu yang jadwalnya sudah disetujui dapat langsung men-tap wajah/QR di pintu putar lobi luar. Status tamu otomatis berubah menjadi 'Sedang Berkunjung' tanpa perlu mampir ke meja resepsionis.",
          },
          {
            question: "Kapan izin akses darurat sementara akan dicabut?",
            answer: "Izin darurat otomatis dicabut saat durasi waktu habis atau saat tamu melakukan check-out kepulangan di sistem.",
          },
        ],
      },
    },

    approvals: {
      title: "Persetujuan Kunjungan Tamu",
      subtitle: "Antrean Verifikasi Izin Kunjungan oleh Tuan Rumah & Petugas Keamanan",
      guide: {
        title: "Panduan Persetujuan Kunjungan",
        subtitle: "Langkah verifikasi permohonan kunjungan masuk sebelum kredensial pintu diaktifkan",
        purpose: "Halaman ini digunakan oleh Karyawan Tuan Rumah, Manajer, atau Petugas Keamanan untuk memeriksa rincian rencana kunjungan tamu, memverifikasi dokumen atau foto diri, serta memberikan keputusan setuju atau tolak sebelum tamu tiba di lokasi.",
        role: "Karyawan Tuan Rumah (Host), Manajer Departemen, & Staf Otorisasi Keamanan",
        steps: [
          {
            step: 1,
            title: "Periksa Rincian Permohonan Kunjungan",
            description: "Klik pada baris antrean permohonan. Periksa identitas tamu, instansi asal, keperluan kunjungan, tanggal, serta jam kedatangan yang diajukan.",
          },
          {
            step: 2,
            title: "Verifikasi Kelengkapan Data & Keamanan",
            description: "Pastikan foto wajah tamu jelas dan tidak buram. Pastikan jadwal tidak bertabrakan dengan agenda ruangan atau jam operasional gedung.",
          },
          {
            step: 3,
            title: "Berikan Keputusan (Setujui / Tolak)",
            description: "Klik 'Setujui' untuk mengaktifkan akses otomatis tamu, atau klik 'Tolak' disertai alasan yang jelas jika permohonan tidak sesuai prosedur.",
          },
        ],
        badgeMeanings: [
          {
            label: "Menunggu Persetujuan (Kuning)",
            color: "bg-amber-100 text-amber-800",
            description: "Permohonan baru masuk dan membutuhkan tindakan persetujuan dari pejabat berwenang.",
          },
          {
            label: "Disetujui (Hijau)",
            color: "bg-emerald-100 text-emerald-800",
            description: "Permohonan telah disetujui. Undangan dan kode akses digital telah dikirimkan ke email/ponsel tamu.",
          },
          {
            label: "Ditolak (Merah)",
            color: "bg-rose-100 text-rose-800",
            description: "Permohonan dibatalkan atau ditolak. Tamu tidak akan diizinkan melewati pintu putar gedung.",
          },
        ],
        faqs: [
          {
            question: "Apa yang terjadi setelah saya menekan tombol 'Setujui'?",
            answer: "Sistem akan segera menyinkronkan data biometrik/QR tamu ke terminal pintu kontrol gedung untuk rentang waktu yang telah ditentukan.",
          },
          {
            question: "Bisakah persetujuan yang sudah diberikan dibatalkan kembali?",
            answer: "Ya, Anda dapat membatalkan kunjungan sebelum tamu melakukan check-in melalui halaman detail janji temu.",
          },
        ],
      },
    },

    preRegistration: {
      title: "Buat Undangan Tamu Terjadwal",
      subtitle: "Jadwalkan Kunjungan Tamu di Muka & Kirim Tautan Pendaftaran Mandiri",
      guide: {
        title: "Panduan Pembuatan Undangan Tamu",
        subtitle: "Langkah mengundang tamu bisnis perorangan sebelum kedatangan di lokasi",
        purpose: "Halaman ini digunakan oleh Karyawan Tuan Rumah untuk membuat janji temu tamu di muka. Tuan rumah dapat langsung melengkapi data tamu atau mengirimkan tautan pendaftaran mandiri agar tamu dapat mengisi data diri dan foto selfie dari smartphone masing-masing.",
        role: "Seluruh Karyawan Internal (Tuan Rumah) & Sekretariat",
        steps: [
          {
            step: 1,
            title: "Pilih Gedung Fasilitas & Waktu Kunjungan",
            description: "Tentukan lokasi gedung tujuan, tanggal kedatangan, serta jam mulai dan jam selesai pertemuan sesuai zona waktu lokal fasilitas.",
          },
          {
            step: 2,
            title: "Isi Identitas Tamu & Tentukan Hak Akses",
            description: "Masukkan nama tamu, email, nomor ponsel, serta pilih kelompok hak akses pintu yang diizinkan untuk dikunjungi.",
          },
          {
            step: 3,
            title: "Kirim Undangan / Tautan Mandiri",
            description: "Klik 'Kirim Undangan'. Tamu akan menerima pesan WhatsApp/Email berisi tautan mandiri untuk unggah foto wajah dan kode akses digital.",
          },
        ],
        badgeMeanings: [
          {
            label: "Undangan Terkirim (Biru)",
            color: "bg-blue-100 text-blue-800",
            description: "Tautan pendaftaran telah berhasil diteruskan ke kontak tamu.",
          },
          {
            label: "Menunggu Selfie Tamu (Kuning)",
            color: "bg-amber-100 text-amber-800",
            description: "Tamu belum melengkapi foto wajah dari ponselnya.",
          },
        ],
        faqs: [
          {
            question: "Apakah tamu bisa datang lebih awal dari jadwal yang ditentukan?",
            answer: "Tamu dapat memasuki gedung 15-30 menit sebelum jadwal pertemuan dimulai (tergantung aturan toleransi gedung).",
          },
          {
            question: "Bagaimana jika tamu tidak memiliki smartphone?",
            answer: "Tamu tetap bisa datang langsung ke meja resepsionis dan petugas akan memotret wajah serta mencetak kartu fisik.",
          },
        ],
      },
    },

    groupRegistration: {
      title: "Pendaftaran Rombongan Tamu",
      subtitle: "Pengelolaan Kunjungan Delegasi, Kunjungan Kerja, & Rombongan Massal",
      guide: {
        title: "Panduan Pendaftaran Rombongan",
        subtitle: "Manajemen kunjungan kelompok dengan satu jadwal dan satu PIC penanggung jawab",
        purpose: "Halaman ini digunakan untuk mendaftarkan rombongan tamu dalam jumlah banyak (misal delegasi dinas, rombongan vendor, peserta pelatihan) di bawah satu nama rombongan, satu karyawan tuan rumah, dan jadwal kunjungan yang sama.",
        role: "Karyawan Tuan Rumah, Panitia Acara Internal, & Staf Administrasi",
        steps: [
          {
            step: 1,
            title: "Tentukan Nama Rombongan & Jadwal Utama",
            description: "Beri nama rombongan (contoh: 'Kunjungan Kerja Tim Audit BPK'), tentukan gedung tujuan, dan rentang jam kunjungan.",
          },
          {
            step: 2,
            title: "Tambahkan Daftar Anggota Rombongan",
            description: "Masukkan nama, nomor identitas, dan nomor ponsel tiap anggota rombongan. Anda juga dapat menentukan ketua rombongan (PIC).",
          },
          {
            step: 3,
            title: "Simpan & Terbitkan Kode Akses Kolektif",
            description: "Klik 'Daftarkan Rombongan'. Sistem akan menghasilkan tautan registrasi mandiri kolektif yang dapat disebarkan ke seluruh anggota.",
          },
        ],
        badgeMeanings: [
          {
            label: "Rombongan Lengkap (Hijau)",
            color: "bg-emerald-100 text-emerald-800",
            description: "Seluruh anggota rombongan telah melengkapi data dan siap masuk gedung.",
          },
          {
            label: "Belum Lengkap (Kuning)",
            color: "bg-amber-100 text-amber-800",
            description: "Sebagian anggota belum mengisi data diri atau foto wajah.",
          },
        ],
        faqs: [
          {
            question: "Apakah tiap anggota rombongan harus men-tap pintu satu per satu?",
            answer: "Ya, demi keselamatan dan akurasi daftar hadir darurat (evakuasi kebakaran), setiap orang wajib men-tap wajah atau kode QR masing-masing di pintu putar.",
          },
          {
            question: "Bisakah menambah anggota rombongan baru di hari kedatangan?",
            answer: "Bisa, petugas resepsionis dapat menambahkan anggota susulan ke dalam kelompok rombongan melalui meja resepsionis.",
          },
        ],
      },
    },

    accessLevels: {
      title: "Hak Akses Pintu & Kuota Tap",
      subtitle: "Konfigurasi Kelompok Izin Pintu Fisik, Pembatasan Lantai, & Toleransi Waktu",
      guide: {
        title: "Panduan Pengaturan Hak Akses Pintu",
        subtitle: "Instruksi konfigurasi izin pintu gedung dan jatah tap bagi tamu",
        purpose: "Halaman ini digunakan oleh Administrator Keamanan untuk membuat dan mengelola kelompok izin akses pintu. Setiap hak akses menentukan pintu mana saja yang boleh dilewati tamu, jadwal berlakunya, serta batasan jumlah tap kartu/wajah.",
        role: "Administrator Sistem Keamanan Gedung & Kepala Satpam",
        steps: [
          {
            step: 1,
            title: "Pilih Gedung Fasilitas yang Dikelola",
            description: "Pilih fasilitas gedung terkait untuk memuat daftar pintu fisik yang terdaftar pada pengontrol pintu.",
          },
          {
            step: 2,
            title: "Tentukan Pintu-Pintu yang Diizinkan",
            description: "Centang pintu putar lobi, pintu koridor lift, atau ruangan rapat yang diizinkan untuk dilewati oleh kelompok akses ini.",
          },
          {
            step: 3,
            title: "Atur Mode Jatah Tap & Batas Toleransi",
            description: "Pilih apakah jatah buka pintu dibatasi (misal 4 kali tap untuk keluar-masuk) atau bebas tanpa batas selama jam kunjungan.",
          },
        ],
        badgeMeanings: [
          {
            label: "Pintu Dua Arah (Biru)",
            color: "bg-blue-100 text-blue-800",
            description: "Pintu memiliki pembaca kartu/wajah di sisi luar maupun sisi dalam.",
          },
          {
            label: "Pintu Masuk Saja (Ungu)",
            color: "bg-purple-100 text-purple-800",
            description: "Pintu menggunakan pemindai saat masuk, dan tombol push-to-exit manual saat keluar.",
          },
        ],
        faqs: [
          {
            question: "Apa arti 'Perpindahan Ruangan Otomatis' pada Pintu Masuk Saja?",
            answer: "Jika pintu keluar tidak memiliki pemindai, sistem secara cerdas mendeteksi tamu telah meninggalkan ruangan lama ketika tamu men-tap di pintu ruangan baru.",
          },
          {
            question: "Bagaimana jika jatah tap tamu habis di tengah pertemuan?",
            answer: "Petugas keamanan dapat menambah jatah tap tamu melalui menu Monitoring Tamu & Pintu Aktif.",
          },
        ],
      },
    },

    visitors: {
      title: "Buku Tamu & Basis Data Biometrik",
      subtitle: "Arsip Riwayat Kunjungan Tamu, Status Foto Wajah, & Daftar Pantauan",
      guide: {
        title: "Panduan Basis Data Buku Tamu",
        subtitle: "Pencarian riwayat kunjungan, audit keamanan, dan pengelolaan foto biometrik",
        purpose: "Halaman ini menyimpan seluruh rekam jejak kunjungan tamu ke gedung. Petugas dapat mencari data kunjungan masa lalu untuk keperluan audit kepatuhan, memverifikasi status kualitas foto biometrik, serta memeriksa status daftar pantauan keamanan.",
        role: "Petugas Resepsionis, Supervisor Keamanan, & Petugas Audit Gedung",
        steps: [
          {
            step: 1,
            title: "Cari Data Tamu Berdasarkan Nama / Kontak",
            description: "Ketik nama tamu, nomor KTP/SIM, nomor telepon, atau nama instansi pada bilah pencarian.",
          },
          {
            step: 2,
            title: "Periksa Riwayat Kedatangan & Kepatuhan",
            description: "Klik pada tamu untuk melihat jam masuk, jam keluar, ruangan yang dikunjungi, serta catatan pelanggaran overstay.",
          },
          {
            step: 3,
            title: "Kelola Status Foto Biometrik",
            description: "Periksa apakah foto wajah tamu masih valid atau perlu diperbarui saat kedatangan berikutnya.",
          },
        ],
        badgeMeanings: [
          {
            label: "Biometrik Siap (Hijau)",
            color: "bg-emerald-100 text-emerald-800",
            description: "Foto wajah memenuhi standar pencahayaan dan resolusi pengenal pintu.",
          },
          {
            label: "Foto Kurang Jelas (Kuning)",
            color: "bg-amber-100 text-amber-800",
            description: "Foto buram atau terlalu gelap. Disarankan foto ulang di resepsionis.",
          },
        ],
        faqs: [
          {
            question: "Berapa lama data riwayat kunjungan disimpan di sistem?",
            answer: "Data kunjungan dan log tap pintu disimpan secara aman sesuai kebijakan retensi data gedung (standar 1 tahun) untuk keperluan audit keamanan.",
          },
          {
            question: "Bagaimana cara memasukkan seseorang ke Daftar Pantauan Keamanan?",
            answer: "Buka detail profil tamu, lalu aktifkan opsi 'Tandai dalam Daftar Pantauan' disertai alasan resmi dari kepala keamanan.",
          },
        ],
      },
    },

    publicInvite: {
      title: "Pendaftaran Mandiri Tamu",
      subtitle: "Pengisian Data Diri & Pengambilan Foto Selfie Sebelum Kedatangan",
      guide: {
        title: "Panduan Pendaftaran Mandiri untuk Tamu",
        subtitle: "Langkah mudah melengkapi data diri dan foto wajah dari ponsel pintar Anda",
        purpose: "Halaman ini dikhususkan bagi tamu untuk melakukan pendaftaran secara mandiri dari smartphone sebelum tiba di gedung. Dengan melengkapi formulir ini, tamu akan langsung mendapatkan tiket masuk digital QR dan akses wajah tanpa antre.",
        role: "Tamu / Pengunjung Eksternal Gedung",
        steps: [
          {
            step: 1,
            title: "Lengkapi Data Identitas Pribadi",
            description: "Masukkan nama lengkap sesuai KTP/Paspor, nomor kontak WhatsApp yang aktif, serta asal instansi/perusahaan Anda.",
          },
          {
            step: 2,
            title: "Ambil Foto Wajah (Selfie) yang Jelas",
            description: "Arahkan kamera ke wajah Anda di tempat dengan pencahayaan terang. Lepaskan masker, topi, dan kacamata hitam agar wajah terbaca sempurna oleh sensor pintu.",
          },
          {
            step: 3,
            title: "Simpan Tiket Akses Digital QR",
            description: "Setelah pendaftaran selesai, simpan kode QR yang muncul di layar. Anda dapat langsung men-tap kode QR atau wajah Anda di pintu putar lobi.",
          },
        ],
        badgeMeanings: [
          {
            label: "Pendaftaran Berhasil (Hijau)",
            color: "bg-emerald-100 text-emerald-800",
            description: "Data Anda telah tercatat dan hak akses pintu telah aktif untuk jam kunjungan Anda.",
          },
          {
            label: "Menunggu Persetujuan (Kuning)",
            color: "bg-amber-100 text-amber-800",
            description: "Tuan rumah sedang memeriksa permohonan Anda. Notifikasi akan dikirim setelah disetujui.",
          },
        ],
        faqs: [
          {
            question: "Di mana saya harus menunjukkan kode QR ini?",
            answer: "Tunjukkan kode QR pada pemindai optik di pintu putar lobi gedung saat tiba, atau langsung arahkan wajah Anda ke layar pemindai biometrik.",
          },
          {
            question: "Bagaimana jika foto selfie saya buram atau ditolak?",
            answer: "Sistem akan meminta Anda mengambil ulang foto. Pastikan ruangan cukup terang dan kamera bersih dari noda.",
          },
        ],
      },
    },
  },
} as const;

/**
 * Format domain visit status into Indonesian label and CSS classes
 */
export function formatStatusBadge(status: VisitStatus | string): StatusBadgeInfo {
  const badge = idDict.statusBadges[status];
  if (badge) {
    return badge;
  }
  return {
    label: "Status Tidak Dikenal",
    description: "Status kunjungan ini belum terdaftar di kamus sistem.",
    className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    dotColor: "bg-gray-400",
  };
}

/**
 * Format domain error kinds into clear Indonesian guidance
 */
export function formatErrorMessage(
  kind: "validation" | "not_found" | "config" | "upstream" | "conflict" | "unauthorized" | "forbidden" | string,
  detail?: string
): string {
  const baseMessage = idDict.errors[kind as keyof typeof idDict.errors] || idDict.errors.unknown;
  if (detail && detail.trim().length > 0) {
    return `${baseMessage} (${detail})`;
  }
  return baseMessage;
}
