const { useRef, useState } = React;

// Clamp avoid colour math artifacts.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// However, hue should wrap rather than clamp, so shifts feel continuous.
const wrapHue = (hue) => ((hue % 360) + 360) % 360;

// Convert hex to RGB.
const hexToRgb = (hex) => {
    const cleaned = hex.replace("#", "");
    const normalized =
        cleaned.length === 3
            ? cleaned
                  .split("")
                  .map((char) => char + char)
                  .join("")
            : cleaned;
    const int = parseInt(normalized, 16);

    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    };
};

// HSL is easier to remix (contrast/saturation/lightness) than raw RGB.
const rgbToHsl = ({ r, g, b }) => {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    let hue = 0;

    if (delta !== 0) {
        if (max === rNorm) {
            hue = ((gNorm - bNorm) / delta) % 6;
        } else if (max === gNorm) {
            hue = (bNorm - rNorm) / delta + 2;
        } else {
            hue = (rNorm - gNorm) / delta + 4;
        }
        hue *= 60;
    }

    const lightness = (max + min) / 2;
    const saturation =
        delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

    return {
        h: wrapHue(Math.round(hue)),
        s: Math.round(saturation * 100),
        l: Math.round(lightness * 100),
    };
};

// Convert edited HSL back to hex for display and swatches.
const hslToHex = ({ h, s, l }) => {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const chroma = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const hPrime = h / 60;
    const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
    const m = lNorm - chroma / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (hPrime >= 0 && hPrime < 1) {
        r = chroma;
        g = x;
    } else if (hPrime >= 1 && hPrime < 2) {
        r = x;
        g = chroma;
    } else if (hPrime >= 2 && hPrime < 3) {
        g = chroma;
        b = x;
    } else if (hPrime >= 3 && hPrime < 4) {
        g = x;
        b = chroma;
    } else if (hPrime >= 4 && hPrime < 5) {
        r = x;
        b = chroma;
    } else {
        r = chroma;
        b = x;
    }

    const toHex = (value) => {
        const rounded = Math.round((value + m) * 255);
        return rounded.toString(16).padStart(2, "0");
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Single-source conversion, so UI state remains hex-driven.
const hexToHsl = (hex) => rgbToHsl(hexToRgb(hex));

// Presets are intentionally set to show quite large, visible jumps.
const remixPresets = [
    {
        label: "Neutral",
        values: {
            contrast: 24,
            saturation: 0,
            lightness: 0,
            hueShift: 0,
        },
    },
    {
        label: "Vivid",
        values: {
            contrast: 62,
            saturation: 28,
            lightness: 6,
            hueShift: 18,
        },
    },
    {
        label: "Moody",
        values: {
            contrast: 70,
            saturation: -10,
            lightness: -18,
            hueShift: -22,
        },
    },
    {
        label: "Warm",
        values: {
            contrast: 46,
            saturation: 16,
            lightness: 10,
            hueShift: 28,
        },
    },
    {
        label: "Cool",
        values: {
            contrast: 46,
            saturation: 12,
            lightness: 8,
            hueShift: -28,
        },
    },
];

// Build palette colours.
const buildPalette = (base, remix) => {
    const contrast = remix.contrast / 100;
    const baseHue = wrapHue(base.h + remix.hueShift);
    const baseSat = clamp(base.s + remix.saturation, 8, 96);
    const baseLight = clamp(base.l + remix.lightness, 10, 88);
    const accentHue = wrapHue(baseHue + 140);

    return {
        primary: { h: baseHue, s: baseSat, l: baseLight },
        secondary: {
            h: wrapHue(baseHue + 32),
            s: clamp(baseSat - 10 + contrast * 10, 10, 90),
            l: clamp(baseLight + 4, 14, 88),
        },
        accent: {
            h: accentHue,
            s: clamp(baseSat + 12 + contrast * 12, 16, 98),
            l: clamp(baseLight + 12 + contrast * 10, 14, 90),
        },
        surface: {
            h: wrapHue(baseHue + 6),
            s: clamp(6 + baseSat * 0.12, 4, 22),
            l: clamp(96 - contrast * 22, 82, 98),
        },
        text: {
            h: baseHue,
            s: clamp(8 + baseSat * 0.1, 4, 24),
            l: clamp(12 - contrast * 10, 4, 20),
        },
        border: {
            h: baseHue,
            s: clamp(10 + baseSat * 0.12, 6, 30),
            l: clamp(80 - contrast * 18, 54, 90),
        },
    };
};

export const ColorPicker = () => {
    const containerRef = useRef(null);
    const [color, setColor] = useState("#ffffff");

    // Remix values are kept as single object.
    const [remix, setRemix] = useState({
        contrast: 24,
        saturation: 0,
        lightness: 0,
        hueShift: 0,
    });

    // Directly update container style.
    const handleColorChange = (event) => {
        const nextColor = event.target.value;
        setColor(nextColor);
        if (containerRef.current) {
            containerRef.current.style.backgroundColor = nextColor;
        }
    };

    // Presets replace whole remix state for clear before/after changes.
    const applyPreset = (values) => {
        setRemix(values);
    };

    // Small helper to keep slider handlers concise and consistent.
    const updateRemix = (key) => (event) => {
        const nextValue = Number(event.target.value);
        setRemix((prev) => ({ ...prev, [key]: nextValue }));
    };

    // Derive roles from the chosen color + current remix settings.
    const baseHsl = hexToHsl(color);
    const palette = buildPalette(baseHsl, remix);
    const roles = [
        { label: "Primary", hex: hslToHex(palette.primary) },
        { label: "Secondary", hex: hslToHex(palette.secondary) },
        { label: "Accent", hex: hslToHex(palette.accent) },
        { label: "Surface", hex: hslToHex(palette.surface) },
        { label: "Text", hex: hslToHex(palette.text) },
        { label: "Border", hex: hslToHex(palette.border) },
    ];

    return (
        <div
            id="color-picker-container"
            ref={containerRef}
            style={{ backgroundColor: color }}
        >
            {/* Title block stays on a card for readability. */}
            <header className="app-header">
                <div className="header-card">
                    <h1>Palette Kit Generator</h1>
                    <p className="subtitle">
                        Palettes from a single base colour.
                    </p>
                    <p className="hero-hex">Hex {color.toUpperCase()}</p>
                </div>
            </header>

            {/* Native input preserves expected color-picker behavior. */}
            <input
                id="color-input"
                type="color"
                value={color}
                onChange={handleColorChange}
                onInput={handleColorChange}
                aria-label="Pick a base color"
            />

            {/* Vertical layout keeps roles and remix separated. */}
            <section className="panel">

                <div className="panel-header">
                    <h2>Core Roles</h2>
                </div>

                {/* Roles are the output users can ship as a palette. */}
                <div className="swatch-grid">
                    {roles.map((role) => (
                        <div className="swatch" key={role.label}>
                            <div
                                className="swatch-chip"
                                style={{ background: role.hex }}
                            />
                            <div className="swatch-meta">
                                <span className="swatch-name">
                                    {role.label}
                                </span>
                                <span className="swatch-hex">{role.hex}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="divider" />

                <div className="panel-header">
                    <h2>Palette Remix</h2>
                </div>

                {/* Sliders give continuous control for tuning. */}
                <div className="remix-controls">
                    <label className="slider-row">
                        <span>Contrast</span>
                        <input
                            type="range"
                            min="0"
                            max="90"
                            value={remix.contrast}
                            onChange={updateRemix("contrast")}
                        />
                        <span className="slider-value">
                            {remix.contrast}
                        </span>
                    </label>
                    <label className="slider-row">
                        <span>Saturation</span>
                        <input
                            type="range"
                            min="-40"
                            max="40"
                            value={remix.saturation}
                            onChange={updateRemix("saturation")}
                        />
                        <span className="slider-value">
                            {remix.saturation}
                        </span>
                    </label>
                    <label className="slider-row">
                        <span>Lightness</span>
                        <input
                            type="range"
                            min="-30"
                            max="30"
                            value={remix.lightness}
                            onChange={updateRemix("lightness")}
                        />
                        <span className="slider-value">
                            {remix.lightness}
                        </span>
                    </label>
                    <label className="slider-row">
                        <span>Hue Shift</span>
                        <input
                            type="range"
                            min="-60"
                            max="60"
                            value={remix.hueShift}
                            onChange={updateRemix("hueShift")}
                        />
                        <span className="slider-value">
                            {remix.hueShift}
                        </span>
                    </label>
                </div>
                
                {/* Presets offer quick jumps for exploration. */}
                <div className="preset-row">
                    {remixPresets.map((preset) => (
                        <button
                            className="preset-button"
                            key={preset.label}
                            type="button"
                            onClick={() => applyPreset(preset.values)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};
