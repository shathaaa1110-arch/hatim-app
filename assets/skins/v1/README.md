# Hatim modular character art · v1

35 transparent PNG layers, generated with **Built-in image_gen** on 2026-09-28. The original 20 layers followed `d306a92`; the girl/boy and accessories update follows `bb0f139`. Both looks use playful, cute 2D cartoon art. The girl has her own oval head/neck, facial features, center-parted hair, blouse, abaya and hijab. Clothing openings were fitted to her narrower neck.

| Files | Role |
|---|---|
| `head-{fair,light,warm,tan,deep}.png` | Original boy head, nose and neck in five tones |
| `girl-head-{fair,light,warm,tan,deep}.png` | Distinct girl's head, nose and neck in five tones |
| `face-{smile,wink,side_eye}.png`, `girl-face-{smile,wink,side_eye}.png` | Separate expression layers for each look |
| `outfit-{thobe,abaya,casual}.png` | Original garments; kept for legacy choices |
| `girl-outfit-{casual,abaya}.png` | Girl blouse and embroidered abaya |
| `headwear-{none,shemagh,ghutra,taqiyah,hijab}.png` | Original hair and covers |
| `girl-hair.png`, `girl-headwear-hijab.png` | Girl hair and fitted hijab |
| `headwear-cap.png` | Shared cap worn over either hairstyle |
| `accessory-{glasses,sunglasses,flower}.png` | One selected accessory, independent of headwear |
| `prop-{host,on_way,you_choose}.png` | Dallah and cups, phone and keys, menu |

All files are1254×1254 RGBA with real alpha; total runtime artwork is17.28MiB before packaging. Keep canvas margins. Images are bundled through static requires in [artwork.ts](../../../src/features/skins/artwork.ts), so the app does not call AI, upload images or merge bitmaps at runtime.

[SkinAvatar.tsx](../../../src/features/skins/SkinAvatar.tsx) assembles layers on a160-unit canvas. `artworkFor` selects the complete head/face/clothes/cover family. The girl abaya uses a raised frame `[0,-38,160,198]` to close the side-neck gap while reaching the bottom of the avatar. Face and glasses have separate frames for girl/boy, and the cap lifts slightly so it does not cover eyes. A cap adds a layer over hair, while other covers replace hair. Sunglasses cover the eyes; the flower clip sits at the temple. Background color remains `Skin.color`; garment colors are baked into their images.

Exact requests and source filenames are in [original generation prompts](generation-prompts.json) and [girl/accessory generation prompts](girl-generation-prompts.json). The girl prompt list is sequential: later fitting edits replace the earlier garment output at the same filename. Documentation references are separate from runtime assets: [boy master](../../../docs/skins/2026-09-28/character-master.png), [girl master](../../../docs/skins/2026-09-28/girl-boy/girl-character-master.png).

Adding a selectable value requires the backend Skin literal, generated types, catalog, asset map, verification and docs together. The girl wardrobe only offers casual/abaya and none/hijab/cap. Old girl thobe or male headwear choices normalize to casual/none; other choices and old boy looks remain intact. No arbitrary painting, image upload or runtime image generation is implemented.

[Arabic implementation walkthrough](../../../docs/learning-python-postgres/25-girl-boy-skins.ar.md) · [verified compositions](../../../docs/skins/2026-09-28/girl-boy/README.ar.md).
