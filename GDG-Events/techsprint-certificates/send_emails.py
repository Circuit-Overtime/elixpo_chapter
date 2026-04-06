import csv
import smtplib
import os
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email import encoders

SENDER_EMAIL = "<provider-email>"
APP_PASSWORD = "<app-password>"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

TEST_MODE = False
TEST_EMAIL = "<test-email>"

SKIP_ALREADY_SENT = 89

WINNER_TEAM = "The LowEnd Corp."
FIRST_RUNNER_TEAM = "The Build Guild"
SECOND_RUNNER_TEAM = "Tech-o-Diva"
TOP_3 = [WINNER_TEAM, FIRST_RUNNER_TEAM, SECOND_RUNNER_TEAM]

BANNER_PATH = "email_banner.png"
FEEDBACK_PDF = "<path-to-feedback-pdf>"
CERT_DIR = "participation_certificates"
WINNER_CERT_DIR = "<winners-certificates-folder>"
FIRST_RUNNER_CERT_DIR = "<1st-runners-certificates-folder>"
SECOND_RUNNER_CERT_DIR = "<2nd-runners-certificates-folder>"
CSV_FILE = "<path-to-csv-file>"


def get_email_html(category, member_name, team_name):
    titles = {
        "winner": ("Champions of TechSprint 2026!", "1st Place Winners"),
        "1st_runner": ("1st Runners-Up - TechSprint 2026!", "1st Runners-Up"),
        "2nd_runner": ("2nd Runners-Up - TechSprint 2026!", "2nd Runners-Up"),
        "participant": ("TechSprint 2026 - Certificate of Participation", "Participant"),
    }
    subject_line, badge = titles[category]

    congrats = {
        "winner": f"""
            <p style="font-size:16px; color:#333;">
                We are thrilled to announce that <strong>Team {team_name}</strong> has been crowned the
                <span style="color:#EA4335; font-weight:bold;">Winner</span> of
                <strong>TechSprint Hackathon 2026</strong>, powered by Google Developer Groups on Campus, JIS University!
            </p>
            <p style="font-size:16px; color:#333;">
                Your innovation, technical excellence, and teamwork stood out among all the competing teams.
                This is a phenomenal achievement - congratulations to every member of your team!
            </p>
        """,
        "1st_runner": f"""
            <p style="font-size:16px; color:#333;">
                We are delighted to announce that <strong>Team {team_name}</strong> has secured the position of
                <span style="color:#4285F4; font-weight:bold;">1st Runners-Up</span> at
                <strong>TechSprint Hackathon 2026</strong>, powered by Google Developer Groups on Campus, JIS University!
            </p>
            <p style="font-size:16px; color:#333;">
                Your creativity, problem-solving skills, and dedication were truly impressive.
                You were neck-and-neck with the best - be proud of what you've accomplished!
            </p>
        """,
        "2nd_runner": f"""
            <p style="font-size:16px; color:#333;">
                We are excited to announce that <strong>Team {team_name}</strong> has earned the position of
                <span style="color:#34A853; font-weight:bold;">2nd Runners-Up</span> at
                <strong>TechSprint Hackathon 2026</strong>, powered by Google Developer Groups on Campus, JIS University!
            </p>
            <p style="font-size:16px; color:#333;">
                Your hard work and ingenuity throughout the hackathon left a lasting impression on the judges.
                This is a fantastic result - well done!
            </p>
        """,
        "participant": f"""
            <p style="font-size:16px; color:#333;">
                Thank you for being a part of <strong>TechSprint Hackathon 2026</strong>,
                powered by Google Developer Groups on Campus, JIS University!
            </p>
            <p style="font-size:16px; color:#333;">
                Your participation as a member of <strong>Team {team_name}</strong> made this event truly special.
                Every line of code you wrote, every idea you pitched, and every challenge you tackled contributed to
                making TechSprint an incredible experience.
            </p>
        """,
    }

    swag_section = ""
    if category in ("winner", "1st_runner", "2nd_runner"):
        swag_section = """
            <div style="background:#FEF7E0; border-left:4px solid #FBBC04; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0;">
                <p style="margin:0; font-size:15px; color:#333;">
                    <strong>Swag Distribution:</strong> Swags and goodies for the Top 3 teams will be distributed
                    between <strong>10th - 15th April 2026</strong> at the campus of
                    <strong>JIS University, Kolkata</strong>. We'll share the exact date and time soon - stay tuned!
                </p>
            </div>
        """

    feedback_note = """
        <p style="font-size:15px; color:#555;">
            We've also attached the <strong>TechSprint Top 5 Teams Feedback</strong> document -
            check it out to see detailed judge feedback and insights from the top-performing teams.
        </p>
    """

    cert_note = """
        <p style="font-size:15px; color:#555;">
            Your <strong>certificate</strong> is attached to this email. Feel free to share it on LinkedIn
            and tag <strong>GDG on Campus - JIS University</strong>!
        </p>
    """

    html = f"""
    <html>
    <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: 'Google Sans', Arial, sans-serif;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff;">
            <div style="text-align:center;">
                <img src="cid:banner" alt="TechSprint Wrap-Up" style="width:100%; display:block;" />
            </div>

            <div style="height:4px; display:flex;">
                <div style="flex:1; background:#4285F4;"></div>
                <div style="flex:1; background:#EA4335;"></div>
                <div style="flex:1; background:#FBBC04;"></div>
                <div style="flex:1; background:#34A853;"></div>
            </div>

            <div style="padding:30px 36px;">
                <h1 style="color:#4285F4; font-size:24px; margin-bottom:20px;">
                    Congratulations, {member_name}!
                </h1>

                <p style="font-size:14px; color:#555; margin-top:0; margin-bottom:24px;">
                    <span style="background:#E8F0FE; color:#4285F4; padding:4px 12px; border-radius:12px; font-weight:600;">
                        {badge}
                    </span>
                    &nbsp;&nbsp;-&nbsp;&nbsp; Team <strong style="color:#333;">{team_name}</strong>
                </p>

                {congrats[category]}

                {swag_section}

                {cert_note}

                {feedback_note}

                <hr style="border:none; border-top:1px solid #e0e0e0; margin:28px 0;" />

                <p style="font-size:15px; color:#333; margin-bottom:4px;">
                    Keep building, keep innovating - the world needs what you create.
                </p>
                <p style="font-size:15px; color:#333; margin-top:20px; margin-bottom:2px;">
                    Warm regards,
                </p>
                <p style="font-size:16px; font-weight:bold; color:#EA4335; margin-top:2px; margin-bottom:0;">
                    Ayushman Bhattacharya
                </p>
                <p style="font-size:13px; color:#666; margin-top:2px;">
                    GDG on Campus Organiser 2025-26<br/>
                    Google Developer Groups on Campus - JIS University
                </p>
            </div>

            <div style="height:4px; display:flex;">
                <div style="flex:1; background:#34A853;"></div>
                <div style="flex:1; background:#FBBC04;"></div>
                <div style="flex:1; background:#EA4335;"></div>
                <div style="flex:1; background:#4285F4;"></div>
            </div>

            <div style="text-align:center; padding:16px; background:#f8f9fa;">
                <p style="font-size:12px; color:#999; margin:0;">
                    2026 Google Developer Groups on Campus - JIS University. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return subject_line, html


def extract_members_with_emails(row):
    members = []
    leader_name = row[2].strip()
    leader_email = row[3].strip()
    if leader_name:
        members.append((leader_name, leader_email))
    for name_i, email_i in [(6, 7), (9, 10), (12, 13)]:
        if name_i < len(row) - 1:
            name = row[name_i].strip()
            email = row[email_i].strip() if email_i < len(row) - 1 else ""
            if name and name not in ("COMPLETED", "PENDING") and email:
                members.append((name, email))
    return members


def find_certificate(team_name, member_name, category="participant"):
    if category == "winner":
        cert_dir = WINNER_CERT_DIR
    elif category == "1st_runner":
        cert_dir = FIRST_RUNNER_CERT_DIR
    elif category == "2nd_runner":
        cert_dir = SECOND_RUNNER_CERT_DIR
    else:
        cert_dir = CERT_DIR

    if category in ("winner", "1st_runner", "2nd_runner"):
        display_name = " ".join([w.capitalize() for w in member_name.split()])
        path = os.path.join(cert_dir, f"{display_name}.jpg")
        if os.path.exists(path):
            return path
        for f in os.listdir(cert_dir):
            if member_name.split()[0].capitalize() in f:
                return os.path.join(cert_dir, f)
        return None

    safe_name = member_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
    safe_name = "_".join([n.capitalize() for n in safe_name.split("_")])
    safe_team = team_name.replace(" ", "_").replace("/", "_").replace("\\", "_").replace(",", "").replace('"', "")
    filename = f"{safe_team}_{safe_name}.jpg"
    path = os.path.join(cert_dir, filename)
    if os.path.exists(path):
        return path
    for f in os.listdir(cert_dir):
        if safe_name in f:
            return os.path.join(cert_dir, f)
    return None


def build_email(sender, recipient_email, subject, html_body, cert_path=None):
    msg = MIMEMultipart("related")
    msg["From"] = f"Ayushman Bhattacharya <{sender}>"
    msg["To"] = recipient_email
    msg["Subject"] = subject

    msg_alt = MIMEMultipart("mixed")
    msg.attach(msg_alt)

    msg_alt.attach(MIMEText(html_body, "html"))

    with open(BANNER_PATH, "rb") as img_file:
        banner = MIMEImage(img_file.read())
        banner.add_header("Content-ID", "<banner>")
        banner.add_header("Content-Disposition", "inline", filename="email_banner.png")
        msg.attach(banner)

    if cert_path and os.path.exists(cert_path):
        with open(cert_path, "rb") as f:
            cert_attachment = MIMEBase("application", "octet-stream")
            cert_attachment.set_payload(f.read())
            encoders.encode_base64(cert_attachment)
            cert_attachment.add_header(
                "Content-Disposition", "attachment",
                filename=os.path.basename(cert_path)
            )
            msg_alt.attach(cert_attachment)

    if os.path.exists(FEEDBACK_PDF):
        with open(FEEDBACK_PDF, "rb") as f:
            pdf_attachment = MIMEBase("application", "octet-stream")
            pdf_attachment.set_payload(f.read())
            encoders.encode_base64(pdf_attachment)
            pdf_attachment.add_header(
                "Content-Disposition", "attachment",
                filename="Techsprint Top 5 Teams Feedback.pdf"
            )
            msg_alt.attach(pdf_attachment)

    return msg


def main():
    with open(CSV_FILE, "r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)
        rows = list(reader)

    email_queue = []
    test_categories_sent = set()

    for row in rows:
        team_name = row[0].strip().strip('"')

        if team_name == WINNER_TEAM:
            category = "winner"
        elif team_name == FIRST_RUNNER_TEAM:
            category = "1st_runner"
        elif team_name == SECOND_RUNNER_TEAM:
            category = "2nd_runner"
        else:
            category = "participant"

        if TEST_MODE and category in test_categories_sent:
            continue

        members = extract_members_with_emails(row)

        for name, email in members:
            display_name = " ".join([w.capitalize() for w in name.split()])
            subject, html = get_email_html(category, display_name, team_name)
            cert_path = find_certificate(team_name, name, category)

            target_email = TEST_EMAIL if TEST_MODE else email
            email_queue.append((target_email, subject, html, cert_path, display_name, team_name))

            if TEST_MODE:
                test_categories_sent.add(category)
                break

    if SKIP_ALREADY_SENT > 0:
        skipped = email_queue[:SKIP_ALREADY_SENT]
        email_queue = email_queue[SKIP_ALREADY_SENT:]
        print(f"Skipping {len(skipped)} already-sent emails.")

    print(f"\n{'='*60}")
    print("TechSprint Email Sender")
    print(f"Mode: {'TEST (all to ' + TEST_EMAIL + ')' if TEST_MODE else 'LIVE'}")
    print(f"Total emails to send: {len(email_queue)}")
    print(f"{'='*60}\n")

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, APP_PASSWORD)
        print("Logged in successfully.\n")

        for i, (to_email, subject, html, cert_path, name, team) in enumerate(email_queue, 1):
            msg = build_email(SENDER_EMAIL, to_email, subject, html, cert_path)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
            cert_status = "cert" if cert_path else "no cert"
            print(f"[{i}/{len(email_queue)}] Sent to {to_email} - {name} ({team}) [{cert_status}]")
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"All {len(email_queue)} emails sent successfully!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
