#!/usr/bin/env python3
"""
Validation script for BrainMark Chrome Extension
Checks if all required files exist and are properly configured
"""

import os
import json
import sys

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"[OK] {description}: {filepath} ({size} bytes)")
        return True
    else:
        print(f"[FAIL] {description}: {filepath} - MISSING!")
        return False

def validate_json(filepath):
    """Validate JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"[OK] Valid JSON: {filepath}")
        return True, data
    except json.JSONDecodeError as e:
        print(f"[FAIL] Invalid JSON in {filepath}: {e}")
        return False, None
    except Exception as e:
        print(f"[FAIL] Error reading {filepath}: {e}")
        return False, None

def main():
    print("=" * 60)
    print("TAB MEMORY ASSISTANT - VALIDATION CHECK")
    print("=" * 60)
    print()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    all_valid = True

    # Check manifest.json
    print("1. Checking manifest.json...")
    manifest_path = os.path.join(base_dir, 'manifest.json')
    valid, manifest_data = validate_json(manifest_path)
    all_valid = all_valid and valid

    if valid and manifest_data:
        print(f"   Name: {manifest_data.get('name')}")
        print(f"   Version: {manifest_data.get('version')}")
        print(f"   Manifest Version: {manifest_data.get('manifest_version')}")
    print()

    # Check HTML files
    print("2. Checking HTML files...")
    html_files = [
        ('sidepanel.html', 'Side Panel'),
    ]
    for filename, desc in html_files:
        filepath = os.path.join(base_dir, filename)
        all_valid = all_valid and check_file_exists(filepath, desc)
    print()

    # Check CSS files
    print("3. Checking CSS files...")
    css_files = [
        ('styles/variables.css', 'Design tokens'),
        ('styles/components.css', 'UI components'),
        ('styles/animations.css', 'Animations'),
        ('styles/sidepanel.css', 'Side Panel styles'),
    ]
    for filename, desc in css_files:
        filepath = os.path.join(base_dir, filename)
        all_valid = all_valid and check_file_exists(filepath, desc)
    print()

    # Check JavaScript files
    print("4. Checking JavaScript files...")
    js_files = [
        ('scripts/sidepanel.js', 'Side Panel logic'),
        ('scripts/modal-manager.js', 'Modal manager'),
        ('scripts/tab-manager.js', 'Tab manager'),
        ('scripts/storage-manager.js', 'Storage manager'),
        ('scripts/background.js', 'Background worker'),
        ('scripts/content-intent-capture.js', 'Content script'),
    ]
    for filename, desc in js_files:
        filepath = os.path.join(base_dir, filename)
        all_valid = all_valid and check_file_exists(filepath, desc)
    print()

    # Check icon files
    print("5. Checking icon files...")
    icon_files = [
        ('assets/icons/icon16.png', '16x16 icon'),
        ('assets/icons/icon48.png', '48x48 icon'),
        ('assets/icons/icon192.png', '128x128 icon'),
    ]
    for filename, desc in icon_files:
        filepath = os.path.join(base_dir, filename)
        all_valid = all_valid and check_file_exists(filepath, desc)
    print()

    # Summary
    print("=" * 60)
    if all_valid:
        print("[SUCCESS] ALL CHECKS PASSED!")
        print()
        print("Your extension is ready to load in Chrome!")
        print()
        print("Next steps:")
        print("1. Open chrome://extensions/ in Chrome")
        print("2. Enable 'Developer mode'")
        print("3. Click 'Load unpacked'")
        print("4. Select this folder:", base_dir)
        print("=" * 60)
        return 0
    else:
        print("[ERROR] SOME CHECKS FAILED!")
        print()
        print("Please fix the issues above before loading the extension.")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
