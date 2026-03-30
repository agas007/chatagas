import React from "react";
import { Markdown } from "./markdown";
import { VERSION } from "../version";
import { useAppConfig } from "../store/config";
import { IconButton } from "./button";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";

const RELEASE_NOTES = `
# Chatagas Release v1.0.0 🚀

Versi v1.0.0 resmi dirilis! Versi ini membawa perubahan besar pada pengalaman penggunaan Chatagas.

### ⚡️ Parallel Multi-Model Chat
Sekarang Anda bisa menjalankan beberapa model AI sekaligus dalam satu sesi chat! Bandingkan jawaban dari model yang berbeda secara instan.

### 🔀 Fork Chat (Branching)
Ingin mencoba skenario jawaban yang berbeda dari sebuah titik pesan? Gunakan fitur **Fork** untuk mencabang obrolan.

### 💬 Text Selection Reply (Smart Quote)
Cukup sorot (highlight) teks di dalam chat, dan tombol **Reply** akan muncul secara otomatis untuk mengutip bagian tersebut.

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
          <h2 style={{ margin: 0 }}>What&apos;s New in v{VERSION}</h2>
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
