//! Small, dependency-free Wasm color kernel. Pixels never leave the browser.
//! The JavaScript renderer owns one reusable allocation per export.

const MAX_BYTES: usize = 3840 * 2160 * 4;

#[no_mangle]
pub extern "C" fn abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn alloc_rgba(length: usize) -> *mut u8 {
    if length == 0 || length > MAX_BYTES || length % 4 != 0 { return std::ptr::null_mut(); }
    let pixels = vec![0_u8; length].into_boxed_slice();
    Box::into_raw(pixels) as *mut u8
}

/// `ptr` and `length` must match a live allocation returned by alloc_rgba.
#[no_mangle]
pub unsafe extern "C" fn free_rgba(ptr: *mut u8, length: usize) {
    if !ptr.is_null() && length > 0 && length <= MAX_BYTES {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, length)));
    }
}

fn bounded(value: f32, fallback: f32, min: f32, max: f32) -> f32 {
    if value.is_finite() { value.clamp(min, max) } else { fallback }
}

fn srgb_to_linear(value: f32) -> f32 {
    if value <= 0.04045 { value / 12.92 } else { ((value + 0.055) / 1.055).powf(2.4) }
}

fn linear_to_srgb(value: f32) -> f32 {
    if value <= 0.0031308 { value * 12.92 } else { 1.055 * value.powf(1.0 / 2.4) - 0.055 }
}

fn process(pixels: &mut [u8], brightness: f32, contrast: f32, saturation: f32, exposure: f32, look: u32) {
    let brightness = bounded(brightness, 0.0, -1.0, 1.0);
    let contrast = bounded(contrast, 1.0, 0.0, 3.0);
    let saturation = bounded(saturation, 1.0, 0.0, 3.0);
    let multiplier = 2.0_f32.powf(bounded(exposure, 0.0, -4.0, 4.0));
    // Exposure is evaluated in linear light. A 256-entry lookup table avoids
    // expensive powers in the pixel loop and is shared by all three channels.
    let mut values = [0.0_f32; 256];
    for (index, value) in values.iter_mut().enumerate() {
        let exposed = linear_to_srgb(srgb_to_linear(index as f32 / 255.0) * multiplier);
        *value = (exposed - 0.5) * contrast + 0.5 + brightness;
    }
    for pixel in pixels.chunks_exact_mut(4) {
        if pixel[3] == 0 { continue; }
        let mut r = values[pixel[0] as usize];
        let mut g = values[pixel[1] as usize];
        let mut b = values[pixel[2] as usize];
        let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = luminance + (r - luminance) * saturation;
        g = luminance + (g - luminance) * saturation;
        b = luminance + (b - luminance) * saturation;
        match look {
            1 => { r *= 1.07; g *= 0.99; b *= 0.93; },
            2 => { r *= 0.93; g *= 1.01; b *= 1.08; },
            3 => { r = luminance; g = luminance; b = luminance; },
            4 => {
                r = (r - 0.5) * 1.08 + 0.52;
                g = (g - 0.5) * 1.04 + 0.50;
                b = (b - 0.5) * 0.96 + 0.48;
            },
            _ => {},
        }
        pixel[0] = (r.clamp(0.0, 1.0) * 255.0 + 0.5) as u8;
        pixel[1] = (g.clamp(0.0, 1.0) * 255.0 + 0.5) as u8;
        pixel[2] = (b.clamp(0.0, 1.0) * 255.0 + 0.5) as u8;
    }
}

/// RGBA bytes are unpremultiplied sRGB, matching Canvas ImageData. Alpha is preserved.
/// `ptr` must point to a live allocation of at least `length` bytes.
#[no_mangle]
pub unsafe extern "C" fn process_rgba(ptr: *mut u8, length: usize, brightness: f32, contrast: f32, saturation: f32, exposure: f32, look: u32) -> i32 {
    if ptr.is_null() || length == 0 || length > MAX_BYTES || length % 4 != 0 { return -1; }
    process(std::slice::from_raw_parts_mut(ptr, length), brightness, contrast, saturation, exposure, look);
    0
}

