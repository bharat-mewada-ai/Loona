# Security Policy

## Supported Versions

Only the current version of the application on the `main` branch is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

We take the security of Loona and our users seriously. If you discover a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner.

Please do **NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via email to **[security@loona.app]** (Placeholder: Update with real email before launch).

### Response SLA
- We will acknowledge receipt of your vulnerability report within **48 hours**.
- We will provide an estimated timeline for a fix and updates within **7 days**.
- Once resolved, we will notify you and (if requested) provide credit in our changelog.

## Important Note on Git History (Sensitive Files)

> [!WARNING]
> Due to early development workflows, some historical commits in this repository's history contain hardcoded placeholder credentials, staging MongoDB URIs, and untracked file artifacts (like `client/google-services.json` or legacy admin setup scripts). 
> 
> **These files have been successfully untracked and rotated in the active production environment.** 
> 
> Security researchers: Please do not submit vulnerability reports regarding secrets found deep in the git history unless you have explicitly verified that they successfully grant unauthorized access to our *current production infrastructure*. Most of these historical secrets are dead or were local placeholders.
