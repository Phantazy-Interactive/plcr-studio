'use client';

import { useState, useEffect } from 'react';
import type { AIProviderType } from '@/types/canvas';

interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  costEstimate: {
    imageGeneration?: string;
    imageEditing?: string;
  };
  latencyEstimate: {
    imageGeneration?: string;
    imageEditing?: string;
  };
  available: boolean;
}

interface ProviderSelectorProps {
  selectedProvider?: AIProviderType;
  onProviderChange: (provider: AIProviderType) => void;
  selectedModel?: string;
  onModelChange: (model: string) => void;
  operation?: 'generation' | 'editing' | 'composition';
}

export function ProviderSelector({
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  operation = 'generation',
}: ProviderSelectorProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Provider information (this could be fetched from API in production)
  const providerData: Record<AIProviderType, Omit<ProviderInfo, 'available'>> = {
    gemini: {
      name: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google\'s multimodal AI with advanced image generation',
      costEstimate: {
        imageGeneration: '$0.02-$0.10/image',
        imageEditing: '$0.03-$0.12/image',
      },
      latencyEstimate: {
        imageGeneration: '5-15s',
        imageEditing: '8-20s',
      },
    },
    openai: {
      name: 'openai',
      displayName: 'OpenAI DALL-E',
      description: 'OpenAI\'s DALL-E for high-quality image generation',
      costEstimate: {
        imageGeneration: '$0.04-$0.08/image',
        imageEditing: '$0.02/image',
      },
      latencyEstimate: {
        imageGeneration: '10-30s',
        imageEditing: '15-40s',
      },
    },
    claude: {
      name: 'claude',
      displayName: 'Anthropic Claude',
      description: 'Claude with vision capabilities (analysis only)',
      costEstimate: {
        imageGeneration: 'N/A',
        imageEditing: 'N/A',
      },
      latencyEstimate: {
        imageGeneration: 'N/A',
        imageEditing: 'N/A',
      },
    },
    replicate: {
      name: 'replicate',
      displayName: 'Replicate (SDXL)',
      description: 'Open-source models including Stable Diffusion XL',
      costEstimate: {
        imageGeneration: '$0.0055-$0.01/image',
        imageEditing: '$0.01-$0.02/image',
      },
      latencyEstimate: {
        imageGeneration: '15-45s',
        imageEditing: '20-60s',
      },
    },
  };

  // Model options per provider
  const modelOptions: Record<AIProviderType, string[]> = {
    gemini: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'],
    openai: ['dall-e-3', 'dall-e-2'],
    claude: ['claude-3-5-sonnet-20241022'],
    replicate: [
      'stability-ai/sdxl',
      'stability-ai/stable-diffusion',
    ],
  };

  useEffect(() => {
    // In a real implementation, this would check which providers are configured
    // For now, we'll just show all providers
    const availableProviders = Object.keys(providerData).map((key) => ({
      ...providerData[key as AIProviderType],
      available: true, // Would check API key availability in production
    }));

    setProviders(availableProviders);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      setModels(modelOptions[selectedProvider] || []);

      // Auto-select first model if none selected
      if (!selectedModel && modelOptions[selectedProvider]?.length > 0) {
        onModelChange(modelOptions[selectedProvider][0]);
      }
    }
  }, [selectedProvider]);

  const handleProviderChange = (provider: AIProviderType) => {
    onProviderChange(provider);
    // Auto-select first model when provider changes
    if (modelOptions[provider]?.length > 0) {
      onModelChange(modelOptions[provider][0]);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading providers...</div>;
  }

  const selectedProviderInfo = selectedProvider
    ? providers.find((p) => p.name === selectedProvider)
    : null;

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Provider
        </label>
        <select
          value={selectedProvider || ''}
          onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Auto (use default)</option>
          {providers.map((provider) => (
            <option
              key={provider.name}
              value={provider.name}
              disabled={!provider.available}
            >
              {provider.displayName}
              {!provider.available && ' (Not configured)'}
            </option>
          ))}
        </select>
      </div>

      {/* Model Selection */}
      {selectedProvider && models.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={selectedModel || ''}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Provider Info Card */}
      {selectedProviderInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <div className="font-medium text-blue-900 mb-1">
            {selectedProviderInfo.displayName}
          </div>
          <div className="text-blue-700 mb-2">
            {selectedProviderInfo.description}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-medium text-blue-800">Cost:</div>
              <div className="text-blue-600">
                {operation === 'editing'
                  ? selectedProviderInfo.costEstimate.imageEditing || 'N/A'
                  : selectedProviderInfo.costEstimate.imageGeneration || 'N/A'}
              </div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Latency:</div>
              <div className="text-blue-600">
                {operation === 'editing'
                  ? selectedProviderInfo.latencyEstimate.imageEditing || 'N/A'
                  : selectedProviderInfo.latencyEstimate.imageGeneration || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
