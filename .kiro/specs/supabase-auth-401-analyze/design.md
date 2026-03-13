# Supabase Auth 401 Analyze Bugfix Design

## Overview

The bug manifests when a user attempts to start analysis via `/api/analyze` after successfully uploading a file. Despite being authenticated and having a valid session, the API returns a 401 Unauthorized error. The `/api/upload` endpoint works correctly with the same authentication mechanism, indicating the issue is specific to how `/api/analyze` handles session validation.

The fix will implement a dual-authentication strategy: use `SUPABASE_SERVICE_ROLE_KEY` as the primary method (more reliable for async operations), with a fallback to JWT token validation if the service role key is unavailable.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a POST request is made to `/api/analyze` with a valid user session and analysisId
- **Property (P)**: The desired behavior when the bug condition occurs - the API should successfully retrieve the session, validate ownership, and start analysis
- **Preservation**: Existing authentication behavior for `/api/upload` and other endpoints that must remain unchanged
- **Session Cookie**: The authentication cookie set by Supabase after user login, transmitted via `credentials: 'include'`
- **Service Role Key**: Server-side Supabase key with elevated permissions, used for backend operations
- **JWT Token**: JSON Web Token in Authorization header as fallback authentication method
- **createRouteHandlerClient**: Supabase helper that reads cookies from the request context
- **analysisId**: Numeric identifier for the analysis record, used to verify ownership

## Bug Details

### Bug Condition

The bug manifests when a user with a valid Supabase session makes a POST request to `/api/analyze` with a valid analysisId. The `createRouteHandlerClient({ cookies })` call in `/api/analyze/route.ts` fails to retrieve the session, even though:
- The same mechanism works in `/api/upload/route.ts`
- The user is authenticated (session exists in browser)
- The request includes `credentials: 'include'`

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { analysisId: number, cookies: CookieStore, userAuthenticated: boolean }
  OUTPUT: boolean
  
  RETURN input.analysisId IS valid number
         AND input.userAuthenticated IS true
         AND input.cookies CONTAINS valid Supabase session
         AND endpoint IS '/api/analyze'
         AND createRouteHandlerClient({ cookies }).auth.getSession() RETURNS null
END FUNCTION
```

### Examples

**Example 1: User uploads file successfully, then analysis fails**
- User logs in → session created ✓
- User uploads file via `/api/upload` → session retrieved successfully ✓
- User navigates to result page → session still valid in browser ✓
- User's browser calls `/api/analyze` with `credentials: 'include'` → session NOT retrieved ✗
- API returns 401 "Требуется авторизация"

**Example 2: Same session works for upload but not analyze**
- `/api/upload` with same cookies → `getSession()` returns session ✓
- `/api/analyze` with same cookies → `getSession()` returns null ✗

**Example 3: Edge case - session expires between requests**
- User uploads file (session valid)
- Session expires (e.g., 1 hour passes)
- User tries to analyze → 401 error (expected, but should be clear)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `/api/upload` must continue to work exactly as before with session-based authentication
- Unauthorized users (no session) must continue to receive 401 errors
- RLS (Row-Level Security) policies must continue to protect user data
- File upload and storage operations must remain unchanged
- Analysis status transitions must remain unchanged
- Email sending must remain unchanged

**Scope:**
All inputs that do NOT involve the `/api/analyze` endpoint should be completely unaffected by this fix. This includes:
- File uploads via `/api/upload`
- Authentication flows (login, register, logout)
- Other API endpoints (payment, limits, etc.)
- Frontend components and pages

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Cookie Transmission Issue**: The session cookie may not be properly transmitted from the browser to the `/api/analyze` endpoint
   - Browser may not send cookies due to CORS/SameSite restrictions
   - Vercel deployment may have different cookie handling than local dev
   - Cookie domain/path mismatch between upload and analyze endpoints

2. **Session Validation Timing**: The session may be valid in the browser but not yet available on the server
   - Race condition between cookie setting and first API call
   - Session cache invalidation issues
   - Supabase auth-helpers-nextjs version compatibility

3. **Environment Configuration**: Missing or incorrect environment variables
   - `SUPABASE_SERVICE_ROLE_KEY` not set in production
   - Cookie configuration in Supabase project settings
   - Next.js middleware not properly configured for auth

4. **Async Operation Timing**: The analysis is triggered from a client component, which may have timing issues
   - Session may not be fully established when component mounts
   - Multiple concurrent requests may cause race conditions

## Correctness Properties

Property 1: Bug Condition - Session Authentication for Analysis

_For any_ POST request to `/api/analyze` where the user is authenticated and has a valid session, the fixed endpoint SHALL successfully retrieve the user's session (either via cookies or service role key), validate that the analysisId belongs to the user, and return a success response with status 200.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Upload Endpoint Authentication

_For any_ POST request to `/api/upload` where the user is authenticated, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing file upload, session validation, and database record creation functionality.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix will implement a dual-authentication strategy:

**File**: `src/app/api/analyze/route.ts`

**Function**: `POST`

**Specific Changes**:

1. **Add Service Role Key Authentication**:
   - Create a new Supabase client using `SUPABASE_SERVICE_ROLE_KEY` for backend operations
   - Use this client to query and update analyses table with elevated permissions
   - Extract user ID from the analysisId ownership check

2. **Implement JWT Token Fallback**:
   - Extract JWT token from `Authorization: Bearer <token>` header
   - Validate JWT token using Supabase
   - Use JWT user ID if service role key is unavailable

3. **Improve Session Validation**:
   - Keep existing session-based approach as primary method
   - Add explicit error handling for session retrieval failures
   - Log authentication method used for debugging

4. **Add Ownership Verification**:
   - Ensure analysisId belongs to the authenticated user
   - Use service role key to bypass RLS for verification
   - Return 404 if analysis doesn't belong to user

5. **Update Error Messages**:
   - Provide clearer error messages for different failure scenarios
   - Include hints for common issues (missing env vars, RLS policies)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the 401 error on unfixed code. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate authenticated POST requests to `/api/analyze` with valid analysisId. Run these tests on the UNFIXED code to observe 401 failures and understand the root cause.

**Test Cases**:
1. **Session Cookie Test**: Simulate POST to `/api/analyze` with valid session cookie (will fail with 401 on unfixed code)
2. **Service Role Key Test**: Simulate POST with `SUPABASE_SERVICE_ROLE_KEY` in env (will fail on unfixed code)
3. **JWT Token Test**: Simulate POST with JWT in Authorization header (will fail on unfixed code)
4. **Cross-Origin Test**: Simulate request from different origin with `credentials: 'include'` (may fail on unfixed code)

**Expected Counterexamples**:
- `getSession()` returns null despite valid session cookie
- 401 error returned even when user is authenticated
- Possible causes: cookie not transmitted, session validation failure, environment variable missing

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := POST /api/analyze (fixed)
  ASSERT result.status = 200
  ASSERT result.body.success = true
  ASSERT analysis.status = 'processing' OR 'completed'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT POST /api/upload (original) = POST /api/upload (fixed)
  ASSERT POST /api/analyze (original) = POST /api/analyze (fixed) for non-auth cases
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for unauthorized requests and other endpoints, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Unauthorized Request Preservation**: Verify that requests without authentication continue to return 401
2. **Invalid AnalysisId Preservation**: Verify that requests with non-existent analysisId continue to return 404
3. **Upload Endpoint Preservation**: Verify that `/api/upload` continues to work exactly as before
4. **RLS Policy Preservation**: Verify that users cannot access other users' analyses

### Unit Tests

- Test session retrieval with valid cookies
- Test service role key authentication
- Test JWT token validation
- Test ownership verification (analysisId belongs to user)
- Test error cases (missing analysisId, invalid analysisId, unauthorized user)
- Test that analysis status transitions correctly

### Property-Based Tests

- Generate random authenticated users and verify they can start analysis for their own records
- Generate random analysisIds and verify users can only access their own
- Generate random request headers and verify proper authentication method selection
- Test that all non-buggy inputs (unauthorized, invalid IDs) continue to fail appropriately

### Integration Tests

- Test full flow: login → upload → navigate to result page → start analysis
- Test that analysis completes successfully after fix
- Test that email is sent after analysis completion
- Test that status polling works correctly during analysis
- Test that switching between contexts (upload, result, dashboard) preserves authentication
