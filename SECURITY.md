# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing the maintainers directly rather than opening a public issue.

### What to include in your report:

1. **Description**: A clear description of the vulnerability
2. **Steps to reproduce**: How to reproduce the issue
3. **Impact**: What data or functionality could be affected
4. **Suggested fix**: If you have ideas for fixing the issue

### What happens next:

1. **Acknowledgment**: We'll acknowledge receipt within 48 hours
2. **Investigation**: We'll investigate and validate the issue
3. **Fix**: We'll work on a fix and coordinate disclosure
4. **Credit**: We'll credit you for the discovery (if desired)

## Security Considerations

### Environment Variables
- Never commit API keys or secrets to the repository
- Use `.env.local` for development secrets
- Set environment variables securely in Vercel dashboard

### File Uploads
- File size limits enforced (50MB max)
- File type validation (PDF only)
- Malicious file scanning recommended for production

### API Security
- Rate limiting should be implemented for production
- Input validation on all API endpoints
- Proper error handling to avoid information leakage

### Content Processing
- User-uploaded content is processed by third-party AI services
- Consider data privacy implications
- Implement content filtering if needed

### Dependencies
- Regularly update dependencies for security patches
- Monitor for security advisories
- Use `npm audit` to check for vulnerabilities

Thank you for helping keep Improve-PDF secure!