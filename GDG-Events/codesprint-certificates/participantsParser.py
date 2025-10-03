import pandas as pd
import json

excel_file = 'participation-data.xlsx'
df = pd.read_excel(excel_file, usecols=['Full Name', 'Email'])

participants = df.to_dict(orient='records')

with open('participants.json', 'w', encoding='utf-8') as f:
    json.dump(participants, f, ensure_ascii=False, indent=2)