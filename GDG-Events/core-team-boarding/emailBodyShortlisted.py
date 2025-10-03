def prepareShortlistBody(name, role):
    html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, Helvetica, sans-serif;
                background-color: #f4f7fa;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 650px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }}
            h2 {{
                color: #4285F4;
                margin-bottom: 20px;
            }}
            p {{
                color: #333333;
                line-height: 1.6;
                font-size: 15px;
            }}
            .highlight {{
                background: #f1f3f4;
                padding: 10px 15px;
                border-left: 4px solid #4285F4;
                border-radius: 6px;
                margin: 15px 0;
                font-size: 14px;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 13px;
                color: #666666;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Congratulations, {name}! 🎉</h2>
            <p>
                We are excited to inform you that you have been <b>shortlisted for the interview round</b> for the <b>{role} Team of GDG JIS University 2025</b>!
            </p>
            <div class="highlight">
                <b>Interview Date:</b> 24th September 2025<br>
                <b>Time:</b> Will be informed soon via WhatsApp group by 5:00PM.
            </div>
            <p>
                To ensure you receive all further updates and instructions regarding the interview, please join our official WhatsApp group using the link below:
            </p>
            <div class="highlight" style="text-align:center;">
                <a href="https://chat.whatsapp.com/IIWRc6HED5BADLeuuRxjrZ" style="color:#4285F4; font-weight:bold;">Join WhatsApp Group</a>
            </div>
            <p style="color:#d32f2f;">
                <b>Important:</b> Please <u>do not share</u> this group link with anyone else. Sharing the link will lead to <b>direct disqualification</b> from the selection process.
                <br> 
            </p>
            <p>
                All further details regarding the interview (including the exact time and instructions) will be communicated in the WhatsApp group. Please make sure to join as soon as possible and keep notifications on.
            </p>
            <p>
                We look forward to meeting you and learning more about your passion for the {role} Team!
            </p>
            <div class="footer">
                <p>Best Wishes,</p>
                <p><b>Ayushman Bhattacharya</b><br>
                GDG JIS University Campus Organiser</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html