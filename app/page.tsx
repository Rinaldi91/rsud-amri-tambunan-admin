import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login"); // Redirect langsung ke halaman login
}