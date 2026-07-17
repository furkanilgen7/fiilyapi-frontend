# API tiplerini yenileme

Backend'in OpenAPI şeması değiştiğinde tipleri yenile:

1. Backend reposunda şemayı üret:
   cd ../backend
   .venv/bin/python -c "import json; from app.main import app; \
     print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))" \
     > ../frontend/openapi/openapi.json
2. Frontend'de tipleri yeniden üret:
   pnpm gen:api
3. src/lib/api/schema.d.ts değişikliğini gözden geçir ve commit et.

Backend canlıya alındığında bu adım, çalışan bir instance'ın /openapi.json
ucundan da beslenebilir. Şimdilik statik anlık görüntü kanondur.
