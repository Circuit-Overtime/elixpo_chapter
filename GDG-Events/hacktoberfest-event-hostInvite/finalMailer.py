from hostEmailBody import prepareBody 
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
SMTP_USER = os.getenv("MAIL_USER")  
SMTP_PASSWORD = os.getenv("MAIL_PASS")  
FROM_EMAIL = SMTP_USER
SUBJECT = "🎉 [GDG JISU] Invitation as a host for Hacktoberfest x GDG Study Jams Session 13th October 💖"
to_email = "ayushbhatt633@gmail.com"
name = "Abiroy Karmakar"
print(f"Preparing email for {name} <{to_email}>")
content = prepareBody(name)
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
        
