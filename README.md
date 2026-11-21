# QR Code Generator

A small, dependency-free web app that generates QR codes entirely in your browser. No server, no tracking, and nothing you type is sent anywhere.

## Features

- **Links and text**: bare domains like `amazon.com` are automatically turned into `https://amazon.com`. Other schemes (`mailto:`, `tel:`, `http:`) and plain text are left as-is.
- **Wi-Fi codes**: enter the network name, password and security type, and phones can join by scanning.
- **Customization**: foreground and background colors, and error-correction level (L / M / Q / H).
- **Export**: download as PNG (1000px) or SVG, or copy the image to the clipboard.
- **Works offline**: the QR library is bundled.
- **Dark mode**: follows your system theme.
- **UTF-8 support**: non-ASCII text encodes correctly.
- Remembers your last link or text input in `localStorage`.

## Usage

No build step. Either:

- open `index.html` in a browser, or
- serve the folder with any static server, e.g. `python -m http.server`, then visit `http://localhost:8000`.

Enter a link or text (or switch to the Wi-Fi tab), press **Generate**, then download or copy the result.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `script.js` | Input handling, QR rendering, downloads |
| `style.css` | Styling, including dark mode |
| `qrcode.js` | Bundled [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 |
| `circle.png` | Decorative icon shown in the focused input |

## Tips

- Keep strong contrast between the foreground and background colors, with a dark foreground on a light background. Low contrast or inverted colors can make codes unscannable.
- Higher error correction makes the code denser but more tolerant of damage; very long text may not fit at high levels.
- Always test-scan a code before printing it.

## Credits

QR encoding by [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT licensed. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
