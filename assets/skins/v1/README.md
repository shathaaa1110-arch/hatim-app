# Hatim modular character art · v1

20 transparent PNG layers generated with **Built-in image_gen** on 2026-09-28 for the source after `d306a92`. The style is playful, cute 2D cartoon illustration with rounded cheeks and moderate detail. A [complete character reference](../../../docs/skins/2026-09-28/character-master.png) established coherent head, neck and shoulder proportions before generating the separate pieces. The exact prompts, reference filenames and output mapping are in [generation-prompts.json](generation-prompts.json). Layers were generated individually from the reference, not programmatically sliced out of a portrait.

| Files | Role |
|---|---|
| `head-{fair,light,warm,tan,deep}.png` | Five skin tones; head, ears, nose and neck, without eyes/mouth/hair |
| `face-{smile,wink,side_eye}.png` | Three independent sets of eyes, eyebrows and mouth |
| `outfit-{thobe,abaya,casual}.png` | Three illustrated upper-chest garments sharing the neck anchor |
| `headwear-{none,shemagh,ghutra,taqiyah,hijab}.png` | Hair or four head covers |
| `accessory-glasses.png` | Optional glasses |
| `prop-{host,on_way,you_choose}.png` | Dallah and cups, phone and keys, menu |

Each delivered file is 1254×1254 RGBA with real alpha transparency. Keep their transparent canvas margins: the layers rely on their registered frames. Total asset pack is10.52MiB before native packaging, excluding the documentation reference. The app does not send prompts, call an AI service, upload images or merge bitmaps at runtime.

[artwork.ts](../../../src/features/skins/artwork.ts) statically registers every image. [SkinAvatar.tsx](../../../src/features/skins/SkinAvatar.tsx) composes them with React Native Image on a160-unit coordinate system. Head and clothing use the full shared canvas, keeping the neck inside the collar. Face and glasses have smaller registered frames; shemagh/ghutra lift slightly above the brows. Props occupy a small lower corner. The background is a View, not another generated file. Garment colors are baked into these images; `Skin.color` controls the background.

To replace artwork for an existing option, preserve transparency/alignment and update its file, then check it with all covers, expressions, glasses and avatar sizes. To introduce a new selectable value, update the backend Skin literal, generated API types, catalog, artwork map, tests and documentation together; do not silently reinterpret an existing value. This pack shares one face shape; custom facial geometry, arbitrary color painting, beards and uploaded portraits are not implemented.

[Arabic beginner explanation and validation](../../../docs/learning-python-postgres/23-layered-character-art.ar.md).
