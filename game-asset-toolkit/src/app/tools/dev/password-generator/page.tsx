import { Metadata } from "next";
import { PasswordClient } from "./PasswordClient";

export const metadata: Metadata = {
  title: "Password Generator",
  description: "Generate secure passwords using Web Crypto.",
};

export default function Page() {
  return <PasswordClient />;
}
