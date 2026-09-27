import "server-only";
import type { ToolCategory, ToolId } from "./tools";

/**
 * Search copy for every page. Server-only: this text renders into HTML and
 * metadata but never ships in client JavaScript.
 *
 * Rules (checked by `npm run check:seo`):
 * - title: 45 characters or fewer; the root layout appends " | <brand>".
 * - description: 140–160 characters. Say what it does, how, and that nothing uploads.
 * - h1: the main search phrase, said naturally.
 * - Write every paragraph for this page only. Copying paragraphs across pages
 *   makes them compete with each other. Only the shared privacy note repeats.
 */

export interface Faq {
  q: string;
  a: string;
}

export interface ToolSeo {
  /** ≤ 45 chars; the layout template adds " | Brand". */
  title: string;
  /** 140–160 chars: what it does, how, and "no upload". */
  description: string;
  /** The main search phrase, said naturally. */
  h1: string;
  /** 1–2 sentences under the H1. */
  intro: string;
  /** 3–4 "how to" steps. */
  steps: readonly string[];
  /** 4–6 real questions. */
  faq: readonly Faq[];
  /** Phrases this page targets. Internal planning only; never rendered. */
  searches: readonly string[];
}

export interface HubSeo {
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Short paragraphs under the tool list. */
  body: readonly string[];
  faq: readonly Faq[];
  searches: readonly string[];
}

/** The one paragraph that is allowed to repeat on every tool page. */
export const privacyNote =
  "Your files never leave this device. Everything runs in your browser with WebAssembly and web workers, so nothing is uploaded, logged or stored on a server, and closing the tab clears it.";

export const homeSeo = {
  title: "RUYIX – Free Tools for Game and Web Developers",
  description:
    "Free browser tools for game and web developers: compress video and images, pack sprite sheets, convert SVG to PNG, format JSON. Files never upload.",
} as const;

export const toolSeo = {
  "image-compressor": {
    title: "Image Compressor: Compress JPG, PNG, WebP",
    description:
      "Compress JPG, PNG, WebP and AVIF images in your browser. Batch folders, set a target size, compare before and after, download a ZIP. No upload, no sign-up.",
    h1: "Compress images without uploading them",
    intro:
      "Drop a few images or a whole folder and get smaller files in seconds. Compression starts right away with a balanced preset, and each image keeps its original format unless you pick another.",
    steps: [
      "Drop images or a folder onto the page, paste from your clipboard, or choose files.",
      "Pick Smaller file, Balanced or Higher quality. Compression runs as soon as files arrive.",
      "Open any result to compare it with the original using the slider.",
      "Download one image, or everything as a ZIP that keeps your folder structure.",
    ],
    faq: [
      {
        q: "Which formats can I compress?",
        a: "JPEG, PNG, WebP and AVIF, in and out. By default each file keeps its own format. You can also convert everything to WebP, JPEG, AVIF or PNG, and JPEG XL is available as an experimental option in Advanced.",
      },
      {
        q: "Will my PNG sprites lose quality?",
        a: "Not when you keep PNG output at the original size. PNGs are optimized losslessly with OxiPNG, so every pixel stays the same. For normal maps, masks and pixel art, keep the output as PNG and turn off automatic resizing in Advanced.",
      },
      {
        q: "Can I hit an exact file size?",
        a: "Set a target in Advanced, in kilobytes, and the compressor searches for the highest quality that fits in up to eight attempts. Lossy formats only. If no setting reaches the target, the row says so and keeps the smallest result.",
      },
      {
        q: "How many images can I do at once?",
        a: "Up to 100 images per session, 20 MB each and 200 MB in total. Images are processed one at a time in a background worker, so the page stays responsive and memory stays bounded even on phones.",
      },
      {
        q: "Does it work offline?",
        a: "Yes. Open Advanced and choose Prepare for offline. The compressor caches its code and codecs, never your images, and after that the page works with no connection. You can remove the offline data at any time.",
      },
    ],
    searches: ["image compressor", "compress image", "compress png", "compress jpeg", "reduce image size", "tinypng alternative"],
  },

  "svg-to-png": {
    title: "SVG to PNG Converter – Any Size, Transparent",
    description:
      "Convert SVG to PNG up to 4096 px, with transparent or solid backgrounds, trimming and padding. Batch up to 20 files. Runs in your browser, no upload.",
    h1: "Convert SVG to PNG at any size",
    intro:
      "Render vector art to sharp PNGs at exactly the sizes you need. The SVG is redrawn at every size, so a 1024 px export is as crisp as a 16 px one.",
    steps: [
      "Drop one or more SVG files, or paste SVG code.",
      "Choose Custom and list the sizes you want, such as 64, 128, 512.",
      "Set a transparent or solid background, padding and auto-trim, and check the live preview.",
      "Download a single PNG or every size as a ZIP.",
    ],
    faq: [
      {
        q: "Is the background transparent?",
        a: "Yes, by default. Switch to Solid color to fill the background instead, for example for platforms that reject transparency. The setting never changes your artwork itself.",
      },
      {
        q: "Why does my SVG look different from the browser?",
        a: "SVGs that depend on a website's CSS or web fonts render without them. Include styles inside the SVG and outline text when exact typography matters. Scripts and foreignObject content are removed for safety, and the tool lists anything it removed.",
      },
      {
        q: "What is auto-trim?",
        a: "Auto-trim finds the visible edges of the artwork and removes empty transparent space before centering it in each output. Padding then adds a consistent margin, so icons from different sources line up.",
      },
      {
        q: "What are the limits?",
        a: "Up to 20 SVGs per batch, 5 MB each and 50 MB in total, with outputs up to 4096 pixels per side and ZIPs up to 128 MB. Heavy files are queued one at a time so the tab stays responsive.",
      },
      {
        q: "Can it make favicons and app icons?",
        a: "Yes. The same engine powers the Favicon Generator and App Icon Generator, which pick the right sizes and write the extra files, such as favicon.ico, the web manifest and Xcode asset catalogs.",
      },
    ],
    searches: ["svg to png", "convert svg to png", "svg to png transparent", "svg to png high resolution", "svg rasterizer"],
  },

  "favicon-generator": {
    title: "Favicon Generator: ICO, PNG & Manifest",
    description:
      "Make a favicon.ico, PNG favicons, Apple touch icon, maskable PWA icon and web manifest from one SVG. Copy the HTML snippet. Runs locally, nothing is uploaded.",
    h1: "Favicon generator from SVG",
    intro:
      "Turn one SVG logo into every icon a modern website needs, plus the HTML to link them. You get a multi-size favicon.ico, PNG icons, an Apple touch icon, a maskable icon and a site.webmanifest.",
    steps: [
      "Drop your logo as an SVG, or paste the SVG code.",
      "Check the preview at each size and adjust padding or trim.",
      "Pick a background color for the touch and maskable icons.",
      "Download the ZIP, copy web/ into your public folder and paste head-snippet.html into your page.",
    ],
    faq: [
      {
        q: "What files are included?",
        a: "Seven PNGs, a favicon.ico containing 16, 32 and 48 pixel images, a site.webmanifest and head-snippet.html with the link tags. The manifest is a starter: edit the name, colors and start URL for your app.",
      },
      {
        q: "Do I still need favicon.ico?",
        a: "Most browsers use the PNG or SVG icon from your link tags, but some tools and older clients still request /favicon.ico directly. Shipping both costs a few kilobytes and avoids 404s in your logs.",
      },
      {
        q: "What is a maskable icon?",
        a: "Android can crop app icons into circles, squircles or other shapes. A maskable icon keeps your artwork inside a central safe zone so nothing important is cut off when the launcher applies its mask.",
      },
      {
        q: "Why start from SVG instead of PNG?",
        a: "A vector redraws cleanly at 16 and at 512 pixels. Scaling one PNG up or down blurs edges or loses detail, which is most visible at favicon sizes.",
      },
      {
        q: "Can I use an SVG favicon as well?",
        a: "Yes. Modern browsers accept an SVG icon through a link tag with type image/svg+xml, and it stays sharp at every zoom level. Keep favicon.ico and the PNGs alongside it for browsers and tools that do not read SVG icons.",
      },
    ],
    searches: ["favicon generator", "favicon from svg", "favicon.ico generator", "pwa icon generator", "apple touch icon generator"],
  },

  "app-icon-generator": {
    title: "App Icon Generator for iOS and Android",
    description:
      "Create iOS, iPadOS, macOS and Android app icons from one SVG, with Xcode asset catalogs, adaptive icon layers and a Play Store icon. Runs locally, no upload.",
    h1: "App icon generator for iOS and Android",
    intro:
      "Export a complete app icon set from a single SVG. Apple sets come with Contents.json for Xcode, and Android sets include legacy icons, adaptive layers and the 512 px Play Store icon.",
    steps: [
      "Drop your icon artwork as an SVG.",
      "Choose Apple or Android. Apple is selected by default on this page.",
      "Set a background color and padding, and check the safe-zone preview.",
      "Download the ZIP and merge it into your Xcode asset catalog or Android res folder.",
    ],
    faq: [
      {
        q: "What does the Apple set contain?",
        a: "Twenty-three PNGs in two AppIcon.appiconset folders, one for iPhone and iPad and one for macOS, each with Contents.json. Apple requires opaque icons, so every image is flattened onto your background color.",
      },
      {
        q: "What does the Android set contain?",
        a: "Legacy launcher icons in five densities from mdpi to xxxhdpi, transparent adaptive foregrounds for Android 8 and later, the XML that ties them together, a background color resource and the 512 px Play Store icon.",
      },
      {
        q: "Does it create layered Icon Composer icons?",
        a: "No. The Apple output is the traditional raster catalog that every current Xcode version accepts. Layered appearances and themed monochrome Android icons need separately designed artwork.",
      },
      {
        q: "How do I install the Android icons?",
        a: "Merge the android/res folder into app/src/main/res, resolve any name conflicts, and set android:icon to @mipmap/ic_launcher in AndroidManifest.xml. The included README walks through each step.",
      },
      {
        q: "Why are my Apple icons not transparent?",
        a: "The App Store rejects app icons that contain transparency. The generator flattens every Apple size onto the background color you choose, so pick one that suits your artwork before you export.",
      },
    ],
    searches: ["app icon generator", "ios app icon generator", "android adaptive icon generator", "appiconset generator", "xcode app icon"],
  },

  "video-compressor": {
    title: "Video Compressor – Reduce MP4 & MOV Size",
    description:
      "Compress MP4, MOV and WebM videos in your browser. Pick Smaller, Balanced or Best quality, or a target size in MB. Files never upload, no watermark, no sign-up.",
    h1: "Compress video without uploading it",
    intro:
      "Make a video small enough to send, share or post, without handing it to a server. Pick how small, press Compress, and download the result.",
    steps: [
      "Drop one or more videos, or choose files. MP4, MOV, WebM, MKV and more work.",
      "Pick Smaller, Balanced or Best quality, or set a target size such as 10 or 25 MB.",
      "Press Compress and keep the tab open while it works.",
      "Download each video, or all of them as a ZIP.",
    ],
    faq: [
      {
        q: "How do I get a video under 10 MB or 25 MB?",
        a: "Choose the 10, 25 or 50 MB chip, or type your own target. The compressor works out the bitrate for your clip's length. The final size is an estimate that is usually close; trimming the clip or removing audio helps very long videos fit.",
      },
      {
        q: "Will the quality drop?",
        a: "Balanced keeps up to 1080p at a quality that is hard to tell from the original on a phone. Smaller drops to 720p for big savings, and Best quality keeps the original resolution with a higher bitrate.",
      },
      {
        q: "Is there a file size limit?",
        a: "Browsers with hardware video encoding can handle sources up to 8 GB. When the compressor has to fall back to its built-in FFmpeg engine, the limit is 256 MB per file, and the page tells you if a file is too large for it.",
      },
      {
        q: "Why is it faster on some computers?",
        a: "Most modern browsers expose the graphics chip's video encoder, which is many times faster than software. When it is not available, the compressor uses FFmpeg compiled to WebAssembly, which is slower but works almost everywhere.",
      },
      {
        q: "Is there a watermark?",
        a: "No. There is no watermark, no account and no daily limit. The only limits are your device's memory and the size caps above.",
      },
    ],
    searches: ["video compressor", "compress video", "reduce video size", "compress mp4", "compress video to 25mb", "compress video for discord"],
  },

  "video-converter": {
    title: "Video Converter: MP4, WebM, MOV, GIF, MP3",
    description:
      "Convert videos to MP4, WebM, MOV, GIF or MP3 in your browser. H.264, HEVC, VP9 and AV1 where supported. Batch up to 20 files. Private: nothing is uploaded.",
    h1: "Convert video to MP4, WebM, MOV, GIF or MP3",
    intro:
      "Change a video's format in one click. Choose what you need, press Convert, and download the new file. Your original is never modified.",
    steps: [
      "Drop your video files or choose them from your device.",
      "Pick the output: MP4, WebM, MOV, GIF or MP3.",
      "Press Convert. Codec, resolution and frame rate are set sensibly for you, and you can change them in Advanced.",
      "Download each file, or all of them as a ZIP.",
    ],
    faq: [
      {
        q: "Which format should I pick?",
        a: "MP4 with H.264 plays almost everywhere, so it is the safe choice. WebM suits websites, MOV suits Apple editing apps, GIF is for short silent loops, and MP3 keeps only the audio.",
      },
      {
        q: "Can I convert MOV from an iPhone to MP4?",
        a: "Yes. Drop the MOV and choose MP4. iPhone videos recorded in HEVC are re-encoded to H.264 by default so they play on Windows, Android and older devices.",
      },
      {
        q: "Can I extract the audio as MP3?",
        a: "Choose MP3 and the converter keeps only the soundtrack at 128 kbps or better. WAV and AAC are available in Advanced. If a file has no audio track, the tool tells you before converting.",
      },
      {
        q: "What input formats work?",
        a: "Anything your browser can read plus what the built-in FFmpeg engine understands, including MP4, MOV, WebM, MKV, AVI, M4V and MPEG transport streams.",
      },
      {
        q: "Does converting reduce quality?",
        a: "Converting re-encodes the video, which always changes it slightly. The default quality is high enough that most people cannot see the difference; raise it in Advanced if you need a closer match.",
      },
    ],
    searches: ["video converter", "convert mov to mp4", "mp4 to webm", "convert video to mp3", "online video converter no upload"],
  },

  "video-to-gif": {
    title: "Video to GIF Converter – MP4 to GIF",
    description:
      "Turn a video clip into a looping GIF in your browser. Pick the start and end, choose 320, 480 or 640 px wide and download. No upload and no watermark.",
    h1: "Convert video to GIF",
    intro:
      "Cut a short moment from any video and turn it into a GIF that loops everywhere, from chat apps to README files. Pick the part you want, choose a width, and make it.",
    steps: [
      "Drop an MP4, MOV, WebM or other video.",
      "Set the start and end of the clip, up to 30 seconds.",
      "Choose a width of 320, 480 or 640 pixels.",
      "Press Make GIF, then download it.",
    ],
    faq: [
      {
        q: "How long can the GIF be?",
        a: "Up to 30 seconds. GIF stores every frame as a full image, so longer clips get very large. For anything longer, a short MP4 or WebM loop looks better at a fraction of the size.",
      },
      {
        q: "How do I make the GIF smaller?",
        a: "Use a narrower width, a shorter clip or a lower frame rate in Advanced. Halving the width cuts the file to roughly a quarter of the size.",
      },
      {
        q: "Why do colors look slightly different?",
        a: "A GIF can hold only 256 colors per frame. The converter builds a custom palette from your clip and applies dithering, which keeps gradients smooth but can shift some tones slightly.",
      },
      {
        q: "Does the GIF have sound?",
        a: "No, the GIF format cannot store audio. If you need sound, use the Video Converter to make a short MP4 instead.",
      },
      {
        q: "What frame rate does the GIF use?",
        a: "Up to 15 frames per second, which looks smooth for most clips while keeping the file small. Lower it in Advanced for an even smaller file; screen recordings and pixel art often look fine at 10 fps.",
      },
    ],
    searches: ["video to gif", "mp4 to gif", "convert video to gif", "make a gif from a video", "mov to gif"],
  },

  "video-editor": {
    title: "Online Video Editor – Trim, Crop, Rotate",
    description:
      "Trim, crop, rotate and speed up video, adjust color, add text and a watermark, then export MP4, WebM or GIF. A private video editor that runs in your browser.",
    h1: "Edit video in your browser",
    intro:
      "Make quick edits without installing anything. Trim the ends, crop to 9:16 or 1:1, fix the color, add a caption or logo, and export, all on your own device.",
    steps: [
      "Drop one or more videos to start. The first one opens in the preview.",
      "Trim with the In and Out handles, then crop, rotate or change the speed in Edit.",
      "Add color, text, a watermark or audio changes in the other tabs.",
      "Export the selected video or the whole batch, then save the results.",
    ],
    faq: [
      {
        q: "Can I crop a video for TikTok, Reels or Shorts?",
        a: "Yes. Choose the 9:16 crop preset and drag the frame to the part you want. There are also presets for 16:9, 1:1 and 4:5, or you can drag the corners freely.",
      },
      {
        q: "Do edits apply to every file in a batch?",
        a: "Yes. Settings apply to the whole batch, which is handy for adding the same watermark or trim to many clips. The trim range is bounded by each file's own length.",
      },
      {
        q: "Can I save a single frame as an image?",
        a: "Pause on the frame you want and choose PNG or JPEG under the preview. The saved frame includes your crop, color changes and overlays.",
      },
      {
        q: "Can I change the speed without chipmunk audio?",
        a: "Yes. Preserve audio pitch is on by default, so voices stay natural anywhere from 0.25× to 4× speed.",
      },
      {
        q: "Where do my exports go?",
        a: "Exports stay in this tab until you save them. Large files are held in your browser's private storage instead of memory. Save your files before closing the page; Clear removes the temporary copies.",
      },
    ],
    searches: ["online video editor", "trim video", "crop video", "rotate video", "add text to video", "video editor no watermark"],
  },

  "sprite-sheet-packer": {
    title: "Sprite Sheet Packer – Texture Atlas Maker",
    description:
      "Pack sprites into a texture atlas with MaxRects, alpha trimming, padding and extrusion. Exports PNG plus TexturePacker JSON for Phaser and PixiJS. No upload.",
    h1: "Sprite sheet packer and texture atlas maker",
    intro:
      "Drop a folder of sprites and get a tightly packed atlas plus the JSON your engine needs. Transparent edges are trimmed automatically and frames can rotate to fit.",
    steps: [
      "Drop your sprite images: PNG, JPEG, WebP, GIF or BMP.",
      "Press Pack. The default settings suit most 2D games.",
      "Check the atlas preview, page count and fill percentage.",
      "Download the PNG and JSON, and load them in Phaser, PixiJS or your engine.",
    ],
    faq: [
      {
        q: "Which JSON format does it export?",
        a: "The TexturePacker JSON Hash format, with frame, rotated, trimmed, spriteSourceSize, sourceSize and pivot for every sprite. Phaser and PixiJS load it directly, and most 2D engines and frameworks have a loader for it.",
      },
      {
        q: "What are padding and extrusion for?",
        a: "Padding leaves empty pixels between sprites so they do not bleed into each other when textures are filtered. Extrusion repeats each sprite's edge pixels into that gap, which removes the thin seams you can see between tiles.",
      },
      {
        q: "What happens when sprites do not fit on one sheet?",
        a: "The packer starts another page automatically and writes one PNG and one JSON per page. Raise the maximum atlas size in Advanced to use fewer pages.",
      },
      {
        q: "Should I force power-of-two sizes?",
        a: "Only if you target old hardware or a texture compression format that requires it, such as PVRTC on older iPhones. Modern WebGL and game engines handle any size.",
      },
      {
        q: "Which packing algorithm is used?",
        a: "MaxRects with the best short side fit heuristic by default, which is what TexturePacker and most tools use. Best area fit and contact point are available in Advanced.",
      },
    ],
    searches: ["sprite sheet packer", "texture packer online", "sprite atlas generator", "sprite sheet maker", "texturepacker alternative"],
  },

  "1x-2x-3x-image-generator": {
    title: "1x 2x 3x Image Generator for iOS & Android",
    description:
      "Export @1x, @2x and @3x images from your largest asset, with iOS and Android naming, pixel-art scaling and a ZIP download. Runs in your browser, no upload.",
    h1: "Generate 1x, 2x and 3x images",
    intro:
      "Drop your largest artwork and get every retina size with the right names. Pixel art scales with nearest neighbor so edges stay sharp.",
    steps: [
      "Drop your images at their largest (@3x) size.",
      "Choose iOS or Android naming.",
      "Pick smooth or pixel-art scaling.",
      "Download every size as a ZIP.",
    ],
    faq: [
      {
        q: "Why start from the largest image?",
        a: "Scaling down keeps detail; scaling up invents pixels and blurs art. Export at @3x and let the tool derive @2x and @1x.",
      },
      {
        q: "Which names does it use?",
        a: "iOS uses @2x and @3x suffixes. Android uses density folders from mdpi to xxxhdpi. You can also set a custom suffix.",
      },
      {
        q: "Does pixel art stay sharp?",
        a: "Yes. Pixel-art mode uses nearest-neighbor scaling so every pixel stays a crisp square.",
      },
      {
        q: "Is anything uploaded?",
        a: "No. Resizing happens in a background worker in your browser.",
      },
    ],
    searches: ["1x 2x 3x image generator", "@2x @3x generator", "retina image generator", "android drawable generator"],
  },

  "3d-model-converter": {
    title: "3D Model Converter: OBJ, STL, GLB, USDZ",
    description:
      "Convert 3D models between OBJ, STL, PLY, glTF and GLB, and export USDZ for iPhone AR Quick Look. Inspect meshes first. Runs in your browser, no upload.",
    h1: "Convert 3D models online",
    intro:
      "Convert a model between the formats games, 3D printers and AR viewers expect, and check its meshes and triangle count before you export.",
    steps: [
      "Drop an OBJ, STL, PLY, glTF or GLB file.",
      "Check the mesh, material and triangle counts.",
      "Pick the output format.",
      "Download the converted model.",
    ],
    faq: [
      {
        q: "Which formats are supported?",
        a: "OBJ, STL, PLY, glTF and GLB in; glTF, GLB, OBJ, STL, PLY and USDZ out.",
      },
      {
        q: "Can I open USD or USDZ files?",
        a: "Not yet. USDZ export is supported; reading USD is planned.",
      },
      {
        q: "Are textures kept?",
        a: "Embedded and referenced textures are carried over when the target format supports them.",
      },
      {
        q: "Is my model uploaded?",
        a: "No. Parsing and exporting happen in your browser.",
      },
    ],
    searches: ["3d model converter", "obj to glb", "stl to obj", "glb to usdz"],
  },

  "json-formatter": {
    title: "JSON Formatter & Beautifier",
    description:
      "Format, beautify and minify JSON, sort keys, explore it as a tree and convert to YAML, CSV or XML. Handles files up to 10 MB in a worker. Private, no upload.",
    h1: "JSON formatter and beautifier",
    intro:
      "Paste messy JSON and get clean, indented output as you type. Large files are parsed in a background worker, so the page never freezes.",
    steps: [
      "Paste JSON, or drop a .json file up to 10 MB.",
      "Pick 2 spaces, 4 spaces, tabs or Minify, and optionally sort keys.",
      "Switch to Tree to explore nested data and copy the JSONPath of any value.",
      "Copy the result or download it as JSON, YAML, CSV or XML.",
    ],
    faq: [
      {
        q: "Does formatting change my numbers?",
        a: "No. Numbers keep their exact source text, so large IDs and long decimals are not rounded the way JSON.parse would round them in JavaScript.",
      },
      {
        q: "What happens to duplicate keys?",
        a: "They are kept and flagged. Many JSON parsers keep only the last value for a repeated key, so the warning tells you your data may be read differently elsewhere.",
      },
      {
        q: "Can I convert JSON to CSV?",
        a: "Yes. Choose CSV as the output format. Arrays of objects become rows and columns, and cells that look like spreadsheet formulas are escaped by default so opening the file in Excel is safe.",
      },
      {
        q: "How do I minify JSON?",
        a: "Choose Minify under Whitespace. All optional spaces and line breaks are removed, which is the smallest valid form for sending over a network or storing in a config.",
      },
      {
        q: "Are there keyboard shortcuts?",
        a: "Ctrl or Cmd + Enter reformats immediately and Escape clears the editor. Tab moves focus as usual, so the page stays fully keyboard accessible.",
      },
    ],
    searches: ["json formatter", "json beautifier", "format json online", "json pretty print", "json minify", "json to yaml"],
  },

  "json-validator": {
    title: "JSON Validator – Find JSON Errors Fast",
    description:
      "Validate JSON instantly and see exactly which line and column is wrong, with a plain-language explanation. Warns about duplicate keys. Runs locally, no upload.",
    h1: "JSON validator",
    intro:
      "Paste JSON and see immediately whether it is valid. If it is not, you get the line, the column and what went wrong, so you can fix it in seconds.",
    steps: [
      "Paste JSON or drop a .json file.",
      "Read the Valid or Invalid banner at the top of the results.",
      "If it is invalid, jump to the reported line and column and fix the error.",
      "Optionally copy the cleanly formatted version once it passes.",
    ],
    faq: [
      {
        q: "What are the most common JSON errors?",
        a: "Trailing commas after the last item, single quotes instead of double quotes, unquoted keys and comments. All of these are valid in JavaScript but not in strict JSON, which is why copied code often fails.",
      },
      {
        q: "Does it validate against a JSON Schema?",
        a: "No, it checks that the text is well-formed JSON according to the standard (RFC 8259). Schema validation checks the shape of the data and is a separate step.",
      },
      {
        q: "Why is my JSON valid here but rejected elsewhere?",
        a: "Duplicate keys and very large numbers are allowed by the standard but handled differently by different parsers. The validator warns about both so you can spot the difference.",
      },
      {
        q: "How big a file can I check?",
        a: "Up to 10 MB. Parsing runs in a background worker with a time limit, so a huge or unusual file cannot lock up the page.",
      },
      {
        q: "Can it fix my JSON automatically?",
        a: "No. Guessing at a fix can silently change your data, so the validator points to the exact problem instead. Most errors are a one-character fix once you know where to look.",
      },
    ],
    searches: ["json validator", "validate json", "json lint", "json checker", "check json online"],
  },

  "base64-encode-decode": {
    title: "Base64 Encode & Decode – Text and Files",
    description:
      "Encode and decode Base64 for text, files and images. UTF-8 safe, URL-safe alphabet, optional padding, data URIs and image preview. All local, no upload.",
    h1: "Base64 encoder and decoder",
    intro:
      "Convert text or files to Base64 and back. Text is handled as UTF-8, so emoji and accented characters survive the round trip.",
    steps: [
      "Choose Encode or Decode.",
      "Type or paste text, or drop a file or image.",
      "Pick standard or URL-safe Base64 and whether to keep the = padding.",
      "Copy the result, download the decoded file, or copy a ready-made data URI.",
    ],
    faq: [
      {
        q: "What is URL-safe Base64?",
        a: "It replaces + and / with - and _ so the output can go in URLs, file names and JWTs without escaping. Padding is often dropped as well. The decoder accepts both alphabets.",
      },
      {
        q: "How do I turn an image into a data URI?",
        a: "Switch to Encode, drop the image, and copy the data URI. You can paste it straight into CSS or an img tag. Keep it for small images, since Base64 makes files about a third larger.",
      },
      {
        q: "Why does my decoded text look garbled?",
        a: "The original was probably binary data, such as an image or a compressed file, rather than text. Download the decoded bytes as a file instead of reading them as text.",
      },
      {
        q: "Is Base64 encryption?",
        a: "No. Base64 only changes how bytes are written so they survive text-only channels. Anyone can decode it, so never use it to hide passwords or secrets.",
      },
      {
        q: "Why is Base64 output longer than the input?",
        a: "Base64 writes every 3 bytes as 4 characters, so encoded data is about a third larger, plus up to two = padding characters. That overhead is the price of sending binary data through text-only channels such as JSON and email.",
      },
    ],
    searches: ["base64 encode", "base64 decode", "base64 to image", "image to base64", "base64 converter"],
  },

  "url-encode-decode": {
    title: "URL Encode & Decode Online",
    description:
      "Percent-encode and decode URLs, query strings and form data. Choose component, full URI or form encoding, and see clear errors for malformed input. No upload.",
    h1: "URL encoder and decoder",
    intro:
      "Make text safe to put in a URL, or turn a percent-encoded link back into something readable. Pick the encoding that matches where the text is going.",
    steps: [
      "Select whether to encode or decode.",
      "Paste the text, URL or query string.",
      "Pick component, full URI or form encoding.",
      "Copy the result.",
    ],
    faq: [
      {
        q: "What is the difference between component and full URI encoding?",
        a: "Component encoding (encodeURIComponent) escapes every reserved character, including / ? & and =, which is right for a single query value. Full URI encoding leaves those alone so an entire address stays a working link.",
      },
      {
        q: "Should spaces be %20 or +?",
        a: "In URL paths and most APIs a space is %20. HTML form submissions (application/x-www-form-urlencoded) use + instead. Pick Form encoding when you are building or reading form data.",
      },
      {
        q: "Why does decoding fail?",
        a: "A percent sign must be followed by two hexadecimal digits, and the bytes must form valid UTF-8. The tool shows where the input breaks one of those rules instead of silently guessing.",
      },
      {
        q: "Does it handle emoji and non-English text?",
        a: "Yes. Text is encoded as UTF-8 first, which is what every modern browser and server expects.",
      },
      {
        q: "Which characters are never encoded?",
        a: "Letters, digits and the symbols - _ . ~ always stay as they are. Component encoding also leaves ! ' ( ) and * alone for historical reasons. Everything else, including spaces, is written as one or more %XX bytes.",
      },
    ],
    searches: ["url encode", "url decode", "percent encoding", "encodeuricomponent online", "url encoder"],
  },

  "jwt-decoder": {
    title: "JWT Decoder – Decode and Verify Tokens",
    description:
      "Decode a JSON Web Token to read its header and claims, check expiry, and verify HS256, RS256, PS256 or ES256 signatures. Your token never leaves the browser.",
    h1: "JWT decoder and verifier",
    intro:
      "Paste a token to see its header, payload and claims in plain language. Add a secret or public key to check the signature, all without sending the token anywhere.",
    steps: [
      "Paste a JWT. It is decoded as you type.",
      "Read the header, payload and registered claims such as exp, iat and iss.",
      "Check the expiry status against your device clock.",
      "Optionally paste the secret or public key to verify the signature.",
    ],
    faq: [
      {
        q: "Is it safe to paste a production token here?",
        a: "Decoding and verification run entirely in your browser, and the token is never sent or saved. Even so, treat live tokens like passwords: prefer expired or test tokens when you can.",
      },
      {
        q: "Which algorithms can it verify?",
        a: "HS256, HS384 and HS512 with a shared secret; RS256, RS384 and RS512 and PS256 with an RSA public key; and ES256 with an EC public key. Keys can be pasted as PEM or JWK.",
      },
      {
        q: "Does decoding a JWT prove it is valid?",
        a: "No. Anyone can decode a JWT because the header and payload are only Base64URL-encoded. Only a signature check with the right key proves the token was issued by who it claims.",
      },
      {
        q: "Why does it say my token has expired?",
        a: "The exp claim is compared with your device's clock. If your clock is off, or the token uses milliseconds instead of seconds, the result can be wrong, and the tool shows the exact times it compared.",
      },
      {
        q: "What do iat, nbf and exp mean?",
        a: "iat is when the token was issued, nbf is the earliest time it may be used, and exp is when it stops being valid. All three are Unix timestamps in seconds, and the decoder shows each one as a readable date.",
      },
    ],
    searches: ["jwt decoder", "decode jwt", "jwt verify", "jwt.io alternative", "jwt parser"],
  },

  "hash-generator": {
    title: "Hash Generator: MD5, SHA-1, SHA-256",
    description:
      "Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes for text or files, and compare with an expected checksum. Uses Web Crypto; files are never uploaded.",
    h1: "Hash generator (MD5, SHA-256)",
    intro:
      "Get the checksum of any text or file, or confirm a download matches the hash its publisher listed. Every common algorithm is computed at once.",
    steps: [
      "Type or paste text, or drop a file.",
      "Read the MD5, SHA-1, SHA-256, SHA-384 and SHA-512 values.",
      "Paste an expected hash to compare automatically.",
      "Copy the hash you need.",
    ],
    faq: [
      {
        q: "How do I verify a downloaded file?",
        a: "Drop the file, paste the checksum from the download page into the compare box, and look for the match. A match means the file is byte-for-byte what the publisher hashed.",
      },
      {
        q: "Which algorithm should I use?",
        a: "Use SHA-256 for new work. MD5 and SHA-1 are broken for security purposes because collisions can be manufactured, but they are still fine for spotting accidental corruption.",
      },
      {
        q: "Can I hash a password with this?",
        a: "You can, but plain hashes are not safe for storing passwords. Password storage needs a slow, salted algorithm such as Argon2, scrypt or bcrypt.",
      },
      {
        q: "Does it handle large files?",
        a: "Yes. Files are read in chunks in a background worker, and you can cancel a long hash at any time. Nothing is uploaded.",
      },
      {
        q: "Why does the same text give a different hash elsewhere?",
        a: "A hash changes with every byte, so invisible differences matter: a trailing newline, Windows line endings or a different text encoding. This tool hashes your text as UTF-8, exactly as typed.",
      },
    ],
    searches: ["hash generator", "sha256 generator", "md5 generator", "checksum calculator", "file hash"],
  },

  "password-generator": {
    title: "Strong Password Generator",
    description:
      "Generate strong random passwords with your browser's secure random generator. Choose length and character sets, make many at once. Nothing is sent or stored.",
    h1: "Strong password generator",
    intro:
      "Create passwords that are genuinely random, using the same cryptographic generator your browser uses for HTTPS. Nothing is sent or saved.",
    steps: [
      "Choose a length. 16 characters or more is a good default.",
      "Pick which character sets to include: upper case, lower case, digits and symbols.",
      "Generate one password or a batch.",
      "Reveal and copy the one you want, then store it in a password manager.",
    ],
    faq: [
      {
        q: "How long should a password be?",
        a: "At least 16 random characters for accounts that matter. Length adds far more strength than symbols do, and a password manager means you never have to type it.",
      },
      {
        q: "Is the randomness really secure?",
        a: "Yes. Characters come from crypto.getRandomValues, and each position is sampled without the modulo bias that makes some generators favor certain characters.",
      },
      {
        q: "Are my passwords saved anywhere?",
        a: "No. They exist only in this tab's memory and are hidden until you choose to reveal them. Closing the tab discards them.",
      },
      {
        q: "Will every password include each character set I picked?",
        a: "Some sites reject passwords that are missing a digit or a symbol. The generator discards any candidate that lacks one of your selected sets, which keeps the result uniformly random among passwords that meet every rule.",
      },
      {
        q: "What does excluding ambiguous characters do?",
        a: "It removes characters that are easy to confuse when reading or typing, such as I, l, 1, O, 0 and o. Use it for passwords you must read aloud or copy by hand; it slightly reduces the number of possible passwords.",
      },
    ],
    searches: ["password generator", "strong password generator", "random password generator", "secure password"],
  },

  "uuid-generator": {
    title: "UUID Generator – Bulk UUID v4",
    description:
      "Generate random UUID v4 values, one or up to 1,000 at a time, and copy them as a list, JSON or CSV. Uses your browser's secure randomness. Nothing is uploaded.",
    h1: "UUID v4 generator",
    intro:
      "Create one UUID or a thousand in a click. Every value is a version 4 UUID built from cryptographically secure random numbers.",
    steps: [
      "Choose how many UUIDs you need, from 1 to 1,000.",
      "Pick plain text, JSON or CSV output, and upper or lower case.",
      "Generate.",
      "Copy the list or download it.",
    ],
    faq: [
      {
        q: "What is a UUID v4?",
        a: "A 128-bit identifier where 122 bits are random, written as 32 hexadecimal digits in five groups. Version 4 needs no central server or clock, so it is the most common type for database keys and request IDs.",
      },
      {
        q: "Can two UUIDs ever be the same?",
        a: "In theory, but you would need to generate billions per second for many years before a collision became likely. For practical purposes every value is unique.",
      },
      {
        q: "Is a GUID the same as a UUID?",
        a: "Yes. GUID is Microsoft's name for the same 128-bit format. Some Windows tools print GUIDs in upper case or inside braces, but the value is identical.",
      },
      {
        q: "Should I use UUID v4 or v7?",
        a: "Version 7 starts with a timestamp, so it sorts by creation time and can index better in databases. Version 4 is fully random and is what this tool generates.",
      },
      {
        q: "Can I generate UUIDs in upper case?",
        a: "Yes. Switch the case option and every value is printed in upper case. UUIDs are case-insensitive, so both forms name the same identifier, but many databases and APIs store them in lower case.",
      },
    ],
    searches: ["uuid generator", "guid generator", "uuid v4", "bulk uuid generator", "random uuid"],
  },

  "unix-timestamp-converter": {
    title: "Unix Timestamp Converter – Epoch to Date",
    description:
      "Convert Unix epoch timestamps in seconds or milliseconds to readable dates in UTC or any time zone, and dates back to timestamps. Runs locally in your browser.",
    h1: "Unix timestamp converter",
    intro:
      "Turn an epoch number into a date you can read, or a date into the timestamp your code needs. Seconds and milliseconds are handled explicitly, so there is no guessing.",
    steps: [
      "Paste a timestamp or type a date.",
      "Choose seconds or milliseconds.",
      "Pick UTC, your local time or any IANA time zone for display.",
      "Copy the format you need, such as ISO 8601.",
    ],
    faq: [
      {
        q: "What is a Unix timestamp?",
        a: "The number of seconds since 00:00:00 UTC on 1 January 1970, not counting leap seconds. It is the same everywhere in the world at a given moment, which makes it ideal for storing times.",
      },
      {
        q: "How do I tell seconds from milliseconds?",
        a: "Current timestamps in seconds have 10 digits and in milliseconds have 13. JavaScript's Date.now() returns milliseconds, while most Unix tools and many APIs use seconds.",
      },
      {
        q: "Why is my converted date off by a few hours?",
        a: "The timestamp is almost certainly right and being shown in a different time zone. Switch the display zone to UTC to see the underlying moment.",
      },
      {
        q: "What is the year 2038 problem?",
        a: "Systems that store timestamps as signed 32-bit integers overflow on 19 January 2038. Modern languages and 64-bit systems are not affected.",
      },
      {
        q: "How do I get the current Unix timestamp in code?",
        a: "In JavaScript use Math.floor(Date.now() / 1000), in Python int(time.time()), and in a Unix shell date +%s. This page can also fill in the current time with one click.",
      },
    ],
    searches: ["unix timestamp converter", "epoch converter", "timestamp to date", "date to timestamp", "epoch time"],
  },

  "regex-tester": {
    title: "Regex Tester for JavaScript",
    description:
      "Test JavaScript regex with live highlighting, capture and named groups, flags and replace, plus a pattern library. Runs locally in your browser, no upload.",
    h1: "JavaScript regex tester",
    intro:
      "Write a pattern and watch it match as you type. Every match, capture group and replacement is shown instantly, using the same engine your JavaScript code runs on.",
    steps: [
      "Enter a regular expression and choose flags such as g, i, m, s, u or y.",
      "Paste the text you want to test.",
      "Inspect highlighted matches and numbered or named capture groups.",
      "Try a replacement with $1 or $<name> tokens and copy the result.",
    ],
    faq: [
      {
        q: "Which regex flavor does this use?",
        a: "Your browser's JavaScript engine, so results match what your code does in Node.js and the browser. Syntax such as possessive quantifiers from PCRE or Python is not supported.",
      },
      {
        q: "What do the flags do?",
        a: "g finds every match, i ignores case, m makes ^ and $ match at line breaks, s lets the dot match new lines, u enables full Unicode, and y matches only from the last position.",
      },
      {
        q: "Why does my pattern freeze other testers?",
        a: "Some patterns backtrack exponentially on certain input. Here matching runs in a worker with a time limit, so a runaway pattern stops with a message instead of hanging the page.",
      },
      {
        q: "How do I use a named group in the replacement?",
        a: "Write (?<name>...) in the pattern and $<name> in the replacement. Numbered groups use $1, $2 and so on, and $& inserts the whole match.",
      },
      {
        q: "How do I match across multiple lines?",
        a: "Turn on the s flag so the dot also matches line breaks, or use [\\s\\S] in the pattern. The m flag is different: it makes ^ and $ match at the start and end of every line.",
      },
    ],
    searches: ["regex tester", "regex online", "javascript regex tester", "regexp tester", "regular expression tester"],
  },

  "color-converter": {
    title: "Color Converter: HEX, RGB, HSL, OKLCH",
    description:
      "Convert colors between HEX, RGB, HSL and OKLCH, with alpha, a live swatch and a color picker. Copy any format in one click. Runs in your browser, no upload.",
    h1: "Color converter (HEX, RGB, HSL)",
    intro:
      "Type a color in any common format and get all the others instantly. The live swatch shows exactly what you are working with.",
    steps: [
      "Type or paste a color, such as #FF6B00 or rgb(255 107 0), or use the picker.",
      "Adjust the opacity if you need transparency.",
      "Read the HEX, RGB, HSL and OKLCH values.",
      "Copy the format your code needs.",
    ],
    faq: [
      {
        q: "What is OKLCH and why use it?",
        a: "OKLCH describes color by lightness, chroma and hue in a way that matches how people see. Changing lightness keeps the hue steady, which makes it great for building palettes and design tokens in modern CSS.",
      },
      {
        q: "Why does my OKLCH color change when converted to HEX?",
        a: "OKLCH can describe colors outside the sRGB range that HEX and RGB can store. The converter maps them to the nearest color that screens using sRGB can show and tells you when it does.",
      },
      {
        q: "How do I write a transparent color in HEX?",
        a: "Add two more digits for alpha: #FF6B0080 is the same orange at about 50% opacity. RGB and HSL use a slash, as in rgb(255 107 0 / 50%).",
      },
      {
        q: "Is HSL the same as HSB or HSV?",
        a: "No. HSL's lightness runs from black through the pure color to white, while HSB's brightness runs from black to the pure color. Design tools often use HSB; CSS uses HSL.",
      },
      {
        q: "How do I convert HEX to RGB by hand?",
        a: "Split the six digits into three pairs and read each pair as a hexadecimal number: #FF6B00 becomes FF = 255, 6B = 107 and 00 = 0, which is rgb(255 107 0). Three-digit HEX doubles each digit first, so #F60 means #FF6600.",
      },
    ],
    searches: ["color converter", "hex to rgb", "rgb to hex", "hex to hsl", "oklch converter"],
  },
} as const satisfies Record<ToolId, ToolSeo>;

export const hubSeo = {
  image: {
    title: "Free Online Image and Icon Tools",
    description:
      "Free image tools that run in your browser: compress JPG, PNG and WebP, convert SVG to PNG, and generate favicons and app icons. No uploads and no sign-up.",
    h1: "Image and icon tools",
    intro: "Compress images, render SVG to PNG, and generate favicons and app icon sets. Everything runs on your device.",
    body: [
      "These tools are built for the jobs that come up while shipping a game or a website: getting screenshots and textures small enough to load fast, turning a vector logo into every icon a platform asks for, and exporting artwork at exact sizes.",
      "Nothing is uploaded. Codecs such as MozJPEG, libwebp, libavif and OxiPNG are compiled to WebAssembly and run in your browser, so even large batches stay private.",
    ],
    faq: [
      {
        q: "Which tool should I use for a logo?",
        a: "Start from an SVG. Use the Favicon Generator for a website, the App Icon Generator for iOS or Android, and SVG to PNG for any other sizes.",
      },
      {
        q: "Are there limits on how many images I can process?",
        a: "Only your device's memory. The compressor handles up to 100 images per session and the SVG tools up to 20 files per batch.",
      },
    ],
    searches: ["image tools online", "free image tools", "icon generator", "image converter online"],
  },
  video: {
    title: "Free Online Video Tools – No Upload",
    description:
      "Compress, convert, trim and edit video, or turn clips into GIFs, right in your browser. Hardware encoding where available. Nothing uploads, no watermark.",
    h1: "Video tools",
    intro: "Compress, convert and edit video, or make a GIF, without uploading anything. Pick the job and drop your file.",
    body: [
      "All four tools share one engine. It uses your browser's hardware video encoder through WebCodecs when available, and falls back to FFmpeg compiled to WebAssembly when it is not, so they work on almost any modern desktop or laptop.",
      "Because your video never leaves the device, there is no upload wait, no queue and no watermark. Big files are held in the browser's private storage instead of memory, and exports stay until you save them.",
    ],
    faq: [
      {
        q: "Which browser works best?",
        a: "A current version of Chrome, Edge or Safari on a desktop or laptop. They expose hardware video encoders, which are many times faster than the software fallback.",
      },
      {
        q: "Can I use these on my phone?",
        a: "Yes, for short clips. Phones have less memory, so long or 4K videos are better handled on a computer.",
      },
    ],
    searches: ["video tools online", "free video tools", "online video tools no upload", "video tools no watermark"],
  },
  "game-dev": {
    title: "Free Game Dev Tools – Sprite Sheets & More",
    description:
      "Free browser tools for game developers: pack sprites into texture atlases with Phaser and PixiJS JSON, and more on the way. No install, no upload.",
    h1: "Game dev tools",
    intro: "Browser tools for 2D game asset pipelines, built by a game developer. No install and no upload.",
    body: [
      "The Sprite Sheet Packer turns a folder of frames into a tightly packed atlas with TexturePacker-compatible JSON, ready for Phaser, PixiJS and most 2D engines.",
      "A retina 1x/2x/3x generator and a 3D model converter are in development. They will appear here once they work end to end; nothing on this site pretends to work before it does.",
    ],
    faq: [
      {
        q: "Which engines can use the sprite sheets?",
        a: "Anything that reads TexturePacker JSON Hash, including Phaser and PixiJS out of the box, and many other engines through a small loader.",
      },
      {
        q: "How do I request a tool?",
        a: "Open an issue on GitHub from the Feedback link in the footer. Requests help decide which engine gets built next.",
      },
    ],
    searches: ["game dev tools", "game developer tools online", "sprite tools", "texture atlas tools"],
  },
  developer: {
    title: "Free Online Developer Tools",
    description:
      "Private developer tools: JSON formatter and validator, JWT decoder, Base64, URL encoding, hashes, UUIDs, passwords, timestamps, regex and colors. No upload.",
    h1: "Developer tools",
    intro: "Everyday utilities for working with data, tokens and text. Results update as you type, and nothing leaves your browser.",
    body: [
      "Paste an API response, a token or a config file without worrying about where it goes. Every tool runs locally, heavier work happens in background workers with time limits, and nothing you enter is stored.",
      "The tools share keyboard shortcuts: Ctrl or Cmd + Enter runs, and Escape clears. Each one documents its limits, such as the 10 MB cap on JSON input, instead of failing silently.",
    ],
    faq: [
      {
        q: "Is it safe to paste secrets and tokens here?",
        a: "Nothing you enter is sent or saved; it stays in this tab's memory. Still, prefer test tokens, and rotate any secret you have pasted somewhere you do not control.",
      },
      {
        q: "Do these tools use analytics?",
        a: "The developer tools send nothing you type anywhere. If page-view analytics are ever added to the site, they will be cookie-free and will never include your input.",
      },
    ],
    searches: ["developer tools online", "online dev tools", "json jwt base64 tools", "web developer utilities"],
  },
} as const satisfies Record<ToolCategory, HubSeo>;
