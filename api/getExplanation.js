// api/getExplanation.js

import OpenAI from 'openai';

/**
 * A Vercel Serverless Function that returns a short explanation of
 * why a user‐chosen chess move is suboptimal.
 *
 * Expects a POST request with JSON body:
 *   { fen: string, userMove: string, correctMove: string }
 *
 * Returns JSON: { explanation: string } on success,
 * or { error: '...' } with HTTP 4xx/5xx on failure.
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extract parameters from request body
  const { fen, userMove, correctMove } = req.body;
  if (!fen || !userMove || !correctMove) {
    return res.status(400).json({
      error: 'Missing required fields: fen, userMove, correctMove',
    });
  }

  // Read the secret key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set in environment');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration: missing API key' });
  }

  // Initialize the OpenAI client with the secret (never exposed to browser)
  const openai = new OpenAI({ apiKey });

  // Construct the chat prompt
const prompt = `
You are a strong chess coach. Here is the board position in FEN:
${fen}

The student guessed the move "${userMove}", but the best move was "${correctMove}".

In 1–2 clear sentences, explain why the move "${userMove}" is a poor choice, without revealing or hinting at the correct move. Do not say what the right move is. Do not give a variation. Just explain what is weak or risky about the guessed move — for example: loss of tempo, hanging a piece, weak square, etc.

Finish your explanation with: "Try again."
`.trim();


  try {
    // Call OpenAI’s chat completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' if you prefer
      messages: [
        { role: 'system', content: 'You are a helpful chess coach.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    // Extract the explanation text
    const explanation = response.choices[0].message.content.trim();
    return res.status(200).json({ explanation });
  } catch (err) {
    console.error('OpenAI error:', err);
    return res
      .status(500)
      .json({ error: 'OpenAI request failed. Please try again later.' });
  }
}
