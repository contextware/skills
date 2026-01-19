# MCP OAuth Architecture Review

## 1. Executive Summary

This review evaluates the architectural requirements for portable MCP OAuth support. The goal is to ensure `context-serve` implements an architecture that allows skills to be portable across different agent platforms (Claude, Gemini CLI, etc.) while providing a seamless user experience.

**Conclusion:** The **Three-Layer Architecture** (Skill, Script, Adapter) is confirmed as the correct approach.
*   **Gemini CLI** represents the "Integrated" pattern (Platform handles OAuth automatically).
*   **Claude API** represents the "Consumer-Managed" pattern (Agent/User must provide the token).
*   **Context-Serve** currently sits in the middle: it handles the flow (like Gemini) but lacks persistence (unlike Gemini).

To achieve full portability and parity, `context-serve` must implement **file-based token persistence**.

---

## 2. Platform Capability Analysis

Understanding the extremes of the Agent Platform spectrum is crucial for defining our architecture.

### Gemini CLI (The "Batteries Included" Model)
*   **Discovery:** Automatic. Detects 401, finds `.well-known` metadata.
*   **User Experience:** "Just Works." Opens browser, handles callback, stores token.
*   **Persistence:** **YES.** tokens are stored in `~/.gemini/mcp-oauth-tokens.json`.
*   **Configuration:** Uses `settings.json` (User or Project scope). Supports `authProviderType` (e.g., `google_credentials`, `dynamic_discovery`).
*   **Implication for Skills:** Skills do *not* need to describe how to authenticate; the platform does it all.

### Claude (The "API Consumer" Model)
*   **Discovery:** Manual / External.
*   **User Experience:** "Bring Your Own Token." usage of the `authorization_token` field in configuration.
*   **Persistence:** **NO.** The docs state: *"API consumers are expected to handle the OAuth flow and obtain the access token prior to making the API call, as well as refreshing the token as needed."*
*   **Implication for Skills:** Skills must provide **Portable Scripts** (Layer 1) to help the user/agent "obtain the access token" because the platform won't do it automatically.

---

## 3. Architecture Recommendations

### A. The "Platform Adapter" Layer (User's App)
**Goal:** Match Gemini CLI's "Batteries Included" experience.

1.  **Implement File-Based Persistence (Critical)**
    *   **Current:** Tokens stored in-memory (`Map<string, ...>`).
    *   **Proposed:** JSON File Store at `~/.context-serve/mcp-tokens.json`.
    *   **Why:** Matches `~/.gemini/mcp-oauth-tokens.json`. Prevents user frustration (Login Fatigue) and aligns with the "best in class" CLI experience.

2.  **Standardize Configuration**
    *   **Current:** `config/mcp-oauth.json` (Project level).
    *   **Recommendation:** Adopt a cascading configuration similar to Gemini CLI:
        1.  Project Config: `.context-serve/config.json`
        2.  User Config: `~/.context-serve/config.json`
    *   **Reason:** Allows users to reuse Client IDs/Secrets across projects.

3.  **Automated OAuth Flow**
    *   **Current:** Implemented.
    *   **Check:** Ensure it handles the standard RFC 6750 `WWW-Authenticate` header parsing exactly as Gemini does (checking `authorization_uri`, `issuer`, etc.).

### B. The "Portable Skill" Layer (Shared Skills)
**Goal:** Support "dumb" platforms (like raw Claude API connections) that don't automate Auth.

1.  **Retain "Helper Scripts"**
    *   Skills should continue to include scripts like `scripts/build-auth-url.js`.
    *   **Why:** If a user is manually configuring Claude Desktop or building a custom script using the Claude API, they can run these scripts to generate the `authorization_token` they need to paste into their config.
    *   *Note:* `context-serve` (and Gemini CLI) will **ignore** these scripts and use their native internal flows, but their presence makes the skill *portable* to less capable environments.

---

## 4. Implementation Plan for Context-Serve

To finalize the architecture, we will implement the following Component:

**`FileTokenStore` Class**
*   **Location:** `app/lib/mcp/tokenStore.ts`
*   **Responsibility:**
    *   Load/Save tokens to `~/.context-serve/mcp-tokens.json`.
    *   Encryption (Optional but recommended for `access_token` safety).
*   **Integration:** Replace the in-memory `tokenStore` Map in `app/lib/mcp/auth.ts`.

## 5. Summary Table

| Feature | Context-Serve (Plan) | Gemini CLI | Claude API |
| :--- | :--- | :--- | :--- |
| **Auth Handling** | **Native / Automated** | **Native / Automated** | **External / Manual** |
| **Persistence** | **File (`~/.context-serve/...`)** | **File (`~/.gemini/...`)** | **None (Consumer managed)** |
| **Configuration** | **Cascading (User/Project)** | **Cascading (User/Project)** | **Manual Config** |
| **Skill Role** | Declarative ("Connect to X") | Declarative ("Connect to X") | Imperative ("Run script to get token") |

This architecture ensures that `context-serve` provides a premium, automated experience while the underlying Skills remain compatible with manual/API workflows via their bundled helper scripts.
