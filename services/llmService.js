const axios = require('axios');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-3.5-turbo';

const sanitizeBaseUrl = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const buildPrompt = (recentTodos) => {
  if (!recentTodos.length) {
    return 'No todos have been created yet.';
  }

  const lines = recentTodos.map((todo, index) => {
    const description = todo.description ? ` - Description: ${todo.description}` : '';
    return `${index + 1}. Title: ${todo.title}${description}`;
  });

  return `Here are the most recent todos:
${lines.join('\n')}`;
};

const parseSuggestions = (content) => {
  if (!content || typeof content !== 'string') {
    throw new Error('LLM response did not include suggestions.');
  }

  const trimmedContent = content.trim();

  const tryParse = (text) => {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  };

  let suggestions = tryParse(trimmedContent);

  if (!suggestions) {
    const jsonMatch = trimmedContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      suggestions = tryParse(jsonMatch[0]);
    }
  }

  if (!Array.isArray(suggestions)) {
    throw new Error('LLM response was not in the expected JSON array format.');
  }

  return suggestions
    .map((suggestion) => ({
      title: suggestion.title || suggestion.Title || suggestion.name || suggestion.Name,
      description:
        suggestion.description ||
        suggestion.Description ||
        suggestion.details ||
        suggestion.Details ||
        '',
    }))
    .filter((suggestion) => suggestion.title)
    .map((suggestion) => ({
      title: String(suggestion.title).trim(),
      description: suggestion.description ? String(suggestion.description).trim() : '',
    }));
};

const generateTodoSuggestions = async (recentTodos) => {
  const baseUrl = sanitizeBaseUrl(process.env.LLM_API_BASE_URL || DEFAULT_BASE_URL);
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_SUGGESTION_MODEL || DEFAULT_MODEL;

  if (!baseUrl) {
    throw new Error('LLM_API_BASE_URL is not configured.');
  }

  if (!model) {
    throw new Error('LLM_SUGGESTION_MODEL is not configured.');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates actionable, concise todo suggestions. Always respond with a JSON array of objects with "title" and "description" fields.',
      },
      {
        role: 'user',
        content: `${buildPrompt(recentTodos)}\n\nBased on these todos, suggest three new, unique todos that would complement the list. Respond using only JSON.`,
      },
    ],
    temperature: 0.7,
    n: 1,
  };

  try {
    const response = await axios.post(`${baseUrl}/chat/completions`, payload, {
      headers,
      timeout: 10000,
    });

    const content = response?.data?.choices?.[0]?.message?.content;
    const suggestions = parseSuggestions(content);

    if (!suggestions.length) {
      throw new Error('No suggestions returned by LLM.');
    }

    return suggestions;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      throw new Error(`LLM request failed with status ${status}: ${data?.error?.message || data?.message || 'Unknown error'}`);
    }

    throw new Error(`Failed to generate suggestions: ${error.message}`);
  }
};

module.exports = {
  generateTodoSuggestions,
};

