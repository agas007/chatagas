"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./signin.module.scss";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isRegister) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Auto login after register
        const signRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signRes?.ok) {
          router.push("/");
        } else {
          setError(
            "Registration successful, but login failed. Please login manually.",
          );
          setIsRegister(false);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed");
      }
    } else {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.ok) {
        router.push("/");
      } else {
        setError("Invalid email or password");
      }
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {isRegister ? "Buat Akun ChatAgas" : "Login ChatAgas"}
        </h1>
        <p className={styles.subtitle}>
          {isRegister
            ? "Mulai simpan riwayat chat kamu di cloud."
            : "Selamat datang kembali!"}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Sabar ya..." : isRegister ? "Daftar Sekarang" : "Masuk"}
          </button>
        </form>

        <div className={styles.toggle}>
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Login di sini" : "Daftar di sini"}
          </span>
        </div>
      </div>
    </div>
  );
}
