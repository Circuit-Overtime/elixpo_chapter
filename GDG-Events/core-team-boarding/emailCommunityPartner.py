from emailBodyDesign import prepareBody as prepareBodyDesign
from emailBodyContent import prepareBody as prepareBodyContent
from emailBodyShortlisted import prepareShortlistBody
from emailBodyFinalInterview import prepareOnboardingBody
from pollinationsInvite import preparePartnershipBody
import os
import json
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv


load_dotenv()
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("GMAIL_USER_CORE")  
SMTP_PASSWORD = os.getenv("GMAIL_PASSWORD_CORE")  
FROM_EMAIL = SMTP_USER
SUBJECT = "🎉 GDG JIS University x Pollinations.ai – Official Partnership Announcement 💖"
name = "Thomash Haferlach"
to_email = "thomashxxxxx"
print(f"Preparing email for {name} <{to_email}>")
content = preparePartnershipBody()
msg = EmailMessage()
msg["Subject"] = SUBJECT
msg['From'] = formataddr(("Ayushman Bhattacharya", "bhattacharyaa599@gmail.com"))
msg["To"] = to_email
msg.set_content(f"{content}", subtype="html")
with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
    server.starttls()
    server.login(SMTP_USER, SMTP_PASSWORD)
    server.send_message(msg)
print(f"✅ Email sent to {name} <{to_email}>")
        
