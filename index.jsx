const { useRef, useState } = React;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const wrapHue = (hue) => ((hue % 360) + 360) % 360;

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

const hexToHsl = (hex) => rgbToHsl(hexToRgb(hex));

const buildSynestheticProfile = ({ h, s, l }) => {
    const temperature =
        h >= 25 && h <= 80
            ? "sun-warm"
            : h >= 81 && h <= 165
            ? "verdant"
            : h >= 166 && h <= 250
            ? "cool"
            : h >= 251 && h <= 325
            ? "dusky"
            : "ember";
    const texture =
        s >= 70 && l <= 55
            ? "lacquer"
            : s >= 55 && l > 55
            ? "glass"
            : s < 30 && l >= 70
            ? "chalk"
            : s < 30 && l < 40
            ? "ink"
            : "velvet";
    const sound =
        s >= 70
            ? "chime"
            : s >= 45
            ? "thrum"
            : l >= 70
            ? "hush"
            : "crackle";

    return { temperature, texture, sound };
};

const buildBrandFeel = ({ temperature, texture, sound }) =>
    `A ${temperature} palette with ${texture} finish and a ${sound}-like energy.`;

const remixPresets = {
    Calm: { stretch: 12, soften: 28 },
    Punchy: { stretch: 42, soften: 6 },
    Editorial: { stretch: 28, soften: 16 },
    Heritage: { stretch: 22, soften: 22 },
};

const buildPalette = (base, remix) => {
    const stretch = remix.stretch / 100;
    const softened = clamp(base.s * (1 - remix.soften / 100), 10, 90);
    const baseTone = {
        h: base.h,
        s: softened,
        l: clamp(base.l, 18, 82),
    };

    return {
        primary: baseTone,
        accent: {
            h: wrapHue(base.h + 120),
            s: clamp(softened + 14, 18, 96),
            l: clamp(baseTone.l + 8 * stretch + 4, 20, 88),
        },
        surface: {
            h: base.h,
            s: clamp(8 + softened * 0.18, 6, 26),
            l: clamp(94 - stretch * 8, 86, 98),
        },
        text: {
            h: base.h,
            s: clamp(10 + softened * 0.1, 6, 24),
            l: clamp(12 - stretch * 5, 6, 20),
        },
        border: {
            h: base.h,
            s: clamp(12 + softened * 0.12, 8, 30),
            l: clamp(78 - stretch * 6, 64, 88),
        },
    };
};

export const ColorPicker = () => {
    const containerRef = useRef(null);
    const [color, setColor] = useState("#ffffff");
    const [remix, setRemix] = useState({
        stretch: 20,
        soften: 14,
    });
    const handleColorChange = (event) => {
        const nextColor = event.target.value;
        setColor(nextColor);
        if (containerRef.current) {
            containerRef.current.style.backgroundColor = nextColor;
        }
    };

    const baseHsl = hexToHsl(color);
    const profile = buildSynestheticProfile(baseHsl);
    const brandFeel = buildBrandFeel(profile);
    const palette = buildPalette(baseHsl, remix);
    const roles = [
        { label: "Primary", hex: hslToHex(palette.primary) },
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
            <header className="app-header">
                <div className="header-card">
                    <p className="eyebrow">Synesthetic Picker</p>
                    <h1>Brand Kit Generator</h1>
                    <p className="subtitle">
                        Minimal palette shaping with a sensory readout.
                    </p>
                </div>
            </header>

            <input
                id="color-input"
                type="color"
                value={color}
                onChange={handleColorChange}
                onInput={handleColorChange}
                aria-label="Pick a base color"
            />

            <section className="panel">
                <div className="meta-row">
                    <div>
                        <p className="meta-label">Base tone</p>
                        <p className="meta-value">{color.toUpperCase()}</p>
                    </div>
                    <div className="tag-row">
                        <span className="tag">{profile.texture}</span>
                        <span className="tag">{profile.temperature}</span>
                        <span className="tag">{profile.sound}</span>
                    </div>
                </div>
                <p className="brand-feel">{brandFeel}</p>

                <div className="divider" />

                <div className="panel-header">
                    <h2>Brand kit</h2>
                </div>
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
                                <span className="swatch-hex">
                                    {role.hex}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="divider" />

                <div className="panel-header">
                    <h2>Palette remix</h2>
                </div>
                <div className="remix-controls">
                    <label className="slider-row">
                        <span>Stretch</span>
                        <input
                            type="range"
                            min="0"
                            max="60"
                            value={remix.stretch}
                            onChange={(event) =>
                                setRemix({
                                    ...remix,
                                    stretch: Number(event.target.value),
                                })
                            }
                        />
                        <span className="slider-value">
                            {remix.stretch}
                        </span>
                    </label>
                    <label className="slider-row">
                        <span>Soften</span>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            value={remix.soften}
                            onChange={(event) =>
                                setRemix({
                                    ...remix,
                                    soften: Number(event.target.value),
                                })
                            }
                        />
                        <span className="slider-value">{remix.soften}</span>
                    </label>
                </div>
                <div className="preset-row">
                    {Object.entries(remixPresets).map(([label, values]) => (
                        <button
                            className="preset-button"
                            key={label}
                            type="button"
                            onClick={() => setRemix(values)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};
