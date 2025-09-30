import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
load_dotenv()

# SMTP config
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("GMAIL_USER")  
SMTP_PASSWORD = os.getenv("GMAIL_PASSWORD") 
FROM_EMAIL = SMTP_USER
TO_EMAIL = "ayushbhatt633@gmail.com"

SUBJECT = "🎉 Your Certificate & Thank You for Joining Codesprint 2.0 at JIS University!"

def build_html_body(name):
    return f"""
    <html>
  <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f9f7fb; padding: 30px;">
    <table width="100%" style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 16px; 
          padding: 25px; box-shadow: 0 6px 18px rgba(65,3,81,0.2); border: 1px solid #e6dff0;">
      
      <!-- Header -->
      <tr>
        <td align="center" style="padding: 25px; background: linear-gradient(90deg, #410351, #CB9DD7); border-radius: 14px 14px 0 0;">
          <h1 style="color: #ffffff; margin-bottom: 10px;"> Codesprint 2.0</h1>
          <h2 style="color: #f4e9f8; margin-top: 0; font-weight: 400;">JIS University • 15th & 16th August 2025</h2>
        </td>
      </tr>
      
      <!-- Body -->
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
      
      <!-- Button -->
      <tr>
        <td style="padding: 25px; text-align: center;">
          <a href="https://gdg.community.dev/gdg-on-campus-jis-university-kolkata-india/" 
             style="background: linear-gradient(90deg, #410351, #CB9DD7); color: white; 
             text-decoration: none; padding: 14px 28px; border-radius: 10px; 
             font-size: 16px; font-weight: bold; display: inline-block;">
             Explore GDG @ JIS University
          </a>
        </td>
      </tr>
      
      <!-- Signature -->
      <tr>
        <td style="font-size: 15px; color: #555; padding: 30px; text-align: center;">
          With gratitude,<br><br>
          <b>Ayushman Bhattacharya</b><br>
          Organizer, Codesprint 2.0
        </td>
      </tr>

      <!-- Quote -->
      <tr>
        <td style="font-size: 14px; color: #777; padding: 20px; text-align: center; font-style: italic; border-top: 1px solid #e6dff0;">
          “Hackathons aren’t just about coding overnight — they’re about dreaming in fast-forward.” ✨
        </td>
      </tr>

    </table>
  </body>
</html>
    """

def send_personalized_email(name, email, cert_path):
    msg = EmailMessage()
    msg["Subject"] = SUBJECT
    msg["From"] = FROM_EMAIL
    msg["To"] = email
    msg.set_content(f"Dear {name},\n\nThank you for joining Codesprint 2.0! Please find your certificate attached.")
    msg.add_alternative(build_html_body(name), subtype="html")

    # Attach certificate
    with open(cert_path, "rb") as f:
        file_data = f.read()
        file_name = os.path.basename(cert_path)
    msg.add_attachment(file_data, maintype="image", subtype="jpeg", filename=file_name)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

    print(f"✅ Email with certificate sent to {name} <{email}>")

if __name__ == "__main__":
    participant_name = "Ayushman Bhattacharya"
    cert_path = os.path.join("CERTIFICATES", f"{participant_name}_certificate.jpg")
    send_personalized_email(participant_name, TO_EMAIL, cert_path)
