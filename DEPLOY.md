# Deployment Guide

## Prerequisites

1. **Vercel Account**: You'll need a Vercel account to deploy the application.
2. **Environment Variables**: The following environment variables need to be configured in Vercel:

### Required Environment Variables

- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `DATABASE_URL`: PostgreSQL database connection string
- `REDIS_URL`: Redis connection URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key for authentication
- `CLERK_SECRET_KEY`: Clerk secret key

### Optional Environment Variables for AI Providers

The application supports multiple AI providers. At least one should be configured:

- `GLM_API_KEY`: Zhipu AI API key
- `MEMO_API_KEY`: Memo AI API key
- `MIMO_API_KEY`: Mimo AI API key
- `OPENROUTER_API_KEY`: OpenRouter API key
- `MINIMAX_API_KEY`: Minimax API key
- `GITHUB_TOKEN`: GitHub Models API key

### Payment Integration Variables

- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`: PayPal client ID
- `PAYPAL_SECRET`: PayPal secret key
- `COINBASE_COMMERCE_API_KEY`: Coinbase Commerce API key
- `COINBASE_WEBHOOK_SECRET`: Coinbase webhook secret

## Deployment Steps

### Manual Deployment

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Vercel will automatically detect the Next.js configuration and use the settings in `vercel.json`

### CI/CD Deployment

The repository includes a GitHub Actions workflow that will automatically deploy the application when changes are pushed to the main branch.

1. Set up the following GitHub repository secrets:
   - `VERCEL_TOKEN`: Your Vercel deployment token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

2. Push changes to the main branch
3. The workflow will automatically:
   - Checkout the code
   - Install dependencies
   - Build the application
   - Deploy to Vercel

## Configuration Notes

- The application is configured with `output: "standalone"` in `next.config.mjs`, which optimizes it for serverless deployment
- The `vercel.json` file configures the deployment with specific build settings and routes
- The `maxDuration: 60` setting for the `/api/run` route allows for longer-running serverless functions
- Node.js version 22+ is required, as specified in the `engines` field of package.json