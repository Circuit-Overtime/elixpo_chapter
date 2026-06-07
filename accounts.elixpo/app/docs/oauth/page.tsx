"use client";

import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import CodeBlock from "../../components/code-block";

const AUTH_URL_EXAMPLE = `GET https://accounts.elixpo.com/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &state=RANDOM_CSRF_TOKEN
  &scope=openid profile email`;

const TOKEN_EXCHANGE_REQ = `POST https://accounts.elixpo.com/api/auth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "code_abc123",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/callback"
}`;

const TOKEN_EXCHANGE_RES = `{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "eyJ...",
  "scope": "openid profile email"
}`;

const TOKEN_REFRESH_REQ = `POST https://accounts.elixpo.com/api/auth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "eyJ...",
  "client_id": "YOUR_CLIENT_ID"
}`;

export default function OAuthPage() {
    return (
        <Box>
            <Typography
                variant="h1"
                sx={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "#fff",
                    mb: 2,
                    letterSpacing: "-0.02em",
                }}
            >
                OAuth 2.0 Flow
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 4,
                    fontSize: "1rem",
                    lineHeight: 1.7,
                }}
            >
                Elixpo Accounts implements the standard OAuth 2.0 Authorization
                Code Flow. This flow is recommended for web and mobile
                applications that communicate with a backend server where
                secrets can be safely stored.
            </Typography>

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                Step 1: Redirect to Authorization
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                Redirect the user's browser to the authorize endpoint. If the
                user is not authenticated, they will be prompted to log in or
                create an account.
            </Typography>
            <CodeBlock code={AUTH_URL_EXAMPLE} language="http" />

            <Typography
                variant="h3"
                sx={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#9b7bf7",
                    mt: 3,
                    mb: 2,
                }}
            >
                Query Parameters
            </Typography>
            <TableContainer
                sx={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    mb: 4,
                    background: "rgba(255, 255, 255, 0.01)",
                }}
            >
                <Table size="small">
                    <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.02)" }}>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#9ca3af",
                                    fontWeight: 600,
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Parameter
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#9ca3af",
                                    fontWeight: 600,
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Required
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#9ca3af",
                                    fontWeight: 600,
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Description
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>response_type</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#ef4444",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Yes
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Must be set to <code>code</code>.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>client_id</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#ef4444",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Yes
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Your application's Client ID.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>redirect_uri</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#ef4444",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Yes
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Must exactly match one of your registered
                                Redirect URIs.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>state</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#ef4444",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Yes
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                A high-entropy random string to mitigate CSRF
                                attacks.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>scope</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.4)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                No
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Space-separated scopes. Defaults to{" "}
                                <code>openid profile email</code>.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                Step 2: Handle the Callback
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                Once authorized, the user is redirected back to the specified{" "}
                <code>redirect_uri</code> with the following params:
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 1,
                    pl: 2,
                    borderLeft: "2px solid #9b7bf7",
                }}
            >
                <strong>Approved:</strong>{" "}
                <code>
                    https://yourapp.com/callback?code=code_abc123&state=YOUR_STATE
                </code>
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 3,
                    pl: 2,
                    borderLeft: "2px solid #ef4444",
                }}
            >
                <strong>Denied:</strong>{" "}
                <code>
                    https://yourapp.com/callback?error=access_denied&state=YOUR_STATE
                </code>
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 4,
                    lineHeight: 1.6,
                }}
            >
                Always verify the returned <code>state</code> matches the
                original CSRF token sent in Step 1 before proceeding.
            </Typography>

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                Step 3: Exchange Code for Tokens
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                From your secure server backend, execute a POST request to
                exchange the single-use authorization code (expires in 10
                minutes) for access and refresh tokens.
            </Typography>
            <CodeBlock code={TOKEN_EXCHANGE_REQ} language="json" />
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                <strong>Response:</strong>
            </Typography>
            <CodeBlock code={TOKEN_EXCHANGE_RES} language="json" />

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                Step 4: Refresh Tokens
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                Access tokens expire in 15 minutes. Send a refresh token request
                to exchange a refresh token for a new set of tokens. Refresh
                tokens are rotated (one-time use), immediately invalidating the
                old token.
            </Typography>
            <CodeBlock code={TOKEN_REFRESH_REQ} language="json" />
        </Box>
    );
}
