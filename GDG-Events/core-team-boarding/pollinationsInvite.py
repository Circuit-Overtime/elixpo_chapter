def preparePartnershipBody():
    html = """
    <html>
    <head>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                background-color: #f4f7fa;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 700px;
                margin: 30px auto;
                background: #ffffff;
                border-radius: 12px;
                padding: 0;
                box-shadow: 0 6px 20px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .banner {
                width: 100%;
                height: auto;
            }
            .content {
                padding: 30px;
            }
            h2 {
                font-size: 24px;
                margin-bottom: 20px;
                color: #202124;
            }
            h2 span {
                color: #4285F4;
            }
            p {
                color: #333333;
                line-height: 1.6;
                font-size: 15px;
            }
            .highlight {
                background: #f1f3f4;
                padding: 12px 18px;
                border-left: 5px solid #34A853;
                border-radius: 6px;
                margin: 20px 0;
                font-size: 14px;
            }
            .footer {
                margin-top: 30px;
                font-size: 13px;
                color: #666666;
                border-top: 1px solid #ddd;
                padding: 15px 30px;
                background: #fafafa;
            }
            .google-colors span:nth-child(1) { color: #4285F4; }
            .google-colors span:nth-child(2) { color: #EA4335; }
            .google-colors span:nth-child(3) { color: #FBBC05; }
            .google-colors span:nth-child(4) { color: #34A853; }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://github.com/user-attachments/assets/cb88d801-1378-4100-a984-11752ad84658" 
                 alt="GDG JIS University Banner" class="banner" />
            <div class="content">
                <h2>Thank You <span>Pollinations</span> for Partnering with GDG JIS University 🤝</h2>
                
                <p>Dear <b>Thomash Haferlach</b>,</p>
                
                <p>
                    On behalf of <b>Google Developer Groups On Campus – JIS University</b>, 
                    we extend our heartfelt gratitude to <b>Pollinations</b> 
                    for becoming our official <b>Chapter Partner</b> since Sept, 2025.
                </p>

                <div class="highlight">
                    GDG JIS University is a vibrant community of developers, innovators, 
                    and learners driven by the vision of Google Developer Groups. 
                    Our mission is to create opportunities for students and professionals 
                    to <b>build, learn, and share</b> together while solving real-world challenges 
                    with the power of technology.
                </div>

                <p>
                    With Pollinations as our <b>Chapter Partner</b>, 
                    we are excited to collaborate across hackathons, workshops, and events, 
                    where participants will have access to <b>Pollinations Text & Image APIs</b>. 
                    Your support will empower creativity and innovation, 
                    and you will receive <b>full credits and attribution</b> 
                    during all hackathon and event hours.
                </p>

                <p style="font-weight: 700; font-size: 16px;">
                    Together, we look forward towards,
                    <span class="google-colors">
                        <span>Innovation</span>, 
                        <span>Collaboration</span>, 
                        <span>Learning</span>, and 
                        <span>Impact</span>
                    </span> 🐝
                </p>

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
                        View Our GDG Chapter
                    </a>
                    <p style="margin-top:12px; font-size:14px; color:#555;">
                        Explore our official chapter page and upcoming initiatives.
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
                    🌟 Once again, thank you <b>Pollinations</b> and 
                    especially <b>Thomash Haferlach</b>, 
                    for your trust and partnership with GDG JIS University. 
                    We’re excited for the journey ahead!
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
