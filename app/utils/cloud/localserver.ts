import { SyncClient } from "./index";

export function createLocalServerClient(): SyncClient {
  return {
    async get() {
      const res = await fetch("/api/sync");
      const data = await res.json();
      return data.content || "";
    },
    async set(key: string, value: string) {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
    },
    async check() {
      const res = await fetch("/api/sync");
      return res.ok;
    },
  };
}
