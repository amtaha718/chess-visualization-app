// src/ai.js

import { Configuration, OpenAIApi } from 'openai';

// Configure the OpenAI client using the environment variable.
// Make sure you have a .env.local in your project root with:
//   REACT_APP_OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXX
const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

/**
 * Given a FEN string (position before move 3), the user's third move,
 * and the correct third move, this function asks OpenAI to explain in 
 * 2–3 sentences why the user's move is inferior.
 *
 * @param {string} fen         — the FEN of the position before move 3
 * @param {string} userMove    — the user's third move (e.g. "b1c3")
 * @param {string} correctMove — the correct third move (e.g. "g1f3")
 * @returns {Promise<string>}   — a concise “why that move is bad” explanation
 */
export async function getIncorrectMoveExplanation(fen, userMove, correctMove) {
  // Construct a clear prompt for the model
  const prompt = `
You are a strong chess coach. Here is the position (in FEN):
${fen}

It is White’s move (or Black’s move, based on FEN). The student played "${userMove}" as their third move, but the best move was "${correctMove}". 

Please explain in 2–3 clear sentences why "${userMove}" is a poor choice compared to "${correctMove}". Mention any tactical or strategic reasons (e.g., material loss, hanging a piece, weakened squares, loss of tempo). Be concise.
`.trim();

  try {
    // Call OpenAI’s Chat Completion endpoint
    const response = await openai.createChatCompletion({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' if you don’t have GPT-4
      messages: [
        { role: 'system', content: 'You are a helpful chess coach.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    // Extract and return the explanation text
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error fetching explanation from OpenAI:', error);
    // Fallback message if the API call fails
    return 'That move is suboptimal. Try to avoid losing material or weakening your position.';
  }
}
