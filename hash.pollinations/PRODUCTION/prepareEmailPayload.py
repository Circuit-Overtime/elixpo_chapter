def build_html_body(token_leaks, commit_hash, diff_info):
    leaks_html = ""
    for leak in token_leaks:
        leaks_html += f"""
        <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px;"><a href="{leak.get('repo_url', '')}" style="color:#2563eb;text-decoration:underline;">{leak.get('repo_url', '')}</a></td>
            <td style="padding:8px;"><a href="{leak.get('file_path', '')}" style="color:#2563eb;text-decoration:underline;">{leak.get('file_path', '')}</a></td>
            <td style="padding:8px;">{leak.get('line_number', '')}</td>
            <td style="padding:8px;">{str(leak.get('token', ''))[:8]}...</td>
        </tr>
        """

    html = f"""
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="background:#f9fafb;font-family:sans-serif;">
        <div style="max-width:600px;margin:32px auto;padding:24px;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0001;">
            <h1 style="font-size:24px;font-weight:bold;color:#db2777;margin-bottom:8px;">🐙 Polli Leaks - Token Exposure Alert</h1>
            <p style="margin-bottom:16px;color:#374151;">We have detected the following Pollinations token leaks in your repository:</p>
            <table style="width:100%;background:#fff;border:1px solid #e5e7eb;margin-bottom:24px;">
                <thead>
                    <tr>
                        <th style="padding:8px;background:#f3f4f6;">Repository</th>
                        <th style="padding:8px;background:#f3f4f6;">File</th>
                        <th style="padding:8px;background:#f3f4f6;">Line</th>
                        <th style="padding:8px;background:#f3f4f6;">Token</th>
                    </tr>
                </thead>
                <tbody>
                    {leaks_html}
                </tbody>
            </table>
            <div style="margin-bottom:16px;">
                <span style="font-weight:600;color:#1f2937;">Commit Hash:</span>
                <span style="font-family:monospace;background:#f3f4f6;padding:2px 8px;border-radius:4px;">{commit_hash}</span>
            </div>
            <div style="margin-bottom:16px;">
                <span style="font-weight:600;color:#1f2937;">Diff Info:</span>
                <pre style="background:#f3f4f6;padding:8px;border-radius:4px;font-size:12px;overflow-x:auto;">{diff_info}</pre>
            </div>
            <p style="color:#6b7280;font-size:14px;margin-top:24px;">If you have questions, please contact the Polli Leaks team.</p>
        </div>
    </body>
    </html>
    """
    return html

if __name__ == "__main__":
    body = build_html_body(
        token_leaks=[{"repo_url": "https://github.com/example/repo", "file_path": "src/main.py", "line_number": 42, "token": "Poll_XXXX..."}],
        commit_hash="abc123def456",
        diff_info="--- a/src/main.py\n+++ b/src/main.py\n@@ ...\n+Poll_XXXX..."
    )
    print(body)