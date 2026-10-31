// Type definitions for json-humanized v2.2
// Project: https://github.com/anom-developer/json-humanized

export type Engine     = 'local' | 'ai';
export type AIProvider = 'anthropic' | 'openai' | 'ollama';
// FIX: added 'csv' and 'html' which are supported by the runtime but were missing from types
export type Format     = 'plain' | 'markdown' | 'story' | 'json' | 'sentence' | 'csv' | 'html';
export type Mode       = 'structured' | 'prose' | 'story' | 'sentence';

export interface HumanizeOptions {
  /** Processing engine. Default: 'local' */
  engine?: Engine;

  /** AI provider (only used when engine = 'ai'). Default: 'anthropic' */
  aiProvider?: AIProvider;

  /** API key for Anthropic or OpenAI. Falls back to env variable. */
  apiKey?: string;

  /** Output format. Default: 'plain' */
  format?: Format;

  /** Description style. Default: 'structured' */
  mode?: Mode;

  /** Natural language for output (AI mode). Default: 'English' */
  lang?: string;

  /** Context hint for the AI (e.g. "This is a Stripe webhook"). */
  context?: string;

  /** Source filename shown in the output header. */
  filename?: string;

  /** Max chars of JSON sent to AI. Default: 12000 */
  maxChars?: number;

  /** Path to a Handlebars (.hbs) template file for custom output. */
  template?: string;

  /** Enable AI response caching. Default: true */
  cache?: boolean;

  /** Cache TTL in seconds. Default: 3600 */
  cacheTTL?: number;

  /** Max array items to describe individually in sentence mode. Default: 3 */
  maxItems?: number;

  /** Explicit path to a .jh.config.json file. Auto-detected if omitted. */
  configPath?: string;

  /** Ollama base URL. Default: 'http://localhost:11434' */
  ollamaUrl?: string;

  /** Ollama model name. Default: 'llama3' */
  ollamaModel?: string;

  /** OpenAI model. Default: 'gpt-4o-mini' */
  openaiModel?: string;

  /** Source format hint: 'json' | 'yaml' | 'yml' | 'toml' */
  sourceFormat?: string;
}

export interface DiffOptions {
  /** 'local' for rule-based diff, 'ai' for AI-powered diff. Default: 'local' */
  engine?: Engine;

  /** Output format. Default: 'plain' */
  format?: 'plain' | 'markdown' | 'json';

  /** Natural language for AI diff output. Default: 'English' */
  lang?: string;

  /** Context hint for AI diff. */
  context?: string;

  /** API key for AI diff mode. */
  apiKey?: string;
}

export interface CacheStats {
  entries: number;
  totalBytes: number;
  dir: string;
}

// FIX: export as namespaced objects matching the actual module shape

export interface DiffModule {
  diff(a: unknown, b: unknown, options?: DiffOptions): Promise<string>;
  diffFiles(fileA: string, fileB: string, options?: DiffOptions): Promise<string>;
}

export interface CacheModule {
  buildCacheKey(data: unknown, options?: object): string;
  readCache(key: string, ttl?: number): string | null;
  writeCache(key: string, result: string): void;
  clearCache(): number;
  cacheStats(): CacheStats;
  withCache(data: unknown, options: object, fn: () => Promise<string>, enabled?: boolean): Promise<string>;
}

export interface ConfigModule {
  loadConfig(configPath?: string): { config: object; configPath: string | null };
  resolveLabel(key: string, fieldLabels?: Record<string, string | null>): string | null;
  resolveType(key: string, fieldTypes?: Record<string, string>): string | null;
  isHidden(key: string, hiddenFields?: string[]): boolean;
  generateExampleConfig(): string;
}

export interface WatchModule {
  watch(filePath: string, options: HumanizeOptions, humanizeFn: (data: unknown, options: HumanizeOptions) => Promise<string>): { stop(): void };
}

export interface BatchItem {
  data: unknown;
  options?: HumanizeOptions;
}

/**
 * Humanize a parsed JavaScript value (object, array, primitive).
 *
 * @example
 * import { humanize } from 'json-humanized';
 * const text = await humanize({ name: 'Alice', age: 30 });
 */
export function humanize(data: unknown, options?: HumanizeOptions): Promise<string>;

/**
 * Read a JSON/YAML/TOML file from disk and humanize it.
 *
 * @example
 * import { humanizeFile } from 'json-humanized';
 * const text = await humanizeFile('./users.json', { format: 'markdown' });
 */
export function humanizeFile(filePath: string, options?: HumanizeOptions): Promise<string>;

/**
 * Parse and humanize a raw JSON/YAML/TOML string.
 *
 * @example
 * import { humanizeString } from 'json-humanized';
 * const text = await humanizeString('{"key":"value"}');
 */
export function humanizeString(rawString: string, options?: HumanizeOptions): Promise<string>;

/**
 * Humanize multiple values concurrently.
 *
 * @example
 * import { humanizeBatch } from 'json-humanized';
 * const results = await humanizeBatch([
 *   { data: { name: 'Alice' } },
 *   { data: { name: 'Bob' }, options: { format: 'markdown' } },
 * ]);
 */
export function humanizeBatch(items: BatchItem[], sharedOptions?: HumanizeOptions): Promise<string[]>;

/**
 * Return a single-line summary of the top-level fields.
 * Useful for tooltips, notifications, or log lines.
 */
export function summarize(data: unknown, maxFields?: number): string;

/** Diff utilities */
export const diff: DiffModule;

/** Cache utilities */
export const cache: CacheModule;

/** Config utilities */
export const config: ConfigModule;

/** File-watch utilities */
export const watch: WatchModule;
