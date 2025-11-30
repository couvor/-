import { GoogleGenAI, Type } from "@google/genai";
import { ParticleConfig, InteractionMode } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateThemeFromDescription = async (description: string): Promise<{ name: string; description: string; config: ParticleConfig }> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const prompt = `
    You are a creative visual coder. 
    Create a particle system configuration based on this description: "${description}".
    
    Think about how gravity, colors, and movement physics would represent this concept.
    For example:
    - "Fire": upward gravity (negative), orange/red colors, high speed, trail mode.
    - "Snow": downward gravity, white/blue colors, slow friction.
    - "Black Hole": attract mode, dark colors, strong force.
    
    Return a JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "A short creative name for this theme" },
            description: { type: Type.STRING, description: "A short explanation of the design choices" },
            config: {
              type: Type.OBJECT,
              properties: {
                gravity: { type: Type.NUMBER, description: "Vertical force, between -0.5 (up) and 0.5 (down)" },
                friction: { type: Type.NUMBER, description: "Velocity decay, between 0.90 and 0.99" },
                speed: { type: Type.NUMBER, description: "Movement speed multiplier, between 0.5 and 5" },
                particleCount: { type: Type.NUMBER, description: "Number of particles, between 100 and 800" },
                interactionRadius: { type: Type.NUMBER, description: "Radius of hand influence, between 50 and 300" },
                interactionForce: { type: Type.NUMBER, description: "Strength of hand influence, between 0.5 and 5" },
                interactionMode: { type: Type.STRING, enum: [InteractionMode.REPEL, InteractionMode.ATTRACT, InteractionMode.TRAIL] },
                colors: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Array of hex color codes" 
                },
                minSize: { type: Type.NUMBER, description: "Minimum particle radius" },
                maxSize: { type: Type.NUMBER, description: "Maximum particle radius" },
                fadeRate: { type: Type.NUMBER, description: "Opacity decay rate 0.01 to 0.1" }
              },
              required: ["gravity", "friction", "speed", "particleCount", "interactionMode", "colors", "minSize", "maxSize"]
            }
          },
          required: ["name", "config", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const result = JSON.parse(text);
    return result;

  } catch (error) {
    console.error("Gemini Theme Error:", error);
    // Fallback config if API fails
    return {
      name: "Error Fallback",
      description: "Could not generate theme. Using defaults.",
      config: {
        gravity: 0,
        friction: 0.95,
        speed: 1,
        particleCount: 200,
        interactionRadius: 150,
        interactionForce: 1,
        interactionMode: InteractionMode.REPEL,
        colors: ["#ffffff", "#aaaaaa"],
        minSize: 1,
        maxSize: 3,
        fadeRate: 0.02
      }
    };
  }
};
