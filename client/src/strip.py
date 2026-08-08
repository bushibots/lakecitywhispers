import os
import re

page_dir = 'pages'
for filename in os.listdir(page_dir):
    if filename.endswith('.jsx'):
        filepath = os.path.join(page_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Simple regex that uses non-greedy match
        new_content = re.sub(r'\s*<div className="mobile-header">.*?</div>', '', content, flags=re.DOTALL)
        
        # also check for {/* Mobile Header */} comments
        new_content = re.sub(r'\s*\{/\*\s*Mobile Header.*?\*/\}', '', new_content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Stripped mobile-header from {filename}')
