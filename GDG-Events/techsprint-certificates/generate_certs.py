import csv
import os
from PIL import Image, ImageDraw, ImageFont

TEMPLATE = "<template-file.jpg>"
OUTPUT_DIR = "<path-to-output-directory>"
EXCLUDE_TEAMS = ["Tech-o-Diva", "The LowEnd Corp.", "The Build Guild"]

# Name position - adjust these as needed
NAME_Y = 700  # vertical position of the name
FONT_SIZE = 85

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load font
try:
    font = ImageFont.truetype("<path-to-font-file>", FONT_SIZE)
except:
    font = ImageFont.truetype("<path-to-font-file>", FONT_SIZE)

def extract_members(row):
    names = []
    # Leader name is at index 2
    leader = row[2].strip()
    if leader:
        names.append(leader)
    # Member names are at indices 6, 9, 12 (if they exist)
    for i in [6, 9, 12]:
        if i < len(row) - 1:  # -1 to skip the last col (Project Submission)
            name = row[i].strip()
            if name and name != "COMPLETED" and name != "PENDING":
                names.append(name)
    return names

def generate_certificate(name, team_name):
    img = Image.open(TEMPLATE)
    draw = ImageDraw.Draw(img)

    # Center the name horizontally
    bbox = draw.textbbox((0, 0), name, font=font)
    text_width = bbox[2] - bbox[0]
    x = (img.width - text_width) / 2
    name = str(name)
    name = name.split(" ")
    name = " ".join([n.capitalize() for n in name])
    draw.text((x, NAME_Y), name, font=font, fill=(255, 0, 0))
    safe_name = name.replace(" ", "_").replace("/", "_").replace("\\", "_")
    safe_team = team_name.replace(" ", "_").replace("/", "_").replace("\\", "_").replace(",", "")
    filename = f"{safe_team}_{safe_name}.jpg"
    img.save(os.path.join(OUTPUT_DIR, filename), quality=95)
    return filename

# Read completed CSV
with open("<path-to-completed-csv>", "r", newline="", encoding="utf-8") as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

count = 0
for row in rows:
    team_name = row[0].strip().strip('"')
    if team_name in EXCLUDE_TEAMS:
        continue

    members = extract_members(row)
    name = members[0]
    print(f"Generating certificate for '{name}' from team '{team_name}'...")
    filename = generate_certificate(name, team_name)
    for name in members:
        filename = generate_certificate(name, team_name)
        print(f"  -> {filename}")
        count += 1
    

print(f"\nGenerated {count} certificates in '{OUTPUT_DIR}/'")
