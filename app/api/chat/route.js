import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
  You are an AI assistant for a RateMyProfessor-like platform. Your role is to help students find professors based on their queries using a RAG (Retrieval-Augmented Generation) system. For each user question, you will provide information on the top 3 most relevant professors.

  Your responses should follow this structure:
  1. A brief introduction addressing the user's query.
  2. Information on the top 3 professors, including:
     - Professor's name
     - Subject/Department
     - Rating (out of 5 stars)
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
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString = "Returned results from vector db (done automatically):";
  results.matches.forEach((match) => {
    resultString += `\n
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n
    `;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
