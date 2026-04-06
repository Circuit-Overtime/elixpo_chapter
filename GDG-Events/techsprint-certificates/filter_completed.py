import csv

with open("<path-to-input-csv>", "r", newline="", encoding="utf-8") as infile:
    reader = csv.reader(infile)
    header = next(reader)
    rows = list(reader)

completed = [row for row in rows if row[-1].strip() == "COMPLETED"]

with open("<path-to-output-csv>", "w", newline="", encoding="utf-8") as outfile:
    writer = csv.writer(outfile)
    writer.writerow(header)
    writer.writerows(completed)

print(f"Wrote {len(completed)} completed entries to completed_techsprint.csv")
