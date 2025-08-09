#!/usr/bin/env python3

import subprocess
import json
import sys
import os

def get_options():
    """Parse command line arguments"""
    filter_mode = 'all'
    detail_count = 10
    
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg.lower() in ['src', 'test', 'all']:
            filter_mode = arg.lower()
        elif arg.isdigit():
            detail_count = int(arg)
    
    return filter_mode, detail_count

def should_include_file(file_path, filter_mode):
    """Check if file should be included based on filter mode"""
    if filter_mode == 'all':
        return True
    elif filter_mode == 'test':
        return '/test' in file_path or '.test.' in file_path or '.spec.' in file_path
    elif filter_mode == 'src':
        return not ('/test' in file_path or '.test.' in file_path or '.spec.' in file_path)
    return True

def format_message(msg):
    """Format a lint message for display"""
    severity = 'error' if msg['severity'] == 2 else 'warning'
    rule = f"  {msg.get('ruleId', '')}" if msg.get('ruleId') else ""
    return f"    {msg['line']}:{msg['column']}  {severity}  {msg['message']}{rule}"

try:
    filter_mode, detail_count = get_options()
    
    # Run ESLint with JSON output
    result = subprocess.run([
        'npx', 'eslint', 'server', '--ext', '.ts', '--format', 'json'
    ], capture_output=True, text=True)
    
    if result.stdout:
        data = json.loads(result.stdout)
        cwd = subprocess.check_output(['pwd'], text=True).strip()
        
        # Filter files with issues and sort by total count
        files_with_issues = []
        for file_result in data:
            if file_result['errorCount'] > 0 or file_result['warningCount'] > 0:
                file_path = file_result['filePath'].replace(cwd + '/', '')
                
                # Apply filter
                if not should_include_file(file_path, filter_mode):
                    continue
                
                total = file_result['errorCount'] + file_result['warningCount']
                files_with_issues.append({
                    'path': file_path,
                    'errors': file_result['errorCount'],
                    'warnings': file_result['warningCount'],
                    'total': total,
                    'messages': file_result['messages']
                })
        
        # Sort by total issues (descending)
        files_with_issues.sort(key=lambda x: x['total'], reverse=True)
        
        filter_desc = {
            'all': 'All server files',
            'src': 'Source files (excluding tests)',
            'test': 'Test files only'
        }
        
        print(f"\n{filter_desc[filter_mode]} sorted by issue count ({len(files_with_issues)} files with issues):\n")
        
        # Show top 20 files summary
        for i, file_info in enumerate(files_with_issues[:20]):
            print(f"{i+1:2d}. {file_info['path']}")
            print(f"    {file_info['errors']} errors, {file_info['warnings']} warnings ({file_info['total']} total)")
        
        if len(files_with_issues) > 20:
            print(f"\n... and {len(files_with_issues) - 20} more files with issues")
        
        # Show detailed errors for top N files
        print(f"\n{'='*80}")
        print(f"DETAILED ERRORS FOR TOP {detail_count} FILES:")
        print(f"{'='*80}\n")
        
        for i, file_info in enumerate(files_with_issues[:detail_count]):
            print(f"{i+1}. {file_info['path']} ({file_info['total']} issues)")
            print("-" * (len(file_info['path']) + 20))
            
            # Group messages by type
            errors = [msg for msg in file_info['messages'] if msg['severity'] == 2]
            warnings = [msg for msg in file_info['messages'] if msg['severity'] == 1]
            
            if errors:
                print(f"  ERRORS ({len(errors)}):")
                for msg in errors:  # Show ALL errors
                    print(format_message(msg))
                print()
            
            if warnings:
                print(f"  WARNINGS ({len(warnings)}):")
                for msg in warnings:  # Show ALL warnings
                    print(format_message(msg))
                print()
            
            print()
        
        print(f"\nUsage: python3 scripts/lint-sorted.py [src|test|all] [number_of_detailed_files]")
        print(f"Current filter: {filter_mode}, showing details for top {detail_count} files")
        print(f"Examples:")
        print(f"  python3 scripts/lint-sorted.py src 5    # Show top 5 source files with full details")
        print(f"  python3 scripts/lint-sorted.py test     # Show top 10 test files with full details")
        print(f"  python3 scripts/lint-sorted.py all 3    # Show top 3 files (any type) with full details")
    
except json.JSONDecodeError as e:
    print(f"Error parsing ESLint JSON output: {e}")
    sys.exit(1)
except subprocess.CalledProcessError as e:
    print(f"Error running ESLint: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {e}")
    sys.exit(1)