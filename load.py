# %% Imports
from dotenv import load_dotenv
load_dotenv()
import os
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec

# %% Create Pinecone index
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pc.create_index(name="rag", dimension=1536, metric="cosine", spec=ServerlessSpec(cloud='aws', region='us-east-1'))

# %% Load data
import json
data = json.load(open("reviews.json"))
data['reviews']

# %% Processed data
processed_data = []
client = OpenAI()

for review in data['reviews']:
    response = client.embeddings.create(
        input=review['review'],
        model="text-embedding-3-small",
    )

    embedding = response.data[0].embeddding
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
