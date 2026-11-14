import Anthropic from '@anthropic-ai/sdk';

// Models fixed by the plan: Sonnet reads quotes/photos, Haiku handles chat and short explanations.
export const PARSE_MODEL = 'claude-sonnet-5-5';
export const CHAT_MODEL = 'claude-haiku-5-5';

let client: Anthropic | undefined;
/** Server-only Anthropic client; reads ANTHROPIC_API_KEY from env. */
export const anthropic = () => (client ??= new Anthropic());
