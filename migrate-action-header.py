import os
import re

SVG_CIRCLE = '<circle cx="12" cy="12" r="3"/>'
SVG_PATH_START = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82'
SVG_PATTERN = re.compile(
    r'<svg[^>]*viewBox="0 0 24 24"[^>]*>.*?'
    + re.escape(SVG_CIRCLE) + r'.*?'
    + re.escape(SVG_PATH_START) + r'.*?'
    + r'</svg>',
    re.DOTALL
)

REPLACEMENT = '<app-table-action-header />'

IMPORT_LINE = "import { TableActionHeaderComponent } from '@shared/table-action-header/table-action-header.component';\n"

BASE_DIR = r'd:\ProyectosPython\rendiciones_web\rendiciones-frontend\src\app'

def add_import_to_ts(content):
    if IMPORT_LINE.strip() in content:
        return content
    # Insert after the last import line before @Component
    lines = content.splitlines(keepends=True)
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, IMPORT_LINE)
        content = ''.join(lines)
    else:
        content = IMPORT_LINE + content
    return content

def add_to_imports_array(content):
    # Match imports: [ ... ]
    pattern = re.compile(r'(imports\s*:\s*\[)([^\]]*?)(\])', re.DOTALL)
    if 'TableActionHeaderComponent' in content:
        return content
    def repl(m):
        before = m.group(2)
        if before.strip() == '':
            return m.group(1) + 'TableActionHeaderComponent' + m.group(3)
        # add after opening bracket
        return m.group(1) + 'TableActionHeaderComponent, ' + before + m.group(3)
    return pattern.sub(repl, content)

def read_file(path):
    for enc in ('utf-8', 'utf-8-sig', 'latin-1'):
        try:
            with open(path, 'r', encoding=enc) as f:
                return f.read(), enc
        except UnicodeDecodeError:
            continue
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read(), 'utf-8'

def process_file(path):
    original, enc = read_file(path)
    if SVG_CIRCLE not in original:
        return False
    new_content = SVG_PATTERN.sub(REPLACEMENT, original)
    if new_content == original:
        return False
    if path.endswith('.ts') and '@Component' in new_content:
        new_content = add_import_to_ts(new_content)
        new_content = add_to_imports_array(new_content)
    with open(path, 'w', encoding=enc) as f:
        f.write(new_content)
    return True

count = 0
for root, dirs, files in os.walk(BASE_DIR):
    # skip node_modules just in case
    if 'node_modules' in root:
        continue
    for fname in files:
        if fname.endswith(('.html', '.ts')):
            fpath = os.path.join(root, fname)
            if process_file(fpath):
                print('Migrated', fpath)
                count += 1

print(f'Done. Migrated {count} files.')
