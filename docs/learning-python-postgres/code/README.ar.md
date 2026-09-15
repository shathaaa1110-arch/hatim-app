# مرجع الكود — الملف بجانب شرحه

[ابدئي بالدروس](../README.ar.md) · [معمارية التطبيق](../../architecture-python-postgres.ar.md)

هذا المرجع يغطي **48 ملفًا نصيًا و5,264 سطرًا أصليًا** من التطبيق والخادم والاختبارات والسكربتات والإعدادات في النسخة `59d45d3`. كل سطر من هذه الملفات معروض مرة واحدة داخل مقطع، مع تفسير للمقطع وأرقام المصدر. راجعت مطابقة نص المقاطع للملفات الأصلية وبصماتها.

تشرح الدروس الرموز المتكررة والخصائص المشتركة، بينما يوضح هذا المرجع دور كل مقطع في التطبيق. ليس ادعاءً أن طالبًا يجب أن يكتب مكتبات React أو PostgreSQL أو ملفات القفل يدويًا.

## Python: العقد والقرار والخادم

| الملف | أسطر المصدر |
|---|---:|
| [backend/hatim/models.py](backend-hatim-models.py.ar.md) | 132 |
| [backend/hatim/store.py](backend-hatim-store.py.ar.md) | 60 |
| [backend/hatim/main.py](backend-hatim-main.py.ar.md) | 305 |
| [backend/hatim/planner.py](backend-hatim-planner.py.ar.md) | 111 |
| [backend/hatim/catalog.py](backend-hatim-catalog.py.ar.md) | 154 |
| [backend/hatim/middleware.py](backend-hatim-middleware.py.ar.md) | 59 |
| [backend/hatim/import_sqlite.py](backend-hatim-import_sqlite.py.ar.md) | 115 |
| [backend/hatim/export_openapi.py](backend-hatim-export_openapi.py.ar.md) | 12 |
| [backend/hatim/__init__.py](backend-hatim-__init__.py.ar.md) | 1 |

## قاعدة البيانات وترحيلاتها

| الملف | أسطر المصدر |
|---|---:|
| [backend/migrations/001_groups_and_members.sql](backend-migrations-001_groups_and_members.sql.ar.md) | 21 |

## الواجهة: الدخول والحالة والاتصال

| الملف | أسطر المصدر |
|---|---:|
| [App.tsx](App.tsx.ar.md) | 44 |
| [index.ts](index.ts.ar.md) | 8 |
| [src/api/client.ts](src-api-client.ts.ar.md) | 135 |
| [src/storage.ts](src-storage.ts.ar.md) | 39 |
| [src/useOrganizer.ts](src-useOrganizer.ts.ar.md) | 121 |
| [src/theme.ts](src-theme.ts.ar.md) | 33 |

## المكونات

| الملف | أسطر المصدر |
|---|---:|
| [src/components/ui.tsx](src-components-ui.tsx.ar.md) | 355 |
| [src/components/PreferencesForm.tsx](src-components-PreferencesForm.tsx.ar.md) | 220 |
| [src/components/MealControl.tsx](src-components-MealControl.tsx.ar.md) | 108 |
| [src/components/Toggle.tsx](src-components-Toggle.tsx.ar.md) | 42 |
| [src/components/ExperienceCard.tsx](src-components-ExperienceCard.tsx.ar.md) | 126 |
| [src/components/WebDocument.tsx](src-components-WebDocument.tsx.ar.md) | 3 |
| [src/components/WebDocument.web.tsx](src-components-WebDocument.web.tsx.ar.md) | 20 |

## الشاشات

| الملف | أسطر المصدر |
|---|---:|
| [src/screens/Organizer.tsx](src-screens-Organizer.tsx.ar.md) | 743 |
| [src/screens/Discover.tsx](src-screens-Discover.tsx.ar.md) | 381 |
| [src/screens/PlanScreen.tsx](src-screens-PlanScreen.tsx.ar.md) | 264 |
| [src/screens/GroupScreen.tsx](src-screens-GroupScreen.tsx.ar.md) | 165 |
| [src/screens/InviteScreen.tsx](src-screens-InviteScreen.tsx.ar.md) | 312 |

## الاختبارات والبيانات الاصطناعية

| الملف | أسطر المصدر |
|---|---:|
| [backend/tests/conftest.py](backend-tests-conftest.py.ar.md) | 36 |
| [backend/tests/test_api.py](backend-tests-test_api.py.ar.md) | 115 |
| [backend/tests/test_planner.py](backend-tests-test_planner.py.ar.md) | 106 |
| [backend/tests/test_postgres.py](backend-tests-test_postgres.py.ar.md) | 205 |
| [tests/group-flow.spec.ts](tests-group-flow.spec.ts.ar.md) | 201 |
| [backend/tests/fixtures/legacy.sql](backend-tests-fixtures-legacy.sql.ar.md) | 17 |

## سكربتات التشغيل

| الملف | أسطر المصدر |
|---|---:|
| [scripts/database.mjs](scripts-database.mjs.ar.md) | 44 |
| [scripts/public-test.mjs](scripts-public-test.mjs.ar.md) | 159 |
| [scripts/generate-types.mjs](scripts-generate-types.mjs.ar.md) | 30 |
| [scripts/make-icon.swift](scripts-make-icon.swift.ar.md) | 16 |

## ملفات الإعداد

| الملف | أسطر المصدر |
|---|---:|
| [playwright.config.ts](playwright.config.ts.ar.md) | 22 |
| [package.json](package.json.ar.md) | 60 |
| [app.json](app.json.ar.md) | 39 |
| [tsconfig.json](tsconfig.json.ar.md) | 20 |
| [compose.yaml](compose.yaml.ar.md) | 17 |
| [backend/pyproject.toml](backend-pyproject.toml.ar.md) | 20 |
| [backend/.python-version](backend-.python-version.ar.md) | 1 |
| [.env.example](.env.example.ar.md) | 4 |
| [backend/.env.example](backend-.env.example.ar.md) | 6 |
| [.gitignore](.gitignore.ar.md) | 57 |

## الملفات المولدة وبقية المستودع

[كيف تقرئين OpenAPI والأنواع وملفات القفل والبيانات المتكررة؟](generated-and-assets.ar.md)

يشمل الرابط أيضًا الصور وملفات التعريف وإعدادات أدوات المساعدة. لا ننسخ ملفات الحزم الخارجية أو المشاريع الأصلية المولدة أو قواعد البيانات الخاصة. الأدلة القديمة في docs/learning تخص مسارًا سابقًا؛ مرجع هذه النسخة يبدأ من الفهرس أعلاه.
