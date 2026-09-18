// Optional developer command. The committed .wasm is used in ordinary Next/Vercel builds.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const app = resolve(directory, "../../../..");
const crate = resolve(directory, "../rust/pixel-ops");
const localCargo = join(app, ".toolchains/cargo/bin/cargo");
const local = existsSync(localCargo);
const env = {
  ...process.env,
  ...(local ? {
    CARGO_HOME: join(app, ".toolchains/cargo"),
    RUSTUP_HOME: join(app, ".toolchains/rustup"),
    PATH: `${join(app, ".toolchains/cargo/bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`,
  } : {}),
};
const result = spawnSync(local ? localCargo : "cargo", ["build", "--locked", "--release", "--target", "wasm32-unknown-unknown", "--manifest-path", join(crate, "Cargo.toml")], { env, stdio: "inherit" });
if (result.error || result.status !== 0) {
  console.error("Rust rebuild failed. Install Rust and run `rustup target add wasm32-unknown-unknown`, then try again. Normal app builds use the included binary and do not need Rust.", result.error?.message ?? "");
  process.exit(1);
}
const destination = join(app, "public/tools/video-editor/pixel-ops.wasm");
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(join(crate, "target/wasm32-unknown-unknown/release/video_pixel_ops.wasm"), destination);
console.log(`Updated ${destination}`);
