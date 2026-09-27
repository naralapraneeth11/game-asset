import type { CapabilityReport } from "../types";
import s from "../VideoEditor.module.css";

/** Engine details for Advanced panels. Most visitors never need this. */
export function Capabilities({ report }: { report: CapabilityReport }) {
  return <div className={s.capabilityDetails}><strong>Processing capabilities</strong><p>{report.rust ? "Rust color processing available." : "Color processing checks run when an engine loads."} {report.opfs ? "Temporary local file storage available." : "Exports use a bounded memory buffer."} {report.isolated ? "Threaded processing available." : "Single-thread compatibility mode."}</p>{report.notes.map((note) => <p key={note}>{note}</p>)}<p>Codec support also depends on your file and export settings. The best available engine is chosen before processing.</p></div>;
}
