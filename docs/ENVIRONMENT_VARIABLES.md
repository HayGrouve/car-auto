# Environment Variables Documentation

This document describes all environment variables required for the car service CRM veterinary clinic CRM application.

## Required Variables

### Server-Side Variables

#### `NODE_ENV`
- **Type**: `string`
- **Values**: `development` | `test` | `production`
- **Required**: Yes
- **Description**: Node.js environment mode. Controls behavior like error details, security settings, and optimizations.
- **Example**: `NODE_ENV=production`

#### `JWT_SECRET`
- **Type**: `string`
- **Min Length**: 32 characters
- **Required**: Yes
- **Description**: Secret key used to sign and verify JWT authentication tokens. Must be a strong, randomly generated string.
- **Security**: Use different secrets for development and production. Never commit to version control.
- **Generate**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Example**: `JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

#### `SINGLE_USER_EMAIL`
- **Type**: `string` (email format)
- **Required**: Yes
- **Description**: Email address for the single admin user (MVP authentication model).
- **Example**: `SINGLE_USER_EMAIL=admin@clinic.local`

#### `SINGLE_USER_PASSWORD_HASH`
- **Type**: `string` (bcrypt hash)
- **Required**: Production only
- **Description**: Bcrypt hash of the admin password. Required in production, optional in development if using `SINGLE_USER_PASSWORD`.
- **Generate**: `node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('your-password', 10).then(h=>console.log(h))"`
- **Example**: `SINGLE_USER_PASSWORD_HASH=$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

#### `SINGLE_USER_PASSWORD`
- **Type**: `string`
- **Required**: Development only (not recommended)
- **Description**: Plain text password for development convenience. **MUST NOT be used in production**. Remove or leave empty in production.
- **Security Warning**: This is a development convenience only. Always use `SINGLE_USER_PASSWORD_HASH` in production.
- **Example**: `SINGLE_USER_PASSWORD=devpassword123`

### Client-Side Variables

#### `NEXT_PUBLIC_CONVEX_URL`
- **Type**: `string` (URL)
- **Required**: Yes
- **Description**: Convex deployment URL for client-side database connection. Obtained from Convex dashboard after deployment.
- **Format**: `https://your-deployment.convex.cloud`
- **Obtain**: 
  1. Sign up at https://convex.dev
  2. Create a project
  3. Run `npx convex deploy`
  4. Copy URL from Convex dashboard
- **Example**: `NEXT_PUBLIC_CONVEX_URL=https://happy-animal-123.convex.cloud`

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
JWT_SECRET=dev-secret-key-minimum-32-characters-long
SINGLE_USER_EMAIL=admin@clinic.local
SINGLE_USER_PASSWORD=devpassword123
SINGLE_USER_PASSWORD_HASH=
NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
```

**Notes:**
- `SINGLE_USER_PASSWORD` can be used for convenience
- `SINGLE_USER_PASSWORD_HASH` is optional if using plain password
- Use development Convex deployment URL

### Production

```env
NODE_ENV=production
JWT_SECRET=<strong-random-32-plus-character-secret>
SINGLE_USER_EMAIL=admin@clinic.local
SINGLE_USER_PASSWORD_HASH=<bcrypt-hash-of-password>
SINGLE_USER_PASSWORD=
NEXT_PUBLIC_CONVEX_URL=https://your-prod-deployment.convex.cloud
```

**Critical Requirements:**
- `SINGLE_USER_PASSWORD` MUST be empty or removed
- `SINGLE_USER_PASSWORD_HASH` MUST be set with a valid bcrypt hash
- `JWT_SECRET` MUST be a strong, randomly generated secret (32+ characters)
- Use production Convex deployment URL
- Never commit `.env` files to version control

## Validation

All environment variables are validated at build time using Zod schemas in `src/env.js`:

- `NODE_ENV` must be one of: `development`, `test`, `production`
- `JWT_SECRET` must be at least 32 characters
- `NEXT_PUBLIC_CONVEX_URL` must be a valid URL format

If validation fails, the build will fail with clear error messages.

## Security Best Practices

1. **Never commit secrets**: Add `.env.local` and `.env` to `.gitignore`
2. **Use different secrets**: Use different values for development and production
3. **Rotate secrets**: Regularly rotate `JWT_SECRET` in production
4. **Use secure storage**: Use platform environment variable management (Vercel, etc.) for production
5. **No plain passwords**: Never use `SINGLE_USER_PASSWORD` in production
6. **Strong secrets**: Use cryptographically secure random generators for `JWT_SECRET`

## Troubleshooting

### "Invalid Convex URL format"
- Ensure `NEXT_PUBLIC_CONVEX_URL` starts with `https://` and ends with `.convex.cloud`
- Verify the URL from your Convex dashboard

### "JWT_SECRET must be at least 32 characters"
- Generate a new secret using the command provided above
- Ensure there are no extra spaces or quotes in the value

### "Environment variable validation failed"
- Check that all required variables are set
- Verify variable names match exactly (case-sensitive)
- Ensure values meet validation requirements (format, length, etc.)

## Platform-Specific Setup

### Vercel

1. Go to Project Settings → Environment Variables
2. Add each variable for the appropriate environment (Production, Preview, Development)
3. Ensure `NEXT_PUBLIC_CONVEX_URL` is set for all environments
4. Redeploy after adding variables

### Docker

Use `SKIP_ENV_VALIDATION=true` during build, then set variables at runtime:

```dockerfile
ENV SKIP_ENV_VALIDATION=true
# Set actual values at runtime via docker run -e or docker-compose
```

### Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in all required values
3. Restart development server after changes


