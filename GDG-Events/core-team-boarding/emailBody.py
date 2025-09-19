def prepareBody(name):
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
            ul {{
                margin: 15px 0;
                padding-left: 20px;
            }}
            li {{
                margin-bottom: 8px;
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
            <h2>Hello, {name} 👋</h2>
            <p>
                Thank you for applying to join the <b>Design Team of GDG JIS University!</b> 
                We’re thrilled to see so many creative minds wanting to be part of our community. 
                Your excitement and dedication are highly appreciated.
            </p>

            <p>To help us with the shortlisting process, please share your portfolio, which may include:</p>
            <ul>
                <li>Samples of your design work (posters, UI/UX, branding, illustrations, etc.)</li>
                <li>Links to platforms like Instagram, or Drive folders, or a personal website</li>
                <li>Any projects, achievements, or recognitions you’d like us to consider</li>
            </ul>

            <div class="highlight">
                <b>Deadline:</b> 21st September 2025, 13:00 hrs <br>
                <hr>
                <b>Format:</b> JPG, JPEG, PNG, PDF 
                <br>(If you don’t have a website, make sure everything is properly organised within a Drive link)
            </div>

            <p>
                Portfolios will only be utilised to understand your experience with design work. 
                The final shortlisting will undergo an interview round with the GDG Design Lead.
            </p>
            <p class="highlight">
                Kindly send the requested details in an organised email to: 
                <b>shinjankundu19@gmail.com</b> by the mentioned deadline.
            </p>

            <p>
                We’re really excited to see your work and can’t wait to witness your creativity reaching
                new heights at GDG JIS University! ✨ We will contact you on the further procedures over email so keep
                an eye up please!
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
