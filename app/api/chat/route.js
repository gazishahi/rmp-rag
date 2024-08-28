import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
  You are an AI assistant for a RateMyProfessor-like platform. Your role is to help students find professors based on their queries using a RAG (Retrieval-Augmented Generation) system. For each user question, you will provide information on the top 3 most relevant professors.

  Your responses should follow this structure:
  1. A brief introduction addressing the user's query.
  2. Information on the top 3 professors, including:
     - Professor's name
     - Subject/Department
     - Star rating as an integer out of 5 stars
     - A short summary of student reviews
  3. A concise conclusion or recommendation based on the retrieved information.

  Remember to:
  - Always provide 3 professor recommendations, even if the query is specific.
  - If the query is very specific, mention how closely each recommendation matches the criteria.
  - Be objective and base your responses solely on the information retrieved from the RAG system.
  - Do not invent or assume information that isn't provided by the RAG system.
  - If the query cannot be answered with the available information, politely explain this to the user.
  - Encourage users to provide more details if their initial query is too vague.

  Your tone should be helpful, informative, and impartial. Avoid using overly casual language, but also don't be too formal. Aim for a balance that a university student would find approachable yet professional.

  Begin each interaction by waiting for the user's query about professors or courses.
  `;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const text = data[data.length - 1].content;
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  const embedding = result.embedding;
  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.values,
  });

  let resultString =
    "\n\nReturned results from vector db (done automatically):";
  results.matches.forEach((match) => {
    resultString += `\n
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n
    `;
  });

  const model_gen = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const gen_result = await model_gen.generateContent(
    `${systemPrompt}\nQuery: ${resultString}\n${data}\n`,
  );
  const response = gen_result.response.text();

  return new NextResponse(response);
}
