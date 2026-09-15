import { Metadata } from "next";
import { Base64Client } from "./Base64Client";

export const metadata: Metadata = {
  title: "Base64 Encode / Decode",
  description: "Encode and decode Base64 text and files locally in your browser.",
};

export default function Page() {
  return <Base64Client />;
}
