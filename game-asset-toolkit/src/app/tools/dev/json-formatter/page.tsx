import { Metadata } from "next";
import { JsonFormatterClient } from "./JsonFormatterClient";

export const metadata: Metadata = {
  title: "JSON Formatter",
  description:
    "Beautify, minify and validate JSON locally in your browser. Private, fast, no upload.",
};

export default function JsonFormatterPage() {
  return <JsonFormatterClient />;
}
