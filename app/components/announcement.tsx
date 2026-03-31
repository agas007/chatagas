import React from "react";
import { Markdown } from "./markdown";
import { useAppConfig } from "../store/config";
import { IconButton } from "./button";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";

const RELEASE_NOTES = `
# Chatagas Release v1.3.0 📡
*Rilis: 31 Maret 2026 (WIB)*

Selamat datang di v1.3.0! Versi ini membawa perbaikan stabilitas besar pada sistem pemrosesan dokumen dan penambahan masker spesialis baru.

### 🏛️ Pakar Tata Kelola & Birokrasi
- Masker baru untuk membantu Anda menavigasi aturan pemerintahan yang kompleks.
- Strategi interaksi pejabat dan pencarian opsi **win-win solution** yang taktis.

### 📁 Enhanced File Context Support
- **Universal Upload Button**: Tombol upload berkas kini muncul di semua model (tidak hanya vision).
- **Direct Txt & Markdown**: Dukungan penuh untuk upload file teks (\`.txt\`) dan Markdown (\`.md\`) langsung sebagai konteks obrolan.
- **Peningkatan Kapasitas**: Unggah hingga 5 berkas sekaligus untuk konteks yang lebih kaya.

### 🛠️ Perbaikan & Bug Fixes (Stability)
- **Fix PDF Extraction**: Perbaikan total error *TypeError* saat memproses PDF dengan sistem *isolated utility* dan *local worker*.
- **Sync Locale**: Pembersihan total sisa-sisa bahasa yang tidak didukung untuk mempercepat waktu build.
- Penyesuaian ikon tombol unggah berkas agar lebih intuitif.

---

# Chatagas Release v1.2.0 🎙️
*Rilis: 31 Maret 2026 (WIB)*

Selamat datang di v1.2.0! Fokus kali ini adalah lokalisasi Indonesia penuh dan fitur **Speech-to-Text Gratis**.

### 🇲🇨 Lokalisasi Indonesia Penuh
- Semua tampilan kini mendukung Bahasa Indonesia.
- Penghapusan total bahasa Mandarin/Taiwan untuk pengalaman yang lebih clean.

### 🎙️ Free Browser STT (Voice to Text)
- Gunakan fitur **Speech Recognition** langsung dari browser.
- **Gratis Selamanya**: Tidak membutuhkan credit OpenAI/OpenRouter.
- Proses transkripsi real-time dan langsung masuk ke kotak chat.

### ⚖️ Mask Spesialis Baru (Indonesia)
- **Pakar Pajak & Hukum**: Asisten khusus untuk regulasi pajak (UU HPP, PPh, PPN) dan hukum di Indonesia.
- **Penerjemah Profesional**: Ahli terjemahan nuansa lokal.
- **Penulis Konten**: Bantu bikin konten viral khas Indonesia.

### 🛠️ Perbaikan & Bug Fixes
- Perbaikan crash server proxy saat menangani data multipart/audio.
- Penyesuaian tata letak (layout) tombol rekam suara di panel input.

---

# Chatagas Release v1.1.0 🚀
*Rilis: 30 Maret 2026 (WIB)*

Versi v1.1.0 resmi dirilis! Versi ini membawa fitur **RAG (Retrieval Augmented Generation)** dan dukungan media yang sangat powerful.

### 📄 Chat with PDF & XLSX
Sekarang Anda bisa melakukan upload file PDF dan Excel langsung. Chatagas akan mengekstrak teksnya dan menggunakannya sebagai konteks obrolan.

### 📚 Knowledge Base (RAG)
Kelola dokumen-dokumen penting Anda lewat panel **Knowledge**. AI akan menjawab pertanyaan Anda berdasarkan dokumen yang Anda upload secara cerdas.

### 💬 Text Selection Reply (Smart Quote)
Cukup sorot (highlight) teks di dalam chat, dan tombol **Reply** akan muncul secara otomatis untuk mengutip bagian tersebut dengan cepat.

### 🎥 Video Analysis Support
Support analisis file video untuk model yang mendukung multimodal (seperti Gemini).

### 🛠️ Perbaikan & Bug Fixes
- Dukungan penuh untuk \`pdfjs-dist v5.x\` di Next.js & React 19.
- Perbaikan layout sidebar dan pratinjau lampiran file.

---

# Chatagas Release v1.0.0 🚀
*Rilis: 29 Maret 2026 (WIB)*

### ⚡️ Parallel Multi-Model Chat
Bandingkan jawaban dari beberapa model AI sekaligus secara instan!

### 🔀 Fork Chat (Branching)
Gunakan fitur **Fork** untuk mencabang obrolan dari titik pesan mana pun.

### 🏷️ Sistem Versi Dinamis
Sidebar kini menampilkan versi aplikasi secara dinamis yang tersinkronisasi langsung dengan sistem.
`;

export function AnnouncementModal(props: { onClose: () => void }) {
  const config = useAppConfig();

  return (
    <div className="modal-mask" onClick={props.onClose}>
      <div
        className="modal-container"
        style={{
          width: "600px",
          maxWidth: "95vw",
          height: "auto",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          animation: "slide-in ease 0.3s",
          backgroundColor: "var(--white)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            color: "var(--black)",
            zIndex: 10,
            padding: "8px",
            borderRadius: "50%",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="clickable"
          onClick={props.onClose}
        >
          <CloseIcon />
        </div>

        <div
          style={{
            padding: "40px 30px 20px",
            textAlign: "left",
            borderBottom: "var(--border-in-light) 1px solid",
            background: "var(--gray)",
          }}
        >
          <h2 style={{ margin: 0 }}>What&apos;s New</h2>
          <p style={{ margin: "10px 0 0", opacity: 0.6 }}>
            Terima kasih telah menggunakan Chatagas!
          </p>
        </div>

        <div style={{ padding: "20px 30px", overflowY: "auto", flex: 1 }}>
          <Markdown content={RELEASE_NOTES} />
        </div>

        <div
          style={{
            padding: "20px 30px 30px",
            textAlign: "center",
          }}
        >
          <IconButton
            text="Get Started"
            type="primary"
            icon={<ConfirmIcon />}
            onClick={props.onClose}
            style={{ width: "100%", height: "45px" }}
          />
        </div>
      </div>
    </div>
  );
}
