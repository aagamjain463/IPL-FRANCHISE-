import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // AI News & Headlines
  app.post('/api/ai/news-headline', async (req: Request, res: Response) => {
    const { teamName, opponentName, matchResult, mvpName, venue } = req.body;
    const ai = getAIClient();

    if (!ai) {
      // Deterministic fallback
      return res.json({
        headline: `${mvpName} leads ${teamName} in dramatic ${matchResult} at ${venue}!`,
        article: `Cricket fans witnessed a sensational T20 encounter at ${venue}. ${teamName} executed their plans with clinical precision as ${mvpName} starred under lights.`,
        mediaReaction: `"A masterclass in high-pressure execution." — CricWire Daily`
      });
    }

    try {
      const prompt = `Write a dramatic IPL breaking news article header and 2-sentence match report:
Match: ${teamName} vs ${opponentName} at ${venue}.
Result: ${matchResult}.
Key Performer: ${mvpName}.
Output format in strictly valid JSON:
{
  "headline": "punchy newspaper headline",
  "article": "2 sentence exciting summary",
  "mediaReaction": "one sentence quote from a cricket analyst"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      res.json({
        headline: `${mvpName} shines as ${teamName} triumphs at ${venue}!`,
        article: `In a thriller at ${venue}, ${teamName} pulled off a memorable result led by a spirited display from ${mvpName}.`,
        mediaReaction: `"Total dominance in key moments." — Indian Cricket Express`
      });
    }
  });

  // AI Post-Match Press Conference
  app.post('/api/ai/press-conference', async (req: Request, res: Response) => {
    const { teamName, result, topPerformers, controversialDecision } = req.body;
    const ai = getAIClient();

    if (!ai) {
      return res.json({
        question: `Captain, what was the turning point in this high-voltage match against tough opposition?`,
        options: [
          { text: 'We backed our tactical process and executed under pressure in the death overs.', moraleChange: +5, ownerTrustChange: +4 },
          { text: 'The pitch played slightly differently than expected, but the boys showed immense grit.', moraleChange: +3, ownerTrustChange: +2 },
          { text: 'We made a couple of fielding lapses that we need to address immediately in the nets.', moraleChange: -2, ownerTrustChange: +3 }
        ]
      });
    }

    try {
      const prompt = `Generate an intense IPL post-match press conference question for the manager of ${teamName} after a match result of "${result}". Top performer was ${topPerformers}. Controversial context: ${controversialDecision || 'close final over finish'}.
Output JSON format:
{
  "question": "Reporter's probing question to the manager",
  "options": [
    { "text": "Confident/Diplomatic answer", "moraleChange": 4, "ownerTrustChange": 4 },
    { "text": "Aggressive/Honest critical answer", "moraleChange": -2, "ownerTrustChange": 3 },
    { "text": "Praising the youngster/team spirit answer", "moraleChange": 5, "ownerTrustChange": 2 }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      res.json({
        question: `How do you assess the team's tactical execution during the crunch overs today?`,
        options: [
          { text: 'We stayed calm and trusted our bowling plans to cross the finish line.', moraleChange: +4, ownerTrustChange: +3 },
          { text: 'There are areas to clean up, but winning crunch moments is what IPL is about.', moraleChange: +3, ownerTrustChange: +3 },
          { text: 'The conditions were challenging, but individual brilliance bailed us out.', moraleChange: +1, ownerTrustChange: +2 }
        ]
      });
    }
  });

  // AI Natural Language Scouting Query Parser
  app.post('/api/ai/scout-query', async (req: Request, res: Response) => {
    const { query } = req.body;
    const ai = getAIClient();

    if (!ai) {
      return res.json({
        parsedQuery: query,
        scoutSummary: `Scouting database queried for: "${query}". Real player search criteria activated.`
      });
    }

    try {
      const prompt = `Analyze this cricket scouting natural language query for an IPL franchise: "${query}".
Output valid JSON:
{
  "scoutSummary": "One crisp sentence explaining what the scouting department is targeting",
  "roleSuggestion": "e.g. Death Bowler / Wicketkeeper / Finisher / Opener / All-rounder / Spinner / Fast Bowler / ALL",
  "nationalitySuggestion": "Indian / Overseas / ALL",
  "valueSuggestion": "Under 2 Cr / 2-5 Cr / 5-10 Cr / 10-15 Cr / 15 Cr+ / ALL",
  "keyTacticalTraits": ["trait1", "trait2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text || '{}';
      res.json(JSON.parse(text));
    } catch {
      res.json({
        parsedQuery: query,
        scoutSummary: `Scouting database queried for: "${query}". Real player search criteria activated.`
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏏 IPL Franchise Simulator server live on http://localhost:${PORT}`);
  });
}

startServer();
