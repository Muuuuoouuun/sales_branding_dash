import glob
import re

files_to_check = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for filepath in files_to_check:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Replace ₩ formatting in strings
        content = content.replace("₩", r"${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}")
        
        # Since replacing ₩ inside JSX text nodes like <span>₩{...}</span> evaluates the $ directly,
        # it might break <span>${typeof...}</span>. JSX allows expressions inside curly braces.
        # It's better to wrap it in {} if it's inside JSX, but doing `<span>{typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}{...}</span>` is correct.
        
        # We need a smarter replace for ₩
        # <span>₩ -> <span>{typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}
        content = content.replace(">₩", r">{typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}")
        content = content.replace("`₩", r"`${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}")
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated ₩ in {filepath}")
    except Exception as e:
        pass
