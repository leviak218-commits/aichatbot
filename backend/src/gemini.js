export function createGeminiAnswerGenerator({ client, model, fallbackModel }) {
  return async ({ history, message, systemInstruction }) => {
    const contents = [
      ...history.map(({ role, text }) => ({ role, parts: [{ text }] })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const config = { systemInstruction, temperature: 0.4 };

    try {
      const response = await client.models.generateContent({ model, contents, config });
      return response.text;
    } catch (error) {
      if (![429, 503].includes(error?.status) || !fallbackModel || fallbackModel === model) {
        throw error;
      }
      const response = await client.models.generateContent({ model: fallbackModel, contents, config });
      return response.text;
    }
  };
}