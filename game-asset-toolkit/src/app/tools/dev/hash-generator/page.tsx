import { Metadata } from "next";
import { HashClient } from "./HashClient";

export const metadata: Metadata = {
  title: "Hash Generator",
  description: "Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes locally.",
};

export default function Page() {
  return <HashClient />;
}
