from sentence_transformers import SentenceTransformer
import faiss
EMBED_MODEL = SentenceTransformer("BAAI/bge-base-en-v1.5")

def embed_texts(texts):
    return EMBED_MODEL.encode(texts, convert_to_numpy=True)

def build_faiss_index(embeddings):
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    return index

def retrieve_top_k(contexts, query, k=3):
    doc_embeddings = embed_texts(contexts)
    index = build_faiss_index(doc_embeddings)
    query_embedding = embed_texts([query])
    distances, indices = index.search(query_embedding, k)
    return [contexts[idx] for idx in indices[0]]