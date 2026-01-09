/**
 * AI Provider Factory and Registry
 * Manages provider instances and provides fallback logic
 */

import { GeminiProvider } from './gemini';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';
import { ReplicateProvider } from './replicate';
import type { AIProvider, AIProviderType, ProviderError } from './types';

export class AIProviderFactory {
  private static providers = new Map<AIProviderType, AIProvider>();
  private static fallbackOrder: AIProviderType[] = [
    'gemini',
    'openai',
    'replicate',
  ];

  /**
   * Get or create a provider instance
   */
  static getProvider(type: AIProviderType): AIProvider {
    if (!this.providers.has(type)) {
      const provider = this.createProvider(type);
      this.providers.set(type, provider);
    }

    return this.providers.get(type)!;
  }

  /**
   * Create a new provider instance
   */
  private static createProvider(type: AIProviderType): AIProvider {
    switch (type) {
      case 'gemini':
        return new GeminiProvider();
      case 'claude':
        return new ClaudeProvider();
      case 'openai':
        return new OpenAIProvider();
      case 'replicate':
        return new ReplicateProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Get all configured providers
   */
  static getConfiguredProviders(): AIProvider[] {
    const allTypes: AIProviderType[] = ['gemini', 'claude', 'openai', 'replicate'];
    return allTypes
      .map((type) => this.getProvider(type))
      .filter((provider) => provider.isConfigured());
  }

  /**
   * Get default provider (first configured provider in fallback order)
   */
  static getDefaultProvider(): AIProvider {
    const defaultType =
      (process.env.DEFAULT_AI_PROVIDER as AIProviderType) || 'gemini';

    const provider = this.getProvider(defaultType);

    if (provider.isConfigured()) {
      return provider;
    }

    // Fallback to first configured provider
    const configured = this.getConfiguredProviders();
    if (configured.length === 0) {
      throw new Error(
        'No AI providers are configured. Please set at least one API key in your environment variables.'
      );
    }

    return configured[0];
  }

  /**
   * Execute with fallback logic
   */
  static async executeWithFallback<T>(
    preferredProvider: AIProviderType | undefined,
    operation: (provider: AIProvider) => Promise<T>
  ): Promise<T> {
    const errors: ProviderError[] = [];
    const providers = this.getProviderFallbackChain(preferredProvider);

    for (const providerType of providers) {
      try {
        const provider = this.getProvider(providerType);

        if (!provider.isConfigured()) {
          continue;
        }

        return await operation(provider);
      } catch (error) {
        errors.push({
          provider: providerType,
          error: error instanceof Error ? error : new Error(String(error)),
          canFallback: true,
        });

        // Log the error for debugging
        console.error(
          `Provider ${providerType} failed:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed. Errors:\n${errors.map((e) => `- ${e.provider}: ${e.error.message}`).join('\n')}`
    );
  }

  /**
   * Get provider fallback chain
   */
  private static getProviderFallbackChain(
    preferredProvider?: AIProviderType
  ): AIProviderType[] {
    if (!preferredProvider) {
      return this.fallbackOrder;
    }

    // Put preferred provider first, then fallback order
    return [
      preferredProvider,
      ...this.fallbackOrder.filter((type) => type !== preferredProvider),
    ];
  }

  /**
   * Check if a specific operation is supported by provider
   */
  static supportsOperation(
    providerType: AIProviderType,
    operation: 'generateText' | 'generateEnvironment' | 'composeProduct' | 'refineImage'
  ): boolean {
    const provider = this.getProvider(providerType);
    const models = provider.getAvailableModels();

    switch (operation) {
      case 'generateText':
        return true; // All providers support text generation
      case 'generateEnvironment':
        return models.some((m) => m.supportsImageGeneration);
      case 'composeProduct':
        return models.some((m) => m.supportsComposition);
      case 'refineImage':
        return models.some((m) => m.supportsImageEditing);
      default:
        return false;
    }
  }

  /**
   * Get providers that support a specific operation
   */
  static getProvidersForOperation(
    operation: 'generateText' | 'generateEnvironment' | 'composeProduct' | 'refineImage'
  ): AIProviderType[] {
    const allTypes: AIProviderType[] = ['gemini', 'claude', 'openai', 'replicate'];
    return allTypes.filter((type) => this.supportsOperation(type, operation));
  }

  /**
   * Clear all cached provider instances (useful for testing)
   */
  static clearCache(): void {
    this.providers.clear();
  }
}

/**
 * Convenience function to get a provider
 */
export function getAIProvider(type?: AIProviderType): AIProvider {
  if (type) {
    return AIProviderFactory.getProvider(type);
  }
  return AIProviderFactory.getDefaultProvider();
}

/**
 * Convenience function to execute with fallback
 */
export async function executeWithFallback<T>(
  preferredProvider: AIProviderType | undefined,
  operation: (provider: AIProvider) => Promise<T>
): Promise<T> {
  return AIProviderFactory.executeWithFallback(preferredProvider, operation);
}
