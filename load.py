# %% Imports
from dotenv import load_dotenv
load_dotenv()
import os
from pinecone import Pinecone, ServerlessSpec
import google.generativeai as genai

# %% Create Pinecone index
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pc.create_index(name="rag", dimension=768, metric="cosine", spec=ServerlessSpec(cloud='aws', region='us-east-1'))

# %% Load data
import json
data = json.load(open("reviews.json"))
data['reviews']

# %% Processed data
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')
processed_data = []
for review in data['reviews']:
    response = genai.embed_content(
        model="models/text-embedding-004",
        content=review['review'],
    )

    embedding = response['embedding']
    processed_data.append({
        "values": embedding,
        "id": review["professor"],
        "metadata": {
            "review": review["review"],
            "subject": review["subject"],
            "stars": review["stars"]
        }
    })

# %% Upsert data
index = pc.Index("rag")
index.upsert(
    vectors=processed_data,
    namespace="ns1"
)

# %% Describe index
index.describe_index_stats()
