import os
import json
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv


load_dotenv()

# Paths
CERTIFICATES_DIR = "CERTIFICATES"
PARTICIPANTS_JSON = "participants.json"


with open(PARTICIPANTS_JSON, "r", encoding="utf-8") as f:
    participants = json.load(f)


name_to_email = {p["Full Name"].strip().lower(): p["Email"] for p in participants}

# Email configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("GMAIL_USER")  
SMTP_PASSWORD = os.getenv("GMAIL_PASSWORD")  
FROM_EMAIL = SMTP_USER

SUBJECT = "🎉 Your Certificate & Thank You for Joining Codesprint 2.0 at JIS University!"


def build_html_body(name: str) -> str:
    return f"""
    <html>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f9f7fb; padding: 30px;">
        <table width="100%" style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 16px; 
              padding: 25px; box-shadow: 0 6px 18px rgba(65,3,81,0.2); border: 1px solid #e6dff0;">
          
          <tr>
            <td align="center" style="padding: 25px; background: linear-gradient(90deg, #410351, #CB9DD7); border-radius: 14px 14px 0 0;">
              <h1 style="color: #ffffff; margin-bottom: 10px;">🚀 Codesprint 2.0</h1>
              <h2 style="color: #f4e9f8; margin-top: 0; font-weight: 400;">JIS University • 15th & 16th August 2025</h2>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 25px; font-size: 16px; line-height: 1.8; color: #333;">
              Dear <b>{name}</b>,<br><br>
              Thank you for being an incredible part of <b>Codesprint 2.0</b>!  
              Your enthusiasm, dedication, and innovative spirit helped make this 2-day journey at  
              <b>JIS University</b> truly unforgettable.<br><br>
              
              🌟 We’re delighted to share your official <b>Certificate of Participation</b>, attached with this email.  
              It’s a small token of appreciation for the energy and brilliance you brought to the hackathon.<br><br>
              
              Keep building, keep innovating, and remember — this is just the beginning of many more amazing milestones ahead. 🚀
            </td>
          </tr>
          
          <tr>
            <td style="padding: 25px; text-align: center;">
              <a href="https://gdg.community.dev/gdg-on-campus-jis-university-kolkata-india/" 
                 style="background: linear-gradient(90deg, #410351, #CB9DD7); color: white; 
                 text-decoration: none; padding: 14px 28px; border-radius: 10px; 
                 font-size: 16px; font-weight: bold; display: inline-block;">
                 Explore GDG - JIS University
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="font-size: 15px; color: #555; padding: 30px; text-align: center;">
              With gratitude,<br><br>
              <b>Ayushman Bhattacharya</b><br>
              Organizer, Codesprint 2.0
            </td>
          </tr>

          <tr>
            <td style="font-size: 14px; color: #777; padding: 20px; text-align: center; font-style: italic; border-top: 1px solid #e6dff0;">
              “Hackathons aren’t just about coding overnight — they’re about dreaming in fast-forward.” ✨
            </td>
          </tr>

        </table>
      </body>
    </html>
    """


def send_mail(to_email: str, name: str, attachment_path: str):
    if has_already_sent(name, to_email):
        print(f"⏭️ Already sent to {name} <{to_email}>, skipping.")
        return
    msg = EmailMessage()
    msg["Subject"] = SUBJECT
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email

    # Fallback plain-text
    plain_text = f"""
    Dear {name},

    Thank you for joining Codesprint 2.0 at JIS University!
    Please find your Certificate of Participation attached.

    With gratitude,
    Ayushman Bhattacharya
    Organizer, Codesprint 2.0
    """
    msg.set_content(plain_text)
    msg.add_alternative(build_html_body(name), subtype="html")

    # Attach the certificate
    with open(attachment_path, "rb") as f:
        file_data = f.read()
        file_name = os.path.basename(attachment_path)
    msg.add_attachment(file_data, maintype="image", subtype="jpeg", filename=file_name)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

    print(f"✅ Sent to {name} <{to_email}>")
    log_file = "sent_log.txt"
    if not os.path.exists(log_file):
        with open(log_file, "w", encoding="utf-8") as lf:
            lf.write("Name,Email\n")
    with open(log_file, "a", encoding="utf-8") as lf:
        lf.write(f"{name},{to_email}\n")


def has_already_sent(name: str, to_email: str, log_file: str = "sent_log.txt") -> bool:
    if not os.path.exists(log_file):
        return False
    with open(log_file, "r", encoding="utf-8") as lf:
        for line in lf:
            if line.strip().lower() == f"{name.lower()},{to_email.lower()}":
                return True
    return False


def main():
    for filename in os.listdir(CERTIFICATES_DIR):
        if not filename.endswith("_certificate.jpg"):
            continue

        name = filename.rsplit("_certificate.jpg", 1)[0].strip()
        name_key = name.lower()
        email = name_to_email.get(name_key)
        if not email:
            print(f"⚠️ Email not found for: {name}")
            continue
        cert_path = os.path.join(CERTIFICATES_DIR, filename)
        print(f"📩 Prepared to send {filename} to {email}") 
        send_mail(email, name, cert_path)
        


if __name__ == "__main__":
    main()
