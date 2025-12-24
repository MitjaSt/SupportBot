#!/usr/bin/env python3
"""Validate .env file against .env.example to find missing or extra variables."""

import re
import sys
from pathlib import Path


def parse_env_file(filepath):
    """Parse .env file and extract variable names (ignoring comments and empty lines)."""
    variables = set()
    if not filepath.exists():
        return variables

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue
            # Extract variable name (everything before =)
            match = re.match(r"^([A-Z_][A-Z0-9_]*)\s*=", line)
            if match:
                variables.add(match.group(1))
    return variables


def main():
    env_example = Path(".env.example")
    env_file = Path(".env")

    if not env_example.exists():
        print("❌ .env.example not found")
        sys.exit(1)

    if not env_file.exists():
        print("❌ .env not found")
        sys.exit(1)

    example_vars = parse_env_file(env_example)
    current_vars = parse_env_file(env_file)

    missing = example_vars - current_vars
    extra = current_vars - example_vars

    # Check for duplicates in .env
    duplicates = find_duplicates(env_file)

    has_issues = bool(missing or extra or duplicates)

    if not has_issues:
        print("✅ .env is valid - all variables match .env.example")
        return

    print("⚠️  .env validation issues found:\n")

    if missing:
        print("❌ Missing variables (defined in .env.example but not in .env):")
        for var in sorted(missing):
            print(f"   - {var}")
        print()

    if extra:
        print("⚠️  Extra variables (in .env but not in .env.example):")
        for var in sorted(extra):
            print(f"   - {var}")
        print()

    if duplicates:
        print("🔴 Duplicate variables in .env (will cause overwrites!):")
        for var, count in sorted(duplicates.items()):
            print(f"   - {var} (appears {count} times)")
        print()

    sys.exit(1)


def find_duplicates(filepath):
    """Find duplicate variable definitions in .env file."""
    var_counts = {}
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            match = re.match(r"^([A-Z_][A-Z0-9_]*)\s*=", line)
            if match:
                var_name = match.group(1)
                var_counts[var_name] = var_counts.get(var_name, 0) + 1

    return {var: count for var, count in var_counts.items() if count > 1}


if __name__ == "__main__":
    main()
