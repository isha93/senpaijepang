#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT_DIR/assets/app-icon/AppIcon-master.svg"
PDF_OUT="$ROOT_DIR/assets/app-icon/AppIcon-master.pdf"
OUT_DIR="$ROOT_DIR/Sources/SenpaiJepangApp/Assets.xcassets/AppIcon.appiconset"

if ! command -v sips >/dev/null 2>&1; then
  echo "error: macOS 'sips' is required" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TMP_DIR="$(mktemp -d)"
MASTER_PNG="$TMP_DIR/AppIcon-master.png"
trap 'rm -rf "$TMP_DIR"' EXIT

sips -s format png "$SRC" --out "$MASTER_PNG" >/dev/null
sips -s format pdf "$SRC" --out "$PDF_OUT" >/dev/null

render() {
  local size="$1"
  local filename="$2"
  cp "$MASTER_PNG" "$OUT_DIR/$filename"
  sips -z "$size" "$size" "$OUT_DIR/$filename" >/dev/null
}

render 40 Icon-Notification@2x.png
render 60 Icon-Notification@3x.png
render 58 Icon-Small@2x.png
render 87 Icon-Small@3x.png
render 80 Icon-Small-40@2x.png
render 120 Icon-Small-40@3x.png
render 120 Icon-60@2x.png
render 180 Icon-60@3x.png
render 1024 icon.png
render 20 Icon-Notification.png
render 29 Icon-Small.png
render 40 Icon-Small-40.png
render 76 Icon-76.png
render 152 Icon-76@2x.png
render 167 Icon-83.5@2x.png

cat > "$OUT_DIR/Contents.json" <<'JSON'
{
  "images" : [
    {
      "size" : "20x20",
      "idiom" : "iphone",
      "filename" : "Icon-Notification@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "20x20",
      "idiom" : "iphone",
      "filename" : "Icon-Notification@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "29x29",
      "idiom" : "iphone",
      "filename" : "Icon-Small@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "29x29",
      "idiom" : "iphone",
      "filename" : "Icon-Small@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "40x40",
      "idiom" : "iphone",
      "filename" : "Icon-Small-40@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "40x40",
      "idiom" : "iphone",
      "filename" : "Icon-Small-40@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "60x60",
      "idiom" : "iphone",
      "filename" : "Icon-60@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "60x60",
      "idiom" : "iphone",
      "filename" : "Icon-60@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "1024x1024",
      "idiom" : "ios-marketing",
      "filename" : "icon.png",
      "scale" : "1x"
    },
    {
      "size" : "20x20",
      "idiom" : "ipad",
      "filename" : "Icon-Notification.png",
      "scale" : "1x"
    },
    {
      "size" : "20x20",
      "idiom" : "ipad",
      "filename" : "Icon-Notification@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "29x29",
      "idiom" : "ipad",
      "filename" : "Icon-Small.png",
      "scale" : "1x"
    },
    {
      "size" : "29x29",
      "idiom" : "ipad",
      "filename" : "Icon-Small@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "40x40",
      "idiom" : "ipad",
      "filename" : "Icon-Small-40.png",
      "scale" : "1x"
    },
    {
      "size" : "40x40",
      "idiom" : "ipad",
      "filename" : "Icon-Small-40@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "76x76",
      "idiom" : "ipad",
      "filename" : "Icon-76.png",
      "scale" : "1x"
    },
    {
      "size" : "76x76",
      "idiom" : "ipad",
      "filename" : "Icon-76@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "83.5x83.5",
      "idiom" : "ipad",
      "filename" : "Icon-83.5@2x.png",
      "scale" : "2x"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
JSON

echo "Generated app icon set in $OUT_DIR"
