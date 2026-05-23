import re

with open("d:\\archive\\backend\\deps.py", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Let's find def require_permission and capture until the end of function
match = re.search(r"def require_permission\(.*?\):.*?(?=\n\n|\ndef |\nclass )", content, re.DOTALL)
if match:
    print(match.group(0))
else:
    # Just search for the line
    lines = content.split('\n')
    for idx, l in enumerate(lines):
        if "require_permission" in l:
            print(f"Line {idx+1}: {l}")
            # Print next 30 lines
            for i in range(1, 35):
                print(f"Line {idx+1+i}: {lines[idx+i]}")
            break
