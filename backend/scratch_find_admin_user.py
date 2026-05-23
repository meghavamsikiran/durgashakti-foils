import re

with open("d:\\archive\\backend\\deps.py", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
for idx, l in enumerate(lines):
    if "def get_admin_user" in l:
        print(f"Line {idx+1}: {l}")
        # Print next 35 lines
        for i in range(1, 35):
            print(f"Line {idx+1+i}: {lines[idx+i]}")
        break
