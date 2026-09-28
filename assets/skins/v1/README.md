# Hatim character art · v1

41 transparent PNG files (23.30MiB before packaging), generated with built-in image_gen on2026-09-28. The first20 layers followed `d306a92`. The first girl/boy pack shipped in `df5aab9`; this correction replaces the girl's separate head/garments with connected bases and fits her covers and eyewear to the assembled face.

| Files | Role |
|---|---|
| `head-{fair,light,warm,tan,deep}.png` | Boy head, nose and neck |
| `girl-base-{casual,abaya}-{fair,light,warm,tan,deep}.png` | Ten connected girl head/neck/garment bases |
| `face-{smile,wink,side_eye}.png`, `girl-face-{smile,wink,side_eye}.png` | Expressions for each look |
| `outfit-{thobe,abaya,casual}.png` | Original garments; abaya retained as original pack artwork, not selectable for boys |
| `headwear-{none,shemagh,ghutra,taqiyah,hijab,cap}.png` | Original covers; hijab not selectable for boys |
| `girl-hair.png`, `girl-headwear-{hijab,cap}.png` | Girl hair, fitted scarf and fitted cap |
| `accessory-glasses.png`, `girl-accessory-glasses.png` | Separate regular eyewear for each face |
| `accessory-sunglasses.png`, `boy-accessory-sunglasses.png` | Girl and fitted boy sunglasses |
| `accessory-flower.png` | Girl flower clip |
| `prop-{host,on_way,you_choose}.png` | Dallah and cups, phone and keys, menu |

Every file is1254×1254 RGBA with real alpha. Keep the canvas margins. Static requires in [artwork.ts](../../../src/features/skins/artwork.ts) bundle images for native use; no AI, bitmap merging or upload happens at runtime. `outfitArtwork` uses both gender and tone for garment thumbnails. The girl has no separate garment overlay: neck and collar meet inside the base itself.

[SkinAvatar.tsx](../../../src/features/skins/SkinAvatar.tsx) composes artwork on a160-unit canvas. Girl face frame is `[9,-5,142,142]`; boy remains `[19,9,124,124]`. Girl cap `[0,-20,160,160]` follows the hair crown; boy cap `[0,-8,160,160]` retains its placement. Girl glasses `[-8,-12,172,172]` and boy sunglasses `[-2,-11,160,160]` align their lenses and bridge with the actual eyes/nose. Girl hijab draws on the full canvas, hides the hair and covers the scalp rim, ears and neck. A cap draws over hair. Background uses Skin.color; garment colors are baked into the files.

Prompt provenance:

- [Original20](generation-prompts.json).
- [First girl/accessory pack](girl-generation-prompts.json): historical generation requests for `df5aab9`; references to removed girl-head/girl-outfit assets refer to that Git revision.
- [Connected bases](connected-generation-prompts.json): replaces the seven old girl head/garment assets with ten bases.
- [Fitted eyewear and covers](fitted-accessories-prompts.json): two separate eyewear assets, girl cap and replacement girl hijab, based on the actual composed avatar.

Reference artwork and app screenshots are under [visual evidence](../../../docs/skins/2026-09-28/girl-boy/README.ar.md). They are not bundled at runtime.

Wardrobe rules apply on both frontend and backend. Girls choose casual/abaya and none/hijab/cap; boys choose casual/thobe and none/shemagh/ghutra/taqiyah/cap. The flower belongs to the girl choices. Switching looks, old saved data, invitation characters and optimistic edit baselines normalize with the same rule. Randomization uses the current look's accessory list. Adding a new selectable value requires updating Skin literals, generated types, catalog, art mapping, verification and docs together.

[Arabic implementation walkthrough](../../../docs/learning-python-postgres/25-girl-boy-skins.ar.md).
