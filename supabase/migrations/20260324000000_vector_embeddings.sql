-- ===============================================
-- 🛡️ VIRTUD SAAS - IA VECTOR DATABASE (RAG)
-- Semantic Search / Memoria a largo plazo
-- ===============================================

-- 1️⃣ Habilitar la extensión de vectores matemáticos
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 2️⃣ Inyectar "cerebro espacial" de 768 dimensiones (Estándar Gemini)
ALTER TABLE rutinas 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3️⃣ Crear Índice HNSW (Hierarchical Navigable Small World) para búsqueda a la velocidad de la luz
CREATE INDEX IF NOT EXISTS idx_rutina_embedding
ON rutinas
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4️⃣ Función de Búsqueda de Similitud (Match)
CREATE OR REPLACE FUNCTION match_rutinas(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_usuario_id UUID
)
RETURNS TABLE (
  id uuid,
  nombre text,
  objetivo text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    r.nombre,
    r.objetivo,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM rutinas r
  WHERE r.usuario_id = p_usuario_id
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;
