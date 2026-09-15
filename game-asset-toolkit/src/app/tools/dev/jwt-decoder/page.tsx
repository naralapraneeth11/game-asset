import { Metadata } from "next";
import { JwtDecoderClient } from "./JwtDecoderClient";

export const metadata: Metadata = {
  title: "JWT Decoder",
  description:
    "Decode and inspect JSON Web Tokens locally in your browser. Private and secure.",
};

export default function JwtDecoderPage() {
  return <JwtDecoderClient />;
}
