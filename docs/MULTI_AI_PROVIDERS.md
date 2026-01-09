# Multi-AI Provider Support

## Overview

PLCR Studio now supports multiple AI backends for image generation and editing, providing flexibility, redundancy, and cost optimization. The system includes built-in fallback logic and transparent cost/latency estimates.

## Supported Providers

### 1. Google Gemini (Default)
- **Models**: Gemini 2.5 Flash Image, Gemini 3 Pro Image
- **Capabilities**: Text generation, Image generation, Image editing, Composition
- **Strengths**: Fast, high quality, supports up to 4K resolution
- **Cost**: $0.02-$0.10/image
- **Latency**: 5-15s for generation
- **API Key**: `GEMINI_API_KEY`

### 2. OpenAI DALL-E
- **Models**: DALL-E 3, DALL-E 2
- **Capabilities**: Text generation (GPT-4o), Image generation, Image editing
- **Strengths**: High-quality creative generation, good composition
- **Cost**: $0.04-$0.08/image (DALL-E 3), $0.02/image (edits)
- **Latency**: 10-30s for generation
- **API Key**: `OPENAI_API_KEY`

### 3. Anthropic Claude
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus
- **Capabilities**: Text generation, Image analysis
- **Strengths**: Advanced vision and analysis, helpful for prompt enhancement
- **Note**: Does not generate images directly - provides analysis and guidance
- **Cost**: $3.00/1M input tokens, $15.00/1M output tokens
- **Latency**: 2-5s for text
- **API Key**: `ANTHROPIC_API_KEY`

### 4. Replicate (Open Source)
- **Models**: SDXL, Stable Diffusion 2.1
- **Capabilities**: Image generation, Image editing
- **Strengths**: Cost-effective, open-source models, customizable
- **Cost**: $0.0055-$0.01/image
- **Latency**: 15-45s for generation
- **API Token**: `REPLICATE_API_TOKEN`

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Default provider (optional)
DEFAULT_AI_PROVIDER=gemini

# Provider API Keys (configure at least one)
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
REPLICATE_API_TOKEN=your_replicate_token_here
```

### Getting API Keys

1. **Google Gemini**: https://aistudio.google.com/apikey
2. **OpenAI**: https://platform.openai.com/api-keys
3. **Anthropic**: https://console.anthropic.com/
4. **Replicate**: https://replicate.com/account/api-tokens

## Architecture

### Provider Abstraction Layer

Located in `lib/ai-providers/`, the abstraction layer provides:

- **Unified Interface**: All providers implement the `AIProvider` interface
- **Type Safety**: Full TypeScript support with comprehensive types
- **Error Handling**: Graceful degradation and informative error messages
- **Fallback Logic**: Automatic failover to alternate providers

### Key Components

```
lib/ai-providers/
├── types.ts          # Core types and interfaces
├── base.ts           # Base provider class with utilities
├── gemini.ts         # Google Gemini implementation
├── claude.ts         # Anthropic Claude implementation
├── openai.ts         # OpenAI implementation
├── replicate.ts      # Replicate implementation
├── factory.ts        # Provider factory and registry
└── index.ts          # Main export
```

### Provider Interface

Each provider implements:

```typescript
interface AIProvider {
  getMetadata(): ProviderMetadata;
  getAvailableModels(): ModelInfo[];
  generateText(request: GenerateTextRequest): Promise<GenerateTextResponse>;
  generateEnvironment(request: GenerateImageRequest): Promise<GenerateImageResponse>;
  composeProduct(request: ComposeImageRequest): Promise<ComposeImageResponse>;
  refineImage(request: RefineImageRequest): Promise<RefineImageResponse>;
  getSupportedResolutions(): ResolutionOption[];
  isConfigured(): boolean;
}
```

## API Usage

### API Routes

All API routes now accept an optional `provider` parameter:

#### Generate Environment
```javascript
POST /api/generate-environment
{
  "prompt": "A modern living room",
  "provider": "gemini",      // Optional
  "model": "gemini-3-pro-image-preview",  // Optional
  "quality": "2K",           // Optional
  "aspectRatio": "16:9"      // Optional
}
```

#### Generate Asset
```javascript
POST /api/generate-asset
{
  "prompt": "A red sports car",
  "provider": "openai",      // Optional
  "model": "dall-e-3",       // Optional
  "quality": "hd",           // Optional
  "aspectRatio": "1:1"       // Optional
}
```

#### Generate Combination
```javascript
POST /api/generate-combination
{
  "prompt": "Place the product here",
  "sketchImage": "data:image/png;base64,...",
  "environmentImage": "data:image/png;base64,...",
  "productImages": ["data:image/png;base64,..."],
  "provider": "gemini",      // Optional
  "model": "gemini-2.5-flash-image",  // Optional
  "quality": "1K",           // Optional
  "aspectRatio": "16:9"      // Optional
}
```

#### Generate Improvement
```javascript
POST /api/generate-improvement
{
  "image": "data:image/png;base64,...",
  "prompt": "Make the sky more dramatic",
  "provider": "replicate",   // Optional
  "model": "stability-ai/sdxl",  // Optional
  "quality": "standard",     // Optional
  "aspectRatio": "1:1"       // Optional
}
```

### Fallback Behavior

If a provider is not specified or fails:

1. Uses `DEFAULT_AI_PROVIDER` from environment
2. Falls back to configured providers in order: `gemini` → `openai` → `replicate`
3. Returns error only if all providers fail

### Programmatic Usage

```typescript
import { getAIProvider, executeWithFallback } from '@/lib/ai-providers';

// Get a specific provider
const gemini = getAIProvider('gemini');
const result = await gemini.generateEnvironment({
  prompt: 'A sunset beach',
  config: { quality: '2K', aspectRatio: '16:9' }
});

// Use with automatic fallback
const result = await executeWithFallback(
  'gemini',  // Preferred provider
  async (provider) => {
    return await provider.generateEnvironment({
      prompt: 'A sunset beach'
    });
  }
);
```

## UI Components

### ProviderSelector Component

The `ProviderSelector` component provides:

- Provider selection dropdown
- Model selection based on provider
- Cost estimates per operation
- Latency estimates
- Provider availability status

Usage:

```typescript
import { ProviderSelector } from '@/components/ProviderSelector';

<ProviderSelector
  selectedProvider={provider}
  onProviderChange={setProvider}
  selectedModel={model}
  onModelChange={setModel}
  operation="generation"  // or "editing" or "composition"
/>
```

### Integration Points

1. **InitialEnvironmentDialog**: Provider selection for environment generation
2. **Asset Generation**: Provider selection for product/asset creation
3. **Image Iteration**: Provider selection for refinement

## Cost & Performance Comparison

### Image Generation (1024×1024)

| Provider | Model | Cost | Latency | Quality |
|----------|-------|------|---------|---------|
| Gemini | 2.5 Flash | $0.02 | 5-10s | Good |
| Gemini | 3 Pro | $0.10 | 10-15s | Excellent |
| OpenAI | DALL-E 3 | $0.04 | 15-25s | Excellent |
| OpenAI | DALL-E 2 | $0.02 | 10-20s | Good |
| Replicate | SDXL | $0.01 | 20-40s | Very Good |

### Image Editing

| Provider | Model | Cost | Latency | Quality |
|----------|-------|------|---------|---------|
| Gemini | 2.5 Flash | $0.03 | 8-15s | Good |
| Gemini | 3 Pro | $0.12 | 12-20s | Excellent |
| OpenAI | DALL-E 2 | $0.02 | 15-30s | Good |
| Replicate | SDXL | $0.02 | 25-50s | Very Good |

## Best Practices

### 1. Provider Selection

- **Speed Priority**: Use Gemini 2.5 Flash
- **Quality Priority**: Use Gemini 3 Pro or DALL-E 3
- **Cost Priority**: Use Replicate SDXL
- **Production**: Configure multiple providers for redundancy

### 2. Error Handling

```typescript
try {
  const result = await fetch('/api/generate-environment', {
    method: 'POST',
    body: JSON.stringify({ prompt, provider: 'gemini' })
  });
  const data = await result.json();

  if (data.status === 'error') {
    console.error(data.message);
    if (data.suggestion) {
      // Show configuration suggestion to user
      console.log(data.suggestion);
    }
  }
} catch (error) {
  // Handle network errors
}
```

### 3. Model Selection

- **Gemini 2.5 Flash**: Fast iterations, prototyping
- **Gemini 3 Pro**: Final high-res outputs (supports 4K)
- **DALL-E 3**: Creative, artistic images
- **SDXL**: Budget-conscious projects

### 4. Quality Settings

- **1K (1024px)**: Quick previews, testing
- **2K (2048px)**: Production quality, web
- **4K (4096px)**: Print, high-res displays (Gemini Pro only)

## Testing

### Unit Tests

Update provider tests:

```typescript
import { GeminiProvider } from '@/lib/ai-providers/gemini';

describe('GeminiProvider', () => {
  it('should generate environment', async () => {
    const provider = new GeminiProvider(process.env.GEMINI_API_KEY);
    const result = await provider.generateEnvironment({
      prompt: 'A test scene',
      config: { quality: '1K' }
    });
    expect(result.imageData).toContain('data:image/');
  });
});
```

### Integration Tests

Test fallback logic:

```typescript
import { executeWithFallback } from '@/lib/ai-providers';

describe('Fallback Logic', () => {
  it('should fallback to next provider on failure', async () => {
    const result = await executeWithFallback(
      'invalid-provider' as any,
      async (provider) => provider.generateText({ prompt: 'test' })
    );
    expect(result.text).toBeDefined();
  });
});
```

## Troubleshooting

### Provider Not Available

**Error**: "All providers failed" or "[Provider] not configured"

**Solution**:
1. Check `.env` file for API keys
2. Verify API key is valid
3. Ensure at least one provider is configured

### Model Not Found

**Error**: "Unknown model" or "Model not supported"

**Solution**:
1. Check model ID matches provider's available models
2. Use `getAvailableModels()` to see supported models
3. Leave model blank to use provider default

### Rate Limiting

**Error**: "Rate limit exceeded"

**Solution**:
1. Configure multiple providers for load distribution
2. Implement request queuing
3. Use fallback to alternate provider

### Image Quality Issues

**Issue**: Generated images don't match expected quality

**Solution**:
1. Use Gemini 3 Pro or DALL-E 3 for highest quality
2. Specify `quality: '4K'` for high-resolution (Gemini Pro)
3. Enhance prompts with detailed descriptions

## Future Enhancements

- **Provider Health Monitoring**: Track success rates and latencies
- **Smart Routing**: Route requests based on prompt analysis
- **Caching**: Cache common generations to reduce costs
- **Batch Processing**: Process multiple images efficiently
- **Custom Models**: Support for fine-tuned models
- **A/B Testing**: Compare outputs across providers

## Support

For issues or questions:
1. Check the API provider's documentation
2. Review error messages and suggestions
3. Ensure all environment variables are set
4. Test with a simple prompt first

## License

Multi-provider support is part of PLCR Studio and follows the same license.
