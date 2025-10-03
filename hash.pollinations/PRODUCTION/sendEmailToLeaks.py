import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from prepareEmailPayload import build_html_body
from dotenv import load_dotenv
import os
import asyncio 
from typing import Optional

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sendEmailToLeaks")

# Email credentials
sender_email = os.getenv("EMAIL_USER")
password = os.getenv("EMAIL_PASS")

if not sender_email or not password:
    raise ValueError("EMAIL_USER and EMAIL_PASS must be set in the .env file")

def send_email(receiver_email, repo_url, file_path, line_number, token, commit_hash, diff_info : Optional[str] = None):
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = "Polli Leaks - Token Exposure Alert"

    body = build_html_body(
        token_leaks=[{"repo_url": repo_url, "file_path": file_path, "line_number": line_number, "token": token}],
        commit_hash=commit_hash,
        diff_info=diff_info
    )
    msg.attach(MIMEText(body, "html", "utf-8"))
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, receiver_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent to {receiver_email}")
        return {"status": "success", "email": receiver_email}
    except Exception as e:
        logger.error(f"Failed to send email to {receiver_email}: {e}")
        return {"status": "error", "email": receiver_email, "message": str(e)}

if __name__ == "__main__":
    if __name__ == "__main__":
        send_email(
            "ayushbhatt633@gmail.com",
            "Circuit-Overtime/elixpo_chapter",
            "code-conduct.md",
            "125",
            "polli_548414848484",
            "#664fefe1de5fe",
            "++ 84551 --12"
        )