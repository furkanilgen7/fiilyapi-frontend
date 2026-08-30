# API tiplerini yenileme

Backend'in OpenAPI şeması değiştiğinde tipleri yenile:

1. Backend reposunda sözleşme TABANINI yenile ve diff'i GÖZLE doğrula:
   cd ../backend
   UPDATE_OPENAPI_BASELINE=1 .venv/bin/pytest tests/contract/test_openapi_contract_baseline.py
   git diff -- tests/contract/openapi_baseline.json
   cp tests/contract/openapi_baseline.json ../frontend/openapi/openapi.json

   🔴 KAYNAK TABAN DOSYASIDIR, `app.openapi()` çıktısı DEĞİL (AI-0b'de ölçüldü).
   Taban `sort_keys=True, indent=2, ensure_ascii=False` ile yazılır; `app.openapi()`
   ekleme sırasını korur. Doğrudan üretilen dosya SIRASIZ olur ve 22.000 satırlık
   sahte bir diff doğar. Bu dosyanın eski hâli (ve `backend/README.md`inki) o
   sırasız komutu tarif ediyordu ve İKİSİ DE fiilen hiç kullanılmamıştı.
2. Frontend'de tipleri yeniden üret:
   pnpm gen:api
3. src/lib/api/schema.d.ts değişikliğini gözden geçir ve commit et.

Backend canlıya alındığında bu adım, çalışan bir instance'ın /openapi.json
ucundan da beslenebilir. Şimdilik statik anlık görüntü kanondur.
