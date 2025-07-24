import requests
import json
import time
import difflib
import os
from pathlib import Path

# Configuration
LM_STUDIO_API_URL = "http://localhost:1234/v1/chat/completions"  # Default LM Studio API endpoint
JS_FILES = ["astral_proxy/window.js", "astral_proxy/index.js"]
IMPROVEMENT_PROMPT = """
You are an expert JavaScript developer. Your task is to improve the following JavaScript code.
Analyze the code for:
1. Performance optimizations
2. Code clarity and readability
3. Best practices and modern JavaScript patterns
4. Bug fixes
5. Modularity and maintainability

Provide your improvements as a diff format that can be applied to the original code.
Only respond with the diff content, nothing else.

Original code:
{code}
"""

def read_file(file_path):
    """Read the content of a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None

def write_file(file_path, content):
    """Write content to a file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)

def apply_diff(original_content, diff_content):
    """Apply a diff to the original content."""
    # This is a simplified diff applier for demonstration
    # In a production environment, you'd want to use a proper diff library
    original_lines = original_content.splitlines(keepends=True)
    diff_lines = diff_content.splitlines(keepends=True)
    
    # Parse the diff (simplified approach)
    result_lines = []
    i = 0
    while i < len(diff_lines):
        line = diff_lines[i]
        if line.startswith('@@'):
            i += 1
            continue
        elif line.startswith('+'):
            result_lines.append(line[1:])
        elif line.startswith('-'):
            # Skip this line from original
            pass
        elif line.startswith(' '):
            result_lines.append(line[1:])
        else:
            result_lines.append(line)
        i += 1
    
    return ''.join(result_lines)

def get_improvement_suggestion(code):
    """Get improvement suggestions from LM Studio API."""
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "LM Studio Model",  # Placeholder - replace with your actual model name
        "messages": [
            {
                "role": "user",
                "content": IMPROVEMENT_PROMPT.format(code=code)
            }
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post(LM_STUDIO_API_URL, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except requests.exceptions.RequestException as e:
        print(f"Error calling LM Studio API: {e}")
        return None
    except KeyError:
        print("Unexpected API response format")
        return None

def process_file(file_path):
    """Process a single file for improvement."""
    print(f"Processing {file_path}...")
    
    # Read current file content
    original_content = read_file(file_path)
    if original_content is None:
        return
    
    # Get improvement suggestion from LM Studio
    print("Requesting improvements from LM Studio...")
    diff_suggestion = get_improvement_suggestion(original_content)
    
    if not diff_suggestion:
        print("Failed to get improvement suggestion.")
        return
    
    # Apply the diff to get improved content
    try:
        improved_content = apply_diff(original_content, diff_suggestion)
        
        # Save the improved content
        write_file(file_path, improved_content)
        print(f"Successfully improved {file_path}")
        
        # Show what changed
        diff = difflib.unified_diff(
            original_content.splitlines(keepends=True),
            improved_content.splitlines(keepends=True),
            fromfile=f"{file_path} (original)",
            tofile=f"{file_path} (improved)"
        )
        print("\nChanges made:")
        print(''.join(diff))
        
    except Exception as e:
        print(f"Error applying improvements to {file_path}: {e}")

def main():
    """Main loop that continuously improves the files."""
    print("Starting continuous improvement process...")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            for file_path in JS_FILES:
                process_file(file_path)
                print("-" * 50)
            
            # Wait before next iteration
            print("Waiting 60 seconds before next improvement cycle...")
            time.sleep(60)
            
    except KeyboardInterrupt:
        print("\nImprovement process stopped by user.")

if __name__ == "__main__":
    main()