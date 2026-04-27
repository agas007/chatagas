import { Markdown } from "./markdown";
import { IconButton } from "./button";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";

const RELEASE_NOTES = [
  "# Chatagas Release v2.1.1 ⚡",
  "*Rilis: 27 April 2026 (WIB)*",
  "",
  "Rilis ini fokus ke tampilan yang lebih rapi, model picker yang lebih jelas, dan perbaikan auth di localhost.",
  "",
  "### 🎨 Claude-Style Workspace Polish",
  "- Cleaner header: jarak sidebar dan judul chat dirapikan supaya tampilan lebih lega.",
  "- Model picker dipindah ke header chat agar lebih mudah dilihat.",
  "- Welcome screen dibuat lebih fokus dan lebih konsisten.",
  "",
  "### 🔐 Auth Fix for Localhost",
  "- Session fetch sekarang pakai origin browser saat development lokal.",
  "- Mengurangi error `CLIENT_FETCH_ERROR` yang muncul di `localhost`.",
  "",
  "---",
  "",
  "# Chatagas Release v2.1.0 ⚡",
  "*Rilis: 15 April 2026 (WIB)*",
  "",
  "Versi ini membawa lompatan besar dalam produktivitas dengan fitur Agentic AI, kendali memori, dan navigasi model yang lebih efisien!",
  "",
  "### ⚡ Agentic AI (Power mode)",
  "- Built-in tools untuk web search, webpage reading, kalkulasi, dan pengecekan waktu.",
  "- Multi-step reasoning lewat tombol Agent di kotak input.",
  "- Live steps tracker di bagian atas chat.",
  "",
  "### 🧠 Real-time Memory Slider",
  "- Atur panjang context window dari 1 hingga 32 pesan.",
  "- Kontrol yang lebih instan untuk hasil yang lebih fokus atau lebih luas.",
  "",
  "### 🔄 Intelligent Project Sync",
  "- Sinkronisasi folder/projects lebih konsisten di semua perangkat.",
  "- Auto-sync lebih stabil dan aman saat pindah perangkat.",
].join("\n");

export function AnnouncementModal(props: { onClose: () => void }) {
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
          <Markdown
            content={RELEASE_NOTES}
            fontSize={16}
            fontFamily="ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
          />
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
