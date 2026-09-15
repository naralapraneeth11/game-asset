import { Metadata } from "next";
import { UuidClient } from "./UuidClient";

export const metadata: Metadata = {
  title: "UUID Generator",
  description: "Generate UUID v4 values locally.",
};

export default function Page() {
  return <UuidClient />;
}
