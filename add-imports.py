import os
import re

IMPORT_LINE = "import { TableActionHeaderComponent } from '@shared/table-action-header/table-action-header.component';\n"

FILES = [
    r'src\app\pages\documentos\components\documentos-table.component.ts',
    r'src\app\pages\cuentas-cabecera\cuentas-cabecera.component.ts',
    r'src\app\pages\cuentas-cabecera\components\cuentas-table\cuentas-table.component.ts',
    r'src\app\pages\cuentas-lista\cuentas-lista.component.ts',
    r'src\app\pages\offline\cuentas\offline-cuentas.component.ts',
    r'src\app\pages\offline\dimensiones\offline-dimensiones.component.ts',
    r'src\app\pages\offline\entidades\offline-entidades.component.ts',
    r'src\app\pages\offline\normas\offline-normas.component.ts',
    r'src\app\pages\rend-cmp\rend-cmp.component.ts',
    r'src\app\pages\rend-d\rend-d.component.ts',
    r'src\app\pages\rend-m\rend-m.component.ts',
    r'src\app\pages\rend-m\components\rendicion-table\rendicion-table.component.ts',
    r'src\app\pages\tipo-doc-sap\tipo-doc-sap.component.ts',
]

BASE = r'd:\ProyectosPython\rendiciones_web\rendiciones-frontend'

def process(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if 'TableActionHeaderComponent' in content:
        return False
    # Add import
    lines = content.splitlines(keepends=True)
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, IMPORT_LINE)
    else:
        lines.insert(0, IMPORT_LINE)
    content = ''.join(lines)
    # Add to imports array
    pattern = re.compile(r'(imports\s*:\s*\[)([^\]]*?)(\])', re.DOTALL)
    def repl(m):
        before = m.group(2)
        if before.strip() == '':
            return m.group(1) + 'TableActionHeaderComponent' + m.group(3)
        return m.group(1) + 'TableActionHeaderComponent, ' + before + m.group(3)
    content = pattern.sub(repl, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

count = 0
for rel in FILES:
    path = os.path.join(BASE, rel)
    if os.path.exists(path):
        if process(path):
            print('Fixed', rel)
            count += 1
        else:
            print('Skipped', rel)
    else:
        print('NOT FOUND', rel)
print(f'Done. Fixed {count} files.')
