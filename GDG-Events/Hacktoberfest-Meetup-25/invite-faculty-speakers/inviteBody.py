def prepareBody(name):
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
            <img src="https://github.com/user-attachments/assets/cb88d801-1378-4100-a984-11752ad84658" 
                 alt="GDG JIS University Banner" class="banner" />
            <div class="content">
                <h2><span>You have been invited</span> as a Speaker for Hacktoberfest Meetup 🎤</h2>

                <p>Dear <b>{name}</b>,</p>
                <p>
                    We are thrilled to invite you to be a <b>speaker</b> for our upcoming 
                    <b>Hacktoberfest Meetup</b> on <b>27th October 2025</b>. 
                    Your expertise and knowledge make you an ideal candidate 
                    to inspire our computer science students.
                </p>
                
                <p>
                    You will be given <b>5 minutes</b> to speak about <b>GDG Club</b> and 
                    <b>Computer Science as a whole</b> to all four years of computer science students. 
                    Your presence is <b>highly solicited</b> for this special occasion.
                </p>

                <div class="highlight">
                    <p style="margin: 0; font-weight: 600;">
                        📅 <b>Date & Time:</b> 27th October 2025, 10:00 AM onwards<br>
                        📍 <b>Location:</b> JIS University, Room 1109<br>
                        🎯 <b>Role:</b> Speaker (Short Speech for 5 minutes)<br>
                        👥 <b>Audience:</b> Computer Science Students<br>
                        🎪 <b>Hosted by:</b> Abhisekh Kushwaha & Github partnered with GDG JISU
                    </p>
                </div>

                <p style="font-weight: 700; font-size: 16px;">
                    Together, we look forward towards,
                    <span class="google-colors">
                        <span>Innovation</span>, 
                        <span>Collaboration</span>, 
                        <span>Learning</span>, and 
                        <span>Impact</span>
                    </span> ⭐
                </p>

                <div style="text-align:center; margin: 25px 0;">
                    <a href="https://luma.com/3zjevylm" 
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
                        Visit our event page
                    </a>
                    <p style="margin-top:12px; font-size:14px; color:#555;">
                        Explore our official event page and GDG chapter.
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
                    🌟 Once again, thank you <b>{name}</b> 
                    for being with GDG JIS University. 
                    We're excited to have you share your insights with our students!
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
