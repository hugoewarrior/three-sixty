import { searchNewsTool } from './tools/search-news';
import { getArticleTool } from './tools/get-article';
import { webSearchTool } from './tools/web-search';
import { generateAudioTool } from './tools/generate-audio';

export const agentTools = {
  search_news: searchNewsTool,
  get_article: getArticleTool,
  web_search: webSearchTool,
  generate_audio: generateAudioTool,
};
