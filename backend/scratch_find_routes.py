import re

with open("d:\\archive\\backend\\routes\\admin.py", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

matches = re.findall(r"@router\..*", content)
print("Found routes:")
for m in matches[:30]:
    print(m)
