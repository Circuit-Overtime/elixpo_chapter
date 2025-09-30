import json
from PIL import Image, ImageDraw, ImageFont

# Paths
json_path = "participants.json"
cert_path = "participation.jpg"


# Load participants
with open(json_path, "r", encoding="utf-8") as f:
    participants = json.load(f)

    
def generate_certificate(name: str):
    name = participant['Full Name']
    if name == "Piyush Gupta":
        output_path = f"{name}_certificate.jpg"

        image = Image.open(cert_path)
        draw = ImageDraw.Draw(image)
        font_path = "MISTRAL.ttf"  # Change this to a path to a TTF font file
        font_size = 95
        font = ImageFont.truetype(font_path, font_size)

        text_width = font.getlength(name)
        image_width, image_height = image.size
        x = (image_width - text_width) // 2
        y = 430  # Keep y fixed, center x

        # Draw the name
        draw.text((x, y), name, font=font, fill=(91, 4, 108))  

        initials = ''.join([part[0].upper() for part in name.split() if part])
        ref_no = f"Ref. No: 2025-CS-{initials}"
        font_path = "ARIAL.ttf"  # Change this to a path to a TTF font file
        font_size = 20
        font = ImageFont.truetype(font_path, font_size)
        text_width = font.getlength(ref_no)
        x_ref = (image_width - text_width) // 2
        draw.text((x_ref, 950), ref_no, font=font, fill=(0, 0, 0))


        pro_vc_sign = Image.open("pro-vc-sign.png").convert("RGBA").resize((250,250))
        vc_sign = Image.open("vc-sign.png").convert("RGBA").resize((250,250))



        pro_vc_sign_pos = (1250, 650)
        vc_sign_pos = (250, 650)


        image.paste(pro_vc_sign, pro_vc_sign_pos, pro_vc_sign)
        image.paste(vc_sign, vc_sign_pos, vc_sign)

        image.save(f"CERTIFICATES/{output_path}")

        print(f"Certificate generated for {name} at {output_path}")

for participant in participants:
    generate_certificate(participant['Full Name'])

print("All certificates generated.")