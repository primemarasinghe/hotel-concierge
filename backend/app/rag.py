"""Property knowledge base (FAQs, policies, facilities) stored in pgvector."""
import hashlib
import math
import re
from functools import lru_cache

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import settings
from .models import KnowledgeChunk, Property


@lru_cache
def _openai_embedder():
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings(model=settings.embedding_model, api_key=settings.openai_api_key)


def _fake_embed(text: str) -> list[float]:
    """Deterministic bag-of-words hash embedding — for offline dev/tests only."""
    vec = [0.0] * settings.embedding_dim
    for tok in re.findall(r"[a-z0-9]+", text.lower()):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % settings.embedding_dim] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def embed_documents(texts: list[str]) -> list[list[float]]:
    if not settings.openai_api_key:
        return [_fake_embed(t) for t in texts]
    return _openai_embedder().embed_documents(texts)


def embed_query(text: str) -> list[float]:
    if not settings.openai_api_key:
        return _fake_embed(text)
    return _openai_embedder().embed_query(text)


def chunk_markdown(text: str, max_chars: int = 900) -> list[str]:
    """Split on headings, then pack paragraphs up to max_chars, keeping the heading as context."""
    chunks = []
    for section in re.split(r"\n(?=#{1,3} )", text.strip()):
        lines = section.strip().splitlines()
        heading = lines[0].lstrip("# ").strip() if lines and lines[0].startswith("#") else ""
        body = "\n".join(lines[1:] if heading else lines).strip()
        buf = ""
        for para in re.split(r"\n\s*\n", body):
            if buf and len(buf) + len(para) > max_chars:
                chunks.append(f"{heading}\n{buf}".strip())
                buf = ""
            buf = f"{buf}\n\n{para}".strip()
        if buf:
            chunks.append(f"{heading}\n{buf}".strip())
    return [c for c in chunks if c]


def index_documents(db: Session, prop: Property, docs: dict[str, str]) -> int:
    """Replace a property's knowledge base with the given {source_name: markdown} docs."""
    db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.property_id == prop.id))
    pieces = [(src, c) for src, text in docs.items() for c in chunk_markdown(text)]
    vectors = embed_documents([c for _, c in pieces]) if pieces else []
    for (src, content), vec in zip(pieces, vectors):
        db.add(KnowledgeChunk(property_id=prop.id, source=src, content=content, embedding=vec))
    db.commit()
    return len(pieces)


def search(db: Session, prop: Property, query: str, k: int = 4) -> list[dict]:
    qv = embed_query(query)
    dist = KnowledgeChunk.embedding.cosine_distance(qv)
    rows = db.execute(
        select(KnowledgeChunk.source, KnowledgeChunk.content, dist.label("d"))
        .where(KnowledgeChunk.property_id == prop.id)
        .order_by(dist).limit(k)
    ).all()
    return [{"source": r.source, "content": r.content, "score": round(1 - r.d, 3)} for r in rows]
