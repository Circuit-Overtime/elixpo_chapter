def prepareOnboardingBody(name, role):
    html = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Arial', sans-serif;
                background-color: #f4f7fa;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 700px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 12px;
                padding: 0;
                box-shadow: 0 6px 20px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .banner {{
                width: 100%;
                height: auto;
            }}
            .content {{
                padding: 30px;
            }}
            h2 {{
                font-size: 24px;
                margin-bottom: 20px;
                color: #202124;
            }}
            h2 span {{
                color: #4285F4;
            }}
            p {{
                color: #333333;
                line-height: 1.6;
                font-size: 15px;
            }}
            .highlight {{
                background: #f1f3f4;
                padding: 12px 18px;
                border-left: 5px solid #34A853;
                border-radius: 6px;
                margin: 20px 0;
                font-size: 14px;
            }}
            .discord-btn {{
                display: inline-block;
                background: #5865F2;
                color: #ffffff !important;
                text-decoration: none;
                font-weight: bold;
                padding: 12px 25px;
                border-radius: 8px;
                margin: 20px auto;
                font-size: 15px;
                transition: 0.3s ease;
            }}
            .discord-btn:hover {{
                background: #4752c4;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 13px;
                color: #666666;
                border-top: 1px solid #ddd;
                padding: 15px 30px;
                background: #fafafa;
            }}
            .google-colors span:nth-child(1) {{ color: #4285F4; }}
            .google-colors span:nth-child(2) {{ color: #EA4335; }}
            .google-colors span:nth-child(3) {{ color: #FBBC05; }}
            .google-colors span:nth-child(4) {{ color: #34A853; }}
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://github.com/user-attachments/assets/cb88d801-1378-4100-a984-11752ad84658" alt="GDG JIS University Banner" class="banner" />
            <div class="content">
                <h2>Welcome to the <span>GDG JIS University 2025–26</span> Core Team 🎉</h2>
                <p>Dear {name},</p>
                <p>
                    Congratulations! We are thrilled to inform you that you have been <b style="color: red;">Officially Selected</b> as a core member with the role of 
                    <b style="color: #5865F2;">{role}</b>, for the GDG JIS University tenure of <b>2025–26</b>. 🚀
                </p>
                <div class="highlight">
                    This marks the beginning of your journey with an amazing community of innovators, developers, and creators. 
                    Together, we’ll build, learn, and inspire using the power of technology.
                </div>
                <p>
                    To stay connected with your fellow GDG members, collaborate on projects, and receive important updates, 
                    please join our official <b>Discord Community</b> using the button below:
                </p>

                <p style="font-weight: 700; font-size: 16px;">
                    Get ready for a year full of 
                    <span class="google-colors">
                        <span style="color: #4285F4;">Innovation</span>, 
                        <span style="color: #34A853;">Collaboration</span>, 
                        <span style="color: #FBBC05;">Learning</span>, and 
                        <span style="color: #EA4335;">Fun</span>
                    </span> 🎨
                </p>


               <div style="text-align:center; margin: 25px 0;">
                <a href="https://discord.gg/7kzBmPZktU" 
                style="display:inline-block; 
                        background: linear-gradient(135deg, #5865F2, #4752C4); 
                        color:#ffffff; 
                        text-decoration:none; 
                        font-weight:bold; 
                        padding:14px 28px; 
                        border-radius:10px; 
                        font-size:16px; 
                        box-shadow:0 4px 10px rgba(0,0,0,0.15); 
                        transition: all 0.3s ease;">
                🚀 Join Our Discord
                </a>
                <p style="margin-top:12px; font-size:14px; color:#555;">
                    You will be assigned the <b style="color:#5865F2;">Core-Team</b> role upon joining.
                </p>
                </div>

                <div style="text-align:center; margin: 25px 0;">
                <a href="https://gdg.community.dev/gdg-on-campus-jis-university-kolkata-india/" 
                style="display:inline-block; 
                        background: linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335); 
                        color:#ffffff; 
                        text-decoration:none; 
                        font-weight:bold; 
                        padding:14px 28px; 
                        border-radius:10px; 
                        font-size:16px; 
                        box-shadow:0 4px 10px rgba(0,0,0,0.15); 
                        transition: all 0.3s ease;">
                    Join Our GDG Chapter
                </a>
                <p style="margin-top:12px; font-size:14px; color:#555;">
                    Become an official member of <b style="color:#4285F4;">GDG On Campus JIS University</b>.
                </p>
            </div>

                
                <p style="margin: 20px 0; 
                    font-size: 16px; 
                    font-weight: 500; 
                    color: #202124; 
                    background: #f1f3f4; 
                    border-left: 5px solid #4285F4; 
                    padding: 14px 18px; 
                    border-radius: 6px; 
                    line-height: 1.6;">
                🎉 We’re excited to have you on board and can’t wait to see the impact you’ll create with the 
                <b style="color:#34A853;">Welcome getting the role of -- {role}</b> this year.
            </p>

                <div class="footer">
                    <p>Best Regards,</p>
                    <p><b>Ayushman Bhattacharya</b><br>
                    GDG JIS University Campus Organiser</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html
