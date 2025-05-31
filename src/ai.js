// src/ai.js

import OpenAI from 'openai';

// 1. Instantiate the OpenAI client using your environment variable.
//    Make sure you have a `.env.local` in your project root with:
//      REACT_APP_OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXX
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

/**
 * Given a FEN (position before move 3), the user's third move, and the correct third move,
 * ask OpenAI’s chat completion endpoint to explain in 2–3 sentences why the user’s move is bad.
 *
 * @param {string} fen         – FEN of the position before move 3
 * @param {string} userMove    – The user’s guessed third move (e.g. "b1c3")
 * @param {string} correctMove – The actual best third move (e.g. "g1f3")
 * @returns {Promise<string>}   – A concise explanation why `userMove` is inferior
 */
export async function getIncorrectMoveExplanation(fen, userMove, correctMove) {
  const prompt = `
You are a strong chess coach. Here is the position (in FEN):
${fen}

It is the side to move (according to the FEN). The student played "${userMove}" as their third move, but the best move was "${correctMove}". 

In 2–3 clear sentences, explain why "${userMove}" is objectively worse than "${correctMove}". Mention any tactical or strategic reasons (for example, material loss, hanging a piece, weakening squares, or loss of tempo). Be concise.
`.trim();

  try {
    // 2. Call OpenAI’s chat completion endpoint with the new syntax:
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' if you don’t have GPT-4 access
      messages: [
        { role: 'system', content: 'You are a helpful chess coach.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    // 3. Extract and return the explanation text:
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error fetching explanation from OpenAI:', error);
    // 4. Fallback if the API request fails:
    return 'That move is suboptimal. Try to avoid losing material or weakening your position.';
  }
}
