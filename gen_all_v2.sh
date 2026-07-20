#!/bin/bash
# Regenerate ALL 26 assets (25 stickers + 1 sample portrait) for NJS Bluebook poster maker.
SCRIPT="/Users/zhuofan/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/image_generation/scripts/image_generation_tool.py"
OUT="/Users/zhuofan/Documents/Kimi/Workspaces/NJS Bluebook/app/public/assets"
PHONE_URL="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2Ff8b7245e4fb3b84cc3939b547c268ab2b3cc1651c17bd8c7de9d3145cca372e2?filename=2f9cf8222cd93e0d9aa48c30e3919256.jpg&sig=d_Er43DU5DmYp6coE5hKpM0ehb4pbV6IE9MOE-lY1xY=&t=o"
HYPE_URL="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F9037961832ce13e3e9fcd0de46464126dde1c253b69854cd90a5f9c72468f284?filename=67fcbdb9ff99577665b95f097d46e76d.jpg&sig=ivTpeg8FboZmEtJA722cj6mwe3jcLYPx4hiG5QL1Y_o=&t=o"
SUFFIX="die-cut sticker with a thick clean white outline border, transparent background, flat bold Y2K doodle illustration style, vivid saturated colors, crisp edges, no shadow, no text unless specified, centered, single object"

mkdir -p "$OUT/stickers" "$OUT/sample"

gen() { # file, prompt, extra args...
  local file="$1"; local prompt="$2"; shift 2
  python3 "$SCRIPT" generate --description "$prompt, $SUFFIX" \
    --ratio 1:1 --resolution 1K --background transparent "$@" \
    --output "$OUT/stickers/$file" > "$OUT/stickers/$file.log" 2>&1
  echo "done $file (exit $?)"
}

# Wave 1
gen "bunny.png" "cute cartoon bunny standing upright, white rabbit with long ears wearing tiny yellow sandals, simple bold line art" &
gen "heart.png" "glossy hot-pink cartoon heart with a small highlight shine" &
gen "daisy.png" "white daisy flower with yellow center, six petals, simple flat illustration" &
gen "eye.png" "hand-drawn doodle pair of two cartoon eyes side by side, big white eyes with black pupils and long eyelashes, sketchy black ink style" &
gen "sparkle.png" "yellow four-point sparkle star with one smaller sparkle, flat cartoon" &
gen "smiley.png" "hand-drawn cobalt-blue smiley face, slightly wobbly ink outline" &
gen "cherry.png" "pair of red cherries with green stems, glossy cartoon" &
gen "butterfly.png" "Y2K butterfly with pink and blue gradient wings, flat cartoon" &
wait
# Wave 2
gen "lightning.png" "yellow lightning bolt doodle with thick outline, energetic cartoon" &
gen "rainbow.png" "small doodle rainbow arc, three bands pink yellow blue, flat cartoon" &
gen "flower-smile.png" "daisy flower with a smiley face in the center, white petals yellow face" &
gen "tape-blue.png" "a single straight strip of translucent cobalt-blue washi tape, slightly torn ends, horizontal" &
gen "tape-pink.png" "a single straight strip of pink-and-white checkerboard washi tape, slightly torn ends, horizontal" &
gen "njs-graffiti.png" "graffiti-style heart logo, teal-green chrome heart with thick black outline and wildstyle graffiti strokes across it, street art style, no readable text" &
gen "nameplate-blank.png" "blank oval chrome nameplate badge, metallic silver gradient with realistic chrome reflections, slight 3D bevel, empty center with no text, viewed straight on" &
gen "flip-phone.png" "retro early-2000s open flip phone rendered in cobalt blue halftone screenprint dot style, blue ink dots on white, small bunny doodle and sparkles on its screen" --reference-image "$PHONE_URL" &
wait
# Wave 3
gen "hype-boy.png" "glossy pink horizontal oval bubble with the text 'Hype Boy' in white outlined retro letters across it, Y2K logo" --reference-image "$HYPE_URL" &
gen "pixel-globe.png" "pixelated planet earth globe, green and blue 8-bit pixel art" &
gen "crt-monitor.png" "retro beige CRT desktop computer with a green heartbeat pulse line on its screen, Y2K pixel art style" &
gen "pixel-cursor.png" "classic pixelated mouse cursor arrow pointing up-left, black with white outline, 8-bit pixel art" &
gen "digicam.png" "silver early-2000s compact digital camera with small screen and round lens, Y2K flat illustration" &
gen "pixel-sparkle4.png" "white pixelated four-point starburst sparkle with stepped pixel edges, 8-bit pixel art" &
gen "pixel-heart-outline.png" "pixel art heart outline, white line-art heart with stepped pixel edges, hollow center, 8-bit" &
gen "pixel-planet.png" "pixel art planet saturn with a tilted ring, white and pale blue, 8-bit pixel art" &
wait
# Wave 4
gen "pixel-moon.png" "pixel art crescent moon, white with stepped pixel edges, 8-bit" &
python3 "$SCRIPT" generate \
  --description "90s film photograph portrait of a young east-asian woman, head and shoulders, looking at camera with a calm friendly expression, plain light-gray seamless studio background, soft even frontal lighting, sharp focus, subtle film grain, K-pop album photoshoot aesthetic" \
  --ratio 2:3 --resolution 1K --background opaque \
  --output "$OUT/sample/sample-portrait.png" > "$OUT/sample/sample-portrait.log" 2>&1 &
wait
echo "ALL DONE"
