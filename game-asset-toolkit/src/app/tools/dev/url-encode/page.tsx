import { Metadata } from "next";
import { UrlEncodeClient } from "./UrlEncodeClient";

export const metadata: Metadata = {
  title: "URL Encode / Decode",
  description: "Encode and decode URL components locally.",
};

export default function Page() {
  return <UrlEncodeClient />;
}
